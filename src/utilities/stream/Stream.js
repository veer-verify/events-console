import React, { useEffect, useRef, useState } from 'react';

const Stream = ({ videoData }) => {

  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const queuedCandidatesRef = useRef([]);
  const offerDataRef = useRef(null);
  const sessionUrlRef = useRef('');
  const restartTimeoutRef = useRef(null);

  const [showLoader, setShowLoader] = useState(false);
  const [hitStream, setHitStream] = useState(true);

  const encoded = btoa('admin:verifai123789');



  useEffect(() => {
    const requestICEServers = () => {
      if (!hitStream) return;

      setShowLoader(true);
      fetch(`${videoData}whep`, {
        method: 'OPTIONS',
        headers: {
          Authorization: `Basic ${encoded}`
        }
      })
        .then(res => {
          setShowLoader(false);
          const linkHeader = res.headers.get('Link');
          const iceServers = linkToIceServers(linkHeader);

          const pc = new RTCPeerConnection({ iceServers });
          peerConnectionRef.current = pc;

          pc.addTransceiver('video', { direction: 'sendrecv' });
          pc.addTransceiver('audio', { direction: 'sendrecv' });

          pc.onicecandidate = onLocalCandidate;
          pc.oniceconnectionstatechange = onConnectionState;
          pc.ontrack = onTrack;

          createOffer(pc);
        })
        .catch(err => {
          setShowLoader(false);
          onError(err.toString());
        });
    };

    const linkToIceServers = (links) => {
      const ics = [];
      if (links) {
        links.split(', ').forEach(link => {
          const m = link.match(/^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i);
          if (m) {
            const ice = { urls: [m[1]] };
            if (m[3]) {
              ice.username = JSON.parse(`"${m[3]}"`);
              ice.credential = JSON.parse(`"${m[4]}"`);
            }
            ics.push(ice);
          }
        });
      }
      return ics;
    };

    const createOffer = (pc) => {
      setShowLoader(true);
      pc.createOffer()
        .then(offer => {
          offerDataRef.current = parseOffer(offer.sdp);
          return pc.setLocalDescription(offer).then(() => offer);
        })
        .then(offer => {
          sendOffer(offer);
        })
        .catch(err => {
          setShowLoader(false);
          onError(err.toString());
        });
    };

    const parseOffer = (sdp) => {
      const ret = { iceUfrag: '', icePwd: '', medias: [] };
      sdp.split('\r\n').forEach(line => {
        if (line.startsWith('m=')) ret.medias.push(line.slice(2));
        if (line.startsWith('a=ice-ufrag:') && !ret.iceUfrag) ret.iceUfrag = line.slice(12);
        if (line.startsWith('a=ice-pwd:') && !ret.icePwd) ret.icePwd = line.slice(10);
      });
      return ret;
    };

    const sendOffer = (offer) => {
      if (!hitStream) return;

      setShowLoader(true);
      fetch(`${videoData}whep`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          Authorization: `Basic ${encoded}`
        },
        body: offer.sdp
      })
        .then(res => {
          setShowLoader(false);
          if (res.status !== 201) throw new Error(`Unexpected status ${res.status}`);
          sessionUrlRef.current = new URL(res.headers.get('location'), videoData).toString();
          return res.text();
        })
        .then(sdp => {
          onRemoteAnswer(sdp);
        })
        .catch(err => {
          setShowLoader(false);
          onError(err.toString());
        });
    };

    const onRemoteAnswer = (sdp) => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState !== 'have-local-offer') return;

      pc.setRemoteDescription({ type: 'answer', sdp })
        .then(() => {
          if (queuedCandidatesRef.current.length > 0) {
            sendLocalCandidates(queuedCandidatesRef.current);
            queuedCandidatesRef.current = [];
          }
        })
        .catch(err => onError(err.toString()));
    };

    const onLocalCandidate = (evt) => {
      if (!evt.candidate || restartTimeoutRef.current) return;

      if (!sessionUrlRef.current) {
        queuedCandidatesRef.current.push(evt.candidate);
      } else {
        sendLocalCandidates([evt.candidate]);
      }
    };

    const sendLocalCandidates = (candidates) => {
      const url = sessionUrlRef.current;
      const offerData = offerDataRef.current;

      setShowLoader(true);
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/trickle-ice-sdpfrag',
          'If-Match': '*'
        },
        body: generateSdpFragment(offerData, candidates)
      })
        .then(res => {
          setShowLoader(false);
          if (res.status !== 204) throw new Error(`Unexpected status ${res.status}`);
        })
        .catch(err => {
          setShowLoader(false);
          onError(err.toString());
        });
    };

    const generateSdpFragment = (od, candidates) => {
      const grouped = {};
      for (const c of candidates) {
        const mid = c.sdpMLineIndex;
        if (!grouped[mid]) grouped[mid] = [];
        grouped[mid].push(c);
      }

      let frag = `a=ice-ufrag:${od.iceUfrag}\r\na=ice-pwd:${od.icePwd}\r\n`;
      od.medias.forEach((media, i) => {
        if (grouped[i]) {
          frag += `m=${media}\r\na=mid:${i}\r\n`;
          grouped[i].forEach(c => frag += `a=${c.candidate}\r\n`);
        }
      });
      return frag;
    };

    const onTrack = (evt) => {
      if (videoRef.current) {
        videoRef.current.srcObject = evt.streams[0];
      }
    };

    const onConnectionState = () => {
      const state = peerConnectionRef.current?.iceConnectionState;
      console.log('ICE State:', state);
      if (restartTimeoutRef.current) return;

      if (state === 'disconnected' || state === 'failed') {
        onError('Peer connection disconnected');
      }
    };

    const onError = (err) => {
      console.error('WebRTC Error:', err);

      peerConnectionRef.current?.close();
      restartTimeoutRef.current = setTimeout(() => {
        restartTimeoutRef.current = null;
        requestICEServers();
      }, 2000);

      if (sessionUrlRef.current) {
        fetch(sessionUrlRef.current, { method: 'DELETE' });
      }

      sessionUrlRef.current = '';
      queuedCandidatesRef.current = [];
    };
    if (hitStream) {
      requestICEServers();
    }

    return () => {
      setHitStream(false);
      peerConnectionRef.current?.close();
    };
  }, []);

  return (
    <div style={{ position: 'relative', height: '350px' }}>
      {showLoader && <div className="loader"></div>}
      <video ref={videoRef} autoPlay playsInline muted controls={false} width="100%" height="100%" style={{ objectFit: 'fill' }} />
    </div>
  );
};

export default Stream;
