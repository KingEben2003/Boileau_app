import { motion } from "framer-motion";
import { staggerItem } from "../../lib/motion";

const ACCENTS = {
  indigo: { glow: "from-indigo-500/15", icon: "text-indigo-300" },
  pink: { glow: "from-pink-500/15", icon: "text-pink-300" },
  emerald: { glow: "from-emerald-500/15", icon: "text-emerald-300" },
  amber: { glow: "from-amber-500/15", icon: "text-amber-300" },
  purple: { glow: "from-purple-500/15", icon: "text-purple-300" },
};

export default function StatCard({ icon: Icon, label, value, hint, accent = "indigo" }) {
  const a = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <motion.div variants={staggerItem} className="card p-5 sm:p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
          <p className="mt-2 text-fluid-2xl font-black text-white tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500 truncate">{hint}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${a.icon}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
