import { useEffect, useRef, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import type HlsType from "hls.js";
import { getHassAccessToken } from "../../lib/haAuth";
import { buildCameraProxyStreamUrl } from "../../lib/haCameraAuth";

type CameraStreamResult = { result?: { url?: string } };

/**
 * Live camera tile aligned with Lovelace picture-entity (camera_view: live):
 * uses Home Assistant WebSocket `camera/stream` (HLS), then falls back to MJPEG `camera_proxy_stream`.
 */
export default function HaCameraLive({
  entityId,
  title,
  connection,
  entityPicture,
}: {
  entityId: string;
  title: string;
  connection: Connection;
  /** From camera state `attributes.entity_picture` — carries HA stream auth token for iframe/proxy. */
  entityPicture?: string | null;
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
    const detachFns: Array<() => void> = [];
    hlsRef.current?.destroy();
    hlsRef.current = null;

    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled || !videoRef.current) return;
      const el = videoRef.current;

      if (Hls.isSupported()) {
        const bearer = getHassAccessToken(connection);
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          xhrSetup(xhr) {
            if (bearer) xhr.setRequestHeader("Authorization", `Bearer ${bearer}`);
          },
        });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(el);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
            if (!cancelled) setUseMjpeg(true);
          }
        });
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        const onNativeError = () => {
          if (!cancelled) setUseMjpeg(true);
        };
        el.addEventListener("error", onNativeError);
        detachFns.push(() => el.removeEventListener("error", onNativeError));
        el.src = hlsUrl;
      } else {
        if (!cancelled) setUseMjpeg(true);
        return;
      }

      void el.play().catch(() => {});
    })();

    return () => {
      cancelled = true;
      detachFns.forEach((fn) => fn());
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, useMjpeg, connection]);

  const mjpegSrc = buildCameraProxyStreamUrl(entityId, connection, entityPicture);

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
