import { useState, useEffect, useCallback } from "react";
import { FiFileText, FiTrash2 } from "react-icons/fi";
import { listDocuments, deleteDocument } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { ConfirmDialog } from "../components/ui/Modal";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const userLabel = (row) => row.user?.email || row.user?.username || row.user_email || row.username || row.user || "—";

export default function Documents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(asList(await listDocuments())); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await deleteDocument(toDelete.id); setItems((l) => l.filter((d) => d.id !== toDelete.id)); setToDelete(null); }
    catch (e) { setError(e.message); } finally { setDeleting(false); }
  };

  const columns = [
    { key: "title", label: "Titre", render: (d) => <span className="font-semibold text-white line-clamp-1">{d.title || `Document ${d.id}`}</span> },
    { key: "user", label: "Propriétaire", render: userLabel },
    { key: "created_at", label: "Ajouté le", render: (d) => fmtDate(d.created_at), hideOnMobile: true },
  ];

  const actions = (d) => (
    <button onClick={() => setToDelete(d)} title="Supprimer" className="p-2 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition">
      <FiTrash2 size={16} />
    </button>
  );

  return (
    <>
      <PageHeader title="Documents" subtitle="Tous les PDF uploadés sur la plateforme" />
      {error && !loading && <ErrorState message={error} onRetry={load} />}
      {loading ? <LoadingState label="Chargement des documents…" />
        : !error && items.length === 0 ? <EmptyState icon={FiFileText} title="Aucun document" />
        : !error && <DataTable columns={columns} data={items} actions={actions} />}
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Supprimer ce document ?"
        message={`« ${toDelete?.title || "Document"} » sera supprimé, ainsi que le fichier sur le disque.`}
      />
    </>
  );
}
