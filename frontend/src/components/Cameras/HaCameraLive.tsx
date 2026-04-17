import { useEffect, useRef, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import type HlsType from "hls.js";

type CameraStreamResult = { result?: { url?: string } };

/**
 * Live camera tile aligned with Lovelace picture-entity (camera_view: live):
 * uses Home Assistant WebSocket `camera/stream` (HLS), then falls back to MJPEG `camera_proxy_stream`.
 */
export default function HaCameraLive({
  entityId,
  title,
  connection,
}: {
  entityId: string;
  title: string;
  connection: Connection;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [useMjpeg, setUseMjpeg] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHlsUrl(null);
    setUseMjpeg(false);

    (async () => {
      try {
        const res = (await connection.sendMessagePromise({
          type: "camera/stream",
          entity_id: entityId,
          format: "hls",
        } as never)) as CameraStreamResult;
        const raw = res?.result?.url;
        if (cancelled) return;
        if (!raw) {
          setUseMjpeg(true);
          return;
        }
        const absolute = raw.startsWith("http") ? raw : `${window.location.origin}${raw}`;
        setHlsUrl(absolute);
      } catch {
        if (!cancelled) {
          setUseMjpeg(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connection, entityId]);

  useEffect(() => {
    if (!hlsUrl || useMjpeg) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    hlsRef.current?.destroy();
    hlsRef.current = null;

    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled || !videoRef.current) return;
      const el = videoRef.current;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(el);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
            setUseMjpeg(true);
          }
        });
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = hlsUrl;
      } else {
        setUseMjpeg(true);
        return;
      }

      void el.play().catch(() => {});
    })();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, useMjpeg]);

  const origin = window.location.origin;
  const mjpegSrc = `${origin}/api/camera_proxy_stream/${encodeURIComponent(entityId)}`;

  if (useMjpeg) {
    return (
      <iframe
        title={title}
        src={mjpegSrc}
        className="absolute inset-0 h-full w-full border-0 bg-black object-cover"
        allow="autoplay; fullscreen"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-black">
      {!useMjpeg && !hlsUrl && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-gray-400">
          Requesting stream…
        </div>
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        controls={false}
        aria-label={title}
      />
    </div>
  );
}
