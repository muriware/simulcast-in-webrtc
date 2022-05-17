// Use WebSocket as a WebRTC Signaling channel
class SignalingChannel extends WebSocket {
  constructor() {
    super('ws://localhost:4242');
    this.listener = {};
    this.addEventListener('message', this.emit);
  }

  set onmessage(callback) {
    this.listener['message'] = callback;
  }

  emit(event) {
    const callback = this.listener[event.type];
    if (typeof callback === 'function') {
      callback({ data: JSON.parse(event.data) });
    }
  }

  send(data) {
    super.send(JSON.stringify(data));
  }
}

const signaling = new SignalingChannel(); // handles JSON.stringify/parse
const constraints = { video: true };
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
const pc = new RTCPeerConnection(configuration);

const selfView = document.getElementById('self-view');
const remoteView = document.getElementById('remote-view');
const cameraButton = document.getElementById('enable-camera');

// Send any ice candidates to the other peer
pc.onicecandidate = ({ candidate }) => signaling.send({ candidate });

// Let the "negotiationneeded" event trigger offer generation
pc.onnegotiationneeded = async () => {
  try {
    await pc.setLocalDescription();
    // Send the offer to the other peer
    signaling.send({ description: pc.localDescription });
  } catch (err) {
    console.error(err);
  }
};

pc.ontrack = ({ track, transceiver }) => {
  // Once media for the remote track arrives, show it in a remote-view
  track.onunmute = () => {
    // Don't set srcObject again if it is already set
    if (!remoteView.srcObject) {
      remoteView.srcObject = new MediaStream();
    }
    remoteView.srcObject.addTrack(track);
  };
};

signaling.onmessage = async ({ data: { description, candidate } }) => {
  try {
    if (description) {
      await pc.setRemoteDescription(description);
      // If we got an offer, we need to reply with an answer
      if (description.type === 'offer') {
        await pc.setLocalDescription();
        signaling.send({ description: pc.localDescription });
      }
    }

    if (candidate) {
      await pc.addIceCandidate(candidate);
    }
  } catch (err) {
    console.error(err);
  }
};

cameraButton.addEventListener('click', addCamera);

async function addCamera() {
  try {
    // Get a local stream, show it in a self-view and add it to be sent
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    selfView.srcObject = stream;
    pc.addTransceiver(stream.getVideoTracks()[0], {
      direction: 'sendonly',
      // Establish the simulcast envelope on the transceiver
      sendEncodings: [
        { rid: 'q', active: true, scaleResolutionDownBy: 4.0 },
        { rid: 'h', active: true, scaleResolutionDownBy: 2.0 },
        { rid: 'f', active: true },
      ],
    });
  } catch (err) {
    console.error(err);
  }
}
