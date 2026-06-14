import { useState, useEffect, useCallback } from "react";
import { FiZap, FiCheckCircle, FiX } from "react-icons/fi";
import { listFeatureRequests, handleFeatureRequest } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const asList = (res) => (Array.isArray(res) ? res : res?.results ?? []);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statusBadge = (status) => {
  if (status === "approved") return <Badge tone="green">Approuvé</Badge>;
  if (status === "refused") return <Badge tone="red">Refusé</Badge>;
  return <Badge tone="amber">En attente</Badge>;
};

export default function FeatureRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { request, action: "approve"|"refuse" }
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRequests(asList(await listFeatureRequests()));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (request, action) => {
    setModal({ request, action });
    setReason("");
    setSubmitError("");
  };

  const closeModal = () => {
    if (submitting) return;
    setModal(null);
    setReason("");
    setSubmitError("");
  };

  const submit = async () => {
    if (!modal) return;
    if (modal.action === "refuse" && !reason.trim()) {
      setSubmitError("Veuillez indiquer la raison du refus.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await handleFeatureRequest(modal.request.id, modal.action, reason.trim());
      setRequests((list) =>
        list.map((r) =>
          r.id === modal.request.id
            ? { ...r, status: modal.action === "approve" ? "approved" : "refused", admin_reason: reason.trim() }
            : r
        )
      );
      setModal(null);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "user",
      label: "Utilisateur",
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xs font-black text-purple-300 shrink-0">
            {(r.user?.username || r.user?.email || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{r.user?.username || "—"}</p>
            <p className="text-xs text-gray-500 truncate">{r.user?.email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Date de demande",
      render: (r) => fmtDate(r.created_at),
      hideOnMobile: true,
    },
    {
      key: "status",
      label: "Statut",
      render: (r) => statusBadge(r.status),
    },
    {
      key: "admin_reason",
      label: "Raison",
      render: (r) =>
        r.admin_reason ? (
          <span className="text-xs text-gray-400 truncate max-w-[200px] block">{r.admin_reason}</span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        ),
      hideOnMobile: true,
    },
  ];

  const actions = (r) => {
    if (r.status !== "pending") return null;
    return (
      <>
        <button
          onClick={() => openModal(r, "approve")}
          title="Approuver"
          className="p-2 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition"
        >
          <FiCheckCircle size={16} />
        </button>
        <button
          onClick={() => openModal(r, "refuse")}
          title="Refuser"
          className="p-2 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition"
        >
          <FiX size={16} />
        </button>
      </>
    );
  };

  const isApprove = modal?.action === "approve";

  return (
    <>
      <PageHeader
        title="Demandes PDF"
        subtitle="Gérer les demandes d'activation de la fonctionnalité Défi PDF"
      />

      {error && !loading && <ErrorState message={error} onRetry={load} />}
      {loading ? (
        <LoadingState label="Chargement des demandes…" />
      ) : !error && requests.length === 0 ? (
        <EmptyState icon={FiZap} title="Aucune demande" message="Aucun utilisateur n'a encore demandé l'activation du défi PDF." />
      ) : (
        !error && <DataTable columns={columns} data={requests} actions={actions} />
      )}

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={isApprove ? "Approuver la demande" : "Refuser la demande"}
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={closeModal} className="btn-secondary" disabled={submitting}>
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className={`btn-primary ${isApprove ? "" : "!bg-red-600 hover:!bg-red-500 !shadow-red-500/25"}`}
            >
              {submitting ? (
                <Spinner size={16} className="!border-white/40 !border-t-white" />
              ) : isApprove ? (
                <FiCheckCircle size={15} />
              ) : (
                <FiX size={15} />
              )}
              {isApprove ? "Approuver" : "Refuser"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            {isApprove ? (
              <>
                Vous allez activer la fonctionnalité <span className="text-white font-semibold">Défi PDF</span> pour{" "}
                <span className="text-purple-300 font-semibold">{modal?.request?.user?.username}</span>.
                L'utilisateur recevra une notification.
              </>
            ) : (
              <>
                Vous allez refuser la demande de{" "}
                <span className="text-purple-300 font-semibold">{modal?.request?.user?.username}</span>.
                La raison sera visible par l'utilisateur.
              </>
            )}
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              {isApprove ? "Message (optionnel)" : "Raison du refus *"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isApprove
                  ? "Message d'accompagnement pour l'utilisateur…"
                  : "Expliquez pourquoi la demande est refusée…"
              }
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {submitError}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
