import { useState, useEffect, useCallback } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiGlobe, FiX, FiCheck } from "react-icons/fi";
import {
  listCultureQuestions, createCultureQuestion,
  updateCultureQuestion, deleteCultureQuestion,
} from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import Modal, { ConfirmDialog } from "../components/ui/Modal";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);

const THEME_SUGGESTIONS = [
  "culture_generale","actualites","faits_insolites","records_exploits",
  "histoire_mondiale","histoire_afrique","histoire_cdi","grandes_civilisations","guerres_conflits",
  "pays_capitales","drapeaux","fleuves_mers","montagnes_deserts","geo_afrique","geo_cdi",
  "biologie","physique","chimie","astronomie","sciences_terre","environnement",
  "informatique","programmation","ia","cybersecurite","internet_reseaux","histoire_info",
  "francais","anglais","grammaire","orthographe","litterature_africaine","litterature_mondiale",
  "calcul_mental","algebre","geometrie","probabilites","logique_maths",
  "football","basketball","jeux_olympiques","sports_africains","records_sportifs",
  "cinema","series_tv","musique","jeux_video","manga_anime",
  "histoire_ivoirienne","politique_ivoirienne","geo_ivoirienne","personnalites_ivoiriennes","culture_ivoirienne","langues_locales",
  "expressions_nouchi","signification_mots","argot_ivoirien","culture_urbaine","coupe_decale","personnalites_urbaines",
  "entreprises","finance","marketing","entrepreneuriat","economie_mondiale",
  "droit","institutions","education_civique","organisations_internationales",
  "enigmes","logique_enigmes","raisonnement","tests_qi",
];

const FILTER_SELECT = "bg-gray-900 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/60 cursor-pointer";

