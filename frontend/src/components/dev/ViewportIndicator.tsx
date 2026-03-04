/**
 * Small badge showing current simulated viewport when Developer Mode is on.
 */

import { useViewportSimulator } from "../../contexts/ViewportSimulatorContext";
import { getPresetDimensions } from "../../lib/viewportPresets";

export default function ViewportIndicator() {
  const { developerMode, presetId, orientation } = useViewportSimulator();

  if (!developerMode) return null;

  const { width, height } = getPresetDimensions(presetId, orientation);

  return (
    <div
      className="fixed bottom-2 right-2 z-[9999] px-2 py-1 rounded bg-gray-800 text-white text-xs font-mono shadow-lg"
      aria-live="polite"
    >
      Simulated: {width}×{height}
    </div>
  );
}
