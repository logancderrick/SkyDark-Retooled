import { useState, useRef, useCallback } from "react";
import { useAppContext, type LockedFeatureKey } from "../contexts/AppContext";

export interface PinPromptProps {
  open: boolean;
  onClose: () => void;
  onVerify: (pin: string) => boolean;
  title: string;
}

export interface UsePinGateResult {
  /** Runs the action when the feature is not locked; supports async actions (e.g. API calls). */
  runIfUnlocked: (feature: LockedFeatureKey, action: () => void | Promise<void>) => void;
  pinPromptProps: PinPromptProps;
}

export function usePinGate(): UsePinGateResult {
  const { isFeatureLocked, verifyPin } = useAppContext();
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const runIfUnlocked = useCallback(
    (feature: LockedFeatureKey, action: () => void | Promise<void>) => {
      const run = () => {
        void Promise.resolve(action()).catch(() => {
          // Async actions (e.g. create list) should not leave the UI stuck
        });
      };
      if (isFeatureLocked(feature)) {
        pendingActionRef.current = run;
        setShowPinPrompt(true);
      } else {
        run();
      }
    },
    [isFeatureLocked]
  );

  const handleVerify = useCallback(
    (pin: string): boolean => {
      if (!verifyPin(pin)) return false;
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setShowPinPrompt(false);
      try {
        action?.();
      } catch {
        // Prevent a failed sync action from leaving the PIN prompt stuck
      }
      return true;
    },
    [verifyPin]
  );

  const handleClose = useCallback(() => {
    setShowPinPrompt(false);
    pendingActionRef.current = null;
  }, []);

  const pinPromptProps: PinPromptProps = {
    open: showPinPrompt,
    onClose: handleClose,
    onVerify: handleVerify,
    title: "Enter PIN",
  };

  return { runIfUnlocked, pinPromptProps };
}
