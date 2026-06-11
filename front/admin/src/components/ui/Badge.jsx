const TONES = {
  neutral: "bg-white/5 border-white/10 text-gray-300",
  indigo: "bg-indigo-500/15 border-indigo-500/40 text-indigo-300",
  green: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  red: "bg-red-500/15 border-red-500/40 text-red-300",
  amber: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  pink: "bg-pink-500/15 border-pink-500/40 text-pink-300",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${TONES[tone] || TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}
