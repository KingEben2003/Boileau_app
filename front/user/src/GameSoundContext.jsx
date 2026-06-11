import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getGameSounds } from "./services/api";

const GameSoundContext = createContext(undefined);

const MUTE_KEY = "game_muted";
const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.7;

export function GameSoundProvider({ children }) {
  const [sounds, setSounds] = useState({});
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");

  // Élément audio dédié à la musique de fond (bouclée) + cache des SFX.
  const musicRef = useRef(null);
  const sfxCache = useRef({});

  // Chargement unique des URLs configurées par l'admin.
  useEffect(() => {
    let alive = true;
    getGameSounds().then((data) => { if (alive) setSounds(data || {}); });
    return () => { alive = false; };
  }, []);

  // Persiste la préférence muet + coupe la musique en cours si on coupe le son.
  useEffect(() => {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    if (musicRef.current) musicRef.current.muted = muted;
  }, [muted]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const playSfx = useCallback((key) => {
    if (muted) return;
    const url = sounds?.[key];
    if (!url) return;
    let audio = sfxCache.current[key];
    if (!audio) {
      audio = new Audio(url);
      audio.volume = SFX_VOLUME;
      sfxCache.current[key] = audio;
    }
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {}); // l'autoplay peut être bloqué hors geste utilisateur
    } catch { /* ignore */ }
  }, [muted, sounds]);

  const startMusic = useCallback(() => {
    const url = sounds?.background_music;
    if (!url) return;
    let audio = musicRef.current;
    if (!audio || audio.dataset?.src !== url) {
      if (audio) { audio.pause(); }
      audio = new Audio(url);
      audio.loop = true;
      audio.volume = MUSIC_VOLUME;
      audio.dataset.src = url;
      musicRef.current = audio;
    }
    audio.muted = muted;
    audio.play().catch(() => {});
  }, [sounds, muted]);

  const stopMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch { /* ignore */ }
  }, []);

  // Coupe tout à la destruction du provider.
  useEffect(() => () => { try { musicRef.current?.pause(); } catch { /* ignore */ } }, []);

  const playCorrect = useCallback(() => playSfx("correct"), [playSfx]);
  const playWrong   = useCallback(() => playSfx("wrong"),   [playSfx]);
  const playWin     = useCallback(() => playSfx("win"),     [playSfx]);
  const playLose    = useCallback(() => playSfx("lose"),    [playSfx]);

  const hasSound = useCallback((key) => Boolean(sounds?.[key]), [sounds]);

  const value = useMemo(() => ({
    muted,
    toggleMute,
    hasSound,
    startMusic,
    stopMusic,
    playCorrect,
    playWrong,
    playWin,
    playLose,
  }), [muted, toggleMute, hasSound, startMusic, stopMusic, playCorrect, playWrong, playWin, playLose]);

  return <GameSoundContext.Provider value={value}>{children}</GameSoundContext.Provider>;
}

export function useGameSounds() {
  const ctx = useContext(GameSoundContext);
  if (ctx === undefined) {
    // Garde-fou : hors provider, on renvoie des no-ops pour éviter les crashs.
    return {
      muted: false, toggleMute: () => {}, hasSound: () => false,
      startMusic: () => {}, stopMusic: () => {},
      playCorrect: () => {}, playWrong: () => {}, playWin: () => {}, playLose: () => {},
    };
  }
  return ctx;
}
