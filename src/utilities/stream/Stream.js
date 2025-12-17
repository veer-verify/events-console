import './Stream.css';
import React, { useEffect, useRef, useState } from "react";

const Stream = ({ site, streamUrl,screenshot,currentCamera }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const sessionUrlRef = useRef("");
  const queuedCandidatesRef = useRef([]);
  const offerDataRef = useRef(null);
  const [error, setError] = useState(null);
 const [showOverlay, setShowOverlay] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [encoded, setEncoded] = useState("");
  const [hitStream, setHitStream] = useState(false);


  useEffect(() => {
    const username = "admin";
    const password = "verifai123789";
    setEncoded(btoa(`${username}:${password}`));
    setHitStream(true);
  }, []);

  useEffect(() => {
    const requestICEServers = () => {
      setShowLoader(true);
      setError(null);
  
      fetch(streamUrl + "whep", {
        method: "OPTIONS",
        headers: {
          Authorization: `Basic ${encoded}`,
        },
      })
        .then((res) => {
          setShowLoader(false);
  
          const pc = new RTCPeerConnection({
            iceServers: linkToIceServers(res.headers.get("Link")),
          });
  
          peerConnectionRef.current = pc;
  
          pc.addTransceiver("video", { direction: "sendrecv" });
          pc.addTransceiver("audio", { direction: "sendrecv" });
  
          pc.onicecandidate = onLocalCandidate;
          pc.oniceconnectionstatechange = onConnectionState;
          pc.ontrack = onTrack;
  
          createOffer();
        })
        .catch((err) => {
          setShowLoader(false);
          setHitStream(false)
       
          setError(err);
       
          onError(err.toString());
        });
    };

    const linkToIceServers = (links) => {
      const servers = [];
      if (!links) return servers;
  
      links.split(", ").forEach((link) => {
        const m = link.match(
          /^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i
        );
  
        if (m) {
          const server = { urls: [m[1]] };
          if (m[3]) {
            server.username = JSON.parse(`"${m[3]}"`);
            server.credential = JSON.parse(`"${m[4]}"`);
          }
          servers.push(server);
        }
      });
  
      return servers;
    };
  
    const onError = () => {
      if (restartTimeoutRef.current) return;
  
      peerConnectionRef.current?.close();
  
      restartTimeoutRef.current = setTimeout(() => {
        restartTimeoutRef.current = null;
        requestICEServers();
      }, 2000);
  
      if (sessionUrlRef.current) {
        fetch(sessionUrlRef.current, { method: "DELETE" });
      }
  
      sessionUrlRef.current = "";
      queuedCandidatesRef.current = [];
    };
  
    const onLocalCandidate = (evt) => {
      if (restartTimeoutRef.current) return;
  
      if (evt.candidate) {
        if (!sessionUrlRef.current) {
          queuedCandidatesRef.current.push(evt.candidate);
        } else {
          sendLocalCandidates([evt.candidate]);
        }
      }
    };
  
    const onConnectionState = () => {
      const pc = peerConnectionRef.current;
      if (!pc || restartTimeoutRef.current) return;
   
      if (pc.iceConnectionState === "disconnected") {
        onError();
      }
    };
  
    const onTrack = (evt) => {
      if (videoRef.current) {
        videoRef.current.srcObject = evt.streams[0];
          
      }
    };
  
    const createOffer = async () => {
      try {
        setShowLoader(true);
        const pc = peerConnectionRef.current;
        const offer = await pc.createOffer();
  
        editOffer(offer);
        offerDataRef.current = parseOffer(offer.sdp);
  
        await pc.setLocalDescription(offer);
        sendOffer(offer);
      } catch {
        setShowLoader(false);
      }
    };
  
    const editOffer = (offer) => {
      const sections = offer.sdp.split("m=");
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].startsWith("audio")) {
          sections[i] = enableStereoOpus(sections[i]);
        }
      }
      offer.sdp = sections.join("m=");
    };
  
    const parseOffer = (sdp) => {
      const data = { iceUfrag: "", icePwd: "", medias: [] };
  
      sdp.split("\r\n").forEach((line) => {
        if (line.startsWith("m=")) data.medias.push(line.slice(2));
        else if (!data.iceUfrag && line.startsWith("a=ice-ufrag:"))
          data.iceUfrag = line.slice(12);
        else if (!data.icePwd && line.startsWith("a=ice-pwd:"))
          data.icePwd = line.slice(10);
      });
  
      return data;
    };
  
    const enableStereoOpus = (section) => {
      let opus = "";
      const lines = section.split("\r\n");
  
      lines.forEach((l) => {
        if (l.startsWith("a=rtpmap:") && l.toLowerCase().includes("opus/")) {
          opus = l.split(" ")[0].replace("a=rtpmap:", "");
        }
      });
  
      if (!opus) return section;
  
      return lines
        .map((l) => {
          if (l.startsWith(`a=fmtp:${opus}`)) {
            if (!l.includes("stereo")) l += ";stereo=1";
            if (!l.includes("sprop-stereo")) l += ";sprop-stereo=1";
          }
          return l;
        })
        .join("\r\n");
    };
  
    const sendOffer = (offer) => {
      fetch(streamUrl + "whep", {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Authorization: `Basic ${encoded}`,
        },
        body: offer.sdp,
      })
        .then((res) => {
          if (res.status !== 201) throw new Error();
          sessionUrlRef.current = new URL(
            res.headers.get("location"),
            streamUrl
          ).toString();
          return res.text();
        })
        .then(onRemoteAnswer)
        .catch(onError)
        .finally(() => setShowLoader(false));
    };
  
    const onRemoteAnswer = (sdp) => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === "closed") return;
  
      pc.setRemoteDescription({ type: "answer", sdp });
  
      if (queuedCandidatesRef.current.length) {
        sendLocalCandidates(queuedCandidatesRef.current);
        queuedCandidatesRef.current = [];
      }
    };
  
    const sendLocalCandidates = (candidates) => {
      fetch(sessionUrlRef.current, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/trickle-ice-sdpfrag",
          "If-Match": "*",
        },
        body: generateSdpFragment(offerDataRef.current, candidates),
      }).catch(onError);
    };
  
    const generateSdpFragment = (od, candidates) => {
      const byMid = {};
  
      candidates.forEach((c) => {
        byMid[c.sdpMLineIndex] ||= [];
        byMid[c.sdpMLineIndex].push(c);
      });
  
      let frag = `a=ice-ufrag:${od.iceUfrag}\r\na=ice-pwd:${od.icePwd}\r\n`;
  
      od.medias.forEach((m, i) => {
        if (byMid[i]) {
          frag += `m=${m}\r\na=mid:${i}\r\n`;
          byMid[i].forEach((c) => {
            frag += `a=${c.candidate}\r\n`;
          });
        }
      });
  
      return frag;
    };

    if (hitStream && encoded) {
      requestICEServers();
    }

    return () => {
      setHitStream(false);
      clearTimeout(restartTimeoutRef.current);
      peerConnectionRef.current?.close();
    };
  }, [hitStream, encoded, streamUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.autoplay = true;
      videoRef.current.playsInline = true;
      videoRef.current.controls = false;
    }
  }, []);


  /* ---------------- SCREENSHOT ---------------- */

  const handleClick = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL("image/jpeg");
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `camera_screenshot_${Date.now()}.jpeg`;
    link.click();
  };

  const max = (e) => {
    const el = e.target.parentNode;
    el.classList.toggle('fullscreen');
  }
  
     return (
    <div
      className="minscreen"
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      onDoubleClick={(e) => screenshot && max(e)}
    >
      <video ref={videoRef} autoPlay playsInline muted controls={false} />
      
      {
        showLoader && <div className="loader"></div>
      }

      {
        showOverlay && screenshot &&
        <div className="hover-overlay">
          <div className="display-icon">
            <p>{currentCamera?.cameraId}</p>
            <img src="icons/screenshot.svg" alt="overlay" style={{ width: "20px", height: "20px", cursor: "pointer" }} onClick={handleClick} title="Screenshot" />
          </div>
        </div>
      }

      {
        error &&
        <div className="error-banner">
          <img src="icons/eyedisabled.svg" alt="" width={50} />
        </div>
      }
    </div>
  );
  
};

export default Stream;







