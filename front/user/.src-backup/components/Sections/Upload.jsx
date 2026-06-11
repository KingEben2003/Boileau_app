import { useState } from "react";
import UploadZone from "../ui/uploadZone";
import QuizSection from "../Sections/quizForm";
import SummarySection from "../Sections/resume";
import ModeToggle from "../ui/ModeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiArrowLeft, FiCpu, FiZap } from "react-icons/fi";
import { uploadDocument } from "../../services/api";

export default function UploadSection({ onDocumentUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMode, setSelectedMode] = useState("summary");
  const [activeMode, setActiveMode] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [currentDocument, setCurrentDocument] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleLaunch = async () => {
    if (!selectedFile) return;

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 12;
      });
    }, 300);

    try {
      const document = await uploadDocument(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setCurrentDocument(document);
      window.dispatchEvent(new Event("documents:refresh"));
      await new Promise((resolve) => setTimeout(resolve, 350));
      setActiveMode(selectedMode);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadError(error.message || "Impossible d'uploader le fichier.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={activeMode === null ? "flex flex-col items-center justify-center min-h-[70vh]" : "w-full"}>
      <AnimatePresence mode="wait">
        {activeMode === null ? (
          <motion.div
            key="upload-view"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-5">
                <FiZap size={13} className="text-indigo-400" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Propulsé par l'IA</span>
              </div>
              <h2 className="text-4xl font-black mb-3 tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Transformez vos PDFs<br />en savoir actionnable.
              </h2>
              <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">
                Résumés intelligents et quiz interactifs générés automatiquement depuis vos documents.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              className="glass-panel p-8 rounded-[2rem]"
            >
              <UploadZone setSelectedFile={setSelectedFile} />

              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mt-8 space-y-6"
                  >
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-indigo-400 ml-1">
                        Choisir l'outil d'analyse
                      </label>
                      <ModeToggle mode={selectedMode} setMode={setSelectedMode} />
                    </div>

                    {isUploading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span className="flex items-center gap-2">
                            <FiCpu size={13} className="text-indigo-400 animate-pulse" />
                            Analyse en cours...
                          </span>
                          <span className="font-mono text-indigo-400">{Math.min(Math.round(uploadProgress), 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            animate={{ width: `${Math.min(uploadProgress, 100)}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    )}

                    <button
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      onClick={handleLaunch}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          Lancer l'analyse <FiArrowRight />
                        </>
                      )}
                    </button>

                    {uploadError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-400 text-center"
                      >
                        {uploadError}
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="content-view"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 text-sm font-medium text-gray-400 hover:text-white transition-all group"
                onClick={() => setActiveMode(null)}
              >
                <FiArrowLeft className="group-hover:-translate-x-0.5 transition-transform" />
                Nouveau document
              </button>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 max-w-[200px] truncate">
                  {currentDocument?.title || "Document analysé"}
                </span>
              </div>
            </div>

            {activeMode === "quiz" ? (
              <QuizSection document={currentDocument} />
            ) : (
              <SummarySection document={currentDocument} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
