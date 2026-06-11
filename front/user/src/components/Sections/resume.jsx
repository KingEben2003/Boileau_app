import { useState, useEffect, useRef } from "react";
import { FiDownload, FiLayout, FiShare2, FiStar, FiChevronRight, FiBookOpen, FiEdit3, FiTarget, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { generateSummary, reextractDocument } from "../../services/api";
import { exportSummaryAsPdf } from "../../utils/pdfExport";

function useTypewriter(text) {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayed("");
    setIsDone(false);
    clearInterval(timerRef.current);
    if (!text) return;
    const chunkSize = Math.max(1, Math.ceil(text.length / 400));
    let pos = 0;
    timerRef.current = setInterval(() => {
      pos += chunkSize;
      if (pos >= text.length) {
        setDisplayed(text);
        setIsDone(true);
        clearInterval(timerRef.current);
      } else {
        setDisplayed(text.slice(0, pos));
      }
    }, 12);
    return () => clearInterval(timerRef.current);
  }, [text]);

  return { displayed, isDone };
}

const SUMMARY_TYPES = [
  { key: "brief", label: "Résumé rapide", description: "Points clés essentiels" },
  { key: "medium", label: "Résumé moyen", description: "Vue d'ensemble structurée" },
  { key: "detailed", label: "Résumé détaillé", description: "Analyse approfondie" },
];

const SUGGESTIONS = {
  brief: [
    { icon: FiTarget, text: "Relisez les points clés mis en évidence." },
    { icon: FiBookOpen, text: "Identifiez les 3 concepts les plus importants." },
    { icon: FiEdit3, text: "Résumez en une phrase par idée principale." },
  ],
  medium: [
    { icon: FiTarget, text: "Comparez les sections avec votre prise de notes." },
    { icon: FiBookOpen, text: "Notez les définitions et théorèmes essentiels." },
    { icon: FiEdit3, text: "Créez une carte mentale des thèmes principaux." },
  ],
  detailed: [
    { icon: FiTarget, text: "Préparez des exemples pour chaque concept clé." },
    { icon: FiBookOpen, text: "Reliez les idées aux chapitres du document." },
    { icon: FiEdit3, text: "Rédigez vos propres questions de révision." },
  ],
};

export default function SummarySection({ document, onDocumentUpdated }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentType, setCurrentType] = useState("brief");
  const { displayed: typedContent, isDone: typingDone } = useTypewriter(summary?.content ?? "");
  const [reextracting, setReextracting] = useState(false);
  const [reextractError, setReextractError] = useState("");

  const hasDocument = !!document;
  const hasText = hasDocument && !!document.extracted_text;

  const handleReextract = async () => {
    setReextracting(true);
    setReextractError("");
    try {
      const updated = await reextractDocument(document.id);
      if (onDocumentUpdated) onDocumentUpdated(updated);
    } catch (err) {
      setReextractError(err.message || "Échec de la ré-extraction.");
    } finally {
      setReextracting(false);
    }
  };

  const handleGenerate = async (type = "brief") => {
    if (!hasDocument) {
      setError("Aucun document n'est disponible pour générer un résumé.");
      return;
    }
    setError("");
    setLoading(true);
    setCurrentType(type);
    try {
      const data = await generateSummary(document.id, type);
      setSummary(data);
    } catch (err) {
      setError(err.message || "Impossible de générer le résumé.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!summary) return;
    exportSummaryAsPdf({
      content: summary.content,
      documentTitle: document?.title || "Document",
      summaryType: currentType,
      generatedAt: summary.created_at,
    });
  };

  const suggestions = SUGGESTIONS[currentType] || SUGGESTIONS.brief;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="h-full w-full flex flex-col gap-6 sm:gap-8"
    >
      {hasDocument && !hasText && (
        <div className="flex flex-col sm:flex-row items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <FiAlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-fluid-sm font-semibold text-amber-300">Texte non extrait</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Ce PDF ne contient pas de texte lisible (probablement un scan). Cliquez sur "Ré-extraire" pour retenter, ou uploadez un PDF natif.
            </p>
            {reextractError && <p className="text-xs text-red-400 mt-1">{reextractError}</p>}
          </div>
          <button
            onClick={handleReextract}
            disabled={reextracting}
            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={reextracting ? "animate-spin" : ""} />
            {reextracting ? "Extraction..." : "Ré-extraire"}
          </button>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-14 sm:h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 flex-shrink-0">
            <FiLayout size={22} className="sm:hidden" />
            <FiLayout size={26} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <h2 className="section-title">Résumé Intelligent</h2>
            <p className="text-fluid-sm text-gray-500">Extraction des points clés via Gemini AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <button className="btn-secondary p-2.5 sm:p-3 flex-shrink-0">
            <FiShare2 size={16} className="sm:hidden" />
            <FiShare2 size={18} className="hidden sm:block" />
          </button>
          <button
            onClick={handleDownload}
            disabled={!summary}
            className="btn-primary text-sm flex-shrink-0"
          >
            <FiDownload size={15} /> Télécharger
          </button>
        </div>
      </motion.div>

      {/* Type selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 mr-1">
          <FiStar size={12} fill="currentColor" /> Type
        </span>
        {SUMMARY_TYPES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleGenerate(key)}
            disabled={!hasDocument || loading}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-widest border transition-all disabled:opacity-50 ${
              currentType === key
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary content — rendered directly on background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${loading}-${error}-${!!summary}-${hasDocument}-${currentType}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {!hasDocument && (
            <p className="text-sm text-gray-500">
              Importez d'abord un PDF pour générer un résumé avec l'IA.
            </p>
          )}

          {hasDocument && loading && (
            <div className="space-y-5">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="shimmer h-4 rounded-lg"
                    style={{ width: `${70 + Math.sin(i) * 20}%` }}
                  />
                ))}
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="shimmer h-4 rounded-lg"
                    style={{ width: `${60 + Math.cos(i) * 25}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {hasDocument && !loading && error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {hasDocument && !loading && !error && !summary && (
            <p className="text-sm text-gray-400 leading-relaxed">
              Choisissez un type de résumé ci‑dessus pour générer une synthèse intelligente de votre document.
            </p>
          )}

          {hasDocument && !loading && !error && summary && (
            <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-10 [&_h1]:mb-5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-indigo-300 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-5 [&_p]:leading-relaxed [&_ul]:mb-5 [&_ul]:pl-5 [&_ol]:mb-5 [&_ol]:pl-5 [&_li]:mb-2 [&_strong]:text-white [&_strong]:font-semibold">
              {typingDone ? (
                <ReactMarkdown>{summary.content}</ReactMarkdown>
              ) : (
                <>
                  <ReactMarkdown>{typedContent}</ReactMarkdown>
                  <span className="inline-block w-[2px] h-[1em] bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Suggestions — show only when summary is present and typing is done */}
      {summary && typingDone && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-4 pt-8 border-t border-white/5"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6">
            Suggestions de révision
          </h3>
          <div className="space-y-3">
            {suggestions.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={`${currentType}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.07 }}
                className="flex items-center gap-4 group"
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/40 transition-all">
                  <Icon size={15} />
                </div>
                <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                  {text}
                </span>
                <FiChevronRight size={14} className="ml-auto text-gray-600 group-hover:text-emerald-500 transition-colors" />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
