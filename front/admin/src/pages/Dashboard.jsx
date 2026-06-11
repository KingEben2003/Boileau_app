import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FiUsers, FiUserPlus, FiHelpCircle, FiFileText,
  FiBookOpen, FiActivity, FiTarget, FiTrendingUp,
} from "react-icons/fi";
import { getAdminStats } from "../services/api";
import { staggerContainer } from "../lib/motion";
import StatCard from "../components/ui/StatCard";
import PageHeader from "../components/ui/PageHeader";
import { LoadingState, ErrorState } from "../components/ui/States";

// Mini-graphe en barres (SVG natif, zéro dépendance)
function BarChart({ data = [], color = "#6366f1", label }) {
  const max = Math.max(1, ...data.map((d) => d.count || 0));
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-fluid-lg font-bold text-white">{label}</h3>
        <FiTrendingUp className="text-gray-500" />
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Aucune donnée sur la période.</p>
      ) : (
        <div className="flex items-end justify-between gap-1.5 h-36">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-full flex items-end justify-center h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${((d.count || 0) / max) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  className="w-full max-w-[28px] rounded-t-lg"
                  style={{ background: `linear-gradient(to top, ${color}, ${color}99)`, minHeight: d.count ? 4 : 0 }}
                  title={`${d.count}`}
                />
              </div>
              <span className="text-[10px] text-gray-600 truncate w-full text-center">{d.label || d.date?.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStats(await getAdminStats());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Chargement des indicateurs…" />;
  if (error) return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme" />
      <ErrorState message={error} onRetry={load} />
    </>
  );

  const s = stats || {};
  const num = (v) => (v ?? 0).toLocaleString("fr-FR");

  const KPIS = [
    { icon: FiUsers, label: "Utilisateurs", value: num(s.users_total), hint: "Total des comptes", accent: "indigo" },
    { icon: FiUserPlus, label: "Inscrits aujourd'hui", value: num(s.users_today), hint: "Nouveaux comptes du jour", accent: "emerald" },
    { icon: FiActivity, label: "Actifs (7 j)", value: num(s.active_users_7d), hint: "Sur la dernière semaine", accent: "purple" },
    { icon: FiHelpCircle, label: "Quiz aujourd'hui", value: num(s.quizzes_today), hint: `${num(s.quizzes_total)} au total`, accent: "pink" },
    { icon: FiFileText, label: "Documents", value: num(s.documents_total), hint: "PDF uploadés", accent: "indigo" },
    { icon: FiBookOpen, label: "Résumés générés", value: num(s.summaries_total), hint: "Par l'IA", accent: "amber" },
    { icon: FiTarget, label: "Score moyen (jour)", value: `${Math.round(s.avg_score_today ?? 0)}%`, hint: "Quiz du jour", accent: "emerald" },
  ];

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme Boileau" />

      <motion.div
        variants={staggerContainer} initial="initial" animate="animate"
        className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {KPIS.map((k) => <StatCard key={k.label} {...k} />)}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <BarChart label="Inscriptions (7 derniers jours)" data={s.signups_7d || []} color="#6366f1" />
        <BarChart label="Quiz passés (7 derniers jours)" data={s.quizzes_7d || []} color="#ec4899" />
      </div>
    </>
  );
}
