import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiArrowLeft, FiGlobe, FiAlertCircle } from "react-icons/fi";
import { fadeInUp, fade, popIn, staggerContainer, staggerItem, hoverLift, EASE } from "../../lib/motion";
import { getGameQuestions, getGameSettings, getCultureThemes } from "../../services/api";
import { useGameSounds } from "../../GameSoundContext";
import MuteButton from "../ui/MuteButton";
import AnswerOption from "../ui/AnswerOption";

/* ─── Couleurs par catégorie ──────────────────────────────────────── */
const CATEGORY_COLORS = {
  "Culture générale":           { color: "from-blue-500/15 to-cyan-500/15",      border: "border-blue-500/30",    text: "text-blue-300" },
  "Histoire":                   { color: "from-amber-500/15 to-yellow-500/15",   border: "border-amber-500/30",   text: "text-amber-300" },
  "Géographie":                 { color: "from-emerald-500/15 to-green-500/15",  border: "border-emerald-500/30", text: "text-emerald-300" },
  "Sciences":                   { color: "from-purple-500/15 to-violet-500/15",  border: "border-purple-500/30",  text: "text-purple-300" },
  "Informatique & Tech":        { color: "from-cyan-500/15 to-teal-500/15",      border: "border-cyan-500/30",    text: "text-cyan-300" },
  "Langues & Littérature":      { color: "from-indigo-500/15 to-blue-500/15",    border: "border-indigo-500/30",  text: "text-indigo-300" },
  "Mathématiques":              { color: "from-violet-500/15 to-purple-500/15",  border: "border-violet-500/30",  text: "text-violet-300" },
  "Sports":                     { color: "from-green-500/15 to-emerald-500/15",  border: "border-green-500/30",   text: "text-green-300" },
  "Divertissement":             { color: "from-orange-500/15 to-red-500/15",     border: "border-orange-500/30",  text: "text-orange-300" },
  "Côte d'Ivoire":              { color: "from-orange-400/15 to-green-500/15",   border: "border-orange-400/30",  text: "text-orange-300" },
  "Nouchi & Urbain":            { color: "from-pink-500/15 to-rose-500/15",      border: "border-pink-500/30",    text: "text-pink-300" },
  "Économie & Entrepreneuriat": { color: "from-yellow-500/15 to-amber-500/15",   border: "border-yellow-500/30",  text: "text-yellow-300" },
  "Citoyenneté":                { color: "from-blue-600/15 to-indigo-500/15",    border: "border-blue-600/30",    text: "text-blue-300" },
  "Logique & Énigmes":          { color: "from-rose-500/15 to-pink-500/15",      border: "border-rose-500/30",    text: "text-rose-300" },
};
const DEFAULT_C = { color: "from-gray-500/15 to-slate-500/15", border: "border-gray-500/30", text: "text-gray-300" };

