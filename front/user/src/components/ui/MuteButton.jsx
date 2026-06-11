import { FiVolume2, FiVolumeX } from "react-icons/fi";
import { useGameSounds } from "../../GameSoundContext";

/**
 * Petit bouton muet/activer le son pour les écrans de jeu.
 * La préférence est mémorisée (localStorage) par le GameSoundProvider.
 */
export default function MuteButton({ className = "" }) {
  const { muted, toggleMute } = useGameSounds();
  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      title={muted ? "Activer le son" : "Couper le son"}
      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all flex-shrink-0 ${
        muted
          ? "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
          : "bg-pink-500/15 border-pink-500/30 text-pink-300 hover:bg-pink-500/25"
      } ${className}`}
    >
      {muted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
    </button>
  );
}
