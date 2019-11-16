#!/bin/bash

for i in account-domain-service account-orchestrator identity-domain-service; do
  for j in 0.1.0 0.1.1 0.1.2; do
    build_cmd="docker build -t wcschlosser/$i:$j -f $i/Dockerfile --build-arg SERVICE_VERSION=$j $i/"
    push_cmd="docker push wcschlosser/$i:$j"
    echo "Executing: $build_cmd && $push_cmd"
    $build_cmd && $push_cmd
  done
done
