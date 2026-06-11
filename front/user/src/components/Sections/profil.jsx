import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiLogOut, FiTrash2, FiLoader, FiFileText, FiTarget, FiTrendingUp,
  FiZap, FiCalendar, FiAlertCircle, FiFolder,
} from "react-icons/fi";
import { getUserProfile, getDocuments, deleteDocument, getAnalyticsSummary } from "../../services/api";
import { useAuth } from "../../AuthContext";
import {
  staggerContainer, staggerItem, hoverLift, tap, EASE,
} from "../../lib/motion";
import ConfirmModal from "../ui/ConfirmModal";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE, delay },
});

export default function ProfileSection() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // ConfirmModal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [userdata, docsData, analyticsData] = await Promise.allSettled([
        getUserProfile(),
        getDocuments(),
        getAnalyticsSummary(),
      ]);
      if (userdata.status === "fulfilled") setUser(userdata.value);
      if (docsData.status === "fulfilled") setDocuments(docsData.value);
      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
      if (userdata.status === "rejected" && docsData.status === "rejected") {
        setError("Impossible de charger le profil.");
      }
    } catch (err) {
      setError(err.message || "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const requestDeleteDocument = (docId) => {
    setPendingDeleteId(docId);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user
    ? user.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : user.username || "Utilisateur"
    : authUser?.first_name
    ? `${authUser.first_name} ${authUser.last_name || ""}`.trim()
    : authUser?.username || "Utilisateur";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const avgScore = analytics?.average_score != null
    ? `${Math.round(analytics.average_score)}%`
    : "—";
  const streak = analytics?.current_streak != null
    ? `${analytics.current_streak}j`
    : "0j";
  const quizCompleted = analytics?.total_quizzes ?? 0;

  const stats = [
    { icon: FiFileText,   label: "Documents",      value: documents.length, color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" },
    { icon: FiTarget,     label: "Quiz complétés", value: quizCompleted,    color: "text-pink-400",   bg: "bg-pink-500/15 border-pink-500/30"    },
    { icon: FiTrendingUp, label: "Score moyen",    value: avgScore,         color: "text-emerald-400",bg: "bg-emerald-500/15 border-emerald-500/30"},
    { icon: FiZap,        label: "Série actuelle", value: streak,           color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/30"  },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <FiLoader className="animate-spin text-indigo-400" size={28} />
          </div>
          <p className="text-gray-400 text-sm font-medium">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        title="Supprimer le document"
        message="Cette action est irréversible. Le document et tous ses résumés/quiz associés seront supprimés."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <motion.div {...fadeUp(0)} className="relative glass-panel rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.35) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(236,72,153,0.2) 0%, transparent 60%)",
            }}
          />

          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 sm:gap-6">
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/20">
                    <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-widest">{initials}</span>
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-ink-900" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-fluid-2xl font-black text-white tracking-tight mb-1 truncate">{displayName}</h1>
                  <p className="text-gray-400 text-sm truncate">{user?.email || authUser?.email || "—"}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <FiCalendar size={12} className="text-gray-500 flex-shrink-0" />
                    <p className="text-xs text-gray-500">Membre depuis {memberSince}</p>
                  </div>
                </div>
              </div>

              <motion.button
                {...tap}
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-xl transition-all font-semibold text-sm self-start w-full sm:w-auto flex-shrink-0"
              >
                <FiLogOut size={16} />
                Se déconnecter
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
        >
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              {...hoverLift}
              className={`glass-card p-3 sm:p-4 md:p-5 rounded-2xl border ${bg}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-fluid-xl font-black text-white mb-1">{value}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-widest">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.16)} className="glass-panel rounded-[1.75rem] sm:rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-7">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <FiFolder size={18} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-fluid-lg font-black text-white tracking-tight truncate">Mes Documents</h2>
                <p className="text-xs text-gray-500">{documents.length} fichier{documents.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-start gap-3"
            >
              <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <FiFileText size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium mb-2">Aucun document uploadé</p>
              <p className="text-sm text-gray-600">
                Allez à la section "Upload" pour commencer.
              </p>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  variants={staggerItem}
                  className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 hover:border-indigo-500/40 group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiFileText size={15} className="text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {doc.title || doc.file?.split("/").pop() || `Document ${doc.id}`}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(doc.upload_date).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    {...tap}
                    onClick={() => requestDeleteDocument(doc.id)}
                    disabled={deletingId === doc.id}
                    className="flex-shrink-0 p-2.5 bg-red-500/10 hover:bg-red-500/25 disabled:opacity-50 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg transition-all flex items-center justify-center text-sm"
                  >
                    {deletingId === doc.id ? (
                      <FiLoader className="animate-spin" size={15} />
                    ) : (
                      <FiTrash2 size={15} />
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}
