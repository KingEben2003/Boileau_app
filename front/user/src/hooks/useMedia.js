import { useEffect, useState } from "react";

const getMatch = (query) =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(query).matches
    : false;

/** Réagit à une media query CSS. Ex: useMedia("(min-width: 768px)") */
export function useMedia(query) {
  const [matches, setMatches] = useState(() => getMatch(query));

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** Raccourcis sémantiques (breakpoints alignés sur tailwind.config.js). */
export const useIsDesktop = () => useMedia("(min-width: 768px)");
export const useIsMobile = () => !useMedia("(min-width: 768px)");

/** true si l'utilisateur préfère réduire les animations. */
export const usePrefersReducedMotion = () =>
  useMedia("(prefers-reduced-motion: reduce)");
