import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlay, FiArrowLeft, FiCheckCircle, FiX, FiRefreshCw, FiZap, FiUsers, FiFileText, FiSend, FiClock, FiAlertCircle } from "react-icons/fi";
import { getQuizzes, getQuiz, submitQuizResult, getFriends, sendChallenge, sendFeatureRequest, getFeatureRequestStatus } from "../../services/api";
import { popIn, staggerContainer, staggerItem, hoverLift, tap, EASE } from "../../lib/motion";
import { useGameSounds } from "../../GameSoundContext";
import MuteButton from "../ui/MuteButton";

const QUIZ_TYPE_LABELS = {
  qcm: "QCM",
  true_false: "Vrai / Faux",
  mixed: "Mixte",
};

export default function QuizPlayer({ documentId, onBack }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [lockedAnswer, setLockedAnswer] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [challengeState, setChallengeState] = useState("idle"); // idle|picking|sending|sent|error
  const [friends, setFriends] = useState([]);
  const [challengeError, setChallengeError] = useState("");
  const [featureStatus, setFeatureStatus] = useState(null); // null|"none"|"pending"|"approved"|"refused"
  const [featureReason, setFeatureReason] = useState("");
  const [featureSending, setFeatureSending] = useState(false);
  const { startMusic, stopMusic, playCorrect, playWrong, playWin, playLose } = useGameSounds();

  // Coupe la musique si on quitte le lecteur de quiz.
  useEffect(() => () => stopMusic(), [stopMusic]);

  useEffect(() => {
    getFeatureRequestStatus()
      .then((d) => { setFeatureStatus(d.status); setFeatureReason(d.reason || ""); })
      .catch(() => {});
  }, []);

  const handleSendFeatureRequest = async () => {
    setFeatureSending(true);
    try {
      await sendFeatureRequest();
      setFeatureStatus("pending");
    } catch (err) {
      if (err.message?.includes("pending") || err.message?.includes("déjà")) {
        setFeatureStatus("pending");
      }
    } finally {
      setFeatureSending(false);
    }
  };

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
    if (documentId) {
      loadQuizzes();
    }
  }, [documentId, loadQuizzes]);

  // Réinitialise le verrou quand on change de question.
  useEffect(() => { setLockedAnswer(null); }, [currentQuestionIndex]);

  const startQuiz = async (quiz) => {
    setLoading(true);
    try {
      const fullQuiz = await getQuiz(quiz.id);
      setSelectedQuiz(fullQuiz);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setShowResults(false);
      setIsFinishing(false);
      setLockedAnswer(null);
      setQuizStartTime(Date.now());
      setChallengeState("idle");
      setChallengeError("");
      startMusic();
    } catch (err) {
      setError(err.message || "Impossible de charger le quiz.");
    } finally {
      setLoading(false);
    }
  };

  const doFinishQuiz = async (answers) => {
    const timeSpent = Math.round((Date.now() - quizStartTime) / 1000);
    let correct = 0;
    selectedQuiz.questions.forEach((q) => {
      if (answers[q.id] && answers[q.id].toLowerCase() === q.correct_answer.toLowerCase())
        correct++;
    });
    const percentage = Math.round((correct / selectedQuiz.questions.length) * 100);

    stopMusic();
    setIsFinishing(true);
    if (percentage >= 50) playWin(); else playLose();

    try {
      await submitQuizResult(selectedQuiz.id, {
        score: percentage,
        time_spent_seconds: timeSpent,
        answers_detail: answers,
      });
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du résultat:", err);
    }

    // Délai avant d'afficher les résultats (laisse le son + feedback s'installer).
    setTimeout(() => {
      setIsFinishing(false);
      setShowResults(true);
    }, 1600);
  };

  const handleAnswerChange = (questionId, answer) => {
    if (lockedAnswer !== null) return;

    const newAnswers = { ...userAnswers, [questionId]: answer };
    setUserAnswers(newAnswers);
    setLockedAnswer(answer);

    const q = selectedQuiz?.questions?.find((x) => x.id === questionId);
    const isCorrect = q && answer.toLowerCase() === (q.correct_answer || "").toLowerCase();

    if (isCorrect) {
      playCorrect();
    } else {
      // Petit délai pour laisser le feedback visuel (rouge) s'afficher avant le son.
      setTimeout(() => playWrong(), 250);
    }

    const isLastQ = currentQuestionIndex === selectedQuiz.questions.length - 1;
    // Délai plus long pour une mauvaise réponse (feedback visible plus longtemps).
    const delay = isCorrect ? 1100 : 1900;

    setTimeout(() => {
      if (isLastQ) {
        doFinishQuiz(newAnswers);
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    }, delay);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0 && lockedAnswer === null) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    selectedQuiz.questions.forEach((question) => {
      if (
        userAnswers[question.id] &&
        userAnswers[question.id].toLowerCase() ===
          question.correct_answer.toLowerCase()
      ) {
        correct++;
      }
    });
    return {
      correct,
      total: selectedQuiz.questions.length,
      percentage: Math.round((correct / selectedQuiz.questions.length) * 100),
    };
  };

  const resetToList = () => {
    stopMusic();
    setSelectedQuiz(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResults(false);
    setIsFinishing(false);
    setLockedAnswer(null);
  };

  if (selectedQuiz && isFinishing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Calcul des résultats…</p>
        </div>
      </div>
    );
  }

  if (selectedQuiz && !showResults) {
    const question = selectedQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;
    const isLocked = lockedAnswer !== null;

    const renderOption = (option, idx) => {
      const selected = userAnswers[question.id] === option;
      const isCorrectOption = isLocked && option.toLowerCase() === (question.correct_answer || "").toLowerCase();
      const isWrongSelection = isLocked && selected && !isCorrectOption;

      return (
        <motion.label
          key={idx}
          variants={staggerItem}
          className={`glass-card flex items-center gap-3 p-4 rounded-2xl select-none transition-colors ${
            isLocked ? "cursor-default" : "cursor-pointer"
          } ${
            isCorrectOption
              ? "!bg-green-500/15 !border-green-500/50 ring-1 ring-green-500/40"
              : isWrongSelection
              ? "!bg-red-500/15 !border-red-500/50 ring-1 ring-red-500/40"
              : selected
              ? "!bg-pink-500/15 !border-pink-500/50 ring-1 ring-pink-500/40"
              : ""
          }`}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            value={option}
            checked={selected}
            onChange={isLocked ? undefined : (e) => handleAnswerChange(question.id, e.target.value)}
            disabled={isLocked}
            className="w-5 h-5 accent-pink-500 flex-shrink-0"
          />
          <span className="text-fluid-base text-white break-words flex-1">{option}</span>
          {isCorrectOption && <FiCheckCircle className="flex-shrink-0 text-green-400" size={18} />}
          {isWrongSelection && <FiX className="flex-shrink-0 text-red-400" size={18} />}
        </motion.label>
      );
    };

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={resetToList}
            className="btn-ghost -ml-2"
          >
            <FiArrowLeft size={20} />
            Retour
          </button>
          <MuteButton />
        </div>

        <div className="glass-panel rounded-3xl p-5 sm:p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2 gap-3">
              <span className="text-fluid-sm text-gray-400">
                Question {currentQuestionIndex + 1} / {selectedQuiz.questions.length}
              </span>
              <span className="text-fluid-sm font-bold text-pink-400 flex-shrink-0">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <h3 className="text-fluid-xl font-bold text-white mb-6 break-words">
                {question.question_text}
              </h3>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-3 mb-8"
              >
                {(question.type === "true_false" || selectedQuiz.type === "true_false") ? (
                  ["Vrai", "Faux"].map((option, idx) => renderOption(option, idx))
                ) : (
                  (question.options || []).map((option, idx) => renderOption(option, idx))
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-2">
            <motion.button
              {...tap}
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0 || isLocked}
              className="btn-secondary"
            >
              <FiArrowLeft size={16} />
              Précédent
            </motion.button>
            <span className="text-xs text-gray-500 ml-2">
              {isLocked
                ? "Passage à la suite…"
                : "Sélectionnez une réponse pour continuer"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuiz && showResults) {
    const score = calculateScore();
    const passed = score.percentage >= 50;

    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Barre de navigation — reste en haut */}
        <div className="flex items-center justify-between py-6">
          <button onClick={resetToList} className="btn-ghost -ml-2">
            <FiArrowLeft size={20} />
            Retour
          </button>
          <MuteButton />
        </div>

        {/* Carte centrée verticalement dans l'espace restant */}
        <div className="flex items-center justify-center min-h-[calc(100svh-220px)] pb-8">
        <div className="w-full">
        <motion.div
          {...popIn}
          className="glass-panel rounded-3xl p-5 sm:p-8 text-center relative overflow-hidden"
        >
          {/* Confettis légers CSS/framer — uniquement si réussite */}
          {passed && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {[...Array(14)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute top-0 w-1.5 h-2.5 rounded-sm"
                  style={{
                    left: `${(i / 14) * 100}%`,
                    backgroundColor: ["#ec4899", "#a855f7", "#6366f1", "#22c55e"][i % 4],
                  }}
                  initial={{ y: -20, opacity: 0, rotate: 0 }}
                  animate={{ y: 320, opacity: [0, 1, 1, 0], rotate: 360 }}
                  transition={{
                    duration: 1.8 + (i % 5) * 0.25,
                    delay: 0.2 + (i % 7) * 0.08,
                    ease: "easeIn",
                    repeat: Infinity,
                    repeatDelay: 1.4,
                  }}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={passed
              ? { scale: 1, rotate: 0 }
              : { scale: 1, rotate: 0, x: [0, -10, 10, -7, 7, 0] }}
            transition={passed
              ? { type: "spring", stiffness: 200, damping: 14, delay: 0.1 }
              : { duration: 0.55, delay: 0.15 }}
            className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg ${
              passed
                ? "bg-gradient-to-br from-green-500 to-pink-500 shadow-pink-500/30 animate-pulse-glow"
                : "bg-gradient-to-br from-orange-500 to-red-600 shadow-red-500/30"
            }`}
          >
            <span className="text-fluid-2xl font-black text-white">{score.percentage}%</span>
          </motion.div>

          <h3 className="section-title mb-2">{passed ? "Bravo ! 🎉" : "Quiz terminé"}</h3>
          <p className="text-fluid-base text-gray-400 mb-8">
            Vous avez obtenu {score.correct} réponses correctes sur {score.total}
          </p>

          <div className="card p-4 sm:p-6 mb-8 text-left max-h-96 overflow-y-auto custom-scrollbar">
            {selectedQuiz.questions.map((question, idx) => {
              const userAnswer = userAnswers[question.id];
              const isCorrect =
                userAnswer &&
                userAnswer.toLowerCase() === question.correct_answer.toLowerCase();

              return (
                <div
                  key={question.id}
                  className="mb-4 pb-4 border-b border-white/10 last:border-0 last:mb-0 last:pb-0"
                >
                  <div className="flex gap-3 mb-2">
                    {isCorrect ? (
                      <FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                    ) : (
                      <FiX className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-fluid-sm font-semibold text-white break-words">{question.question_text}</p>
                      <p className="text-xs text-gray-400 mt-1 break-words">
                        Votre réponse: {userAnswer || "Non répondu"}
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-green-400 mt-1 break-words">
                          Bonne réponse: {question.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={resetToList}
              className="btn-secondary flex-1"
            >
              Retour aux quizzes
            </button>
            <motion.button
              {...tap}
              onClick={async () => {
                if (challengeState === "idle") {
                  setChallengeState("picking");
                  setChallengeError("");
                  const list = await getFriends().catch(() => []);
                  setFriends(Array.isArray(list) ? list : []);
                } else {
                  setChallengeState("idle");
                }
              }}
              className="btn-primary flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            >
              <FiZap size={15} />
              {challengeState === "idle" ? "Défier un ami" : "Annuler"}
            </motion.button>
          </div>

          {/* Sélecteur d'ami pour le défi */}
          {(challengeState === "picking" || challengeState === "sending" || challengeState === "sent" || challengeState === "error") && (
            <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              {challengeState === "sent" ? (
                <div className="text-center py-2">
                  <FiCheckCircle className="text-emerald-400 mx-auto mb-2" size={28} />
                  <p className="text-emerald-300 font-bold text-sm">Défi envoyé !</p>
                  <p className="text-gray-500 text-xs mt-1">Votre ami recevra une notification.</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-2">
                  <FiUsers className="text-gray-600 mx-auto mb-2" size={24} />
                  <p className="text-gray-500 text-sm">Aucun ami à défier pour l'instant.</p>
                  <p className="text-xs text-gray-600 mt-1">Ajoutez des amis dans la section Amis & Défis.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Choisissez un ami</p>
                  {challengeError && <p className="text-xs text-red-400 mb-2">{challengeError}</p>}
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {friends.map((f) => (
                      <motion.button
                        key={f.id}
                        {...tap}
                        disabled={challengeState === "sending"}
                        onClick={async () => {
                          setChallengeState("sending");
                          setChallengeError("");
                          try {
                            const sc = calculateScore();
                            await sendChallenge(f.id, selectedQuiz.id, {
                              score: sc.percentage,
                              answersDetail: userAnswers,
                            });
                            setChallengeState("sent");
                          } catch (err) {
                            setChallengeError(err.message || "Erreur lors de l'envoi du défi.");
                            setChallengeState("picking");
                          }
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-xl text-left transition-all"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-sm font-black text-indigo-300 flex-shrink-0">
                          {(f.username || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{f.username}</p>
                          <p className="text-[10px] text-gray-500">Niv.{f.level ?? 1} · {Math.round(f.score ?? 0)}%</p>
                        </div>
                        {challengeState === "sending" ? (
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <FiZap size={14} className="text-indigo-400 flex-shrink-0" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h3 className="text-fluid-lg font-bold text-white">Mes Quizzes</h3>
        <button
          onClick={loadQuizzes}
          className="btn-secondary px-3 py-2 text-sm"
        >
          <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-300 mb-6 text-fluid-sm break-words">
          {error}
        </div>
      )}

      {loading && <p className="text-gray-400 italic">Chargement...</p>}

      {!loading && quizzes.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Aucun quiz généré pour ce document.
        </p>
      )}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {quizzes.map((quiz) => (
          <motion.div
            key={quiz.id}
            variants={staggerItem}
            className="glass-card rounded-2xl p-4 sm:p-5 hover:border-pink-500/30"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-fluid-sm font-bold text-white break-words">
                  {QUIZ_TYPE_LABELS[quiz.type] ?? quiz.type?.toUpperCase()} — {quiz.number_of_questions} question{quiz.number_of_questions > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(quiz.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
              </div>
              <motion.button
                {...hoverLift}
                onClick={() => startQuiz(quiz)}
                className="btn-primary w-full sm:w-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-pink-500/25 text-sm flex-shrink-0"
              >
                <FiPlay size={14} fill="currentColor" />
                Commencer le quiz
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bannière Défi PDF ─────────────────────────────────────────── */}
      <PdfChallengeBanner
        status={featureStatus}
        reason={featureReason}
        sending={featureSending}
        onRequest={handleSendFeatureRequest}
      />
    </div>
  );
}

function PdfChallengeBanner({ status, reason, sending, onRequest }) {
  if (status === null) return null;

  if (status === "approved") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <FiFileText className="text-emerald-400" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Défi PDF activé</p>
            <p className="text-xs text-emerald-400">Fonctionnalité disponible dans la section Amis &amp; Défis</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Rendez-vous dans <span className="text-white font-semibold">Amis &amp; Défis</span> pour lancer un défi basé sur l'un de vos cours PDF.
          L'IA génèrera les questions et votre ami jouera le même quiz que vous.
        </p>
      </motion.div>
    );
  }

  if (status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 glass-panel rounded-3xl p-5 sm:p-6 border border-yellow-500/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <FiClock className="text-yellow-400" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Demande en cours de traitement</p>
            <p className="text-xs text-yellow-400">Vous recevrez une notification dès que l'admin aura répondu.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "refused") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 glass-panel rounded-3xl p-5 sm:p-6 border border-red-500/30"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <FiAlertCircle className="text-red-400" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Demande refusée</p>
            <p className="text-xs text-red-400">Votre demande d'activation n'a pas été approuvée.</p>
          </div>
        </div>
        {reason && (
          <p className="text-xs text-gray-400 mt-2 p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-gray-300 font-semibold">Raison&nbsp;: </span>{reason}
          </p>
        )}
      </motion.div>
    );
  }

  // status === "none" → montrer la bannière promo
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 glass-panel rounded-3xl p-5 sm:p-6 border border-purple-500/20"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0">
          <FiFileText className="text-purple-300" size={20} />
        </div>
        <p className="font-bold text-white">Défi Quiz depuis vos PDF</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { icon: FiFileText, color: "purple", title: "Cours personnalisé", desc: "Sélectionnez ou téléversez votre PDF de cours pour créer un quiz unique." },
          { icon: FiZap, color: "pink", title: "Quiz généré par l'IA", desc: "L'IA analyse votre cours et génère automatiquement des questions pertinentes." },
          { icon: FiUsers, color: "indigo", title: "Défi comparatif", desc: "Jouez en premier, puis votre ami répond aux mêmes questions. Comparez vos scores." },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className={`p-3 rounded-2xl bg-${color}-500/10 border border-${color}-500/20`}>
            <div className={`w-7 h-7 rounded-lg bg-${color}-500/20 flex items-center justify-center mb-2`}>
              <Icon className={`text-${color}-400`} size={14} />
            </div>
            <p className="text-xs font-bold text-white mb-1">{title}</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <motion.button
        {...tap}
        onClick={onRequest}
        disabled={sending}
        className="w-full btn-primary bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 justify-center"
      >
        {sending ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <FiSend size={15} />
        )}
        {sending ? "Envoi en cours…" : "Demander l'activation"}
      </motion.button>
    </motion.div>
  );
}
