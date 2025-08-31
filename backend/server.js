const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { PORT } = require('./src/config/env');
const onConnection = require('./src/websocket/connection');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', onConnection);

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});