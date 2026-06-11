import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiX } from "react-icons/fi";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
  danger = false,
}) {
  // Fermeture avec Échap
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-sm bg-ink-700 border border-white/10 rounded-2xl shadow-2xl p-6"
          >
            <button
              onClick={onCancel}
              aria-label="Fermer"
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <FiX size={18} />
            </button>

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              danger
                ? "bg-red-500/15 border border-red-500/30"
                : "bg-amber-500/15 border border-amber-500/30"
            }`}>
              <FiAlertTriangle size={22} className={danger ? "text-red-400" : "text-amber-400"} />
            </div>

            <h3 id="confirm-title" className="text-base font-black text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400 mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-semibold text-sm transition-all"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all text-white ${
                  danger
                    ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
