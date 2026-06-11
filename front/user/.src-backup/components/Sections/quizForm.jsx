
import { motion } from "framer-motion";
import { useState } from "react";
import { FiCheck, FiPlay, FiSettings, FiHelpCircle, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { generateQuiz, reextractDocument } from "../../services/api";

const QUIZ_LIMIT = 20;

const QUIZ_TYPES_FORM = [
  { key: "qcm",        label: "QCM",             desc: "Choix multiple" },
  { key: "true_false", label: "Vrai / Faux",      desc: "2 choix" },
  { key: "open",       label: "Question ouverte", desc: "Texte libre" },
  { key: "mixed",      label: "Mixte",            desc: "Tous les types" },
];

export default function QuizSection({ document, onDocumentUpdated, totalQuizCount = 0 }) {
  const [selectedType, setSelectedType] = useState("qcm");
  const [started, setStarted] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [reextracting, setReextracting] = useState(false);

  const limitReached = totalQuizCount >= QUIZ_LIMIT;

  const hasDocument = !!document;
  const hasText = hasDocument && !!document.extracted_text;

  const handleReextract = async () => {
    setReextracting(true);
    try {
      const updated = await reextractDocument(document.id);
      if (onDocumentUpdated) onDocumentUpdated(updated);
    } catch (err) {
      setError(err.message || "Échec de la ré-extraction.");
    } finally {
      setReextracting(false);
    }
  };

  const handleStart = async () => {
    if (!hasDocument) {
      setError("Aucun document n'est disponible pour générer un quiz.");
      return;
    }
    if (limitReached) {
      setError(`Limite atteinte : vous avez déjà ${QUIZ_LIMIT} quiz.`);
      return;
    }

    setError("");
    setStarted(true);
    setLoading(true);

    try {
      const data = await generateQuiz(document.id, {
        type: selectedType,
        numberOfQuestions: numQuestions,
        difficulty: "medium",
      });
      setQuiz(data);
    } catch (err) {
      setError(err.message || "Impossible de générer le quiz.");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!started) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10">
          <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-400 mb-6">
            <FiHelpCircle size={32} />
          </div>

          <h3 className="text-2xl font-black mb-2 text-white">Générer un Quiz</h3>
          <p className="text-gray-500 mb-10 text-center max-w-sm">
            L&apos;IA va extraire les concepts clés de votre document pour tester vos connaissances.
          </p>

          <div className="w-full max-w-md space-y-8">
            {limitReached && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
              >
                <FiAlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-300 font-medium">
                  Limite atteinte : vous avez déjà {QUIZ_LIMIT} quiz.
                </p>
              </motion.div>
            )}

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-pink-400">
                Format des questions
              </label>
              <div className="grid grid-cols-2 gap-3">
                {QUIZ_TYPES_FORM.map(({ key, label, desc }) => (
                  <ToggleButton
                    key={key}
                    label={label}
                    desc={desc}
                    active={selectedType === key}
                    onClick={() => setSelectedType(key)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-pink-400">
                  Quantité
                </label>
                <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded-md">
                  {numQuestions}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                <span>1 Question</span>
                <span>20 Questions</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 28px rgba(236, 72, 153, 0.35)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              disabled={!hasDocument || loading || limitReached}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-pink-500/20 transition-all flex items-center justify-center gap-3"
            >
              <FiPlay fill="currentColor" size={16} /> Générer le quiz
            </motion.button>

            {!hasDocument && (
              <p className="text-xs text-gray-500">
                Importez d&apos;abord un PDF pour générer un quiz personnalisé.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col h-full"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Quiz en préparation</h3>
              <p className="text-sm text-gray-500">
                Document : {document ? document.title : "en cours..."}
              </p>
            </div>
            <div className="px-4 py-2 glass-card rounded-xl text-xs font-bold text-pink-400 uppercase tracking-widest">
              {numQuestions} questions
            </div>
          </div>

          <div className="flex-1 glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-6 border-pink-500/10">
            <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-400 mb-2">
              <FiSettings className="animate-spin-slow" />
            </div>
            <h4 className="text-lg font-medium text-gray-300">
              L&apos;IA prépare vos questions...
            </h4>
            <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="h-full w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent"
              />
            </div>
          </div>
        </motion.div>
      );
    }

    if (!quiz) {
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Quiz généré</h3>
            <p className="text-sm text-gray-500">
              Document : {document ? document.title : "inconnu"}
            </p>
          </div>
          <div className="px-4 py-2 glass-card rounded-xl text-xs font-bold text-pink-400 uppercase tracking-widest">
            {quiz.questions?.length || 0} questions
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {quiz.questions?.map((q, index) => (
            <div
              key={q.id || index}
              className="glass-card rounded-2xl p-5 border border-pink-500/10"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
                  Question {index + 1}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 uppercase tracking-widest">
                  {q.type === "true_false" ? "Vrai / Faux" : "QCM"}
                </span>
              </div>
              <p className="text-sm text-white mb-3">{q.question_text}</p>
              {Array.isArray(q.options) && q.options.length > 0 && (
                <ul className="space-y-2">
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-300 px-3 py-1.5 rounded-full bg-white/5"
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col gap-4">
      {hasDocument && !hasText && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <FiAlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Texte non extrait</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Ce PDF ne contient pas de texte lisible (probablement un scan). Retentez l'extraction ou uploadez un PDF natif.
            </p>
          </div>
          <button
            onClick={handleReextract}
            disabled={reextracting}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={reextracting ? "animate-spin" : ""} />
            {reextracting ? "Extraction..." : "Ré-extraire"}
          </button>
        </div>
      )}
      {renderContent()}
    </div>
  );
}

function ToggleButton({ label, desc, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left
        ${
          active
            ? "bg-pink-500/20 border-pink-500/40 text-pink-400 shadow-lg shadow-pink-500/10"
            : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
        }
      `}
    >
      {active && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-white scale-110">
          <FiCheck size={10} strokeWidth={4} />
        </span>
      )}
      <div>{label}</div>
      {desc && <div className="text-[10px] font-normal opacity-60 mt-0.5">{desc}</div>}
    </button>
  );
}

