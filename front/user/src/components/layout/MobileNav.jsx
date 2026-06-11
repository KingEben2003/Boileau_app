import { motion } from "framer-motion";
import { FiFileText, FiLayout, FiHelpCircle, FiTrendingUp, FiGlobe } from "react-icons/fi";

// Barre de navigation basse (mobile uniquement) — pattern des apps mobiles modernes.
// Les sections secondaires (Amis, Profil) restent accessibles via la TopBar / le menu.
const TABS = [
  { label: "PDFs",      section: "upload",    icon: FiFileText },
  { label: "Résumés",   section: "summaries", icon: FiLayout },
  { label: "Quiz",      section: "quizzes",   icon: FiHelpCircle },
  { label: "Culture",   section: "culture",   icon: FiGlobe },
  { label: "Progrès",   section: "progress",  icon: FiTrendingUp },
];

export default function MobileNav({ currentSection, onSectionChange }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom
                 bg-ink-700/85 backdrop-blur-xl border-t border-white/10"
      style={{ height: "calc(var(--mobile-nav-h) + var(--safe-bottom))" }}
      aria-label="Navigation principale"
    >
      <ul className="flex items-stretch justify-around h-[var(--mobile-nav-h)] px-0.5">
        {TABS.map(({ label, section, icon: Icon }) => {
          const active = currentSection === section;
          return (
            <li key={section} className="flex-1 min-w-0">
              <button
                onClick={() => onSectionChange(section)}
                aria-current={active ? "page" : undefined}
                className="relative w-full h-full flex flex-col items-center justify-center gap-0.5
                           font-bold tracking-wide transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="mobilenav-pill"
                    className="absolute top-1 h-9 w-[3.25rem] min-[360px]:w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  size={19}
                  className={`relative z-10 transition-colors ${active ? "text-indigo-300" : "text-gray-500"}`}
                />
                <span className={`relative z-10 transition-colors text-[9px] min-[360px]:text-[10px] leading-none ${active ? "text-indigo-300" : "text-gray-500"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