/* ─── Quiz (banque admin, survie — fin à la 1ʳᵉ erreur) ─────────── */
function ThemeQuiz({ theme, countdown, onBack }) {
  const { startMusic, stopMusic, playCorrect, playWrong, playWin, playLose } = useGameSounds();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(countdown);
  const [done, setDone] = useState(null);

  const initThemeKeyRef = useRef(theme.key);

  useEffect(() => {
    const themeKey = initThemeKeyRef.current;
    let alive = true;
    getGameQuestions({ themes: [themeKey], count: 10 })
      .then((qs) => { if (alive) { setQuestions(qs); startMusic(); } })
      .catch((e) => { if (alive) setError(e.message || "Impossible de charger les questions."); });
    return () => { alive = false; stopMusic(); };
  }, [startMusic, stopMusic]);

  const q = questions && questions[idx];
  const total = questions ? questions.length : 0;

  const finish = useCallback((finalCorrect) => {
    stopMusic();
    const won = finalCorrect > total / 2;
    if (won) playWin(); else playLose();
    setDone({ won, score: finalCorrect, total });
  }, [total, stopMusic, playWin, playLose]);

  const handlePick = useCallback((opt) => {
    if (locked || !q) return;
    setPicked(opt); setLocked(true);
    const ok = String(opt).toLowerCase() === String(q.answer).toLowerCase();
    if (ok) playCorrect(); else setTimeout(() => playWrong(), 250);
    setTimeout(() => {
      if (ok) {
        const nc = correctCount + 1;
        setCorrectCount(nc);
        if (idx + 1 >= total) finish(nc);
        else { setIdx(idx + 1); setPicked(null); setLocked(false); setTimeLeft(countdown); }
      } else finish(correctCount);
    }, 1300);
  }, [locked, q, idx, total, correctCount, countdown, finish, playCorrect, playWrong]);

  useEffect(() => {
    if (!q || locked || done) return;
    if (timeLeft <= 0) { handlePick("__timeout__"); return; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, q, locked, done, handlePick]);

  const backBtn = (
    <button onClick={onBack} className="btn-ghost mb-5 group">
      <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Retour aux thèmes
    </button>
  );

  if (error) return <div className="w-full max-w-xl mx-auto">{backBtn}<div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-300">{error}</div></div>;
  if (!questions) return <div className="w-full max-w-xl mx-auto">{backBtn}<p className="text-gray-400 italic text-center py-10">Chargement…</p></div>;
  if (questions.length === 0) return <div className="w-full max-w-xl mx-auto">{backBtn}<p className="text-gray-400 text-center py-10">Aucune question pour ce thème (à ajouter depuis l'admin).</p></div>;

  if (done) {
    return (
      <motion.div {...popIn} className="w-full max-w-xl mx-auto">
        <div className="glass-card rounded-[2rem] p-6 sm:p-8 text-center">
          <div className="text-5xl mb-4">{done.won ? "🏆" : "😅"}</div>
          <h3 className="text-fluid-xl font-black text-white mb-1">{done.won ? "Gagné !" : "Perdu !"}</h3>
          <p className="text-gray-400 mb-2">Score : <span className="text-white font-bold">{done.score}</span> / {done.total}</p>
          <p className="text-xs text-gray-500 mb-7">{done.won ? "Plus de la moitié de bonnes réponses 🎉" : "Il fallait dépasser la moitié des questions."}</p>
          <motion.button {...hoverLift} onClick={onBack} className="btn-primary w-full">Retour aux thèmes</motion.button>
        </div>
      </motion.div>
    );
  }

  const optState = (opt) => {
    if (!locked) return picked === opt ? "selected" : "idle";
    const isCorrect = String(opt).toLowerCase() === String(q.answer).toLowerCase();
    if (opt === picked) return isCorrect ? "correct" : "wrong";
    if (isCorrect) return "missed";
    return "idle";
  };

  const RADIUS = 26, CIRC = 2 * Math.PI * RADIUS;
  const timerRatio = countdown > 0 ? timeLeft / countdown : 0;
  const strokeOffset = CIRC * (1 - timerRatio);
  const timerColor = timerRatio > 0.5 ? "#22c55e" : timerRatio > 0.25 ? "#f97316" : "#ef4444";

  return (
    <motion.div {...fadeInUp} className="w-full max-w-xl mx-auto">
      {backBtn}
      <div className="flex items-center gap-4 mb-5">
        <span className="text-3xl flex-shrink-0">{theme.icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-fluid-lg font-black text-white truncate">{theme.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Question {idx + 1} / {total} · {correctCount} ✓</p>
        </div>
        <div className={`relative flex-shrink-0 ${timerRatio <= 0.25 ? "animate-pulse" : ""}`}>
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle cx="32" cy="32" r={RADIUS} fill="none" stroke={timerColor} strokeWidth="5"
              strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={strokeOffset}
              style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums" style={{ color: timerColor }}>{timeLeft}</span>
        </div>
        <MuteButton />
      </div>

      <div className="glass-card rounded-[2rem] p-5 sm:p-7">
        <p className="text-fluid-base font-bold text-white mb-5">{q.question}</p>
        <div className="space-y-2.5">
          {(q.options || []).map((opt) => (
            <AnswerOption key={opt} label={opt} state={optState(opt)} disabled={locked} onClick={() => handlePick(opt)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Composant principal ────────────────────────────────────────── */
export default function CultureGeneraleSection() {
  const [themes, setThemes] = useState([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTheme, setActiveTheme] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    getGameSettings().then((s) => setCountdown(s.countdown_seconds || 30)).catch(() => {});
    getCultureThemes()
      .then((data) => {
        setThemes(Array.isArray(data) ? data : []);
        setLoadingThemes(false);
      })
      .catch(() => setLoadingThemes(false));
  }, []);

  const categories = [...new Set(themes.map((t) => t.category).filter(Boolean))];
  const visibleThemes = activeCategory ? themes.filter((t) => t.category === activeCategory) : themes;

  if (activeTheme) {
    return (
      <div className="w-full pb-10">
        <ThemeQuiz theme={activeTheme} countdown={countdown} onBack={() => setActiveTheme(null)} />
      </div>
    );
  }

  return (
    <div className="w-full pb-10 space-y-6 sm:space-y-8">
      <motion.div {...fadeInUp}>
        <div className="flex items-center gap-3 mb-1">
          <FiGlobe size={24} className="text-cyan-400 flex-shrink-0" />
          <h2 className="section-title">Culture Générale</h2>
        </div>
        <p className="text-gray-500 text-sm">Choisissez un thème — une seule erreur et la partie s'arrête !</p>
      </motion.div>

      {/* Filtre catégories */}
      {categories.length > 0 && (
        <motion.div {...fadeInUp} className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              !activeCategory ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                activeCategory === cat ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>
      )}

      {/* Grille des thèmes */}
      {loadingThemes ? (
        <p className="text-gray-500 italic text-center py-10">Chargement des thèmes…</p>
      ) : visibleThemes.length === 0 ? (
        <p className="text-gray-500 text-center py-10">Aucun thème disponible.</p>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {visibleThemes.map((theme) => {
            const c = CATEGORY_COLORS[theme.category] ?? DEFAULT_C;
            return (
              <motion.div key={theme.key} variants={staggerItem} {...hoverLift}
                onHoverStart={() => setHoveredKey(theme.key)} onHoverEnd={() => setHoveredKey(null)}
                onClick={() => setActiveTheme(theme)}
                className={`relative p-5 rounded-2xl border bg-gradient-to-br ${c.color} ${c.border} cursor-pointer transition-all overflow-hidden`}>
                <AnimatePresence>
                  {hoveredKey === theme.key && <motion.div {...fade} className="absolute inset-0 bg-white/5 rounded-2xl" />}
                </AnimatePresence>
                <motion.div animate={hoveredKey === theme.key ? { scale: 1.12, rotate: 5 } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.25, ease: EASE }} className="text-4xl mb-3">{theme.icon}</motion.div>
                <p className={`text-sm font-black ${c.text}`}>{theme.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{theme.description}</p>
                <motion.div animate={hoveredKey === theme.key ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, ease: EASE }} className={`flex items-center gap-1 mt-3 text-[10px] font-bold ${c.text}`}>
                  <FiPlay size={9} fill="currentColor" /> Commencer
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <motion.div {...fadeInUp} className="glass-card rounded-2xl p-5 border-cyan-500/20 flex items-start gap-4">
        <FiAlertCircle size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white mb-0.5">Règle du jeu</p>
          <p className="text-xs text-gray-500">Répondez sans vous tromper : la partie s'arrête à la première mauvaise réponse. Vous gagnez en trouvant plus de la moitié des questions.</p>
        </div>
      </motion.div>
    </div>
  );
}
