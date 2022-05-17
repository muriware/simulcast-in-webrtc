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
