import { useState, useEffect, useCallback } from "react";
import { FiHelpCircle } from "react-icons/fi";
import { listResults } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const userLabel = (row) => row.user?.email || row.user?.username || row.user_email || row.user || "—";
const scoreTone = (s) => (s >= 80 ? "green" : s >= 50 ? "amber" : "red");

export default function Quizzes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(asList(await listResults())); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "user", label: "Utilisateur", render: userLabel },
    { key: "document", label: "Source", render: (r) => r.document_title || r.quiz?.document_title || r.document || `Quiz ${r.quiz || r.quiz_id || ""}`, hideOnMobile: true },
    { key: "score", label: "Score", render: (r) => <Badge tone={scoreTone(r.score ?? 0)}>{Math.round(r.score ?? 0)}%</Badge> },
    { key: "time", label: "Temps", render: (r) => (r.time_spent_seconds != null ? `${Math.round(r.time_spent_seconds)} s` : "—"), hideOnMobile: true },
    { key: "date_passed", label: "Passé le", render: (r) => fmtDateTime(r.date_passed || r.created_at) },
  ];

  return (
    <>
      <PageHeader title="Quiz & Résultats" subtitle="Historique des quiz passés par les utilisateurs" />
      {error && !loading && <ErrorState message={error} onRetry={load} />}
      {loading ? <LoadingState label="Chargement des résultats…" />
        : !error && items.length === 0 ? <EmptyState icon={FiHelpCircle} title="Aucun résultat" />
        : !error && <DataTable columns={columns} data={items} />}
    </>
  );
}
