import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiShield } from "react-icons/fi";
import { useIsDesktop } from "../../hooks/useMedia";
import { NAV_ITEMS } from "./navItems";

export default function Sidebar({ open, onClose }) {
  const isDesktop = useIsDesktop();
  const visible = isDesktop || open;

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
      isActive ? "text-indigo-300 bg-indigo-500/15 border border-indigo-500/40" : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
    }`;

  return (
    <>
      <AnimatePresence>
        {!isDesktop && visible && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ x: visible ? 0 : -288 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed md:static top-0 bottom-0 left-0 w-64 max-w-[86vw] h-[100dvh] glass-panel
                   flex flex-col z-50 select-none overflow-hidden safe-top shrink-0"
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
                <FiShield size={18} className="text-white" />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-black tracking-tighter text-gradient">BOILEAU</h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Admin</p>
              </div>
            </div>
            {!isDesktop && (
              <button onClick={onClose} aria-label="Fermer" className="p-2 -mr-1 rounded-xl hover:bg-white/10 transition">
                <FiX size={20} />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => !isDesktop && onClose()} className={linkClass}>
                <Icon size={19} className="shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-6 text-[10px] text-gray-600 shrink-0">
            Console d'administration · v1.0
          </div>
        </div>
      </motion.aside>
    </>
  );
}
