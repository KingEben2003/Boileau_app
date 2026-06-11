
import { useState } from "react";
import { motion } from "framer-motion";
import { useMedia } from "../../hooks/useMedia";
import { FiLayout, FiSettings, FiX, FiFileText, FiHelpCircle, FiTrendingUp, FiUsers, FiGlobe } from "react-icons/fi";

export default function Sidebar({ open, onClose, currentSection, onSectionChange, documents, selectedDocId, onSelectDoc }) {
  const isDesktop = useMedia("(min-width: 768px)");
  const [width, setWidth] = useState(260);
  const visible = isDesktop || open;

  const navItems = [
    { label: "Mes PDFs",       section: "upload",   icon: <FiFileText /> },
    { label: "Résumés",        section: "summaries", icon: <FiLayout /> },
    { label: "Quizzes",        section: "quizzes",  icon: <FiHelpCircle /> },
    { label: "Culture G.",     section: "culture",  icon: <FiGlobe /> },
    { label: "Progression",    section: "progress", icon: <FiTrendingUp /> },
    { label: "Amis",           section: "amis",     icon: <FiUsers /> },
    { label: "Profil",         section: "profil",   icon: <FiSettings /> },
  ];

  const handleNavClick = (section) => {
    onSectionChange(section);
    if (!isDesktop) {
      onClose();
    }
  };

  return (
    <>
      {!isDesktop && visible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      )}

      <motion.aside
        animate={{ x: visible ? 0 : -width }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ width }}
        className="fixed md:static top-0 bottom-0 left-0 h-screen glass-panel text-white flex flex-col z-50 select-none overflow-hidden"
      >
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
              BOILEAU
            </h1>
            {!isDesktop && (
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
                <FiX size={20} />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <div
                key={item.label}
                onClick={() => handleNavClick(item.section)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                  currentSection === item.section
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/50"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </nav>

          {documents && documents.length > 0 && (
            <div className="mt-[20px] flex flex-col min-h-0">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 px-2 flex-shrink-0">
                Historique
              </p>
              <div className="space-y-1 overflow-y-auto max-h-52 pr-1 custom-scrollbar">
                {documents.map((doc) => {
                  const label = doc.title || `Document ${doc.id}`;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        onSelectDoc(doc.id);
                        handleNavClick("summaries");
                      }}
                      className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
                        selectedDocId === doc.id
                          ? "bg-pink-500/20 text-pink-300 border border-pink-500/50"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                      }`}
                      title={label}
                    >
                      <FiFileText size={11} className="flex-shrink-0 opacity-60" />
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {isDesktop && (
          <div
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = width;
              const onMove = (ev) => {
                const newWidth = startWidth + (ev.clientX - startX);
                setWidth(Math.min(Math.max(newWidth, 200), 400));
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
