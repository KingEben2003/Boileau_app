import { useState, useEffect, useCallback } from "react";
import { FiShare2 } from "react-icons/fi";
import { listFriendRequests } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const label = (u) => u?.username || u?.email || u || "—";
const STATUS = { pending: ["En attente", "amber"], accepted: ["Acceptée", "green"], declined: ["Refusée", "red"] };

export default function Friends() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(asList(await listFriendRequests())); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "from_user", label: "De", render: (r) => label(r.from_user) },
    { key: "to_user", label: "Vers", render: (r) => label(r.to_user) },
    {
      key: "status", label: "Statut",
      render: (r) => { const [lbl, tone] = STATUS[r.status] || [r.status || "—", "neutral"]; return <Badge tone={tone}>{lbl}</Badge>; },
    },
    { key: "sent_at", label: "Envoyée le", render: (r) => fmtDate(r.sent_at || r.created_at), hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader title="Amis & Demandes" subtitle="Relations et demandes d'amitié entre utilisateurs" />
      {error && !loading && <ErrorState message={error} onRetry={load} />}
      {loading ? <LoadingState label="Chargement des demandes…" />
        : !error && items.length === 0 ? <EmptyState icon={FiShare2} title="Aucune demande" />
        : !error && <DataTable columns={columns} data={items} />}
    </>
  );
}
