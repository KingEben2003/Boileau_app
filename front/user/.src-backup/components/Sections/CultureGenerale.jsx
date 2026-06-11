import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlay, FiArrowLeft, FiCheckCircle, FiX, FiGlobe, FiAlertCircle,
} from "react-icons/fi";

/* ─── Thèmes ──────────────────────────────────────────────────────── */
const THEMES = [
  { key: "geo",     label: "Géographie",    icon: "🌍", color: "from-blue-500/20 to-cyan-500/20",    border: "border-blue-500/30",   text: "text-blue-300",   desc: "Capitales, pays, reliefs..." },
  { key: "sport",   label: "Sport",         icon: "⚽", color: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30",  text: "text-green-300",  desc: "Foot, tennis, JO..." },
  { key: "histoire",label: "Histoire",      icon: "📜", color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/30",  text: "text-amber-300",  desc: "Civilisations, guerres, rois..." },
  { key: "sciences",label: "Sciences",      icon: "🔬", color: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", text: "text-purple-300", desc: "Biologie, chimie, physique..." },
  { key: "musique", label: "Musique",       icon: "🎵", color: "from-pink-500/20 to-rose-500/20",    border: "border-pink-500/30",   text: "text-pink-300",   desc: "Artistes, genres, instruments..." },
  { key: "cinema",  label: "Cinéma",        icon: "🎬", color: "from-orange-500/20 to-red-500/20",   border: "border-orange-500/30", text: "text-orange-300", desc: "Films, réalisateurs, acteurs..." },
  { key: "art",     label: "Art",           icon: "🎨", color: "from-indigo-500/20 to-blue-500/20",  border: "border-indigo-500/30", text: "text-indigo-300", desc: "Peintres, mouvements, œuvres..." },
  { key: "techno",  label: "Technologie",   icon: "💻", color: "from-cyan-500/20 to-teal-500/20",    border: "border-cyan-500/30",   text: "text-cyan-300",   desc: "Inventions, marques, code..." },
  { key: "cuisine", label: "Gastronomie",   icon: "🍽️", color: "from-yellow-500/20 to-amber-500/20", border: "border-yellow-500/30", text: "text-yellow-300", desc: "Plats, chefs, pays..." },
  { key: "nature",  label: "Nature",        icon: "🌿", color: "from-emerald-500/20 to-green-500/20", border: "border-emerald-500/30", text: "text-emerald-300", desc: "Animaux, plantes, écosystèmes..." },
  { key: "astro",   label: "Astronomie",    icon: "🌌", color: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30",  text: "text-violet-300",  desc: "Planètes, étoiles, galaxies..." },
  { key: "philo",   label: "Philosophie",   icon: "🧠", color: "from-rose-500/20 to-pink-500/20",    border: "border-rose-500/30",   text: "text-rose-300",   desc: "Courants, penseurs, concepts..." },
];

/* ─── Questions mock par thème ────────────────────────────────────── */
const MOCK_QUESTIONS = {
  geo: [
    { id: 1, q: "Quelle est la capitale de l'Australie ?", opts: ["Sydney", "Melbourne", "Canberra", "Perth"], ans: "Canberra" },
    { id: 2, q: "Quel est le plus grand pays du monde ?", opts: ["Canada", "Chine", "Russie", "USA"], ans: "Russie" },
    { id: 3, q: "Quel fleuve est le plus long du monde ?", opts: ["Amazone", "Nil", "Yangtsé", "Mississippi"], ans: "Nil" },
  ],
  sport: [
    { id: 1, q: "Combien de joueurs dans une équipe de football ?", opts: ["9", "10", "11", "12"], ans: "11" },
    { id: 2, q: "Quel pays a remporté la Coupe du Monde 2018 ?", opts: ["Brésil", "Allemagne", "France", "Argentine"], ans: "France" },
    { id: 3, q: "Où ont eu lieu les JO d'été 2024 ?", opts: ["Tokyo", "Los Angeles", "Paris", "Brisbane"], ans: "Paris" },
  ],
  histoire: [
    { id: 1, q: "En quelle année a eu lieu la Révolution française ?", opts: ["1778", "1789", "1795", "1802"], ans: "1789" },
    { id: 2, q: "Qui a peint la Joconde ?", opts: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"], ans: "Léonard de Vinci" },
    { id: 3, q: "Quel empire était le plus grand de l'histoire ?", opts: ["Mongol", "Romain", "Britannique", "Ottoman"], ans: "Mongol" },
  ],
  sciences: [
    { id: 1, q: "Quelle est la formule chimique de l'eau ?", opts: ["H2O", "CO2", "O2", "H2SO4"], ans: "H2O" },
    { id: 2, q: "Combien d'os a le corps humain adulte ?", opts: ["196", "206", "226", "246"], ans: "206" },
    { id: 3, q: "À quelle vitesse voyage la lumière ?", opts: ["200 000 km/s", "300 000 km/s", "400 000 km/s", "150 000 km/s"], ans: "300 000 km/s" },
  ],
};

const DEFAULT_QUESTIONS = [
  { id: 1, q: "Le quiz pour ce thème arrive bientôt !", opts: ["Vrai", "Faux"], ans: "Vrai" },
];

/* ─── Mini quiz culture générale ─────────────────────────────────── */
function ThemeQuiz({ theme, onBack }) {
  const questions = MOCK_QUESTIONS[theme.key] || DEFAULT_QUESTIONS;
  const [idx, setIdx]         = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone]       = useState(false);

  const q = questions[idx];
  const progress = ((idx + 1) / questions.length) * 100;

  const calcScore = () => {
    let ok = 0;
    questions.forEach((q) => {
      if (answers[q.id]?.toLowerCase() === q.ans.toLowerCase()) ok++;
    });
    return { ok, total: questions.length, pct: Math.round((ok / questions.length) * 100) };
  };

  if (done) {
    const score = calcScore();
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl mx-auto">
        <div className="glass-card rounded-[2rem] p-8 text-center border border-white/10">
          <div className="text-5xl mb-4">{score.pct >= 80 ? "🏆" : score.pct >= 50 ? "👍" : "📚"}</div>
          <div className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center text-2xl font-black ${
            score.pct >= 75 ? "bg-emerald-500/20 text-emerald-400" :
            score.pct >= 50 ? "bg-orange-500/20 text-orange-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {score.pct}%
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Quiz terminé !</h3>
          <p className="text-gray-400 mb-7">{score.ok} / {score.total} bonnes réponses</p>

          <div className="text-left space-y-2 max-h-64 overflow-y-auto custom-scrollbar mb-6 pr-1">
            {questions.map((qItem) => {
              const ua = answers[qItem.id];
              const ok = ua?.toLowerCase() === qItem.ans.toLowerCase();
              return (
                <div key={qItem.id} className={`p-3 rounded-xl border text-sm ${ok ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <div className="flex gap-2">
                    {ok ? <FiCheckCircle className="text-emerald-400 flex-shrink-0 mt-0.5" size={14} /> : <FiX className="text-red-400 flex-shrink-0 mt-0.5" size={14} />}
                    <div>
                      <p className="font-semibold text-white text-xs">{qItem.q}</p>
                      {!ok && <p className="text-emerald-400 text-[11px] mt-0.5">Bonne réponse : {qItem.ans}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-2xl">
            Retour aux thèmes
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-5 transition-colors group">
        <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Retour aux thèmes
      </button>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{theme.icon}</span>
        <div>
          <h3 className="text-lg font-black text-white">{theme.label}</h3>
          <p className="text-xs text-gray-500">{theme.desc}</p>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] p-7">
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Question {idx + 1} / {questions.length}</span>
            <span className="text-pink-400 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
            />
          </div>
        </div>

        <p className="text-base font-bold text-white mb-5">{q.q}</p>

        <div className="space-y-2.5 mb-7">
          {q.opts.map((opt) => (
            <label key={opt} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              answers[q.id] === opt
                ? "bg-pink-500/20 border-pink-500/40 text-white"
                : "bg-white/5 border-white/10 text-gray-300 hover:border-pink-500/30 hover:bg-white/8"
            }`}>
              <input
                type="radio"
                name={`cg-${q.id}`}
                value={opt}
                checked={answers[q.id] === opt}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                className="accent-pink-500"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => setIdx((i) => i - 1)} disabled={idx === 0}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 rounded-xl transition text-sm font-semibold">
            Précédent
          </motion.button>
          {idx < questions.length - 1 ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setIdx((i) => i + 1)}
              className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition text-sm shadow-lg shadow-pink-500/20">
              Suivant
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setDone(true)}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl transition text-sm shadow-lg shadow-emerald-500/20">
              Terminer
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Composant principal ────────────────────────────────────────── */
export default function CultureGeneraleSection() {
  const [activeTheme, setActiveTheme] = useState(null);
  const [hoveredKey, setHoveredKey]   = useState(null);

  if (activeTheme) {
    return (
      <div className="w-full pb-10">
        <ThemeQuiz theme={activeTheme} onBack={() => setActiveTheme(null)} />
      </div>
    );
  }

  return (
    <div className="w-full pb-10 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <FiGlobe size={24} className="text-cyan-400" />
          <h2 className="text-2xl font-black text-white tracking-tight">Culture Générale</h2>
        </div>
        <p className="text-gray-500 text-sm">Choisissez un thème et testez vos connaissances</p>
      </motion.div>

      {/* Thèmes grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {THEMES.map((theme, i) => (
          <motion.div
            key={theme.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            onHoverStart={() => setHoveredKey(theme.key)}
            onHoverEnd={() => setHoveredKey(null)}
            onClick={() => setActiveTheme(theme)}
            className={`relative p-5 rounded-2xl border bg-gradient-to-br ${theme.color} ${theme.border} cursor-pointer transition-all overflow-hidden`}
          >
            {/* Hover glow */}
            <AnimatePresence>
              {hoveredKey === theme.key && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/5 rounded-2xl"
                />
              )}
            </AnimatePresence>

            <motion.div
              animate={hoveredKey === theme.key
                ? { scale: 1.12, rotate: 5 }
                : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.25 }}
              className="text-4xl mb-3"
            >
              {theme.icon}
            </motion.div>

            <p className={`text-sm font-black ${theme.text}`}>{theme.label}</p>
            <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{theme.desc}</p>

            <motion.div
              animate={hoveredKey === theme.key ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-1 mt-3 text-[10px] font-bold ${theme.text}`}
            >
              <FiPlay size={9} fill="currentColor" /> Commencer
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Info classement solo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass-card rounded-2xl p-5 border border-cyan-500/20 flex items-start gap-4"
      >
        <FiAlertCircle size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white mb-0.5">Classement en temps réel</p>
          <p className="text-xs text-gray-500">
            Vos scores de culture générale sont comparés aux autres utilisateurs en temps réel.
            Accédez à la section <span className="text-cyan-400 font-semibold">Progression</span> pour voir votre rang global.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
