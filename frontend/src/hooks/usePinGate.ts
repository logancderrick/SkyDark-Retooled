import { useState, useRef, useCallback } from "react";
import { useAppContext, type LockedFeatureKey } from "../contexts/AppContext";

export interface PinPromptProps {
  open: boolean;
  onClose: () => void;
  onVerify: (pin: string) => boolean;
  title: string;
}

export interface UsePinGateResult {
  runIfUnlocked: (feature: LockedFeatureKey, action: () => void) => void;
  pinPromptProps: PinPromptProps;
}

export function usePinGate(): UsePinGateResult {
  const { isFeatureLocked, verifyPin } = useAppContext();
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const runIfUnlocked = useCallback(
    (feature: LockedFeatureKey, action: () => void) => {
      if (isFeatureLocked(feature)) {
        pendingActionRef.current = action;
        setShowPinPrompt(true);
      } else {
        action();
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
        // Prevent a failed action from leaving the PIN prompt stuck
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