const emptyForm = { theme: "", question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", type: "qcm", difficulty: "medium" };

function QuestionForm({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(initial
        ? {
            theme: initial.theme || "",
            question: initial.question || "",
            options: Array.isArray(initial.options) && initial.options.length ? [...initial.options] : ["", "", "", ""],
            correct_answer: typeof initial.correct_answer === "number" ? initial.correct_answer : 0,
            explanation: initial.explanation || "",
            type: initial.type || "qcm",
            difficulty: initial.difficulty || "medium",
          }
        : emptyForm);
    }
  }, [open, initial]);

  const setOption = (i, val) => setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? val : o)) }));
  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ""] }));
  const removeOption = (i) => setForm((f) => {
    const options = f.options.filter((_, idx) => idx !== i);
    return { ...f, options, correct_answer: Math.min(f.correct_answer, options.length - 1) };
  });

  const submit = async () => {
    const options = form.options.map((o) => o.trim()).filter(Boolean);
    if (!form.theme.trim()) return setError("Le thème est obligatoire.");
    if (!form.question.trim()) return setError("La question est obligatoire.");
    if (options.length < 2) return setError("Au moins 2 réponses sont nécessaires.");
    if (form.correct_answer >= options.length) return setError("La bonne réponse sélectionnée n'existe plus.");

    setSaving(true); setError("");
    const payload = { theme: form.theme.trim(), question: form.question.trim(), options, correct_answer: form.correct_answer, explanation: form.explanation.trim(), type: form.type, difficulty: form.difficulty };
    try {
      const saved = initial ? await updateCultureQuestion(initial.id, payload) : await createCultureQuestion(payload);
      onSaved(saved, !!initial);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title={initial ? "Modifier la question" : "Nouvelle question"}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Annuler</button>
          <button onClick={submit} className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} className="!border-white/40 !border-t-white" /> : <FiCheck size={16} />}
            {initial ? "Enregistrer" : "Créer"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>}

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Thème</label>
          <input
            list="theme-suggestions" value={form.theme}
            onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
            placeholder="ex. football" className="input-field"
          />
          <datalist id="theme-suggestions">
            {THEME_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input-field">
              <option value="qcm">QCM</option>
              <option value="true_false">Vrai / Faux</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Difficulté</label>
            <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className="input-field">
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Question</label>
          <textarea
            value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            rows={2} placeholder="Énoncé de la question…" className="input-field resize-y"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Réponses</label>
            <span className="text-[11px] text-gray-500">Cochez la bonne réponse</span>
          </div>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button" onClick={() => setForm((f) => ({ ...f, correct_answer: i }))}
                  title="Marquer comme bonne réponse"
                  className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition ${
                    form.correct_answer === i ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                  }`}
                >
                  {form.correct_answer === i ? <FiCheck size={16} /> : String.fromCharCode(65 + i)}
                </button>
                <input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Réponse ${String.fromCharCode(65 + i)}`} className="input-field py-2.5" />
                {form.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition" title="Retirer">
                    <FiX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {form.options.length < 6 && (
            <button type="button" onClick={addOption} className="btn-ghost mt-2 !px-3 !py-1.5 text-sm">
              <FiPlus size={14} /> Ajouter une réponse
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Explication (optionnel)</label>
          <textarea
            value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            rows={2} placeholder="Affichée à l'utilisateur après correction…" className="input-field resize-y"
          />
        </div>
      </div>
    </Modal>
  );
}

const DIFFICULTY_LABEL = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
const DIFFICULTY_TONE  = { easy: "green", medium: "yellow", hard: "red" };
const TYPE_LABEL = { qcm: "QCM", true_false: "Vrai/Faux" };

export default function Culture() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [editing, setEditing] = useState(undefined);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (t, tp, diff) => {
    setLoading(true); setError("");
    const params = {};
    if (t) params.theme = t;
    if (tp) params.type = tp;
    if (diff) params.difficulty = diff;
    try { setQuestions(asList(await listCultureQuestions(Object.keys(params).length ? params : undefined))); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(theme, filterType, filterDifficulty); }, [theme, filterType, filterDifficulty, load]);

  const onSaved = (saved, wasEdit) => {
    setEditing(undefined);
    if (wasEdit && saved?.id) setQuestions((list) => list.map((q) => (q.id === saved.id ? saved : q)));
    else load(theme, filterType, filterDifficulty);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await deleteCultureQuestion(toDelete.id); setQuestions((l) => l.filter((q) => q.id !== toDelete.id)); setToDelete(null); }
    catch (e) { setError(e.message); } finally { setDeleting(false); }
  };

  const themes = Array.from(new Set([...THEME_SUGGESTIONS, ...questions.map((q) => q.theme).filter(Boolean)])).sort();

  const columns = [
    { key: "theme",      label: "Thème",      render: (q) => <Badge tone="indigo">{q.theme}</Badge> },
    { key: "type",       label: "Type",       hideOnMobile: true, render: (q) => <Badge tone="blue">{TYPE_LABEL[q.type] ?? q.type}</Badge> },
    { key: "difficulty", label: "Difficulté", hideOnMobile: true, render: (q) => <Badge tone={DIFFICULTY_TONE[q.difficulty] ?? "gray"}>{DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}</Badge> },
    { key: "question",   label: "Question",   render: (q) => <span className="line-clamp-2">{q.question}</span>, className: "max-w-md" },
    {
      key: "options", label: "Bonne réponse", hideOnMobile: true,
      render: (q) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const ans = typeof q.correct_answer === "number" ? opts[q.correct_answer] : q.correct_answer;
        return <span className="text-emerald-300 text-sm">{ans || "—"}</span>;
      },
    },
  ];

  const actions = (q) => (
    <>
      <button onClick={() => setEditing(q)} title="Modifier" className="p-2 rounded-lg text-gray-400 hover:text-indigo-300 hover:bg-white/10 transition">
        <FiEdit2 size={16} />
      </button>
      <button onClick={() => setToDelete(q)} title="Supprimer" className="p-2 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition">
        <FiTrash2 size={16} />
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Culture Générale"
        subtitle="Gérer la banque de questions par thème"
        actions={
          <>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className={FILTER_SELECT}>
              <option value="">Tous les thèmes</option>
              {themes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={FILTER_SELECT}>
              <option value="">Tous les types</option>
              <option value="qcm">QCM</option>
              <option value="true_false">Vrai / Faux</option>
            </select>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={FILTER_SELECT}>
              <option value="">Toutes difficultés</option>
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
            <button onClick={() => setEditing(null)} className="btn-primary !py-2.5">
              <FiPlus size={16} /> Ajouter
            </button>
          </>
        }
      />

      {error && !loading && <ErrorState message={error} onRetry={() => load(theme, filterType, filterDifficulty)} />}
      {loading ? <LoadingState label="Chargement des questions…" />
        : !error && questions.length === 0 ? <EmptyState icon={FiGlobe} title="Aucune question" message="Ajoutez votre première question de culture générale." />
        : !error && <DataTable columns={columns} data={questions} actions={actions} />}

      <QuestionForm open={editing !== undefined} initial={editing || null} onClose={() => setEditing(undefined)} onSaved={onSaved} />

      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Supprimer cette question ?"
        message={`« ${toDelete?.question?.slice(0, 80) || ""}… » sera définitivement supprimée.`}
      />
    </>
  );
}
