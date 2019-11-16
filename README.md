# SETUP:

Start up docker k8s cluster. Make sure to allocate at least 4gb memory in docker preferences.
Install istio (istio-demo.yaml included in istio-install directory)

Next, create namespace and deploy version 0.1.0 of everything along with an initial k8s service:
```
kubectl apply -f services/k8s-deploy/multi-tenant-namespace.yaml && \
  kubectl apply -f services/k8s-deploy/identity-domain-service/identity_domain_service_deploy_0.1.0.yaml && \
  kubectl apply -f services/k8s-deploy/identity-domain-service/identity_domain_service_svc.yaml && \
  kubectl apply -f services/k8s-deploy/account-orchestrator/account_orchestrator_deploy_0.1.0.yaml && \
  kubectl apply -f services/k8s-deploy/account-orchestrator/account_orchestrator_svc.yaml && \
  kubectl apply -f services/k8s-deploy/account-domain-service/account_domain_service_deploy_0.1.0.yaml && \
  kubectl apply -f services/k8s-deploy/account-domain-service/account_domain_service_svc.yaml
```

*NOTE: All of the following assumes your kubeconfig context namespace is set to 'multi-tenant-namespace'*

Verify everything is deployed:
```
kubectl get deployments
```

FIRST NOTE: Check out how istio auto injected the sidecar. It is not in the deployment yaml, but
since the multi-tenant-namespace is labeled with injection, istio modifies the pods to add the container
```
kubectl get pods
kubectl get ns multi-tenant-namespace --show-labels
```

Notice the deployments are named with a version so that multiple version can stand up next to each other
Notice the k8s svc object though is not, and so by default (without istio rules) the svc will forward to any version
```
kubectl get svc
kubectl get endpoints
```

# CHECK OUT THE PUBLIC API ON A NODEPORT

Get a file (account-orchestrator calls identity-domain-service)
```
curl -v http://localhost:30050/api/myfile
```

Write a file (account-orchestrator calls identity-domain-service)
```
curl -v http://localhost:30050/api/mynewfile -H 'Content-Type: application/json' --data '{"content": "This is my new file"}'
curl -v http://localhost:30050/api/mynewfile
```

Write hostname file (account-orchestrator calls account-domain-service which calls identity-domain-service)
```
curl -v http://localhost:30050/hostname-log -X POST
```

# A - NOW LOCK DOWN ROUTING BY APPLYING ISTIO DESTINATION RULES AND VIRTUAL SERVICES:

```
kubectl apply -f services/routing-demo/demo-a/
```

V1 is now locked down to client id resi
```
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
```

No client ID now fails
```
curl -v http://localhost:80/api/myfile
```

# B - NOW DEPLOY 0.1.1 OF THE IDENTITY DOMAIN SERVICE

```
kubectl apply -f services/routing-demo/demo-b/identity_domain_service_deploy_0.1.1.yaml
```

```
kubectl get pods
kubectl get endpoints
```

Note that it doesn't get traffic yet - it's not in the resi subset in the destination rule

```
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
```

Now update the resi subset in the destination rule to 'roll out' to v0.1.1

```
kubectl apply -f services/routing-demo/demo-b/destination_rules.yaml
```

Note that now all traffic for resi is on 0.1.1
```
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
```

# C - ROLL OUT FULL 0.1.1 STACK FOR NEW CLIENT MSA

First deploy 0.1.1 of account-orchestrator and account-domain-service. 
Note that resi is unaffected, the subset resi for each destination rule is still on the same versions

```
kubectl apply -f services/routing-demo/demo-c/account_orchestrator_deploy_0.1.1.yaml && \
  kubectl apply -f services/routing-demo/demo-c/account_domain_service_deploy_0.1.1.yaml
```

```
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: resi'
```

Now update the destination rules to create a subset for msa to go to all 0.1.1. 
Now update the virtual service for each to route msa based on header. 
Note that msa gets all 0.1.1 while resi is still the previous 0.1.0, 0.1.1, 0.1.0 stack
```
kubectl apply -f services/routing-demo/demo-c/destination_rules.yaml && \
  kubectl apply -f services/routing-demo/demo-c/virtual_services.yaml
```

```
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: msa'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: msa'
```

# D - UPGRADE RESI TO ALREADY RUNNING ACCOUNT DOMAIN SERVICE 0.1.1

account-domain-service 0.1.1 already exists since it's in the msa stack. 
Update destination rule for resi account-domain-service to route to 0.1.1
```
kubectl apply -f services/routing-demo/demo-d/
```

```
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: msa'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: msa'
```

# E - ROLLOUT IDENTITY DOMAIN SERVICE 0.1.2 TO RESI ONLY

First deploy 0.1.2 of identity-domain-service since it's new. 
Update the identity-domain-service destination rule resi subset to point to 0.1.2. 
Notice resi and msa are reusing the same account-domain-service 0.1.1, but depending on the client, identity-domain-service 0.1.1 or 0.1.2 is used

```
kubectl apply -f services/routing-demo/demo-e/
```

```
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: msa'
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: msa'
```

# F - MIRROR ACCOUNT ORCHESTRATOR 0.1.2 TO RESI ONLY

First deploy 0.1.2 of account-orchestrator since it's new.
Update the account-orchestrator virtual service to create a 'resi-mirror' subset which routes to 0.1.2
Next, update the account-orchestrator destination rule to mirror traffic to the 'resi-mirror' subset for the resi client
Watch the logs to both account-orchestrator 0.1.0 and 0.1.2, and notice both services recieve a request for 'resi', but not for 'msa'

```
kubectl apply -f services/routing-demo/demo-f/
```

```
# IN TWO SEPARATE TERMINALS:
kubectl logs account-orchestrator-0.1.0-{hash} account-orchestrator -f
kubectl logs account-orchestrator-0.1.2-{hash} account-orchestrator -f
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: resi'
# REPEAT:
curl -v http://localhost:80/api/myfile -H 'x-client-id: msa'
```

# G - CANARY RELEASE ACCOUNT DOMAIN SERVICE 0.1.2 TO MSA ONLY

First deploy 0.1.2 of account-domain-service since it's new.
Update the account-domain-service virtual service to create an 'msa-canary' subset which routes to 0.1.2
Next, update the account-domain-service destination rule to route 25% of traffic to the 'msa-canary' subset for the msa client.
Repeat the curl and notice the version of the account-domain-service varies. Try adjusting the weights to send a higher amount of traffic to the msa-canary subset and repeat the curls again.

```
kubectl apply -f services/routing-demo/demo-g/
```

```
# REPEAT:
curl -v http://localhost:80/hostname-log -X POST -H 'x-client-id: msa'
# EDIT WEIGHT IN PLACE:
kubectl edit virtualservice account-domain-service
```

# CLEANUP
Delete the multi-tenant-namspace namespace
```
kubectl delete ns multi-tenant-namespace
```
