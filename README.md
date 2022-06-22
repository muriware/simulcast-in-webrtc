# Simulcast in WebRTC

This WebRTC sample shows how to use simulcast on a video application.

## Requirements
* Node v14+

## How to run locally

1. Clone this repository

```
git clone https://github.com/muriware/simulcast-in-webrtc.git
```

2. Copy the `.env.example` file into a file named `.env` in the server folder

```
cp .env.example server/.env
```

`STATIC_DIR` tells the server where to the client files are located and does not need to be modified.

3. Install dependencies

```
cd server && yarn
```

4. Run the application

```
yarn start
```

5. Go to `localhost:4242` to see the demo

## How to test

Disable second layer

```js
var sender = pc1.getSenders()[0];
var parameters = sender.getParameters();

parameters.encodings[1].active = false;

sender.setParameters(parameters);
```

Enable second layer

```js
var sender = pc1.getSenders()[0];
var parameters = sender.getParameters();

parameters.encodings[1].active = true;

sender.setParameters(parameters);
```

Limit first layer bitrate to 100kbps, and second layer to 300kbps.

```js
var sender = pc1.getSenders()[0];
var parameters = sender.getParameters();

parameters.encodings[0].maxBitrate = 100000;
parameters.encodings[1].maxBitrate = 300000;

sender.setParameters(parameters);
```

Set the resolution of the second layer to be a quarter of the original resolution.

```js
var sender = pc1.getSenders()[0];
var parameters = sender.getParameters();

parameters.encodings[1].scaleResolutionDownBy = 4;

sender.setParameters(parameters);
```

Set the resolution of the second layer to be a half of the original resolution.

```js
var sender = pc1.getSenders()[0];
var parameters = sender.getParameters();

parameters.encodings[1].scaleResolutionDownBy = 2;

sender.setParameters(parameters);
```

Limit the bandwidth available to 800kbps on the remote end

```js
await pc1.setLocalDescription()
pc1.setRemoteDescription({type: 'answer', sdp: pc1.remoteDescription.sdp + "b=AS:800\r\n"})
```
