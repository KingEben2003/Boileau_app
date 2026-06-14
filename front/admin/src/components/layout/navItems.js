import {
  FiGrid, FiUsers, FiFileText, FiHelpCircle,
  FiBookOpen, FiGlobe, FiShare2, FiRepeat, FiMusic, FiSettings, FiZap,
} from "react-icons/fi";

// Source unique de vérité pour la navigation de l'admin.
export const NAV_ITEMS = [
  { to: "/",            label: "Tableau de bord",  icon: FiGrid, end: true },
  { to: "/users",       label: "Utilisateurs",     icon: FiUsers },
  { to: "/documents",   label: "Documents",        icon: FiFileText },
  { to: "/quizzes",     label: "Quiz & Résultats", icon: FiHelpCircle },
  { to: "/summaries",   label: "Résumés",          icon: FiBookOpen },
  { to: "/culture",     label: "Culture Générale", icon: FiGlobe },
  { to: "/friends",     label: "Amis & Demandes",  icon: FiShare2 },
  { to: "/srs",         label: "Révisions (SRS)",  icon: FiRepeat },
  { to: "/feature-requests", label: "Demandes PDF", icon: FiZap },
  { to: "/game-sounds", label: "Sons du jeu",      icon: FiMusic },
  { to: "/game-settings", label: "Paramètres du jeu", icon: FiSettings },
];
