import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUsers, FiZap, FiBell, FiX } from "react-icons/fi";

const ICONS = {
  friend_request: <FiUsers size={16} className="text-indigo-400" />,
  challenge:      <FiZap   size={16} className="text-pink-400" />,
  info:           <FiBell  size={16} className="text-gray-400" />,
};

const COLORS = {
  friend_request: "border-indigo-500/40 bg-indigo-500/10",
  challenge:      "border-pink-500/40 bg-pink-500/10",
  info:           "border-white/10 bg-white/5",
};

let _nextId = 0;

export default function NotificationToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((detail) => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, ...detail }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const handler = (e) => addToast(e.detail);
    window.addEventListener("boileau:notify", handler);
    return () => window.removeEventListener("boileau:notify", handler);
  }, [addToast]);

  return (
    <div className="fixed right-4 left-4 sm:left-auto sm:right-6 z-[200] flex flex-col gap-3 pointer-events-none
                    bottom-[calc(var(--mobile-nav-h)+var(--safe-bottom)+1rem)] md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.92 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl w-full sm:max-w-xs ${COLORS[t.type] || COLORS.info}`}
          >
            <div className="flex-shrink-0 mt-0.5">{ICONS[t.type] || ICONS.info}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{t.title}</p>
              {t.body && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{t.body}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors mt-0.5"
            >
              <FiX size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
