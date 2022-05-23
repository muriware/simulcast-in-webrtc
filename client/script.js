const pc1 = new RTCPeerConnection();
const pc2 = new RTCPeerConnection();
pc1.onicecandidate = (e) => pc2.addIceCandidate(e.candidate);
pc2.onicecandidate = (e) => pc1.addIceCandidate(e.candidate);
pc2.ontrack = (e) => show(e.streams[0], true);

const extensionsToFilter = [
  'urn:ietf:params:rtp-hdrext:sdes:mid',
  'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
  'urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id',
];
const rids = [0, 1, 2];

document.getElementById('enable-camera').addEventListener('click', start);

function start() {
  navigator.mediaDevices
    .getUserMedia({ video: { width: 1280, height: 720 } })
    .then((stream) => {
      pc1.addTransceiver(stream.getVideoTracks()[0], {
        streams: [stream],
        sendEncodings: [
          { rid: 0, active: true },
          { rid: 1, active: true },
          { rid: 2, active: true },
        ],
      });
      show(stream, false);
      return pc1.createOffer();
    })
    .then((offer) => {
      const sections = SDPUtils.splitSections(offer.sdp);
      const dtls = SDPUtils.getDtlsParameters(sections[1], sections[0]);
      const ice = SDPUtils.getIceParameters(sections[1], sections[0]);
      const rtpParameters = SDPUtils.parseRtpParameters(sections[1]);
      const rtcpParameters = SDPUtils.parseRtcpParameters(sections[1]);

      // The gist of this hack is that rid and mid have the same wire format.
      // Kudos to orphis for this clever hack!
      const rid = rtpParameters.headerExtensions.find(
        (ext) => ext.uri === 'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id'
      );
      rtpParameters.headerExtensions = rtpParameters.headerExtensions.filter(
        (ext) => {
          return !extensionsToFilter.includes(ext.uri);
        }
      );
      // This tells the other side that the RID packets are actually mids.
      rtpParameters.headerExtensions.push({
        id: rid.id,
        uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
        direction: 'sendrecv',
      });

      // Filter rtx as we have no wait to reinterpret rrid. Not doing this makes probing use RTX, its not understood
      // and ramp-up is slower.
      rtpParameters.codecs = rtpParameters.codecs.filter(
        (c) => c.name.toUpperCase() !== 'RTX'
      );

      let sdp =
        SDPUtils.writeSessionBoilerplate() +
        SDPUtils.writeDtlsParameters(dtls, 'actpass') +
        SDPUtils.writeIceParameters(ice) +
        'a=group:BUNDLE 0 1 2\r\n' +
        'a=msid-semantic:WMS *\r\n';
      const codecs =
        SDPUtils.writeRtpDescription('video', rtpParameters) +
        SDPUtils.writeRtcpParameters({
          mux: rtcpParameters.mux,
          reducedSize: rtcpParameters.reducedSize,
        });
      sdp +=
        codecs +
        'a=setup:actpass\r\n' +
        'a=mid:' +
        rids[0] +
        '\r\n' +
        'a=msid:low low\r\n';
      sdp +=
        codecs +
        'a=setup:actpass\r\n' +
        'a=mid:' +
        rids[1] +
        '\r\n' +
        'a=msid:mid mid\r\n';
      sdp +=
        codecs +
        'a=setup:actpass\r\n' +
        'a=mid:' +
        rids[2] +
        '\r\n' +
        'a=msid:hi hi\r\n';

      return Promise.all([
        pc1.setLocalDescription(offer),
        pc2.setRemoteDescription({
          type: 'offer',
          sdp,
        }),
      ]);
    })
    .then(() => pc2.createAnswer())
    .then((answer) => {
      const sections = SDPUtils.splitSections(answer.sdp);
      const dtls = SDPUtils.getDtlsParameters(sections[1], sections[0]);
      const ice = SDPUtils.getIceParameters(sections[1], sections[0]);
      const rtpParameters = SDPUtils.parseRtpParameters(sections[1]);
      const rtcpParameters = SDPUtils.parseRtcpParameters(sections[1]);
      // Avoid duplicating the mid extension even though Chrome does not care (boo!)
      rtpParameters.headerExtensions = rtpParameters.headerExtensions.filter(
        (ext) => {
          return !extensionsToFilter.includes(ext.uri);
        }
      );
      let sdp =
        SDPUtils.writeSessionBoilerplate() +
        SDPUtils.writeDtlsParameters(dtls, 'active') +
        SDPUtils.writeIceParameters(ice) +
        'a=group:BUNDLE 0\r\n' +
        'a=msid-semantic:WMS *\r\n';
      const codecs =
        SDPUtils.writeRtpDescription('video', rtpParameters) +
        SDPUtils.writeRtcpParameters({
          mux: rtcpParameters.mux,
          reducedSize: rtcpParameters.reducedSize,
        });
      sdp += codecs;
      sdp += 'a=setup:active\r\n';

      rids.forEach((rid) => {
        sdp += 'a=rid:' + rid + ' recv\r\n';
      });
      sdp += 'a=simulcast:recv ' + rids.join(';') + '\r\n';
      sdp +=
        'a=mid:' +
        SDPUtils.getMid(SDPUtils.splitSections(pc1.localDescription.sdp)[1]) +
        '\r\n';

      // Re-add headerextensions we filtered.
      const headerExtensions = SDPUtils.parseRtpParameters(
        SDPUtils.splitSections(pc1.localDescription.sdp)[1]
      ).headerExtensions;
      headerExtensions.forEach((ext) => {
        if (extensionsToFilter.includes(ext.uri)) {
          sdp += 'a=extmap:' + ext.id + ' ' + ext.uri + '\r\n';
        }
      });
      return Promise.all([
        pc2.setLocalDescription(answer),
        pc1.setRemoteDescription({
          type: 'answer',
          sdp,
        }),
      ]);
    })
    .then(() => {
      window.setInterval(() => {
        draw(pc1, pc2);
      }, 2000);
    })
    .catch((e) => console.error(e));
}
