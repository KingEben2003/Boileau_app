import { useState, useEffect, useCallback } from "react";
import { FiSave, FiClock, FiUsers, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import PageHeader from "../components/ui/PageHeader";
import Spinner from "../components/ui/Spinner";
import { getGameSettings, updateGameSettings } from "../services/api";

const DIFFICULTIES = [
  { key: "easy", label: "Facile" },
  { key: "medium", label: "Moyen" },
  { key: "hard", label: "Difficile" },
];
const END_CONDITIONS = [
  { key: "best_score", label: "Meilleur score (toutes les questions)" },
  { key: "elimination", label: "Élimination (1ʳᵉ mauvaise réponse seul)" },
];
const TYPES = [
  { key: "qcm", label: "QCM" },
  { key: "true_false", label: "Vrai / Faux" },
];

export default function GameSettings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const s = await getGameSettings();
      setForm({
        ...s,
        mp_themes: (s.mp_themes || []).join(", "),
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleType = (t) => set("mp_types", form.mp_types.includes(t)
    ? form.mp_types.filter((x) => x !== t)
    : [...form.mp_types, t]);

  const save = async () => {
    setSaving(true); setError(""); setOk(false);
    try {
      await updateGameSettings({
        countdown_seconds: Number(form.countdown_seconds),
        mp_num_questions: Number(form.mp_num_questions),
        mp_difficulty: form.mp_difficulty,
        mp_end_condition: form.mp_end_condition,
        mp_types: form.mp_types,
        mp_themes: form.mp_themes.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setOk(true); setTimeout(() => setOk(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading || !form) return <div className="py-20 flex justify-center"><Spinner /></div>;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Paramètres du jeu"
        subtitle="Compte à rebours des jeux et valeurs par défaut des défis multijoueurs."
      />

      {error && <div className="mb-5 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-center gap-2"><FiAlertCircle size={14} /> {error}</div>}
      {ok && <div className="mb-5 p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2"><FiCheckCircle size={14} /> Enregistré !</div>}

      <div className="glass-card rounded-2xl p-5 border border-white/10 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2"><FiClock size={13} /> Compte à rebours (Défi & Culture)</p>
        <label className="block text-sm text-gray-400 mb-1">Secondes par question</label>
        <input type="number" min="5" max="180" value={form.countdown_seconds}
          onChange={(e) => set("countdown_seconds", e.target.value)}
          className="input-field w-40" />
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-pink-300 flex items-center gap-2"><FiUsers size={13} /> Défauts multijoueur (modifiables par le demandeur)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre de questions</label>
            <input type="number" min="1" max="50" value={form.mp_num_questions}
              onChange={(e) => set("mp_num_questions", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Difficulté</label>
            <select value={form.mp_difficulty} onChange={(e) => set("mp_difficulty", e.target.value)} className="input-field">
              {DIFFICULTIES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Condition de fin</label>
          <select value={form.mp_end_condition} onChange={(e) => set("mp_end_condition", e.target.value)} className="input-field">
            {END_CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Types de question</label>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => toggleType(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  form.mp_types.includes(t.key)
                    ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                }`}>{t.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Domaines par défaut (clés séparées par des virgules)</label>
          <input type="text" value={form.mp_themes} placeholder="geo, sport, histoire…"
            onChange={(e) => set("mp_themes", e.target.value)} className="input-field" />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="btn-primary mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
        {saving ? <Spinner size={16} className="!border-white/40 !border-t-white" /> : <FiSave size={16} />} Enregistrer
      </button>
    </div>
  );
}
