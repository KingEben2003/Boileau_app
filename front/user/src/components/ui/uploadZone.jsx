
import { useState, useRef, useEffect } from "react";
import { FiUploadCloud, FiFile, FiTrash2 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function UploadZone({ setSelectedFile: setParentFile }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (setParentFile) setParentFile(selectedFile);
  }, [selectedFile, setParentFile]);

  const handleFile = (file) => {
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("Veuillez sélectionner un fichier PDF valide");
    }
  };

  return (
    <div
      className={`
        relative group overflow-hidden
        border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer
        ${isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}
      `}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => fileInputRef.current.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files[0])}
        accept=".pdf"
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 glass-card rounded-2xl flex items-center justify-center text-indigo-400 shadow-xl">
              <FiFile size={40} />
            </div>
            <div>
              <p className="font-bold text-lg text-white truncate max-w-xs">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="mt-4 flex items-center gap-2 px-6 py-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-sm font-medium"
            >
              <FiTrash2 size={16} /> Supprimer
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
              <FiUploadCloud size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">Déposez votre document ici</p>
              <p className="text-sm text-gray-400">PDF uniquement, max 50MB</p>
            </div>
            <span className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
              Parcourir mes fichiers
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
