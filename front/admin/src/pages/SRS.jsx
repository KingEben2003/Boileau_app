import { useState, useEffect, useCallback } from "react";
import { FiRepeat } from "react-icons/fi";
import { listSRSCards } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const userLabel = (row) => row.user?.email || row.user?.username || row.user_email || row.user || "—";

export default function SRS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(asList(await listSRSCards())); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "user", label: "Utilisateur", render: userLabel },
    { key: "document", label: "Document", render: (c) => c.document_title || c.document || `Doc ${c.document_id || ""}`, hideOnMobile: true },
    { key: "next_review", label: "Prochaine révision", render: (c) => fmtDate(c.next_review) },
    { key: "interval", label: "Intervalle", render: (c) => (c.interval != null ? `${c.interval} j` : "—"), hideOnMobile: true },
    { key: "repetitions", label: "Répétitions", render: (c) => c.repetitions ?? "—", hideOnMobile: true },
    { key: "easiness_factor", label: "Facilité", render: (c) => (c.easiness_factor != null ? Number(c.easiness_factor).toFixed(2) : "—"), hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader title="Révisions (SRS)" subtitle="Cartes de répétition espacée (algorithme SM-2)" />
      {error && !loading && <ErrorState message={error} onRetry={load} />}
      {loading ? <LoadingState label="Chargement des cartes SRS…" />
        : !error && items.length === 0 ? <EmptyState icon={FiRepeat} title="Aucune carte SRS" />
        : !error && <DataTable columns={columns} data={items} />}
    </>
  );
}
