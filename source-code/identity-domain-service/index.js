const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const dataDirectory = process.env.DATA_DIR || 'data';
const versionSuffix = `[identity-domain-service version ${process.env.SERVICE_VERSION}]`;

app.use(express.json());

app.get('/:filename', (req, res) => {
    const filepath = path.resolve(__dirname, dataDirectory, req.params.filename);
    console.log(`Retrieving ${filepath}`);
    const file = fs.readFileSync(filepath);
    res.send(JSON.stringify({content: `${file.toString()} ${versionSuffix}`}));
});

app.post('/:filename', (req, res) => {
    if (!req.body.content) {
        console.log('No content to write');
        res.status(500);
        res.send(JSON.stringify({status: `No content to write ${versionSuffix}`}));
    } else {
        const filepath = path.resolve(__dirname, dataDirectory, req.params.filename);
        console.log(`Writing to ${filepath}`);
        fs.writeFileSync(filepath, req.body.content);
        res.send(JSON.stringify({status: `Success ${versionSuffix}`}));
    }
});

app.listen(8081, () => {
  console.log('Ready on 8081');
});
