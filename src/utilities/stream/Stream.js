import { useEffect, useRef, useState } from "react";
import "./Stream.css";

const Stream = ({ streamUrl, screenshot, credentials = "admin:verifai123789",currentCamera }) => {
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const queuedCandidatesRef = useRef([]);
  const offerDataRef = useRef(null);

  const sessionUrlRef = useRef("");                 // current session URL
  const lastValidSessionUrlRef = useRef("");        // used for safe cleanup
  const restartTimeoutRef = useRef(null);
  const keepaliveIntervalRef = useRef(null);
  const watchdogIntervalRef = useRef(null);

  const [showOverlay, setShowOverlay] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [error, setError] = useState(null);

  const encoded = btoa(credentials);

  useEffect(() => {
    let isMounted = true;

    // ------------------------------------
    // GENERIC LOADER
    // ------------------------------------
    const withLoader = async (fn) => {
      setShowLoader(true);
      try {
        await fn();
      } finally {
        if (isMounted) setShowLoader(false);
      }
    };

    // ------------------------------------
    // SAFE DELETE (404 OK)
    // ------------------------------------
    const safeDelete = async (url) => {
      if (!url) return;
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (res.status === 404) return true;
        if (!res.ok) console.warn("DELETE returned:", res.status);
        return res.ok;
      } catch (err) {
        console.warn("DELETE error:", err);
        return false;
      }
    };

    // ------------------------------------
    // CLEANUP SESSION (SYNCHRONOUS)
    // ------------------------------------
    const cleanupSession = () => {
      console.log("Running cleanup…");

      // 1. Clear all intervals/timeouts immediately
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current);
        keepaliveIntervalRef.current = null;
      }
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      const sessionUrl = lastValidSessionUrlRef.current;
      lastValidSessionUrlRef.current = "";
      sessionUrlRef.current = "";

      queuedCandidatesRef.current = [];

      // 2. DELETE session asynchronously (won't block unmount)
      if (sessionUrl) {
        setTimeout(() => {
          safeDelete(sessionUrl).catch(() =>
            console.warn("DELETE failed during cleanup:", sessionUrl)
          );
        }, 0);
      }
    };

    // ------------------------------------
    // ERROR HANDLER
    // ------------------------------------
    const onError = (err) => {
      console.error("WebRTC Error:", err);
      setError(err);
      peerConnectionRef.current?.close();
      cleanupSession();
    };

    // ------------------------------------
    // REQUEST ICE SERVERS
    // ------------------------------------
    const requestICEServers = async () => {
      setError(null);
      try {
        const res = await fetch(`${streamUrl}whep`, {
          method: "OPTIONS",
          headers: { Authorization: `Basic ${encoded}` },
        });

        const linkHeader = res.headers.get("Link");
        const iceServers = linkToIceServers(linkHeader);

        const pc = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = pc;

        pc.addTransceiver("video", { direction: "sendrecv" });
        pc.addTransceiver("audio", { direction: "sendrecv" });

        pc.onicecandidate = onLocalCandidate;
        pc.oniceconnectionstatechange = onConnectionState;
        pc.ontrack = onTrack;

        await createOffer(pc);
      } catch (err) {
        onError(err.toString());
      }
    };

    // ------------------------------------
    // LINK HEADER → ICE SERVERS
    // ------------------------------------
    const linkToIceServers = (links) => {
      const arr = [];
      if (!links) return arr;

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
          arr.push(server);
        }
      });

      return arr;
    };

    // ------------------------------------
    // CREATE OFFER
    // ------------------------------------
    const createOffer = async (pc) => {
      await withLoader(async () => {
        const offer = await pc.createOffer();
        offerDataRef.current = parseOffer(offer.sdp);
        await pc.setLocalDescription(offer);
        await sendOffer(offer);
      });
    };

    const parseOffer = (sdp) => {
      const o = { iceUfrag: "", icePwd: "", medias: [] };
      sdp.split("\r\n").forEach((line) => {
        if (line.startsWith("m=")) o.medias.push(line.slice(2));
        if (line.startsWith("a=ice-ufrag:") && !o.iceUfrag) o.iceUfrag = line.slice(12);
        if (line.startsWith("a=ice-pwd:") && !o.icePwd) o.icePwd = line.slice(10);
      });
      return o;
    };

    // ------------------------------------
    // SEND OFFER
    // ------------------------------------
    const sendOffer = async (offer) => {
      await withLoader(async () => {
        const res = await fetch(`${streamUrl}whep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            Authorization: `Basic ${encoded}`,
          },
          body: offer.sdp,
        });

        const loc = res.headers.get("location");
        const finalUrl = buildSessionUrl(loc);

        sessionUrlRef.current = finalUrl;
        lastValidSessionUrlRef.current = finalUrl;

        const sdp = await res.text();
        onRemoteAnswer(sdp);

        startKeepalive();
        startWatchdog();
      });
    };

    const buildSessionUrl = (location) => {
      const base = new URL(streamUrl);
      if (!location) return "";
      if (location.startsWith("http")) return location;
      if (location.startsWith("/")) return `${base.origin}${location}`;
      return `${base.origin}/${location}`;
    };

    const onRemoteAnswer = async (sdp) => {
      setError(null);
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState !== "have-local-offer") return;
      try {
        await pc.setRemoteDescription({ type: "answer", sdp });
        if (queuedCandidatesRef.current.length) {
          await sendLocalCandidates(queuedCandidatesRef.current);
          queuedCandidatesRef.current = [];
        }
      } catch (err) {
        onError(err.toString());
      }
    };

    const onLocalCandidate = (evt) => {
      if (!evt.candidate || restartTimeoutRef.current) return;
      if (!sessionUrlRef.current) {
        queuedCandidatesRef.current.push(evt.candidate);
      } else {
        sendLocalCandidates([evt.candidate]);
      }
    };

    const sendLocalCandidates = async (candidates) => {
      const url = sessionUrlRef.current;
      const offerData = offerDataRef.current;
      await withLoader(async () => {
        await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/trickle-ice-sdpfrag",
            "If-Match": "*",
          },
          body: generateSdpFragment(offerData, candidates),
        });
      });
    };

    const generateSdpFragment = (od, candidates) => {
      const grouped = {};
      candidates.forEach((c) => {
        const mid = c.sdpMLineIndex;
        if (!grouped[mid]) grouped[mid] = [];
        grouped[mid].push(c);
      });

      let frag = `a=ice-ufrag:${od.iceUfrag}\r\na=ice-pwd:${od.icePwd}\r\n`;
      od.medias.forEach((media, i) => {
        if (grouped[i]) {
          frag += `m=${media}\r\na=mid:${i}\r\n`;
          grouped[i].forEach((c) => (frag += `a=${c.candidate}\r\n`));
        }
      });
      return frag;
    };

    const onTrack = (evt) => {
      if (videoRef.current) videoRef.current.srcObject = evt.streams[0];
    };

    const onConnectionState = () => {
      setError(null);
      const state = peerConnectionRef.current?.iceConnectionState;
      console.log("ICE State:", state);
      if (restartTimeoutRef.current) return;
      if (state === "disconnected" || state === "failed") {
        onError("Peer connection lost. Restarting…");
        restartTimeoutRef.current = setTimeout(() => {
          restartTimeoutRef.current = null;
          restartStream();
        }, 2000);
      }
    };

    const restartStream = async () => {
      console.warn("Restarting WebRTC stream…");
      cleanupSession();
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      requestICEServers();
    };

    const startKeepalive = () => {
      if (keepaliveIntervalRef.current) clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = setInterval(() => {
        if (sessionUrlRef.current) {
          fetch(sessionUrlRef.current, {
            method: "PATCH",
            headers: { "Content-Type": "application/trickle-ice-sdpfrag", "If-Match": "*" },
            body: "",
          }).catch(() => {});
        }
      }, 15000);
    };

    const startWatchdog = () => {
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = setInterval(() => {
        console.log("Watchdog: restarting stream…");
        restartStream();
      }, 5 * 60 * 1000);
    };

    // START STREAM
    requestICEServers();

    // CLEANUP ON UNMOUNT / LOGOUT
    return () => {
      isMounted = false;
      peerConnectionRef.current?.close();
      cleanupSession();
    };
  }, [encoded, streamUrl]);

  // -------------------------------
  // SCREENSHOT
  // -------------------------------
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

  return (
    <div
      style={{ position: "relative", height: "100%" }}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
      {showLoader && <div className="loader"></div>}
      {error && (
        <div className="error-banner">
          <img src="icons/eyedisabled.svg" alt="" width={50} />
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        width="100%"
        height="100%"
        style={{ objectFit: "fill" }}
      />

      {showOverlay && screenshot && (
        <div className="hover-overlay">

        <div className="displayicon">

        <p style={{color:"white"}}>{currentCamera?.cameraId}</p>
          <img
            src="icons/screenshot.svg"
            alt="overlay"
            style={{ width: "20px", height: "20px", cursor: "pointer" }}
            onClick={handleClick}
            title="Screenshot"
          />
        </div>
        </div>
      )}
    </div>
  );
};

export default Stream;
