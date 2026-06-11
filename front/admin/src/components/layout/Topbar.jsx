import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiLogOut, FiUser, FiChevronDown } from "react-icons/fi";
import { useAuth } from "../../AuthContext";

export default function Topbar({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const name = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Admin";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="safe-top relative z-50 h-16 md:h-20 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 sm:px-6 md:px-8 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} aria-label="Menu" className="md:hidden p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition">
          <FiMenu size={20} />
        </button>
        <span className="md:hidden text-base font-black tracking-tighter text-gradient">BOILEAU Admin</span>
      </div>

      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 group">
          <div className="text-right hidden sm:block leading-tight">
            <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{name}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {user?.is_superuser ? "Superadmin" : "Staff"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-gradient p-0.5 shadow-glow group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-[10px] bg-ink-800 flex items-center justify-center">
              <span className="text-xs font-black text-white tracking-widest">{initials}</span>
            </div>
          </div>
          <FiChevronDown size={14} className={`text-gray-500 hidden sm:block transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-3 w-56 bg-ink-700 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email || ""}</p>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-500">
                  <FiUser size={14} /> Connecté en tant qu'administrateur
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-left"
                >
                  <FiLogOut size={15} /> Se déconnecter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
