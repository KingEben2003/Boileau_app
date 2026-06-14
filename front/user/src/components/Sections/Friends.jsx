import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUsers, FiUserPlus, FiMail, FiHash, FiSend, FiX,
  FiZap, FiCheck, FiTrendingUp, FiAward, FiArrowLeft,
  FiStar, FiCheckCircle, FiAlertCircle, FiClock, FiPlay,
  FiFileText, FiUpload, FiRefreshCw,
} from "react-icons/fi";
import {
  getFriends, getFriendRequests, acceptFriendRequest, declineFriendRequest,
  sendFriendRequest, getGameSettings, getGameQuestions,
  getChallenges, acceptChallenge, refuseChallenge, submitChallengeAnswers, getQuiz,
  getFeatureRequestStatus, getDocuments, uploadDocument,
  generateQuizForChallenge, sendPdfChallenge,
} from "../../services/api";
import { useGameSounds } from "../../GameSoundContext";
import MuteButton from "../ui/MuteButton";
import AnswerOption from "../ui/AnswerOption";
import { fadeInUp, popIn, staggerContainer, staggerItem, hoverLift, tap } from "../../lib/motion";

/* ─── Constantes ─────────────────────────────────────────────────── */
const THEMES = [
  { key: "geo", label: "Géographie", icon: "🌍" },
  { key: "sport", label: "Sport", icon: "⚽" },
  { key: "histoire", label: "Histoire", icon: "📜" },
  { key: "sciences", label: "Sciences", icon: "🔬" },
  { key: "musique", label: "Musique", icon: "🎵" },
  { key: "cinema", label: "Cinéma", icon: "🎬" },
  { key: "art", label: "Art", icon: "🎨" },
  { key: "techno", label: "Technologie", icon: "💻" },
];
const DIFFICULTIES = [{ key: "easy", label: "Facile" }, { key: "medium", label: "Moyen" }, { key: "hard", label: "Difficile" }];
const TYPES = [{ key: "qcm", label: "QCM" }, { key: "true_false", label: "Vrai / Faux" }];
const COUNT_OPTIONS = [5, 10, 15, 20];

/* ─── Helpers ────────────────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-500", "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-cyan-500 to-blue-500",
];

function LetterAvatar({ username, size = "w-11 h-11", textSize = "text-base" }) {
  const letter = (username || "?")[0].toUpperCase();
  const grad = AVATAR_GRADIENTS[(username?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black ${textSize} flex-shrink-0`}>
      {letter}
    </div>
  );
}

function CircularTimer({ value, max }) {
  const R = 22, circ = 2 * Math.PI * R;
  const progress = circ * (1 - value / Math.max(1, max));
  const color = value <= 5 ? "#ef4444" : value <= 10 ? "#f97316" : "#6366f1";
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={progress} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
      </svg>
      <span className="absolute text-base font-black" style={{ color }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SOLO (survie, banque culture)
   ═══════════════════════════════════════════════════════════════════ */
