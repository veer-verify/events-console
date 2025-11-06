import { useEffect, useRef, useState } from "react";
import "./Stream.css";

const Stream = ({ streamUrl, screenshot, credentials = "admin:verifai123789" }) => {
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const queuedCandidatesRef = useRef([]);
  const offerDataRef = useRef(null);
  const sessionUrlRef = useRef("");
  const restartTimeoutRef = useRef(null);

  const [showOverlay, setShowOverlay] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [error, setError] = useState(null);

  const encoded = btoa(credentials);

  useEffect(() => {
    let isMounted = true;

    const withLoader = async (fn) => {
      setShowLoader(true);
      try {
        await fn();
      } finally {
        if (isMounted) setShowLoader(false);
      }
    };

    const requestICEServers = async () => {
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

    const linkToIceServers = (links) => {
      const ics = [];
      if (!links) return ics;
      links.split(", ").forEach((link) => {
        const m = link.match(
          /^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i
        );
        if (m) {
          const ice = { urls: [m[1]] };
          if (m[3]) {
            ice.username = JSON.parse(`"${m[3]}"`);
            ice.credential = JSON.parse(`"${m[4]}"`);
          }
          ics.push(ice);
        }
      });
      return ics;
    };

    const createOffer = async (pc) => {
      await withLoader(async () => {
        const offer = await pc.createOffer();
        offerDataRef.current = parseOffer(offer.sdp);
        await pc.setLocalDescription(offer);
        await sendOffer(offer);
      });
    };

    const parseOffer = (sdp) => {
      const ret = { iceUfrag: "", icePwd: "", medias: [] };
      sdp.split("\r\n").forEach((line) => {
        if (line.startsWith("m=")) ret.medias.push(line.slice(2));
        if (line.startsWith("a=ice-ufrag:") && !ret.iceUfrag)
          ret.iceUfrag = line.slice(12);
        if (line.startsWith("a=ice-pwd:") && !ret.icePwd)
          ret.icePwd = line.slice(10);
      });
      return ret;
    };

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

        if (res.status !== 201)
          throw new Error(`Unexpected status ${res.status}`);

        sessionUrlRef.current = new URL(
          res.headers.get("location"),
          streamUrl
        ).toString();

        const sdp = await res.text();
        onRemoteAnswer(sdp);
      });
    };

    const onRemoteAnswer = async (sdp) => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState !== "have-local-offer") return;

      try {
        await pc.setRemoteDescription({ type: "answer", sdp });
        if (queuedCandidatesRef.current.length > 0) {
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
        const res = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/trickle-ice-sdpfrag",
            "If-Match": "*",
          },
          body: generateSdpFragment(offerData, candidates),
        });

        if (res.status !== 204)
          throw new Error(`Unexpected status ${res.status}`);
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
          grouped[i].forEach((c) => (frag += `a=${c.candidate}\r\n`));
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
      setError(null);
      const state = peerConnectionRef.current?.iceConnectionState;
      console.log("ICE State:", state);
      if (restartTimeoutRef.current) return;

      if (state === "disconnected" || state === "failed") {
        onError("Peer connection disconnected. Attempting restart...");
        restartTimeoutRef.current = setTimeout(() => {
          restartTimeoutRef.current = null;
          requestICEServers();
        }, 2000);
      }
    };

    const cleanupSession = async () => {
      if (sessionUrlRef.current) {
        try {
          await fetch(sessionUrlRef.current, { method: "DELETE" });
        } catch (err) {
          console.warn("Session cleanup failed:", err);
        }
      }
      sessionUrlRef.current = "";
      queuedCandidatesRef.current = [];
    };

    const onError = (err) => {
      console.error("WebRTC Error:", err);
      setError(err);
      peerConnectionRef.current?.close();
      cleanupSession();
    };

    // Start stream connection
    requestICEServers();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      peerConnectionRef.current?.close();
      cleanupSession();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [encoded, streamUrl]);

  // Screenshot capture
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
      {error && <div className="error-banner"><img src="icons/eyedisabled.svg" alt="" width={50} /></div>}

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
          <img
            src="icons/screenshot.svg"
            alt="overlay"
            style={{ width: "20px", height: "20px", cursor: "pointer" }}
            onClick={handleClick}
            title="Screenshot"
          />
        </div>
      )}
    </div>
  );
};

export default Stream;
