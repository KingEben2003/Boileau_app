import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiPlay, FiArrowLeft, FiCheckCircle, FiX } from "react-icons/fi";
import { getQuizzes, getQuiz, submitQuizResult } from "../../services/api";

const QUIZ_TYPE_LABELS = {
  qcm: "QCM",
  true_false: "Vrai / Faux",
  open: "Question ouverte",
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

  useEffect(() => {
    if (documentId) {
      loadQuizzes();
    }
  }, [documentId]);

  const loadQuizzes = async () => {
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
  };

  const startQuiz = async (quiz) => {
    setLoading(true);
    try {
      const fullQuiz = await getQuiz(quiz.id);
      setSelectedQuiz(fullQuiz);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setShowResults(false);
      setQuizStartTime(Date.now());
    } catch (err) {
      setError(err.message || "Impossible de charger le quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setUserAnswers({
      ...userAnswers,
      [questionId]: answer,
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleFinishQuiz = async () => {
    const timeSpent = Math.round((Date.now() - quizStartTime) / 1000);
    const score = calculateScore();

    try {
      await submitQuizResult(selectedQuiz.id, {
        score: score.percentage,
        time_spent_seconds: timeSpent,
        answers_detail: userAnswers,
      });
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du résultat:", err);
    }

    setShowResults(true);
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

  if (selectedQuiz && !showResults) {
    const question = selectedQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;

    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <button
          onClick={() => {
            setSelectedQuiz(null);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <FiArrowLeft size={20} />
          Retour
        </button>

        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">
                Question {currentQuestionIndex + 1} / {selectedQuiz.questions.length}
              </span>
              <span className="text-sm font-bold text-pink-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-6">{question.question_text}</h3>

          <div className="space-y-3 mb-8">
            {(question.type === "open" || (selectedQuiz.type === "open" && !question.options?.length)) ? (
              <textarea
                value={userAnswers[question.id] || ""}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Votre réponse..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 resize-none transition-all"
              />
            ) : (question.type === "true_false" || selectedQuiz.type === "true_false") ? (
              ["Vrai", "Faux"].map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                    userAnswers[question.id] === option
                      ? "bg-pink-500/20 border-pink-500/40 text-white"
                      : "border-white/10 hover:border-pink-500/50 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={userAnswers[question.id] === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-4 h-4 accent-pink-500"
                  />
                  <span className="text-white">{option}</span>
                </label>
              ))
            ) : (
              (question.options || []).map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                    userAnswers[question.id] === option
                      ? "bg-pink-500/20 border-pink-500/40 text-white"
                      : "border-white/10 hover:border-pink-500/50 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={userAnswers[question.id] === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-4 h-4 accent-pink-500"
                  />
                  <span className="text-white">{option}</span>
                </label>
              ))
            )}
          </div>

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition text-sm font-semibold"
            >
              Précédent
            </motion.button>

            {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNextQuestion}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-xl transition font-bold text-sm shadow-lg shadow-pink-500/20"
              >
                Suivant
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(34, 197, 94, 0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleFinishQuiz}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl transition font-bold text-sm shadow-lg shadow-emerald-500/20"
              >
                Terminer
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuiz && showResults) {
    const score = calculateScore();
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <button
          onClick={() => {
            setSelectedQuiz(null);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setShowResults(false);
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <FiArrowLeft size={20} />
          Retour
        </button>

        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-pink-500 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{score.percentage}%</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Quiz terminé !</h3>
          <p className="text-gray-400 mb-8">
            Vous avez obtenu {score.correct} réponses correctes sur {score.total}
          </p>

          <div className="bg-white/5 rounded-lg p-6 mb-8 text-left max-h-96 overflow-y-auto">
            {selectedQuiz.questions.map((question, idx) => {
              const userAnswer = userAnswers[question.id];
              const isCorrect =
                userAnswer &&
                userAnswer.toLowerCase() === question.correct_answer.toLowerCase();

              return (
                <div
                  key={question.id}
                  className="mb-4 pb-4 border-b border-white/10 last:border-0"
                >
                  <div className="flex gap-3 mb-2">
                    {isCorrect ? (
                      <FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                    ) : (
                      <FiX className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{question.question_text}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Votre réponse: {userAnswer || "Non répondu"}
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-green-400 mt-1">
                          Bonne réponse: {question.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              setSelectedQuiz(null);
              setCurrentQuestionIndex(0);
              setUserAnswers({});
              setShowResults(false);
            }}
            className="w-full px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition font-bold"
          >
            Retour aux quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Mes Quizzes</h3>
        <button
          onClick={loadQuizzes}
          className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
        >
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 mb-6">
          {error}
        </div>
      )}

      {loading && <p className="text-gray-400 italic">Chargement...</p>}

      {!loading && quizzes.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Aucun quiz généré pour ce document.
        </p>
      )}

      <div className="space-y-3">
        {quizzes.map((quiz, i) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-pink-500/30 transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {QUIZ_TYPE_LABELS[quiz.type] ?? quiz.type?.toUpperCase()} — {quiz.number_of_questions} question{quiz.number_of_questions > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(quiz.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(236, 72, 153, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startQuiz(quiz)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl transition-all font-bold text-xs shadow-lg shadow-pink-500/20 flex-shrink-0"
              >
                <FiPlay size={13} fill="currentColor" />
                Commencer le quiz
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
