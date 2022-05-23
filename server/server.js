require('dotenv').config();
const { resolve } = require('path');
const express = require('express');

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
