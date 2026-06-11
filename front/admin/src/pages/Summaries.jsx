import { useState, useEffect, useCallback } from "react";
import { FiBookOpen } from "react-icons/fi";
import { listSummaries } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const userLabel = (row) => row.user?.email || row.user?.username || row.user_email || row.user || "—";
const LEVELS = { brief: ["Bref", "indigo"], medium: ["Moyen", "amber"], detailed: ["Détaillé", "pink"] };

export default function Summaries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(asList(await listSummaries())); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "user", label: "Utilisateur", render: userLabel },
    { key: "document", label: "Document", render: (s) => s.document_title || s.document || `Doc ${s.document_id || ""}`, hideOnMobile: true },
    {
      key: "level", label: "Niveau",
      render: (s) => { const [lbl, tone] = LEVELS[s.level] || [s.level || "—", "neutral"]; return <Badge tone={tone}>{lbl}</Badge>; },
    },
    { key: "created_at", label: "Généré le", render: (s) => fmtDate(s.created_at) },
  ];

  return (
    <>
      <PageHeader title="Résumés" subtitle="Résumés générés par l'IA" />
      {error && !loading && <ErrorState message={error} onRetry={load} />}
      {loading ? <LoadingState label="Chargement des résumés…" />
        : !error && items.length === 0 ? <EmptyState icon={FiBookOpen} title="Aucun résumé" />
        : !error && <DataTable columns={columns} data={items} />}
    </>
  );
}
