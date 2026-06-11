import { motion } from "framer-motion";
import { FiArrowLeft, FiHome } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fadeInUp } from "../../lib/motion";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-ink-900 flex items-center justify-center p-6 text-center">
      <motion.div {...fadeInUp} className="max-w-sm w-full">
        <p className="text-8xl sm:text-9xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent mb-4 leading-none">
          404
        </p>
        <h1 className="text-2xl font-black text-white mb-3">Page introuvable</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-200 transition-all duration-200"
          >
            <FiArrowLeft size={15} />
            Retour
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all duration-200"
          >
            <FiHome size={15} />
            Accueil
          </button>
        </div>
      </motion.div>
    </div>
  );
}
