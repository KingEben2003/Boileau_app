import { useState, useEffect, useCallback } from "react";
import { FiSearch, FiTrash2, FiShield, FiShieldOff, FiCheckCircle, FiSlash, FiUsers } from "react-icons/fi";
import { listUsers, setUserActive, setUserStaff, deleteUser } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { ConfirmDialog } from "../components/ui/Modal";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (q = "") => {
    setLoading(true); setError("");
    try {
      setUsers(asList(await listUsers(q ? { search: q } : undefined)));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recherche debouncée
  useEffect(() => {
    const t = setTimeout(() => load(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  const patchLocal = (id, changes) => setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...changes } : u)));

  const toggleActive = async (u) => {
    setBusyId(u.id);
    try { await setUserActive(u.id, !u.is_active); patchLocal(u.id, { is_active: !u.is_active }); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };
  const toggleStaff = async (u) => {
    setBusyId(u.id);
    try { await setUserStaff(u.id, !u.is_staff); patchLocal(u.id, { is_staff: !u.is_staff }); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteUser(toDelete.id);
      setUsers((list) => list.filter((u) => u.id !== toDelete.id));
      setToDelete(null);
    } catch (e) { setError(e.message); } finally { setDeleting(false); }
  };

  const columns = [
    {
      key: "username", label: "Utilisateur",
      render: (u) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-300 shrink-0">
            {(u.username || u.email || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{u.username || "—"}</p>
            <p className="text-xs text-gray-500 truncate">{u.email || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "date_joined", label: "Inscrit le", render: (u) => fmtDate(u.date_joined), hideOnMobile: true },
    {
      key: "is_active", label: "Statut",
      render: (u) => u.is_active
        ? <Badge tone="green">Actif</Badge>
        : <Badge tone="red">Désactivé</Badge>,
    },
    {
      key: "is_staff", label: "Rôle",
      render: (u) => u.is_superuser
        ? <Badge tone="pink">Superadmin</Badge>
        : u.is_staff ? <Badge tone="indigo">Staff</Badge> : <Badge>Membre</Badge>,
    },
  ];

  const actions = (u) => (
    <>
      <button
        onClick={() => toggleActive(u)} disabled={busyId === u.id}
        title={u.is_active ? "Désactiver" : "Activer"}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
      >
        {busyId === u.id ? <Spinner size={15} /> : u.is_active ? <FiSlash size={16} /> : <FiCheckCircle size={16} />}
      </button>
      <button
        onClick={() => toggleStaff(u)} disabled={busyId === u.id || u.is_superuser}
        title={u.is_staff ? "Retirer le rôle staff" : "Donner le rôle staff"}
        className="p-2 rounded-lg text-gray-400 hover:text-indigo-300 hover:bg-white/10 transition disabled:opacity-40"
      >
        {u.is_staff ? <FiShieldOff size={16} /> : <FiShield size={16} />}
      </button>
      <button
        onClick={() => setToDelete(u)} disabled={u.is_superuser}
        title="Supprimer"
        className="p-2 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-30"
      >
        <FiTrash2 size={16} />
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gérer les comptes, les rôles et les accès"
        actions={
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, email)…" className="input-field pl-10 py-2.5"
            />
          </div>
        }
      />

      {error && !loading && <ErrorState message={error} onRetry={() => load(search.trim())} />}
      {loading ? <LoadingState label="Chargement des utilisateurs…" />
        : !error && users.length === 0 ? <EmptyState icon={FiUsers} title="Aucun utilisateur" message="Aucun compte ne correspond à la recherche." />
        : !error && <DataTable columns={columns} data={users} actions={actions} />}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Supprimer cet utilisateur ?"
        confirmLabel="Supprimer définitivement"
        message={`Le compte « ${toDelete?.username || toDelete?.email} » et toutes ses données associées seront supprimés. Cette action est irréversible.`}
      />
    </>
  );
}
