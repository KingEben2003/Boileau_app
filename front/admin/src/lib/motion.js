// Presets d'animation framer-motion partagés — cohérence + moins de duplication.
// Respecte automatiquement prefers-reduced-motion via la prop `transition`.

export const EASE = [0.4, 0, 0.2, 1];
export const EASE_SPRING = { type: "spring", stiffness: 300, damping: 30 };

// Apparition simple (vers le haut)
export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: EASE },
};

// Apparition discrète (fondu)
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE },
};

// Zoom léger (modales, cartes mises en avant)
export const popIn = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
  transition: { duration: 0.22, ease: EASE },
};

// Transition entre sections / pages
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: EASE },
};

// Conteneur avec apparition en cascade des enfants
export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// Interactions tactiles standard
export const tap = { whileTap: { scale: 0.95 } };
export const hoverLift = {
  whileHover: { y: -3, transition: { duration: 0.2, ease: EASE } },
  whileTap: { scale: 0.98 },
};
