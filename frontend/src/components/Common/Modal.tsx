import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ModalVariant = "center" | "slideRight";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "slideRight" = panel slides in from the right (Skydark-style). Default "center". */
  variant?: ModalVariant;
  /** Optional action (e.g. Edit icon) shown in the header next to the title. */
  rightAction?: ReactNode;
}

export default function Modal({ open, onClose, title, children, variant = "center", rightAction }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const isSlideRight = variant === "slideRight";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
            aria-hidden
          />
          <div
            className={
              isSlideRight
                ? "fixed inset-0 z-50 flex justify-end pointer-events-none"
                : "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            }
          >
            <motion.div
              initial={isSlideRight ? { x: "100%" } : { opacity: 0, scale: 0.95 }}
              animate={isSlideRight ? { x: 0 } : { opacity: 1, scale: 1 }}
              exit={isSlideRight ? { x: "100%" } : { opacity: 0, scale: 0.95 }}
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
              className={
                isSlideRight
                  ? "bg-skydark-surface w-full max-w-md sm:max-w-lg flex flex-col h-full overflow-hidden pointer-events-auto rounded-l-2xl shadow-skydark-modal"
                  : "bg-skydark-surface rounded-modal shadow-skydark-modal max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
              }
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 border-b border-skydark-border shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 -ml-2 rounded-lg hover:bg-skydark-surface-muted text-skydark-text-secondary"
                  aria-label="Back"
                >
                  ←
                </button>
                <h2 id="modal-title" className="text-lg font-semibold text-skydark-text text-center min-w-0">
                  {title}
                </h2>
                <div className="w-10 flex justify-end">{rightAction ?? null}</div>
              </div>
              <div className="p-4 overflow-auto flex-1">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
