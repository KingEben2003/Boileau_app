import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsDesktop } from "../../hooks/useMedia";
import {
  FiLayout, FiSettings, FiX, FiFileText, FiHelpCircle,
  FiTrendingUp, FiUsers, FiGlobe,
} from "react-icons/fi";

const NAV_ITEMS = [
  { label: "Mes PDFs",    section: "upload",    icon: FiFileText },
  { label: "Résumés",     section: "summaries", icon: FiLayout },
  { label: "Quizzes",     section: "quizzes",   icon: FiHelpCircle },
  { label: "Culture G.",  section: "culture",   icon: FiGlobe },
  { label: "Progression", section: "progress",  icon: FiTrendingUp },
  { label: "Amis",        section: "amis",      icon: FiUsers },
  { label: "Profil",      section: "profil",    icon: FiSettings },
];

export default function Sidebar({
  open, onClose, currentSection, onSectionChange,
  documents, selectedDocId, onSelectDoc,
}) {
  const isDesktop = useIsDesktop();
  const [width, setWidth] = useState(264);
  const visible = isDesktop || open;

  const handleNavClick = (section) => {
    onSectionChange(section);
    if (!isDesktop) onClose();
  };

  const startResize = (e) => {
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev) =>
      setWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 220), 400));
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <>
      {/* Overlay mobile */}
      <AnimatePresence>
        {!isDesktop && visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ x: visible ? 0 : -(width + 16) }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        style={{ width, maxWidth: "86vw" }}
        className="fixed md:static top-0 bottom-0 left-0 h-[100dvh] glass-panel text-white
                   flex flex-col z-50 select-none overflow-hidden safe-top"
      >
        <div className="flex flex-col h-full p-6 md:p-7">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h1 className="text-2xl font-black tracking-tighter text-gradient">BOILEAU</h1>
            {!isDesktop && (
              <button
                onClick={onClose}
                aria-label="Fermer le menu"
                className="p-2 -mr-1 rounded-xl hover:bg-white/10 transition-colors"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, section, icon: Icon }) => {
              const active = currentSection === section;
              return (
                <button
                  key={section}
                  onClick={() => handleNavClick(section)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left
                              transition-colors duration-200 ${
                                active ? "text-pink-300" : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-pink-500/15 border border-pink-500/40"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={19} className="relative z-10 shrink-0" />
                  <span className="relative z-10 text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Historique des documents */}
          {documents?.length > 0 && (
            <div className="mt-7 flex flex-col min-h-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] font-bold mb-2 px-1 shrink-0">
                Historique
              </p>
              <div className="space-y-0.5 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
                {documents.map((doc) => {
                  const label = doc.title || `Document ${doc.id}`;
                  const active = selectedDocId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        onSelectDoc(doc.id);
                        handleNavClick("summaries");
                      }}
                      title={label}
                      className={`w-full text-xs px-3 py-2 rounded-lg flex items-center gap-2 text-left transition-colors ${
                        active
                          ? "bg-pink-500/15 text-pink-200 border border-pink-500/40"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                      }`}
                    >
                      <FiFileText size={12} className="shrink-0 opacity-60" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Poignée de redimensionnement (desktop) */}
        {isDesktop && (
          <div
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
            onMouseDown={startResize}
          />
        )}
      </motion.aside>
    </>
  );
}
