import { useEffect, useRef } from "react";
import type { Connection } from "home-assistant-js-websocket";
import {
  addWebRtcCandidate,
  fetchWebRtcClientConfiguration,
  type WebRtcOfferEvent,
  webRtcOffer,
} from "../../lib/haCameraWebRtc";

/**
 * Low-latency live camera via HA WebRTC signaling (go2rtc / native providers).
 * Negotiation mirrors `ha-web-rtc-player`; parent handles HLS/MJPEG fallback.
 */
export default function HaCameraWebRtc({
  entityId,
  connection,
  title,
  active,
  muted,
  compact,
  onFatalError,
}: {
  entityId: string;
  connection: Connection;
  title: string;
  active: boolean;
  muted: boolean;
  compact: boolean;
  onFatalError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFatalErrorRef = useRef(onFatalError);
  onFatalErrorRef.current = onFatalError;

  useEffect(() => {
    if (!active) {
      return;
    }
    if (typeof RTCPeerConnection === "undefined") {
      onFatalErrorRef.current();
      return;
    }

    let cancelled = false;
    const peerRef: { pc: RTCPeerConnection | null } = { pc: null };
    const remoteStreamRef: { stream: MediaStream | null } = { stream: null };
    let unsubPromise: Promise<() => Promise<void>> | null = null;
    let sessionId: string | undefined;
    /** Local ICE before `session`; first batch is merged into the offer SDP (like HA frontend). */
    const localIceQueue: RTCIceCandidate[] = [];
    let wsOfferStarted = false;

    const cleanup = () => {
      wsOfferStarted = false;
      try {
        void unsubPromise?.then((unsub) => unsub());
      } catch {
        // ignore
      }
      unsubPromise = null;
      sessionId = undefined;
      localIceQueue.length = 0;

      if (remoteStreamRef.stream) {
        remoteStreamRef.stream.getTracks().forEach((t) => t.stop());
        remoteStreamRef.stream = null;
      }
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.removeAttribute("src");
        videoEl.srcObject = null;
        videoEl.load();
      }
      if (peerRef.pc) {
        peerRef.pc.close();
        peerRef.pc.onnegotiationneeded = null;
        peerRef.pc.onicecandidate = null;
        peerRef.pc.oniceconnectionstatechange = null;
        peerRef.pc.ontrack = null;
        peerRef.pc = null;
      }
    };

    const handleOfferEvent = async (event: WebRtcOfferEvent) => {
      if (cancelled || !peerRef.pc) return;

      if (event.type === "session") {
        sessionId = event.session_id;
        while (localIceQueue.length) {
          const c = localIceQueue.pop();
          if (c) {
            try {
              await addWebRtcCandidate(connection, entityId, event.session_id, c.toJSON());
            } catch {
              // non-fatal
            }
          }
        }
      }

      if (event.type === "answer") {
        const pc = peerRef.pc;
        if (!pc?.signalingState || ["stable", "closed"].includes(pc.signalingState)) {
          return;
        }
        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: event.answer }),
          );
        } catch {
          onFatalErrorRef.current();
          cleanup();
        }
      }

      if (event.type === "candidate") {
        try {
          const cand =
            event.candidate.sdpMid || event.candidate.sdpMLineIndex != null
              ? new RTCIceCandidate(event.candidate)
              : new RTCIceCandidate({
                  candidate: event.candidate.candidate,
                  sdpMid: "0",
                });
          await peerRef.pc?.addIceCandidate(cand);
        } catch {
          // ICE add can race; ignore
        }
      }

      if (event.type === "error") {
        onFatalErrorRef.current();
        cleanup();
      }
    };

    const startNegotiation = async () => {
      const pc = peerRef.pc;
      if (!pc || cancelled || wsOfferStarted) return;
      wsOfferStarted = true;

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        if (!peerRef.pc || cancelled) return;

        await pc.setLocalDescription(offer);
        if (!peerRef.pc || cancelled) return;

        let sdpExtra = "";
        while (localIceQueue.length) {
          const c = localIceQueue.pop();
          if (c?.candidate) {
            sdpExtra += `a=${c.candidate}\r\n`;
          }
        }
        const offerSdp = `${offer.sdp!}${sdpExtra}`;

        unsubPromise = webRtcOffer(connection, entityId, offerSdp, (ev) => {
          void handleOfferEvent(ev);
        });
      } catch {
        onFatalErrorRef.current();
        cleanup();
      }
    };

    void (async () => {
      try {
        const client = await fetchWebRtcClientConfiguration(connection, entityId);
        if (cancelled) return;

        const pc = new RTCPeerConnection(client.configuration);
        peerRef.pc = pc;

        if (client.dataChannel) {
          pc.createDataChannel(client.dataChannel);
        }

        pc.onnegotiationneeded = () => {
          void startNegotiation();
        };

        pc.onicecandidate = (ev) => {
          if (!ev.candidate?.candidate) return;
          if (sessionId) {
            void addWebRtcCandidate(connection, entityId, sessionId, ev.candidate.toJSON());
          } else {
            localIceQueue.push(ev.candidate);
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed") {
            pc.restartIce();
          }
        };

        remoteStreamRef.stream = new MediaStream();
        const stream = remoteStreamRef.stream;

        pc.ontrack = (ev) => {
          if (ev.track.kind === "audio" && muted) return;
          stream.addTrack(ev.track);
          const videoEl = videoRef.current;
          if (videoEl) {
            videoEl.srcObject = stream;
            void videoEl.play().catch(() => {});
          }
        };

        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.addTransceiver("video", { direction: "recvonly" });
      } catch {
        if (!cancelled) onFatalErrorRef.current();
        cleanup();
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active, entityId, connection, muted]);

  const videoClass = compact
    ? "absolute inset-0 z-0 h-full w-full object-cover bg-black [transform:translateZ(0)]"
    : "absolute inset-0 block h-full w-full object-contain [transform:translateZ(0)]";

  return (
    <video
      ref={videoRef}
      className={videoClass}
      playsInline
      muted={muted}
      autoPlay
      controls={false}
      aria-label={title}
    />
  );
}
