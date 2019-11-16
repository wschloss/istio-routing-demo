const express = require('express');
const app = require('express')();
const request = require('request');
const os = require('os');
const identity_domain_service_location = process.env.IDENTITY_DOMAIN_SERVICE_LOCATION || 'http://localhost:8081/';
const versionSuffix = `[account-domain-service version ${process.env.SERVICE_VERSION}]`

app.use(express.json());

app.post('/hostname-file/:hostname', (req, res) => {
    console.log(`Creating a hostname file for ${req.params.hostname}`);
    request({
        url: identity_domain_service_location + req.params.hostname,
        method: 'POST',
        json: true,
        headers: { 'x-client-id': req.header('x-client-id')},
        body: { content: `${req.params.hostname} written by ${versionSuffix}!`}
    }, (err, response, body) => {
        if (err || response.statusCode != 200) {
            console.log(err);
            res.send(JSON.stringify({status: "Error occurred"}));
        } else {
            res.send(JSON.stringify({status: `${body.status} ${versionSuffix}`}));
        }
    });
});

app.listen(8082, () => {
  console.log('Ready on 8082');
});
