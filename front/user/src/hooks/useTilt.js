import { useRef, useCallback } from "react";

/**
 * Tilt 3D léger au survol — pur CSS transform (GPU), zéro dépendance.
 * Désactivé automatiquement sur écran tactile / reduced-motion.
 *
 *   const tilt = useTilt({ max: 10 });
 *   <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
 *        className="preserve-3d transition-transform duration-200" />
 */
export function useTilt({ max = 8, scale = 1.0 } = {}) {
  const ref = useRef(null);

  const enabled =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMouseMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || !enabled) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale(${scale})`;
    },
    [enabled, max, scale]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  return { ref, onMouseMove, onMouseLeave, enabled };
}
