/**
 * Wraps the app in a device frame when Developer Mode is on.
 * Uses CSS transform scale() to fit the simulated viewport in the window.
 */

import { type ReactNode, useRef, useState, useEffect } from "react";
import { useViewportSimulator } from "../../contexts/ViewportSimulatorContext";
import { getPresetDimensions } from "../../lib/viewportPresets";

interface SimulatedViewportProps {
  children: ReactNode;
}

function useScaleToFit(
  frameWidth: number,
  frameHeight: number,
  containerRef: React.RefObject<HTMLDivElement | null>
): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (frameWidth <= 0 || frameHeight <= 0) {
      setScale(1);
      return;
    }

    const updateScale = () => {
      const el = containerRef.current;
      if (!el) return;
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      const s = Math.min(availW / frameWidth, availH / frameHeight, 1);
      setScale(Math.max(0.1, s));
    };

    const ro = new ResizeObserver(updateScale);
    const raf = requestAnimationFrame(() => {
      updateScale();
      const el = containerRef.current;
      if (el) ro.observe(el);
    });

    const resizeHandler = () => updateScale();
    window.addEventListener("resize", resizeHandler);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resizeHandler);
    };
  }, [frameWidth, frameHeight]);

  return scale;
}

export default function SimulatedViewport({ children }: SimulatedViewportProps) {
  const {
    developerMode,
    presetId,
    orientation,
    showSafeArea,
    showGrid,
  } = useViewportSimulator();

  const { width: frameWidth, height: frameHeight } = getPresetDimensions(
    presetId,
    orientation
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useScaleToFit(frameWidth, frameHeight, containerRef);
  const safeArea = showSafeArea ? 20 : 0;

  if (!developerMode || frameWidth <= 0 || frameHeight <= 0) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center bg-gray-900 overflow-auto p-4"
      aria-label="Simulated device viewport"
    >
      <div
        className="relative bg-skydark-surface rounded-lg shadow-2xl overflow-hidden flex-shrink-0"
        style={{
          width: frameWidth,
          height: frameHeight,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <div
          className="w-full h-full overflow-auto bg-skydark-bg"
          style={{
            padding: safeArea,
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(59,155,191,0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59,155,191,0.15) 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px",
              padding: safeArea,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              boxSizing: "border-box",
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
