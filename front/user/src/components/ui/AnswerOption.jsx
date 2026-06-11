import { motion } from "framer-motion";
import { FiCheck, FiX } from "react-icons/fi";

/**
 * Option de réponse avec feedback visuel immédiat.
 * state : "idle" | "selected" | "correct" | "wrong" | "missed"
 *  - "correct" : clignote vert ~1,2 s (bonne réponse choisie)
 *  - "wrong"   : clignote rouge ~1,2 s (mauvaise réponse choisie)
 *  - "missed"  : surligne en vert la bonne réponse non choisie (révélation)
 */
export default function AnswerOption({ label, state = "idle", disabled, onClick }) {
  const isCorrect = state === "correct";
  const isWrong = state === "wrong";
  const isMissed = state === "missed";

  const base = "w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-sm font-medium";
  let cls = "bg-white/5 border-white/10 text-gray-200 hover:border-pink-500/40 hover:bg-white/10";
  if (state === "selected") cls = "bg-pink-500/20 border-pink-500/50 text-white";
  else if (isCorrect) cls = "border-emerald-500/60 text-white";
  else if (isWrong) cls = "border-red-500/60 text-white";
  else if (isMissed) cls = "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";

  // Clignotement (keyframes de couleur de fond) synchronisé avec le son.
  const blink = isCorrect
    ? { backgroundColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0.45)", "rgba(16,185,129,0.1)", "rgba(16,185,129,0.45)", "rgba(16,185,129,0.2)"] }
    : isWrong
    ? { backgroundColor: ["rgba(239,68,68,0)", "rgba(239,68,68,0.45)", "rgba(239,68,68,0.1)", "rgba(239,68,68,0.45)", "rgba(239,68,68,0.2)"] }
    : {};

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      animate={blink}
      transition={isCorrect || isWrong ? { duration: 1.2, times: [0, 0.25, 0.5, 0.75, 1] } : { duration: 0.2 }}
      className={`${base} ${cls} disabled:cursor-default`}
    >
      <span className="flex-1 break-words">{label}</span>
      {isCorrect && <FiCheck className="text-emerald-400 flex-shrink-0" size={16} strokeWidth={3} />}
      {isWrong && <FiX className="text-red-400 flex-shrink-0" size={16} strokeWidth={3} />}
      {isMissed && <FiCheck className="text-emerald-400 flex-shrink-0" size={16} strokeWidth={3} />}
    </motion.button>
  );
}
