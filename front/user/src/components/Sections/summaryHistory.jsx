import { useState, useEffect, useCallback } from "react";
import {
  FiArrowLeft, FiCopy, FiCheck, FiClock, FiFileText, FiRefreshCw, FiDownload,
  FiAlertCircle, FiHelpCircle, FiPlay, FiPlus, FiChevronDown, FiChevronUp,
  FiCheckCircle, FiX, FiAlertTriangle, FiRotateCcw,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { getSummaries, getQuizzes, getQuiz, generateQuiz, submitQuizResult, getDocument } from "../../services/api";
import { exportSummaryAsPdf } from "../../utils/pdfExport";
import { fadeInUp, popIn, staggerContainer, staggerItem, hoverLift, tap } from "../../lib/motion";

const QUIZ_LIMIT = 20;

const QUIZ_TYPES = [
  { key: "qcm",        label: "QCM",         desc: "Choix multiple" },
  { key: "true_false", label: "Vrai / Faux", desc: "2 choix" },
  { key: "mixed",      label: "Mixte",       desc: "QCM + Vrai/Faux" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
const SUMMARY_META = {
  brief:    { label: "Rapide",   color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" },
  medium:   { label: "Moyen",    color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
  detailed: { label: "Détaillé", color: "text-pink-400",   bg: "bg-pink-500/15   border-pink-500/30"   },
};

function formatDate(s) {
  return new Date(s).toLocaleDateString("fr-FR", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Quiz Player inline ───────────────────────────────────────────────────────
function InlineQuizPlayer({ quiz: initialQuiz, onBack, onComplete }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now);

  useEffect(() => {
    getQuiz(initialQuiz.id)
      .then(setQuiz)
      .finally(() => setLoading(false));
  }, [initialQuiz.id]);

  const calcScore = () => {
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id]?.toLowerCase() === q.correct_answer?.toLowerCase()) correct++;
    });
    return { correct, total: quiz.questions.length, pct: Math.round((correct / quiz.questions.length) * 100) };
  };

  const finish = async () => {
    const score = calcScore();
    try {
      await submitQuizResult(quiz.id, {
        score: score.pct,
        time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        answers_detail: answers,
      });
    } catch {}
    setShowResults(true);
    if (onComplete) onComplete(quiz.id, score.pct);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Chargement du quiz...</p>
      </div>
    );
  }

  if (!quiz) return null;

  if (showResults) {
    const score = calcScore();
    return (
      <motion.div {...popIn} className="w-full max-w-2xl mx-auto">
        <div className="glass-card rounded-3xl p-5 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500 to-pink-500 flex items-center justify-center">
            <span className="text-fluid-2xl font-black text-white">{score.pct}%</span>
          </div>
          <h3 className="text-fluid-xl font-black text-white mb-2">Quiz terminé !</h3>
          <p className="text-gray-400 mb-7">{score.correct} bonne{score.correct > 1 ? "s" : ""} réponse{score.correct > 1 ? "s" : ""} sur {score.total}</p>

          <div className="text-left space-y-3 max-h-80 overflow-y-auto custom-scrollbar mb-7 pr-1">
            {quiz.questions.map((q, i) => {
              const ua = answers[q.id];
              const ok = ua?.toLowerCase() === q.correct_answer?.toLowerCase();
              return (
                <div key={q.id} className={`p-4 rounded-2xl border ${ok ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <div className="flex gap-3">
                    {ok
                      ? <FiCheckCircle className="text-emerald-400 flex-shrink-0 mt-0.5" size={16} />
                      : <FiX className="text-red-400 flex-shrink-0 mt-0.5" size={16} />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white mb-1 break-words">{q.question_text}</p>
                      <p className="text-xs text-gray-400 break-words">Votre réponse : {ua || "—"}</p>
                      {!ok && <p className="text-xs text-emerald-400 mt-0.5 break-words">Bonne réponse : {q.correct_answer}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={onBack} className="btn-primary w-full">
            Retour
          </button>
        </div>
      </motion.div>
    );
  }

  const q = quiz.questions[currentIdx];
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  return (
    <motion.div {...fadeInUp} className="w-full max-w-2xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-5 group">
        <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Retour
      </button>

      <div className="glass-card rounded-3xl p-5 sm:p-7">
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Question {currentIdx + 1} / {quiz.questions.length}</span>
            <span className="text-pink-400 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="text-base font-bold text-white mb-5 break-words">{q.question_text}</p>

        <div className="space-y-2.5 mb-7">
          {(
            (q.type === "true_false" || quiz.type === "true_false" ? ["Vrai", "Faux"] : q.options || []).map((opt) => (
              <label key={opt} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                answers[q.id] === opt
                  ? "bg-pink-500/20 border-pink-500/40 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:border-pink-500/30 hover:bg-white/5"
              }`}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className="accent-pink-500 flex-shrink-0"
                />
                <span className="text-sm break-words min-w-0">{opt}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentIdx((i) => i - 1)}
            disabled={currentIdx === 0}
            className="px-3 sm:px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 rounded-xl transition text-sm font-semibold flex-shrink-0"
          >
            Précédent
          </button>
          {currentIdx < quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition text-sm"
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm"
            >
              Terminer
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Quizzes tab ──────────────────────────────────────────────────────────────
const QUIZ_TYPE_LABELS = {
  qcm: "QCM",
  true_false: "Vrai / Faux",
  mixed: "Mixte",
};

const DIFFICULTY_FORM = [
  { key: "easy",   label: "Facile" },
  { key: "medium", label: "Moyen" },
  { key: "hard",   label: "Difficile" },
];

function QuizzesTab({ documentId, document }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [completedScores, setCompletedScores] = useState({});

  // Generation form
  const [showForm, setShowForm] = useState(false);
  const [genType, setGenType] = useState("qcm");
  const [genDifficulty, setGenDifficulty] = useState("medium");
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const hasText = !!document?.extracted_text;
  const limitReached = quizzes.length >= QUIZ_LIMIT;

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getQuizzes(documentId);
      setQuizzes(data);
    } catch (err) {
      setError(err.message || "Impossible de charger les quizzes.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) loadQuizzes();
  }, [documentId, loadQuizzes]);

  const handleGenerate = async () => {
    if (!hasText || limitReached) return;
    setGenerating(true);
    setGenError("");
    try {
      await generateQuiz(documentId, { type: genType, numberOfQuestions: genCount, difficulty: genDifficulty });
      setShowForm(false);
      await loadQuizzes();
    } catch (err) {
      setGenError(err.message || "Impossible de générer le quiz.");
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = (quizId, score) => {
    setCompletedScores((prev) => ({ ...prev, [quizId]: score }));
  };

  if (activeQuiz) {
    return (
      <InlineQuizPlayer
        quiz={activeQuiz}
        onBack={() => setActiveQuiz(null)}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Limite 20 quiz */}
      {limitReached && (
        <motion.div
          {...fadeInUp}
          className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl"
        >
          <FiAlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300 font-medium">
            Limite atteinte : vous avez déjà {QUIZ_LIMIT} quiz.
          </p>
        </motion.div>
      )}

      {/* Generate button */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={!hasText || limitReached}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-sm font-bold text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors group"
        >
          <span className="flex items-center gap-2 flex-wrap min-w-0">
            <FiPlus size={16} className="text-pink-400 flex-shrink-0" />
            Générer un nouveau quiz
            <span className="text-[10px] font-normal text-gray-600 ml-1">
              ({quizzes.length}/{QUIZ_LIMIT})
            </span>
          </span>
          {showForm ? <FiChevronUp size={15} className="text-gray-500 flex-shrink-0" /> : <FiChevronDown size={15} className="text-gray-500 flex-shrink-0" />}
        </button>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="px-4 sm:px-6 py-5 space-y-5">
                {!hasText && (
                  <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                    Ce document n'a pas de texte extrait — impossible de générer un quiz.
                  </p>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-3">Format</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUIZ_TYPES.map(({ key, label, desc }) => (
                      <button
                        key={key}
                        onClick={() => setGenType(key)}
                        className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                          genType === key
                            ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                            : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <div>{label}</div>
                        <div className="text-[10px] font-normal opacity-60 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-3">Niveau de difficulté</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTY_FORM.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setGenDifficulty(key)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                          genDifficulty === key
                            ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                            : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-pink-400">Nombre de questions</p>
                    <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded-md">{genCount}</span>
                  </div>
                  <input
                    type="range" min="1" max="30" step="1" value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase mt-1">
                    <span>1</span><span>30</span>
                  </div>
                </div>

                {genError && <p className="text-xs text-red-400">{genError}</p>}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGenerate}
                  disabled={generating || !hasText || limitReached}
                  className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-pink-500/20"
                >
                  {generating ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Génération...</>
                  ) : (
                    <><FiPlay size={14} fill="currentColor" /> Générer le quiz</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quiz list */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-sm">
          <FiAlertCircle size={15} className="flex-shrink-0" />{error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <div className="text-center py-14">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <FiHelpCircle size={22} className="text-gray-600" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Aucun quiz généré</p>
          <p className="text-xs text-gray-600 mt-1">Cliquez sur "Générer un nouveau quiz" ci‑dessus.</p>
        </div>
      )}

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
        {quizzes.map((quiz) => {
          const isDone = quiz.id in completedScores;
          const lastScore = completedScores[quiz.id];
          const typeLabel = QUIZ_TYPE_LABELS[quiz.type] ?? quiz.type?.toUpperCase() ?? "Quiz";

          return (
            <motion.div
              key={quiz.id}
              variants={staggerItem}
              className={`glass-card rounded-2xl p-4 sm:p-5 transition-all border ${
                isDone ? "border-emerald-500/20 hover:border-emerald-500/40" : "hover:border-pink-500/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    isDone
                      ? "bg-emerald-500/15 border-emerald-500/30"
                      : "bg-pink-500/15 border-pink-500/30"
                  }`}>
                    {isDone
                      ? <FiCheckCircle size={16} className="text-emerald-400" />
                      : <FiHelpCircle size={16} className="text-pink-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white break-words">
                      {typeLabel} — {quiz.number_of_questions} question{quiz.number_of_questions > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <FiClock size={11} className="text-gray-600 flex-shrink-0" />
                        <span className="text-xs text-gray-500">{formatDate(quiz.created_at)}</span>
                      </div>
                      {isDone && lastScore != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          lastScore >= 75
                            ? "bg-emerald-500/20 text-emerald-400"
                            : lastScore >= 50
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {lastScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isDone ? (
                  <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
                    <motion.button
                      {...tap}
                      onClick={() => setActiveQuiz(quiz)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-bold transition-all"
                    >
                      <FiRotateCcw size={12} /> Rejouer
                    </motion.button>
                    <motion.button
                      {...tap}
                      onClick={() => setActiveQuiz(quiz)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all"
                    >
                      <FiCheckCircle size={12} /> Voir le quiz
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    {...hoverLift}
                    onClick={() => setActiveQuiz(quiz)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-lg shadow-pink-500/20"
                  >
                    <FiPlay size={12} fill="currentColor" /> Commencer le quiz
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SummaryHistory({ documentId, document: docProp, onBack }) {
  const [activeTab, setActiveTab] = useState("summaries");
  const [document, setDocument] = useState(docProp || null);

  // Summaries state
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load document if not passed as prop
  useEffect(() => {
    if (docProp) { setDocument(docProp); return; }
    if (documentId) {
      getDocument(documentId).then(setDocument).catch(() => {});
    }
  }, [docProp, documentId]);

  const loadSummaries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSummaries(documentId);
      setSummaries(data);
    } catch (err) {
      setError(err.message || "Impossible de charger les résumés.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) loadSummaries();
  }, [documentId, loadSummaries]);

  const handleCopy = async () => {
    if (!selectedSummary) return;
    await navigator.clipboard.writeText(selectedSummary.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (s) => {
    const target = s || selectedSummary;
    if (!target) return;
    exportSummaryAsPdf({
      content: target.content,
      documentTitle: document?.title || "Document",
      summaryType: target.type,
      generatedAt: target.created_at,
    });
  };

  // ── Summary detail view ───────────────────────────────────────────────────
  if (selectedSummary) {
    const meta = SUMMARY_META[selectedSummary.type] || SUMMARY_META.brief;
    return (
      <motion.div {...fadeInUp} className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col gap-3 min-[440px]:flex-row min-[440px]:flex-wrap min-[440px]:items-center min-[440px]:justify-between mb-6">
          <button
            onClick={() => setSelectedSummary(null)}
            className="btn-ghost px-0 hover:bg-transparent group self-start"
          >
            <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Retour à l'historique
          </button>
          <div className="flex flex-wrap items-center gap-2 self-end min-[440px]:self-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all text-sm font-semibold"
            >
              {copied ? <FiCheck size={14} className="text-emerald-400" /> : <FiCopy size={14} />}
              {copied ? "Copié !" : "Copier"}
            </button>
            <button
              onClick={() => handleDownload()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-bold"
            >
              <FiDownload size={14} /> PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FiClock size={11} className="flex-shrink-0" />{formatDate(selectedSummary.created_at)}
          </div>
        </div>
        <div className="card p-5 sm:p-8 prose prose-invert prose-sm max-w-none break-words text-gray-300 leading-relaxed [&_*]:max-w-full [&_pre]:overflow-x-auto [&_pre]:custom-scrollbar [&_img]:h-auto [&_table]:block [&_table]:overflow-x-auto [&_h1]:text-fluid-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-5 [&_h2]:text-fluid-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-fluid-base [&_h3]:font-bold [&_h3]:text-indigo-300 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-5 [&_p]:leading-relaxed [&_ul]:mb-5 [&_ul]:pl-5 [&_ol]:mb-5 [&_ol]:pl-5 [&_li]:mb-2 [&_strong]:text-white [&_strong]:font-semibold">
          <ReactMarkdown>{selectedSummary.content}</ReactMarkdown>
        </div>
      </motion.div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header — titre mis en valeur */}
      <motion.div {...fadeInUp} className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-semibold">Document sélectionné</p>
        <h3 className="section-title text-gradient leading-tight break-words">
          {document?.title || "Historique"}
        </h3>
        <div className="mt-2 h-0.5 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500" />
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-white/5 rounded-2xl border border-white/10 w-full sm:w-fit">
        {[
          { key: "summaries", label: "Résumés", icon: FiFileText },
          { key: "quizzes",   label: "Quizzes",  icon: FiHelpCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === key
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon size={14} className="flex-shrink-0" /> {label}
          </button>
        ))}
      </div>

      {/* Summaries tab */}
      {activeTab === "summaries" && (
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <p className="text-xs text-gray-500">{summaries.length} résumé{summaries.length !== 1 ? "s" : ""} généré{summaries.length !== 1 ? "s" : ""}</p>
            <button
              onClick={loadSummaries}
              disabled={loading}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all font-semibold disabled:opacity-50"
            >
              <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} /> Rafraîchir
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-sm mb-5">
              <FiAlertCircle size={14} className="flex-shrink-0" />{error}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
            </div>
          )}

          {!loading && summaries.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <FiFileText size={22} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium text-sm">Aucun résumé généré</p>
              <p className="text-xs text-gray-600 mt-1">Générez un résumé depuis l'onglet Résumés.</p>
            </div>
          )}

          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {summaries.map((summary) => {
              const meta = SUMMARY_META[summary.type] || SUMMARY_META.brief;
              return (
                <motion.div
                  key={summary.id}
                  variants={staggerItem}
                  className="glass-card rounded-2xl p-4 sm:p-5 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
                        <FiFileText size={15} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-white">Résumé {meta.label}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <FiClock size={11} className="text-gray-600 flex-shrink-0" />
                          <span className="text-xs text-gray-500">{formatDate(summary.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed break-words">{summary.content.slice(0, 120)}…</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-start">
                      <button
                        onClick={() => handleDownload(summary)}
                        title="Télécharger PDF"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all border border-white/5"
                      >
                        <FiDownload size={14} />
                      </button>
                      <button
                        onClick={() => setSelectedSummary(summary)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 rounded-xl transition-all text-xs font-bold"
                      >
                        Voir
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Quizzes tab */}
      {activeTab === "quizzes" && (
        <QuizzesTab documentId={documentId} document={document} />
      )}
    </div>
  );
}
