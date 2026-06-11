import { useState, useEffect, useCallback, useRef } from "react";
import { FiMusic, FiUploadCloud, FiTrash2, FiCheckCircle, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import PageHeader from "../components/ui/PageHeader";
import Spinner from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/Modal";
import { listGameSounds, uploadGameSound, deleteGameSound } from "../services/api";

// Descriptif par catégorie (icône + aide contextuelle)
const CATEGORY_HINTS = {
  background_music: "Jouée en boucle pendant toute la partie (volume réduit).",
  correct: "Joué quand le joueur choisit la bonne réponse.",
  wrong: "Joué quand le joueur choisit une mauvaise réponse.",
  win: "Joué sur l'écran de fin quand le joueur gagne.",
  lose: "Joué sur l'écran de fin quand le joueur perd.",
};

function SoundCard({ sound, onUploaded, onDeleted }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setOk(false); setUploading(true);
    try {
      const saved = await uploadGameSound({ key: sound.key, audio: file });
      onUploaded(saved);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (err) {
      setError(err.message || "Échec du téléversement.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const hasAudio = !!sound.audio_url;

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
          <FiMusic size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{sound.key_display || sound.label}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{CATEGORY_HINTS[sound.key] || ""}</p>
        </div>
        <span className={`chip text-[10px] uppercase tracking-widest flex-shrink-0 ${
          hasAudio ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                   : "bg-white/5 border-white/10 text-gray-500"
        }`}>
          {hasAudio ? "Configuré" : "Vide"}
        </span>
      </div>

      {hasAudio && (
        <audio controls src={sound.audio_url} className="w-full h-9" preload="none" />
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5"><FiAlertCircle size={12} /> {error}</p>
      )}
      {ok && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5"><FiCheckCircle size={12} /> Enregistré !</p>
      )}

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex-1 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20"
        >
          {uploading ? <Spinner size={15} className="!border-white/40 !border-t-white" /> : <FiUploadCloud size={15} />}
          {hasAudio ? "Remplacer" : "Téléverser"}
        </button>
        {hasAudio && (
          <button
            onClick={() => onDeleted(sound)}
            disabled={uploading}
            className="btn-secondary px-3 text-red-400 hover:!bg-red-500/10"
            aria-label="Supprimer"
          >
            <FiTrash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function GameSounds() {
  const [sounds, setSounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setSounds(await listGameSounds()); }
    catch (e) { setError(e.message || "Impossible de charger les sons."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUploaded = (saved) => {
    setSounds((list) => list.map((s) => (s.key === saved.key ? saved : s)));
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteGameSound(toDelete.key);
      setSounds((list) => list.map((s) =>
        s.key === toDelete.key
          ? { ...s, id: null, audio_url: null, is_active: false }
          : s
      ));
      setToDelete(null);
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Sons du jeu"
        subtitle="Musique de fond et effets sonores joués pendant les parties (solo, défi, culture, quiz)."
        actions={
          <button onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Rafraîchir
          </button>
        }
      />

      {error && (
        <div className="mb-5 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sounds.map((s) => (
            <SoundCard key={s.key} sound={s} onUploaded={handleUploaded} onDeleted={setToDelete} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Supprimer ce son ?"
        message={`Le son « ${toDelete?.key_display || toDelete?.label} » sera retiré du jeu. Cette action est irréversible.`}
        confirmLabel="Supprimer"
      />
    </div>
  );
}
