import './Stream.css';
import { memo, useEffect, useRef, useState } from "react";

const Stream = ({ streamUrl, screenshot, currentCamera, getCamera }) => {
  const videoRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const sessionUrlRef = useRef("");
  const queuedCandidatesRef = useRef([]);
  const offerDataRef = useRef(null);
  const [error, setError] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [encoded, setEncoded] = useState("");


  useEffect(() => {
    const username = "admin";
    const password = "verifai123789";
    setEncoded(btoa(`${username}:${password}`));
  }, []);

  useEffect(() => {
    if (!encoded || !streamUrl) return;

    let cancelled = false;
    const abortController = new AbortController();
    sessionUrlRef.current = "";
    queuedCandidatesRef.current = [];
    offerDataRef.current = null;

    const requestICEServers = () => {
      setShowLoader(true);
      setError(null);

      fetch(streamUrl + "whep", {
        method: "OPTIONS",
        signal: abortController.signal,
        headers: {
          Authorization: `Basic ${encoded}`,
        },
      })
        .then((res) => {
          if (cancelled) return;
          setShowLoader(false);

          const pc = new RTCPeerConnection({
            iceServers: linkToIceServers(res.headers.get("Link")),
          });

          peerConnectionRef.current = pc;

          pc.addTransceiver("video", { direction: "sendrecv" });
          pc.addTransceiver("audio", { direction: "sendrecv" });

          pc.onicecandidate = (evt) => onLocalCandidate(evt, pc);
          pc.oniceconnectionstatechange = () => onConnectionState(pc);
          pc.ontrack = (evt) => onTrack(evt, pc);

          createOffer(pc);
        })
        .catch((err) => {
          if (cancelled || err.name === "AbortError") return;
          setShowLoader(false);
          // clearInterval(restartTimeoutRef.current);
          // setError(err);

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
      if (cancelled) return;
      // if (restartTimeoutRef.current) return;

      peerConnectionRef.current?.close();

      // restartTimeoutRef.current = setTimeout(() => {
      //   restartTimeoutRef.current = null;
      //   requestICEServers();
      // }, 2000);

      if (sessionUrlRef.current) {
        fetch(sessionUrlRef.current, { method: "DELETE" }).catch((err) => console.log(err));
      }

      sessionUrlRef.current = "";
      queuedCandidatesRef.current = [];
    };

    const onLocalCandidate = (evt, pc) => {
      // if (restartTimeoutRef.current) return;

      if (cancelled || peerConnectionRef.current !== pc) return;

      if (evt.candidate) {
        if (!sessionUrlRef.current) {
          queuedCandidatesRef.current.push(evt.candidate);
        } else {
          sendLocalCandidates([evt.candidate], pc);
        }
      }
    };

    const onConnectionState = (pc) => {
      // if (!pc || restartTimeoutRef.current) return;

      if (cancelled || peerConnectionRef.current !== pc) return;

      if (pc.iceConnectionState === "disconnected") {
        onError();
      }
    };

    const onTrack = (evt, pc) => {
      if (cancelled || peerConnectionRef.current !== pc) return;

      if (videoRef.current) {
        videoRef.current.srcObject = evt.streams[0];

      }
    };

    const createOffer = async (pc) => {
      try {
        setShowLoader(true);
        if (cancelled || peerConnectionRef.current !== pc || pc.signalingState === "closed") return;

        const offer = await pc.createOffer();
        if (cancelled || peerConnectionRef.current !== pc || pc.signalingState === "closed") return;

        editOffer(offer);
        offerDataRef.current = parseOffer(offer.sdp);

        await pc.setLocalDescription(offer);
        if (cancelled || peerConnectionRef.current !== pc || pc.signalingState !== "have-local-offer") return;

        sendOffer(offer, pc);
      } catch (err) {
        if (!cancelled) {
          setShowLoader(false);
          onError(err);
        }
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

    const sendOffer = async (offer, pc) => {
      try {
        const res = await fetch(streamUrl + "whep", {
          method: "POST",
          signal: abortController.signal,
          headers: {
            "Content-Type": "application/sdp",
            Authorization: `Basic ${encoded}`,
          },
          body: offer.sdp,
        });

        if (cancelled || peerConnectionRef.current !== pc) return;
        if (res.status !== 201) throw new Error();

        sessionUrlRef.current = new URL(
          res.headers.get("location"),
          streamUrl
        ).toString();

        const sdp = await res.text();
        await onRemoteAnswer(sdp, pc);
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") {
          onError(err);
        }
      } finally {
        if (!cancelled) setShowLoader(false);
      }
    };

    const onRemoteAnswer = async (sdp, pc) => {
      if (
        cancelled ||
        !pc ||
        peerConnectionRef.current !== pc ||
        pc.signalingState !== "have-local-offer"
      ) {
        return;
      }

      try {
        await pc.setRemoteDescription({ type: "answer", sdp });
      } catch (err) {
        if (!cancelled) onError(err);
        return;
      }

      if (queuedCandidatesRef.current.length) {
        sendLocalCandidates(queuedCandidatesRef.current, pc);
        queuedCandidatesRef.current = [];
      }
    };

    const sendLocalCandidates = (candidates, pc) => {
      if (
        cancelled ||
        peerConnectionRef.current !== pc ||
        !sessionUrlRef.current ||
        !offerDataRef.current
      ) {
        return;
      }

      fetch(sessionUrlRef.current, {
        method: "PATCH",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/trickle-ice-sdpfrag",
          "If-Match": "*",
        },
        body: generateSdpFragment(offerDataRef.current, candidates),
      }).catch((err) => {
        if (!cancelled && err.name !== "AbortError") onError(err);
      });
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

    requestICEServers();

    return () => {
      cancelled = true;
      abortController.abort();
      // clearTimeout(restartTimeoutRef.current);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [encoded, streamUrl]);

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
      style={screenshot ==='live' ? { height: '250px' } : { height: '350px' }}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      onDoubleClick={(e) => screenshot && max(e)}
    >
      <video ref={videoRef} autoPlay playsInline muted controls={false} />

      {
        showLoader && <div className="loader"></div>
      }



      {
        showOverlay && screenshot==='live' &&
        <div className="hover-overlay">
          <div className="display-icon">
            <p>{currentCamera?.cameraId}</p>

            <div>
                <img src="icons/play-back.png" alt="overlay"
                  style={{ width: "20px", height: "20px", cursor: "pointer", rotate: '180deg', marginRight: '4px' }}
                  onClick={() => getCamera(currentCamera)} title="Playback" />
              <img src="icons/screenshot.svg" alt="overlay"
                style={{ width: "20px", height: "20px", cursor: "pointer", }}
                onClick={handleClick} title="Screenshot" />
             
          
            </div>
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

export default memo(Stream);



