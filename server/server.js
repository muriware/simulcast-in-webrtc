require('dotenv').config();
const { resolve } = require('path');
const express = require('express');
const ws = require('ws');

const app = express();
const port = process.env.PORT || 4242;

app.use(express.static(process.env.STATIC_DIR));

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

const server = app.listen(port, () =>
  console.log(`Server listening on port ${port}!`)
);

const wss = new ws.Server({ server });

// Use WebSocket as a WebRTC Signaling channel
wss.on('connection', (ws) => {
  ws.on('message', (data, isBinary) => {
    wss.clients.forEach((client) => {
      if (client !== ws) {
        client.send(data, { binary: isBinary });
      }
    });
  });
  console.log('WebSocket connected');
});
