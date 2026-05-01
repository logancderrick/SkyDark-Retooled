import { useEffect, useRef, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import type HlsType from "hls.js";
import { getHassAccessToken } from "../../lib/haAuth";
import { buildCameraProxyStreamUrl } from "../../lib/haCameraAuth";
import {
  cameraSupportsWebRtc,
  fetchCameraCapabilities,
} from "../../lib/haCameraWebRtc";
import HaCameraWebRtc from "./HaCameraWebRtc";

const IO_ROOT_MARGIN = "72px";

type CameraStreamResult = { url?: string; result?: { url?: string } };

/**
 * Live camera tile aligned with Lovelace `camera_view: live`:
 * prefers Home Assistant WebRTC when supported (smooth, low latency), then `camera/stream` HLS,
 * then MJPEG `camera_proxy_stream`.
 */
export default function HaCameraLive({
  entityId,
  title,
  connection,
  entityPicture,
  compact = false,
  aspectRatio = 16 / 9,
}: {
  entityId: string;
  title: string;
  connection: Connection;
  entityPicture?: string | null;
  compact?: boolean;
  aspectRatio?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const inViewRef = useRef(true);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [useMjpeg, setUseMjpeg] = useState(false);
  const [inView, setInView] = useState(true);
  /** null = capabilities not loaded yet */
  const [webrtcEligible, setWebrtcEligible] = useState<boolean | null>(null);
  const [webrtcFailed, setWebrtcFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWebrtcEligible(null);
    setWebrtcFailed(false);
    setHlsUrl(null);
    setUseMjpeg(false);

    void (async () => {
      try {
        const cap = await fetchCameraCapabilities(connection, entityId);
        if (cancelled) return;
        setWebrtcEligible(cameraSupportsWebRtc(cap));
      } catch {
        if (!cancelled) setWebrtcEligible(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connection, entityId]);

  const skipHlsFetch =
    webrtcEligible === null || (webrtcEligible === true && !webrtcFailed);

  useEffect(() => {
    if (skipHlsFetch || useMjpeg) return;

    let cancelled = false;
    setHlsUrl(null);

    void (async () => {
      try {
        const res = (await connection.sendMessagePromise({
          type: "camera/stream",
          entity_id: entityId,
          format: "hls",
        } as never)) as CameraStreamResult;
        const raw = res?.result?.url ?? res?.url;
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
  }, [connection, entityId, skipHlsFetch, useMjpeg]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const vis = e?.isIntersecting ?? true;
        inViewRef.current = vis;
        setInView(vis);
      },
      { root: null, rootMargin: IO_ROOT_MARGIN, threshold: 0.02 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (useMjpeg || skipHlsFetch) return;
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video || !hlsUrl) return;
    if (!inView) {
      video.pause();
      hls?.stopLoad();
      return;
    }
    hls?.startLoad(-1);
    void video.play().catch(() => {});
  }, [inView, useMjpeg, hlsUrl, skipHlsFetch]);

  useEffect(() => {
    if (!hlsUrl || useMjpeg || skipHlsFetch) return;
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
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 90,
          liveSyncDuration: 5,
          liveMaxLatencyDuration: 20,
          maxLiveSyncPlaybackRate: 1,
          abrEwmaDefaultEstimate: 2_000_000,
          xhrSetup(xhr) {
            if (bearer) xhr.setRequestHeader("Authorization", `Bearer ${bearer}`);
          },
        });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(el);
        if (!inViewRef.current) {
          el.pause();
          hls.stopLoad();
        }
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

      if (inViewRef.current) {
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    })();

    return () => {
      cancelled = true;
      detachFns.forEach((fn) => fn());
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, useMjpeg, connection, skipHlsFetch]);

  const usingWebRtc = webrtcEligible === true && !webrtcFailed;
  const showSpinner =
    !useMjpeg &&
    (webrtcEligible === null || (!(webrtcEligible === true && !webrtcFailed) && !hlsUrl));

  const mjpegSrc = buildCameraProxyStreamUrl(entityId, connection, entityPicture);

  const shellClass = compact
    ? "relative h-full min-h-0 w-full overflow-hidden bg-black"
    : `relative w-full overflow-hidden ${showSpinner ? "min-h-[200px]" : ""}`;

  return (
    <div ref={containerRef} className={shellClass} style={compact ? undefined : { aspectRatio }}>
      {useMjpeg ? (
        compact ? (
          <iframe
            title={title}
            src={inView ? mjpegSrc : "about:blank"}
            className="absolute inset-0 z-0 h-full w-full border-0 bg-black"
            allow="autoplay; fullscreen"
          />
        ) : (
          <img
            src={inView ? mjpegSrc : undefined}
            alt={title}
            className="absolute inset-0 block h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        )
      ) : (
        <>
          {showSpinner && (
            <div
              className={
                compact
                  ? "absolute inset-0 z-10 flex items-center justify-center text-xs text-skydark-text-secondary opacity-70"
                  : "absolute inset-0 z-10 flex items-center justify-center text-sm text-skydark-text-secondary opacity-70"
              }
            >
              Requesting stream…
            </div>
          )}
          {usingWebRtc ? (
            <HaCameraWebRtc
              entityId={entityId}
              connection={connection}
              title={title}
              active={inView}
              muted
              compact={compact}
              onFatalError={() => setWebrtcFailed(true)}
            />
          ) : (
            <video
              ref={videoRef}
              className={
                compact
                  ? "absolute inset-0 z-0 h-full w-full object-cover bg-black [transform:translateZ(0)]"
                  : "absolute inset-0 block h-full w-full object-contain [transform:translateZ(0)]"
              }
              playsInline
              muted
              autoPlay
              controls={false}
              aria-label={title}
            />
          )}
        </>
      )}
    </div>
  );
}