function SoloGame({ config, countdown, onExit }) {
  const { startMusic, stopMusic, playCorrect, playWrong, playWin, playLose } = useGameSounds();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(countdown);
  const [done, setDone] = useState(null);
  const initConfigRef = useRef(config);

  useEffect(() => {
    const cfg = initConfigRef.current;
    let alive = true;
    getGameQuestions({ themes: cfg.themes, types: cfg.types, difficulty: cfg.difficulty, count: cfg.count })
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
      } else {
        finish(correctCount);
      }
    }, 1300);
  }, [locked, q, idx, total, correctCount, countdown, finish, playCorrect, playWrong]);

  useEffect(() => {
    if (!q || locked || done) return;
    if (timeLeft <= 0) { handlePick("__timeout__"); return; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, q, locked, done, handlePick]);

  if (error) return <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-300">{error} <button onClick={onExit} className="underline ml-2">Retour</button></div>;
  if (!questions) return <p className="text-gray-400 italic text-center py-10">Chargement des questions…</p>;
  if (questions.length === 0) return <div className="text-center py-10 text-gray-400">Aucune question pour ces critères.<div><button onClick={onExit} className="btn-secondary mt-4">Retour</button></div></div>;

  if (done) {
    return (
      <motion.div {...popIn} className="glass-card rounded-[2rem] p-6 sm:p-8 text-center border border-white/10">
        <div className="text-6xl mb-4">{done.won ? "🏆" : "😅"}</div>
        <h3 className="text-2xl font-black text-white mb-1">{done.won ? "Gagné !" : "Perdu !"}</h3>
        <p className="text-gray-400 mb-2">Score : <span className="text-white font-bold">{done.score}</span> / {done.total}</p>
        <p className="text-xs text-gray-500 mb-6">{done.won ? "Plus de la moitié de bonnes réponses 🎉" : "Il fallait dépasser la moitié des questions."}</p>
        <button onClick={onExit} className="btn-secondary w-full"><FiArrowLeft size={15} /> Retour</button>
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

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">Question {idx + 1} / {total}</p>
          <p className="text-2xl font-black text-pink-400">{correctCount} ✓</p>
        </div>
        <CircularTimer value={timeLeft} max={countdown} />
        <MuteButton />
      </div>
      <div className="glass-card rounded-[2rem] p-6 border border-white/10">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
          {THEMES.find((t) => t.key === q.theme)?.icon} {THEMES.find((t) => t.key === q.theme)?.label || q.theme}
        </span>
        <p className="text-lg font-bold text-white my-4">{q.question}</p>
        <div className="space-y-2.5">
          {(q.options || []).map((opt) => (
            <AnswerOption key={opt} label={opt} state={optState(opt)} disabled={locked} onClick={() => handlePick(opt)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETUP SOLO
   ═══════════════════════════════════════════════════════════════════ */
function MultiSelect({ items, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map(({ key, label, icon }) => {
        const active = selected.includes(key);
        return (
          <button key={key} type="button" onClick={() => onToggle(key)}
            className={`flex flex-col items-center gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl border text-xs font-bold transition-all ${
              active ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
            }`}>
            {icon && <span className="text-lg sm:text-xl">{icon}</span>}
            <span className="leading-tight text-center break-words">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function GameSetup({ defaults, onStart, onCancel }) {
  const [themes, setThemes] = useState(defaults.themes?.length ? defaults.themes : ["geo", "sport"]);
  const [types, setTypes] = useState(defaults.types?.length ? defaults.types : ["qcm", "true_false"]);
  const [difficulty, setDifficulty] = useState(defaults.difficulty || "medium");
  const [count, setCount] = useState(defaults.count || 10);

  const toggle = (setter, arr, key) =>
    setter(arr.includes(key) ? (arr.length > 1 ? arr.filter((k) => k !== key) : arr) : [...arr, key]);

  return (
    <motion.div {...fadeInUp} className="space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onCancel} className="btn-ghost w-10 h-10 p-0 flex-shrink-0"><FiArrowLeft size={18} /></button>
        <h3 className="text-fluid-lg font-black text-white">Partie solo</h3>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-purple-500/20">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3"><FiStar size={13} className="inline" /> Domaines</p>
        <MultiSelect items={THEMES} selected={themes} onToggle={(k) => toggle(setThemes, themes, k)} />
      </div>

      <div className="glass-card rounded-2xl p-5 border border-pink-500/20">
        <p className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-3">Types de question</p>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => toggle(setTypes, types, t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${types.includes(t.key) ? "bg-pink-500/20 border-pink-500/40 text-pink-300" : "bg-white/5 border-white/10 text-gray-500"}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-indigo-500/20">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Difficulté</p>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((d) => (
              <button key={d.key} onClick={() => setDifficulty(d.key)}
                className={`py-2 rounded-xl text-sm font-bold border ${difficulty === d.key ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-white/5 border-white/10 text-gray-500"}`}>{d.label}</button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Nb de questions</p>
          <div className="grid grid-cols-2 gap-2">
            {COUNT_OPTIONS.map((c) => (
              <button key={c} onClick={() => setCount(c)}
                className={`py-2 rounded-xl text-sm font-black border ${count === c ? "bg-pink-500/20 border-pink-500/50 text-pink-300" : "bg-white/5 border-white/10 text-gray-500"}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <motion.button {...tap} onClick={() => onStart({ themes, types, difficulty, count })}
        className="btn-primary w-full bg-gradient-to-r from-pink-600 to-purple-600">
        <FiPlay size={16} fill="currentColor" /> Commencer
      </motion.button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   JEU DU DÉFI — l'adversaire joue le quiz du challenger
   ═══════════════════════════════════════════════════════════════════ */
function ChallengeQuizPlayer({ challenge, onBack, onComplete }) {
  const { startMusic, stopMusic, playCorrect, playWrong, playWin, playLose } = useGameSounds();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [locked, setLocked] = useState(false);
  const [pickedAnswer, setPickedAnswer] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getQuiz(challenge.quiz.id)
      .then((q) => { if (alive) { setQuiz(q); startMusic(); } })
      .catch((e) => { if (alive) setError(e.message || "Impossible de charger le quiz."); });
    return () => { alive = false; stopMusic(); };
  }, [challenge.quiz.id, startMusic, stopMusic]);

  // Reset verrou à chaque changement de question
  useEffect(() => { setLocked(false); setPickedAnswer(null); }, [idx]);

  const question = quiz?.questions?.[idx];
  const total = quiz?.questions?.length ?? 0;

  const finishQuiz = useCallback(async (finalAnswers) => {
    setIsFinishing(true);
    stopMusic();
    let correct = 0;
    quiz.questions.forEach((q) => {
      const a = finalAnswers[q.id] || "";
      if (a.toLowerCase() === (q.correct_answer || "").toLowerCase()) correct++;
    });
    const percentage = Math.round((correct / total) * 100);
    if (percentage >= 50) playWin(); else playLose();

    setSubmitting(true);
    try {
      const completed = await submitChallengeAnswers(challenge.id, {
        score: percentage,
        answersDetail: finalAnswers,
      });
      setTimeout(() => {
        setIsFinishing(false);
        onComplete(completed);
      }, 1600);
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi des résultats.");
      setIsFinishing(false);
      setSubmitting(false);
    }
  }, [quiz, total, challenge.id, stopMusic, playWin, playLose, onComplete]);

  const handlePick = useCallback((answer) => {
    if (locked || !question) return;
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);
    setPickedAnswer(answer);
    setLocked(true);

    const ok = answer.toLowerCase() === (question.correct_answer || "").toLowerCase();
    if (ok) playCorrect(); else setTimeout(() => playWrong(), 250);

    const isLast = idx + 1 >= total;
    setTimeout(() => {
      if (isLast) {
        finishQuiz(newAnswers);
      } else {
        setIdx((i) => i + 1);
      }
    }, ok ? 1100 : 1900);
  }, [locked, question, answers, idx, total, finishQuiz, playCorrect, playWrong]);

  if (isFinishing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-sm">{submitting ? "Envoi des résultats…" : "Calcul…"}</p>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="w-full max-w-xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-4"><FiArrowLeft size={15} /> Retour</button>
      <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-300">{error}</div>
    </div>
  );

  if (!quiz) return (
    <div className="w-full max-w-xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-4"><FiArrowLeft size={15} /> Retour</button>
      <p className="text-gray-400 italic text-center py-10">Chargement du quiz…</p>
    </div>
  );

  const optState = (opt) => {
    if (!locked) return pickedAnswer === opt ? "selected" : "idle";
    const isCorrect = opt.toLowerCase() === (question.correct_answer || "").toLowerCase();
    if (opt === pickedAnswer) return isCorrect ? "correct" : "wrong";
    if (isCorrect) return "missed";
    return "idle";
  };

  const progress = ((idx + 1) / total) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="btn-ghost -ml-2">
          <FiArrowLeft size={20} /> Retour
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-400 font-bold">Défi de {challenge.challenger.username}</span>
          <MuteButton />
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 gap-3">
            <span className="text-fluid-sm text-gray-400">Question {idx + 1} / {total}</span>
            <span className="text-fluid-sm font-bold text-indigo-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-400" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h3 className="text-fluid-xl font-bold text-white mb-6 break-words">{question?.question_text}</h3>

        <div className="space-y-3 mb-4">
          {(question?.type === "true_false" || quiz.type === "true_false"
            ? ["Vrai", "Faux"]
            : question?.options || []
          ).map((opt) => (
            <AnswerOption key={opt} label={opt} state={optState(opt)} disabled={locked} onClick={() => handlePick(opt)} />
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {locked ? "Passage à la suite…" : "Sélectionnez une réponse pour continuer"}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RAPPORT COMPARATIF
   ═══════════════════════════════════════════════════════════════════ */
function ChallengeReport({ challenge, onBack, onLoadQuiz }) {
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);

  useEffect(() => {
    if (challenge.quiz?.id) {
      getQuiz(challenge.quiz.id)
        .then(setQuiz)
        .catch(() => setQuiz(null))
        .finally(() => setLoadingQuiz(false));
    } else {
      setLoadingQuiz(false);
    }
  }, [challenge.quiz?.id]);

  const cScore = challenge.challenger_score ?? 0;
  const oScore = challenge.opponent_score ?? 0;
  const iCompleted = challenge.status === "completed";
  const cAnswers = challenge.challenger_answers || {};
  const oAnswers = challenge.opponent_answers || {};

  const winnerName = challenge.winner?.username;
  const challengerName = challenge.challenger.username;
  const opponentName = challenge.opponent.username;

  return (
    <motion.div {...popIn} className="w-full max-w-2xl mx-auto px-4 py-6">
      <button onClick={onBack} className="btn-ghost mb-6"><FiArrowLeft size={15} /> Retour</button>

      <div className="glass-panel rounded-3xl p-5 sm:p-8">
        {/* En-tête résultat */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">
            {!iCompleted ? "⏳" : winnerName ? "🏆" : "🤝"}
          </div>
          <h3 className="text-2xl font-black text-white mb-1">
            {!iCompleted ? "En attente de l'adversaire" : winnerName ? `${winnerName} a gagné !` : "Égalité !"}
          </h3>
          {challenge.quiz && (
            <p className="text-xs text-gray-500 mt-1">Quiz : {challenge.quiz.document_title}</p>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="text-center">
            <LetterAvatar username={challengerName} size="w-12 h-12" textSize="text-lg" />
            <p className="text-sm font-bold text-white mt-2 truncate">{challengerName}</p>
            <p className={`text-3xl font-black mt-1 ${winnerName === challengerName ? "text-yellow-400" : "text-white"}`}>
              {cScore.toFixed(0)}%
            </p>
            {winnerName === challengerName && <p className="text-[10px] text-yellow-400 mt-0.5">Vainqueur</p>}
          </div>

          <div className="text-center">
            <p className="text-2xl font-black text-gray-600">VS</p>
          </div>

          <div className="text-center">
            <LetterAvatar username={opponentName} size="w-12 h-12" textSize="text-lg" />
            <p className="text-sm font-bold text-white mt-2 truncate">{opponentName}</p>
            {iCompleted ? (
              <>
                <p className={`text-3xl font-black mt-1 ${winnerName === opponentName ? "text-yellow-400" : "text-white"}`}>
                  {oScore.toFixed(0)}%
                </p>
                {winnerName === opponentName && <p className="text-[10px] text-yellow-400 mt-0.5">Vainqueur</p>}
              </>
            ) : (
              <p className="text-gray-500 text-sm mt-1">En attente…</p>
            )}
          </div>
        </div>

        {/* Détail question par question */}
        {iCompleted && !loadingQuiz && quiz?.questions?.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Détail des réponses</p>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {quiz.questions.map((q, i) => {
                const cAns = String(cAnswers[q.id] || "").toLowerCase();
                const oAns = String(oAnswers[q.id] || "").toLowerCase();
                const correct = (q.correct_answer || "").toLowerCase();
                const cRight = cAns === correct;
                const oRight = oAns === correct;
                return (
                  <div key={q.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs font-medium text-gray-300 mb-2 break-words">
                      {i + 1}. {q.question_text}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${cRight ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                        {cRight ? <FiCheckCircle size={11} /> : <FiX size={11} />}
                        <span className="truncate">{challengerName}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${oRight ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                        {oRight ? <FiCheckCircle size={11} /> : <FiX size={11} />}
                        <span className="truncate">{opponentName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!iCompleted && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <FiClock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              Votre défi a été accepté. {opponentName} doit encore jouer le quiz pour que les résultats soient disponibles.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DÉFI PDF — FLUX MULTI-ÉTAPES
   ═══════════════════════════════════════════════════════════════════ */
function PdfChallengeFlow({ friends, onBack }) {
  const { startMusic, stopMusic, playCorrect, playWrong, playWin, playLose } = useGameSounds();
  // step: "select-doc" | "generating" | "pick-friend" | "playing" | "sending" | "sent"
  const [step, setStep] = useState("select-doc");
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [genError, setGenError] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  // quiz playing
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lockedAnswer, setLockedAnswer] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [sendError, setSendError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    getDocuments()
      .then((d) => setDocuments(Array.isArray(d) ? d : []))
      .catch((e) => setDocsError(e.message || "Impossible de charger les documents."))
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => { if (step !== "playing") stopMusic(); }, [step, stopMusic]);
  useEffect(() => { setLockedAnswer(null); }, [questionIndex]);

  const handleGenerate = async (doc) => {
    setSelectedDoc(doc);
    setGenError("");
    setStep("generating");
    try {
      const generated = await generateQuizForChallenge(doc.id);
      setQuiz(generated);
      setStep("pick-friend");
    } catch (e) {
      setGenError(e.message || "Impossible de générer le quiz.");
      setStep("select-doc");
    }
  };

  const handleUploadAndGenerate = async () => {
    if (!uploadFile) return;
    setGenError("");
    setStep("generating");
    try {
      const uploaded = await uploadDocument(uploadFile);
      const generated = await generateQuizForChallenge(uploaded.id);
      setSelectedDoc(uploaded);
      setQuiz(generated);
      setStep("pick-friend");
    } catch (e) {
      setGenError(e.message || "Erreur lors de l'upload ou de la génération.");
      setStep("select-doc");
    }
  };

  const startPlaying = (friend) => {
    setSelectedFriend(friend);
    setAnswers({});
    setQuestionIndex(0);
    setLockedAnswer(null);
    setStartTime(Date.now());
    startMusic();
    setStep("playing");
  };

  const handleAnswer = (qId, answer) => {
    if (lockedAnswer !== null) return;
    const newAnswers = { ...answers, [qId]: answer };
    setAnswers(newAnswers);
    setLockedAnswer(answer);

    const q = quiz.questions.find((x) => x.id === qId);
    const isCorrect = q && answer.toLowerCase() === (q.correct_answer || "").toLowerCase();
    if (isCorrect) playCorrect(); else setTimeout(() => playWrong(), 250);

    const isLast = questionIndex === quiz.questions.length - 1;
    setTimeout(async () => {
      if (isLast) {
        stopMusic();
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        const correct = quiz.questions.filter(
          (q) => newAnswers[q.id]?.toLowerCase() === q.correct_answer?.toLowerCase()
        ).length;
        const score = Math.round((correct / quiz.questions.length) * 100);
        if (score >= 50) playWin(); else playLose();
        setStep("sending");
        setSendError("");
        try {
          await sendPdfChallenge(selectedFriend.id, quiz.id, {
            score,
            answersDetail: newAnswers,
            timeSpentSeconds: timeSpent,
          });
          setStep("sent");
        } catch (e) {
          setSendError(e.message || "Erreur lors de l'envoi du défi.");
          setStep("playing");
        }
      } else {
        setQuestionIndex((prev) => prev + 1);
        setLockedAnswer(null);
      }
    }, isCorrect ? 1100 : 1900);
  };

  /* ── Écrans ── */
  if (step === "sent") {
    return (
      <motion.div {...popIn} className="glass-panel rounded-3xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
          <FiCheckCircle size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">Défi envoyé !</h3>
        <p className="text-gray-400 text-sm mb-6">
          <span className="text-white font-semibold">{selectedFriend?.username}</span> recevra une notification pour jouer le même quiz.
        </p>
        <button onClick={onBack} className="btn-secondary w-full"><FiArrowLeft size={15} /> Retour</button>
      </motion.div>
    );
  }

  if (step === "sending") {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        <div className="animate-spin w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Envoi du défi…</p>
      </div>
    );
  }

  if (step === "playing" && quiz) {
    const q = quiz.questions[questionIndex];
    const progress = ((questionIndex + 1) / quiz.questions.length) * 100;
    const isLocked = lockedAnswer !== null;

    const renderOption = (option, idx) => {
      const selected = answers[q.id] === option;
      const isCorrectOpt = isLocked && option.toLowerCase() === (q.correct_answer || "").toLowerCase();
      const isWrong = isLocked && selected && !isCorrectOpt;
      return (
        <label key={idx}
          className={`glass-card flex items-center gap-3 p-4 rounded-2xl select-none transition-colors ${isLocked ? "cursor-default" : "cursor-pointer"} ${
            isCorrectOpt ? "!bg-green-500/15 !border-green-500/50 ring-1 ring-green-500/40"
            : isWrong ? "!bg-red-500/15 !border-red-500/50 ring-1 ring-red-500/40"
            : selected ? "!bg-pink-500/15 !border-pink-500/50 ring-1 ring-pink-500/40" : ""
          }`}
        >
          <input type="radio" name={`pq-${q.id}`} value={option} checked={selected}
            onChange={isLocked ? undefined : (e) => handleAnswer(q.id, e.target.value)}
            disabled={isLocked} className="w-5 h-5 accent-pink-500 flex-shrink-0" />
          <span className="text-sm text-white break-words flex-1">{option}</span>
          {isCorrectOpt && <FiCheckCircle className="flex-shrink-0 text-green-400" size={16} />}
          {isWrong && <FiX className="flex-shrink-0 text-red-400" size={16} />}
        </label>
      );
    };

    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { stopMusic(); setStep("pick-friend"); }} className="btn-ghost -ml-2">
            <FiArrowLeft size={20} /> Annuler
          </button>
          <MuteButton />
        </div>
        <div className="glass-panel rounded-3xl p-5 sm:p-8">
          <p className="text-xs text-gray-500 mb-1">Défi PDF vs {selectedFriend?.username}</p>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Q{questionIndex + 1}/{quiz.questions.length}</span>
              <span className="text-sm font-bold text-pink-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={questionIndex} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
              <h3 className="text-lg font-bold text-white mb-6 break-words">{q.question_text}</h3>
              <div className="space-y-3">
                {(q.type === "true_false" || quiz.type === "true_false")
                  ? ["Vrai", "Faux"].map((opt, i) => renderOption(opt, i))
                  : (q.options || []).map((opt, i) => renderOption(opt, i))}
              </div>
            </motion.div>
          </AnimatePresence>
          {sendError && <p className="text-xs text-red-400 mt-4">{sendError}</p>}
        </div>
      </div>
    );
  }

  if (step === "pick-friend") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="btn-ghost -ml-2"><FiArrowLeft size={20} /></button>
          <h3 className="text-lg font-black text-white">Choisir un ami à défier</h3>
        </div>
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-gray-400">
          Quiz généré depuis <span className="text-white font-semibold">{selectedDoc?.title || selectedDoc?.file_name || "votre PDF"}</span> · {quiz?.questions?.length} questions
        </div>
        {friends.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <FiUsers size={28} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm">Aucun ami disponible. Ajoutez des amis d'abord.</p>
            <button onClick={onBack} className="btn-secondary mt-4"><FiArrowLeft size={15} /> Retour</button>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <motion.div key={f.id} {...hoverLift}
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 flex items-center gap-3 cursor-pointer"
                onClick={() => startPlaying(f)}
              >
                <LetterAvatar username={f.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{f.username}</p>
                  <p className="text-[10px] text-gray-500">Niv.{f.level ?? 1} · {Math.round(f.score ?? 0)}%</p>
                </div>
                <motion.button {...tap}
                  className="btn-primary px-4 py-2 text-xs bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
                  <FiZap size={12} /> Défier
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        <div className="animate-spin w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Génération du quiz par l'IA…</p>
        {genError && <p className="text-xs text-red-400 mt-3">{genError}</p>}
      </div>
    );
  }

  // step === "select-doc"
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost -ml-2"><FiArrowLeft size={20} /></button>
        <h3 className="text-lg font-black text-white">Sélectionner un cours PDF</h3>
      </div>

      {genError && (
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs">{genError}</div>
      )}

      {docsError && <p className="text-xs text-red-400">{docsError}</p>}

      {docsLoading ? (
        <p className="text-gray-400 italic text-sm">Chargement de vos documents…</p>
      ) : documents.length > 0 ? (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Vos cours importés</p>
          <div className="space-y-2">
            {documents.map((doc) => (
              <motion.div key={doc.id} {...hoverLift}
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 flex items-center gap-3 cursor-pointer"
                onClick={() => handleGenerate(doc)}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                  <FiFileText className="text-purple-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{doc.title || doc.file_name || "Document"}</p>
                  <p className="text-[10px] text-gray-500">{doc.page_count ? `${doc.page_count} pages` : "PDF"}</p>
                </div>
                <FiZap size={14} className="text-purple-400 flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </>
      ) : null}

      {/* Upload nouveau PDF */}
      <div className="p-4 glass-card rounded-2xl border border-dashed border-white/20">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Téléverser un nouveau PDF</p>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => setUploadFile(e.target.files[0] || null)} />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 transition">
            <FiUpload size={16} />
            {uploadFile ? uploadFile.name : "Choisir un fichier PDF…"}
          </button>
          {uploadFile && (
            <motion.button {...tap} onClick={handleUploadAndGenerate}
              className="btn-primary px-4 bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
              <FiZap size={14} /> Générer
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION PRINCIPALE
   ═══════════════════════════════════════════════════════════════════ */
export default function FriendsSection() {
  const [phase, setPhase] = useState("list"); // list | setup-solo | solo | challenge-quiz | challenge-report | pdf-challenge
  const [settings, setSettings] = useState({ countdown_seconds: 30 });
  const [soloConfig, setSoloConfig] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [featureStatus, setFeatureStatus] = useState(null);

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [method, setMethod] = useState("pseudo");
  const [input, setInput] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [adding, setAdding] = useState(false);

  const pollRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [fr, req, ch, st] = await Promise.allSettled([
        getFriends(), getFriendRequests(), getChallenges(), getGameSettings(),
      ]);
      if (fr.status === "fulfilled") setFriends(Array.isArray(fr.value) ? fr.value : []);
      if (req.status === "fulfilled") setRequests(Array.isArray(req.value) ? req.value : []);
      if (ch.status === "fulfilled") setChallenges(Array.isArray(ch.value) ? ch.value : []);
      if (st.status === "fulfilled") setSettings(st.value);
    } catch {}
    finally { setLoadingData(false); }
  }, []);

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(loadAll, 15000);
    return () => clearInterval(pollRef.current);
  }, [loadAll]);

  useEffect(() => {
    getFeatureRequestStatus()
      .then((d) => setFeatureStatus(d.status))
      .catch(() => {});
  }, []);

  const acceptRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    try {
      await acceptFriendRequest(id);
      setRequests((p) => p.filter((r) => r.id !== id));
      if (req?.from_user) {
        const u = req.from_user;
        setFriends((p) => [{ id: u.id || Date.now(), username: u.username, level: u.level || 1, score: u.score || 0 }, ...p]);
      }
    } catch {}
  };
  const declineRequest = async (id) => {
    try { await declineFriendRequest(id); setRequests((p) => p.filter((r) => r.id !== id)); } catch {}
  };

  const handleAdd = async () => {
    if (!input.trim()) { setAddError("Champ vide."); return; }
    setAdding(true); setAddError(""); setAddSuccess("");
    try {
      await sendFriendRequest(method === "pseudo" ? { pseudo: input.trim() } : { email: input.trim() });
      setAddSuccess(`Demande envoyée à ${input.trim()} !`); setInput("");
    } catch (e) { setAddError(e.message || "Impossible d'envoyer la demande."); }
    finally { setAdding(false); }
  };

  const handleAcceptChallenge = async (ch) => {
    try {
      const updated = await acceptChallenge(ch.id);
      setChallenges((p) => p.map((c) => c.id === ch.id ? updated : c));
      setActiveChallenge(updated);
      setPhase("challenge-quiz");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefuseChallenge = async (id) => {
    try {
      await refuseChallenge(id);
      setChallenges((p) => p.filter((c) => c.id !== id));
    } catch {}
  };

  const backToList = () => {
    setPhase("list");
    setSoloConfig(null);
    setActiveChallenge(null);
    loadAll();
  };

  // Segmentation des défis
  const pendingReceived = challenges.filter((c) => c.status === "pending" && c.opponent?.id !== undefined);
  const acceptedReceived = challenges.filter((c) => c.status === "accepted");
  const completed = challenges.filter((c) => c.status === "completed" || c.status === "refused");

  /* ── Écrans ── */
  if (phase === "solo" && soloConfig)
    return <div className="w-full max-w-xl mx-auto pb-10"><SoloGame config={soloConfig} countdown={settings.countdown_seconds} onExit={backToList} /></div>;

  if (phase === "setup-solo")
    return (
      <div className="w-full max-w-xl mx-auto pb-10">
        <GameSetup
          defaults={{ themes: settings.mp_themes || [], types: settings.mp_types || [], difficulty: settings.mp_difficulty || "medium", count: 10 }}
          onStart={(p) => { setSoloConfig(p); setPhase("solo"); }}
          onCancel={backToList}
        />
      </div>
    );

  if (phase === "pdf-challenge")
    return (
      <div className="w-full max-w-xl mx-auto pb-10">
        <PdfChallengeFlow friends={friends} onBack={backToList} />
      </div>
    );

  if (phase === "challenge-quiz" && activeChallenge)
    return (
      <div className="w-full pb-10">
        <ChallengeQuizPlayer
          challenge={activeChallenge}
          onBack={backToList}
          onComplete={(completedChallenge) => {
            setActiveChallenge(completedChallenge);
            setPhase("challenge-report");
          }}
        />
      </div>
    );

  if (phase === "challenge-report" && activeChallenge)
    return (
      <div className="w-full pb-10">
        <ChallengeReport challenge={activeChallenge} onBack={backToList} />
      </div>
    );

  /* ── Liste principale ── */
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="w-full max-w-2xl mx-auto space-y-6 pb-10">
      <motion.div variants={staggerItem}>
        <h2 className="section-title">Amis &amp; Défis</h2>
        <p className="text-gray-500 text-fluid-sm mt-1">Jouez en solo ou défiez vos amis sur vos quiz de cours</p>
      </motion.div>

      {/* Solo */}
      <motion.div variants={staggerItem} {...hoverLift} className="glass-card rounded-2xl p-4 sm:p-5 border border-pink-500/20 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-2xl flex-shrink-0">🎯</div>
        <div className="flex-1 min-w-0">
          <p className="text-fluid-base font-black text-white">Mode Solo</p>
          <p className="text-fluid-sm text-gray-500">Enchaînez les bonnes réponses sans vous tromper</p>
        </div>
        <motion.button {...tap} onClick={() => setPhase("setup-solo")} className="btn-primary px-4 py-2.5 text-xs bg-gradient-to-r from-pink-600 to-purple-600 flex-shrink-0">
          <FiPlay size={13} fill="currentColor" /> Jouer
        </motion.button>
      </motion.div>

      {/* Info défi */}
      <motion.div variants={staggerItem} className="glass-card rounded-2xl p-4 border border-indigo-500/20 flex items-start gap-3">
        <FiAlertCircle size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          Pour défier un ami, jouez un quiz depuis la section <strong className="text-white">Documents</strong>, puis cliquez sur <strong className="text-white">Défier un ami</strong> sur la page de résultats.
        </p>
      </motion.div>

      {/* Défi PDF (si activé) */}
      {featureStatus === "approved" && (
        <motion.div variants={staggerItem} {...hoverLift} className="glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/20 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <FiFileText size={22} className="text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-fluid-base font-black text-white">Défi depuis un PDF</p>
            <p className="text-fluid-sm text-gray-500">L'IA génère un quiz depuis votre cours et vous défiez un ami</p>
          </div>
          <motion.button {...tap} onClick={() => setPhase("pdf-challenge")}
            className="btn-primary px-4 py-2.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
            <FiZap size={13} /> Lancer
          </motion.button>
        </motion.div>
      )}

      {/* Défis reçus en attente */}
      {pendingReceived.length > 0 && (
        <motion.div variants={staggerItem} className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-4">
            <FiZap size={16} className="text-amber-400" />
            <h3 className="text-fluid-base font-black text-white">Défis reçus</h3>
            <span className="chip ml-auto bg-amber-500/20 border-amber-500/30 text-amber-300">{pendingReceived.length}</span>
          </div>
          <div className="space-y-2">
            {pendingReceived.map((ch) => (
              <div key={ch.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <LetterAvatar username={ch.challenger?.username} size="w-9 h-9" textSize="text-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ch.challenger?.username}</p>
                  <p className="text-[10px] text-gray-500">{ch.quiz?.document_title || "Quiz"} · {ch.quiz?.number_of_questions} questions</p>
                </div>
                <div className="flex gap-1.5">
                  <motion.button {...tap} onClick={() => handleAcceptChallenge(ch)}
                    className="btn-primary px-3 py-2 text-xs bg-gradient-to-r from-amber-600 to-orange-600">
                    <FiPlay size={11} fill="currentColor" /> Jouer
                  </motion.button>
                  <motion.button {...tap} onClick={() => handleRefuseChallenge(ch.id)}
                    className="w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center text-red-400">
                    <FiX size={14} />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Défis acceptés (en cours — à jouer) */}
      {acceptedReceived.filter((c) => c.opponent_score === null).length > 0 && (
        <motion.div variants={staggerItem} className="glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-4">
            <FiClock size={16} className="text-purple-400" />
            <h3 className="text-fluid-base font-black text-white">À jouer</h3>
          </div>
          <div className="space-y-2">
            {acceptedReceived.filter((c) => c.opponent_score === null).map((ch) => (
              <div key={ch.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <LetterAvatar username={ch.challenger?.username} size="w-9 h-9" textSize="text-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ch.challenger?.username} vous a défié</p>
                  <p className="text-[10px] text-gray-500">{ch.quiz?.document_title || "Quiz"}</p>
                </div>
                <motion.button {...tap} onClick={() => { setActiveChallenge(ch); setPhase("challenge-quiz"); }}
                  className="btn-primary px-3 py-2 text-xs bg-gradient-to-r from-purple-600 to-indigo-600">
                  <FiPlay size={11} fill="currentColor" /> Jouer
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Demandes d'amis reçues */}
      {requests.length > 0 && (
        <motion.div variants={staggerItem} className="glass-card rounded-2xl p-4 sm:p-5 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-4">
            <FiUsers size={16} className="text-indigo-400" />
            <h3 className="text-fluid-base font-black text-white">Demandes reçues</h3>
            <span className="chip ml-auto bg-indigo-500/20 border-indigo-500/30 text-indigo-300">{requests.length}</span>
          </div>
          <div className="space-y-2">
            {requests.map((req) => {
              const u = req.from_user || {};
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <LetterAvatar username={u.username} size="w-9 h-9" textSize="text-sm" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">{u.username || "Utilisateur"}</p></div>
                  <div className="flex gap-1.5">
                    <motion.button {...tap} onClick={() => acceptRequest(req.id)} className="w-10 h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400"><FiCheck size={16} strokeWidth={3} /></motion.button>
                    <motion.button {...tap} onClick={() => declineRequest(req.id)} className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 flex items-center justify-center text-red-400"><FiX size={16} /></motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Ajouter un ami */}
      <motion.div variants={staggerItem} className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10">
        <div className="flex items-center gap-2 mb-4"><FiUserPlus size={16} className="text-gray-400" /><h3 className="text-fluid-base font-black text-white">Ajouter un ami</h3></div>
        <div className="flex gap-2 mb-3 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {[{ key: "pseudo", icon: <FiHash size={12} />, label: "Pseudo" }, { key: "email", icon: <FiMail size={12} />, label: "Email" }].map(({ key, icon, label }) => (
            <button key={key} onClick={() => { setMethod(key); setInput(""); setAddError(""); setAddSuccess(""); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${method === key ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>{icon} {label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type={method === "email" ? "email" : "text"} value={input}
            onChange={(e) => { setInput(e.target.value); setAddError(""); setAddSuccess(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={method === "pseudo" ? "Pseudo de l'ami…" : "Email de l'ami…"} className="input-field flex-1 min-w-0 text-sm" />
          <motion.button {...tap} onClick={handleAdd} disabled={adding} className="btn-primary px-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0">
            {adding ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={14} />}
          </motion.button>
        </div>
        {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
        {addSuccess && <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><FiCheck size={11} />{addSuccess}</p>}
      </motion.div>

      {/* Historique des défis terminés */}
      {completed.length > 0 && (
        <motion.div variants={staggerItem}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Historique des défis</p>
          <div className="space-y-2">
            {completed.slice(0, 8).map((ch) => {
              const isChallenger = ch.challenger?.username !== undefined;
              const otherName = isChallenger ? ch.opponent?.username : ch.challenger?.username;
              const won = ch.winner !== null && ch.winner?.id !== undefined;
              const isWinner = ch.winner?.username !== undefined;
              return (
                <div key={ch.id} className="flex items-center gap-3 p-3 glass-card rounded-xl">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    ch.status === "refused" ? "bg-gray-500/20 text-gray-500" :
                    isWinner ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/15 text-red-400"
                  }`}>
                    {ch.status === "refused" ? <FiX size={14} /> : isWinner ? "🏆" : "😅"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {ch.status === "refused" ? `${otherName} a refusé` : `vs ${otherName}`}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {ch.status === "completed" && ch.challenger_score !== null
                        ? `${ch.challenger_score?.toFixed(0)}% vs ${ch.opponent_score?.toFixed(0) ?? "…"}%`
                        : ch.quiz?.document_title || "Quiz"}
                    </p>
                  </div>
                  {ch.status === "completed" && (
                    <motion.button {...tap}
                      onClick={() => { setActiveChallenge(ch); setPhase("challenge-report"); }}
                      className="btn-secondary px-3 py-2 text-xs flex-shrink-0">
                      Rapport
                    </motion.button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Liste d'amis */}
      <motion.div variants={staggerItem}>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Mes amis — {friends.length}</p>
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {friends.map((f) => (
              <div key={f.id} className="glass-card rounded-2xl p-4 border border-white/10 hover:border-indigo-500/30 flex items-center gap-3 min-w-0">
                <LetterAvatar username={f.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{f.username}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-gray-600 flex items-center gap-1"><FiTrendingUp size={9} /> Niv.{f.level ?? 1}</span>
                    <span className="text-[10px] text-gray-600 flex items-center gap-1"><FiAward size={9} /> {Math.round(f.score ?? 0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loadingData && (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4"><FiUsers size={22} className="text-gray-600" /></div>
              <p className="text-gray-500 font-medium text-sm">Aucun ami pour l'instant</p>
            </div>
          )
        )}
      </motion.div>
    </motion.div>
  );
}
