
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useMedia } from "../../hooks/useMedia";
import PdfCard from "../ui/pdfCard";
import { FiX, FiFilter, FiPlus } from "react-icons/fi";
import { getDocuments } from "../../services/api";

function formatDate(dateValue) {
  if (!dateValue) {
    return "Date inconnue";
  }

  const date = new Date(dateValue);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyPdfsSection({ open, onClose }) {
  const isDesktop = useMedia("(min-width: 1024px)");
  const [width, setWidth] = useState(320);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const visible = isDesktop || open;

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await getDocuments();
        if (isMounted) {
          setDocuments(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Impossible de charger les documents.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDocuments();
    window.addEventListener("documents:refresh", loadDocuments);

    return () => {
      isMounted = false;
      window.removeEventListener("documents:refresh", loadDocuments);
    };
  }, []);

  return (
    <>
      {!isDesktop && visible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      )}

      <motion.aside
        animate={{ x: visible ? 0 : width }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ width }}
        className="fixed lg:static right-0 top-0 h-screen max-w-[85vw] glass-panel p-5 sm:p-6 flex flex-col gap-5 sm:gap-6 z-50 border-l border-white/10"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-fluid-lg font-black tracking-tight text-white truncate">Mes Documents</h3>
          <div className="flex items-center gap-1">
            <button className="p-2.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
              <FiFilter size={18} />
            </button>
            {!isDesktop && (
              <button onClick={onClose} className="p-2.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                <FiX size={20} />
              </button>
            )}
          </div>
        </div>

        <button className="w-full py-3 min-h-[3rem] bg-white/5 border border-dashed border-white/20 rounded-2xl text-sm font-bold text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all flex items-center justify-center gap-2 group">
          <FiPlus className="group-hover:rotate-90 transition-transform" /> Nouveau PDF
        </button>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {isLoading && <p className="text-sm text-gray-500">Chargement des documents...</p>}
          {!isLoading && error && <p className="text-sm text-red-400">{error}</p>}
          {!isLoading && !error && documents.length === 0 && (
            <p className="text-sm text-gray-500">Aucun document uploadé pour le moment.</p>
          )}
          {!isLoading && !error && documents.map((doc) => (
            <PdfCard
              key={doc.id}
              pdf={{
                id: doc.id,
                title: doc.title,
                date: formatDate(doc.upload_date),
              }}
            />
          ))}
        </div>

        {isDesktop && (
          <div
            className="absolute top-0 left-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/30 transition-colors"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = width;
              const onMove = ev => {
                const newWidth = startWidth - (ev.clientX - startX);
                setWidth(Math.min(Math.max(newWidth, 280), 450));
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
        )}
      </motion.aside>
    </>
  );
}
