const express = require('express');
const app = require('express')();
const request = require('request');
const os = require('os');
const identity_domain_service_location = process.env.IDENTITY_DOMAIN_SERVICE_LOCATION || 'http://localhost:8081/';
const account_domain_service_location = process.env.ACCOUNT_DOMAIN_SERVICE_LOCATION || 'http://localhost:8082/';
const hostname_log_endpoint = 'hostname-file/';
const versionSuffix = `[account-orchestrator version ${process.env.SERVICE_VERSION}]`

app.use(express.json());

app.get('/api/:filename', (req, res) => {
    console.log(`Retrieving the file ${req.params.filename}`);
    request({
        url: identity_domain_service_location + req.params.filename, 
        method: 'GET',
        headers: { 'x-client-id': req.header('x-client-id')}
    }, (err, response, body) => {
      if (err) { 
          console.log(err);
          res.send(err);
      } else {
          res.send(JSON.stringify({ content: `${JSON.parse(body).content} ${versionSuffix}` }));
      }
    });
});

app.post('/api/:filename', (req, res) => {
    console.log(`Creating the file ${req.params.filename}`);
    request({
        url: identity_domain_service_location + req.params.filename, 
        method: 'POST',
        json: true,
        headers: { 'x-client-id': req.header('x-client-id')},
        body: req.body
    }, (err, response, body) => {
        if (err || response.statusCode != 200) {
            console.log(err);
            res.send(JSON.stringify({status: "Error occurred"}));
        } else {
            res.send(JSON.stringify({status: `${body.status} ${versionSuffix}`}));
        }
    });
});

app.post('/hostname-log', (req, res) => {
    console.log(`Creating a hostname file ${os.hostname()}`);
    request({
        url: account_domain_service_location + hostname_log_endpoint + os.hostname(),
        method: 'POST',
        headers: { 'x-client-id': req.header('x-client-id')}
    }, (err, response, body) => {
        if (err || response.statusCode != 200) {
            console.log(err);
            res.send(JSON.stringify({status: "Error occurred"}));
        } else {
            res.send(JSON.stringify({status: `${JSON.parse(body).status} ${versionSuffix}`}));
        }
    });
});

app.listen(8080, () => {
  console.log('Ready on 8080');
});
