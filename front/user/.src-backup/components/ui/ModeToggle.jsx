
import { FiLayout, FiHelpCircle } from "react-icons/fi";
import { motion } from "framer-motion";

export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="relative flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-full max-w-sm mx-auto">
      <motion.div
        className="absolute top-1.5 bottom-1.5 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30"
        initial={false}
        animate={{
          left: mode === "summary" ? "6px" : "calc(50% + 1px)",
          right: mode === "summary" ? "calc(50% + 1px)" : "6px",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      />
      
      <button
        type="button"
        onClick={() => setMode("summary")}
        className={`
          flex-1 py-3 px-4 z-10 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
          ${mode === "summary" ? "text-white" : "text-gray-500 hover:text-gray-300"}
        `}
      >
        <FiLayout size={18} />
        Résumé
      </button>

      <button
        type="button"
        onClick={() => setMode("quiz")}
        className={`
          flex-1 py-3 px-4 z-10 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
          ${mode === "quiz" ? "text-white" : "text-gray-500 hover:text-gray-300"}
        `}
      >
        <FiHelpCircle size={18} />
        Quiz
      </button>
    </div>
  );
}
