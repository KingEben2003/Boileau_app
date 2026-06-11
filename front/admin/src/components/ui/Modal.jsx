import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import Spinner from "./Spinner";

export default function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`relative w-full ${maxWidth} bg-ink-700 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col`}
          >
            <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white truncate">{title}</h2>
              <button onClick={onClose} aria-label="Fermer" className="p-2 -mr-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition">
                <FiX size={20} />
              </button>
            </div>
            <div className="px-5 sm:px-6 py-5 overflow-y-auto custom-scrollbar">{children}</div>
            {footer && <div className="px-5 sm:px-6 py-4 border-t border-white/10 flex flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmer", danger = true, loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Annuler</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`btn-primary ${danger ? "!bg-red-600 hover:!bg-red-500 !shadow-red-500/25" : ""}`}
          >
            {loading ? <Spinner size={16} className="!border-white/40 !border-t-white" /> : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
    </Modal>
  );
}
