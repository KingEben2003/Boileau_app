import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  FiTrendingUp, FiAward, FiZap, FiTarget, FiStar,
  FiCpu, FiRefreshCw, FiCheckCircle, FiBarChart2, FiUsers,
  FiShield, FiGift, FiSun, FiCheck,
} from "react-icons/fi";
import {
  getAnalyticsSummary,
  getAnalyticsDashboard,
  getAIWeaknesses,
  getSRSDue,
  updateSRS,
  getDailyChallenges,
} from "../../services/api";
import { fadeInUp, staggerContainer, staggerItem, hoverLift } from "../../lib/motion";

/* ─── Constantes gamification ────────────────────────────────────────── */
const LEVEL_NAMES = ["Novice", "Apprenti", "Explorateur", "Adepte", "Expert",
  "Maître", "Sage", "Vétéran", "Légende", "Dieu"];

/* Catalogue complet des cosmétiques — unlocked = badge reçu de l'API */
const COSMETICS_CATALOG = [
  { id: 1, name: "Avatar Flamme",   type: "avatar",  icon: "🔥", badgeKey: "Premier quiz"   },
  { id: 2, name: "Avatar Cristal",  type: "avatar",  icon: "💎", badgeKey: "Score parfait"   },
  { id: 3, name: "Badge Chasseur",  type: "badge",   icon: "🏹", badgeKey: "Série de 3"      },
  { id: 4, name: "Badge Champion",  type: "badge",   icon: "🏆", badgeKey: "Série de 7"      },
  { id: 5, name: "Thème Galaxie",   type: "theme",   icon: "🌌", badgeKey: "10 quiz complétés" },
  { id: 6, name: "Bordure Or",      type: "border",  icon: "✨", badgeKey: "Assidu"           },
];

/* ─── Level Scale ──────────────────────────────────────────────────── */
function LevelScale({ currentLevel }) {
  const TOTAL_LEVELS = 10;
  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
        {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
          const lvl = i + 1;
          const isActive = lvl === currentLevel;
          const isPast = lvl < currentLevel;
          return (
            <div key={lvl} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: isActive ? 1.15 : 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={`relative flex flex-col items-center gap-1`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 border-purple-300 text-white shadow-lg shadow-purple-500/40"
                    : isPast
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                    : "bg-white/5 border-white/10 text-gray-600"
                }`}>
                  {isActive ? <FiStar size={16} className="text-white" /> : lvl}
                </div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -inset-1 rounded-full bg-purple-500/20 blur-sm -z-10"
                  />
                )}
                <span className={`text-[9px] font-bold text-center leading-tight w-12 ${
                  isActive ? "text-purple-300" : isPast ? "text-emerald-600" : "text-gray-700"
                }`}>
                  {LEVEL_NAMES[i]}
                </span>
              </motion.div>
              {lvl < TOTAL_LEVELS && (
                <div className={`w-4 h-0.5 mx-0.5 rounded-full ${
                  isPast ? "bg-emerald-500/50" : "bg-white/10"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Heatmap faiblesses ─────────────────────────────────────────── */
function WeaknessHeatmap({ themes }) {
  const getColor = (score) => {
    if (score >= 75) return { bg: "bg-emerald-500/30", border: "border-emerald-500/50", text: "text-emerald-300" };
    if (score >= 50) return { bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-300" };
    if (score >= 30) return { bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-300" };
    return { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-300" };
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {themes.map((theme, i) => {
        const c = getColor(theme.score);
        return (
          <motion.div
            key={theme.name}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`p-3 rounded-xl border ${c.bg} ${c.border} flex flex-col gap-1`}
          >
            <span className="text-xs font-bold text-white truncate">{theme.name}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${theme.score}%` }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
                  className={`h-full rounded-full ${
                    theme.score >= 75 ? "bg-emerald-400" :
                    theme.score >= 50 ? "bg-yellow-400" :
                    theme.score >= 30 ? "bg-orange-400" : "bg-red-400"
                  }`}
                />
              </div>
              <span className={`text-[10px] font-black ${c.text}`}>{theme.score}%</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Défis quotidiens ──────────────────────────────────────────── */
function DailyChallenges({ challenges }) {
  const [done, setDone] = useState(
    () => new Set(challenges.filter((c) => c.progress >= c.target).map((c) => c.id))
  );

  const toggleDone = (id) => {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {challenges.map((ch, i) => {
        const isDone = done.has(ch.id) || ch.progress >= ch.target;
        return (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              isDone
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-white/5 border-white/10"
            }`}
          >
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleDone(ch.id)}
              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                isDone
                  ? "bg-emerald-500 border-emerald-400"
                  : "bg-white/5 border-white/20 hover:border-emerald-500/50"
              }`}
            >
              <AnimatePresence>
                {isDone && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <FiCheck size={13} className="text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isDone ? "text-emerald-300 line-through opacity-75" : "text-white"}`}>
                {ch.label}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden max-w-24">
                  <div
                    className="h-full bg-emerald-400/60 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{ch.progress}/{ch.target}</span>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"
              }`}>
                +{ch.reward}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Récompenses cosmétiques ────────────────────────────────────── */
function CosmeticRewards({ items }) {
  const [justUnlocked, setJustUnlocked] = useState(null);

  const handleUnlock = (item) => {
    if (!item.unlocked) {
      setJustUnlocked(item.id);
      setTimeout(() => setJustUnlocked(null), 1500);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
    >
      {items.map((item) => (
        <motion.div
          key={item.id}
          variants={staggerItem}
          {...hoverLift}
          onClick={() => handleUnlock(item)}
          className={`relative p-4 rounded-2xl border text-center cursor-pointer transition-all ${
            item.unlocked
              ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 hover:border-yellow-500/60"
              : "bg-white/5 border-white/10 hover:border-white/20 opacity-60"
          }`}
        >
          {justUnlocked === item.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl bg-yellow-500/20 border-2 border-yellow-400/60 flex items-center justify-center z-10"
            >
              <span className="text-2xl">✨</span>
            </motion.div>
          )}
          <div className="text-3xl mb-2">{item.icon}</div>
          <p className="text-xs font-bold text-white leading-tight">{item.name}</p>
          <p className="text-[10px] text-gray-600 mt-0.5 capitalize">{item.type}</p>
          {item.unlocked
            ? <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-wider text-yellow-400 px-2 py-0.5 bg-yellow-500/10 rounded-full">Débloqué</span>
            : <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-wider text-gray-600 px-2 py-0.5 bg-white/5 rounded-full">🔒 Verrouillé</span>
          }
        </motion.div>
      ))}
    </motion.div>
  );
}

function ProgressChart({ data, globalAvg }) {
  const [hover, setHover] = useState(null);
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(520);

  // ResizeObserver — SVG dimensions always match the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerW(el.offsetWidth || 520);
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(Math.floor(entry.contentRect.width) || 520);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build a complete 7-day range — fill missing days with null
  const today = new Date();
  const allDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const scoreMap = {};
  (data || []).forEach((d) => { scoreMap[d.date] = d.avg_score ?? d.score; });

  const pts = allDays.map((date, i) => ({
    date,
    score: scoreMap[date] != null ? scoreMap[date] : null,
    label: new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }),
    i,
  }));

  const hasAnyData = pts.some((p) => p.score !== null);

  // Responsive SVG dimensions derived from container width
  const W  = Math.max(containerW, 260);
  const H  = Math.max(130, Math.round(W * 0.32));
  const PL = Math.round(W * 0.058);   // left: Y labels
  const PR = Math.round(W * 0.022);
  const PT = Math.round(H * 0.075);
  const PB = Math.round(H * 0.24);
  const fSize   = Math.max(9, Math.min(11, W * 0.02));   // axis font
  const fSizeY  = Math.max(8, Math.min(10, W * 0.017));  // Y label font

  const CW = W - PL - PR;
  const CH = H - PT - PB;
  const N  = pts.length - 1;
  const X  = (i) => PL + (i / N) * CW;
  const Y  = (v) => PT + (1 - v / 100) * CH;

  // Split into segments of consecutive non-null points
  const segments = [];
  let cur = [];
  for (const p of pts) {
    if (p.score !== null) { cur.push(p); }
    else { if (cur.length) { segments.push([...cur]); cur = []; } }
  }
  if (cur.length) segments.push(cur);

  // Smooth cubic bezier path
  const makePath = (seg) =>
    seg.reduce((acc, p, idx) => {
      const x = X(p.i).toFixed(1), y = Y(p.score).toFixed(1);
      if (idx === 0) return `M ${x} ${y}`;
      const prev = seg[idx - 1];
      const cpx = ((X(prev.i) + X(p.i)) / 2).toFixed(1);
      return `${acc} C ${cpx} ${Y(prev.score).toFixed(1)}, ${cpx} ${y}, ${x} ${y}`;
    }, "");

  const gridVals = [0, 25, 50, 75, 100];

  return (
    <div ref={containerRef}>
      {!hasAnyData ? (
        <div className="flex flex-col items-center justify-center h-44 gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <FiBarChart2 size={18} className="text-gray-600" />
          </div>
          <p className="text-sm text-gray-500 text-center">Aucune donnée — faites des quiz pour voir votre courbe.</p>
        </div>
      ) : (
        <div className="relative select-none">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
            <defs>
              <linearGradient id="pgAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
                <stop offset="85%" stopColor="#7c3aed" stopOpacity="0.03" />
              </linearGradient>
              <linearGradient id="pgLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <filter id="pgGlow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Horizontal grid lines + Y labels */}
            {gridVals.map((v) => (
              <g key={v}>
                <line
                  x1={PL} y1={Y(v)} x2={W - PR} y2={Y(v)}
                  stroke={v === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}
                  strokeWidth={v === 0 ? 1 : 0.7}
                />
                <text x={PL - 4} y={Y(v) + fSizeY * 0.38} textAnchor="end" fontSize={fSizeY} fill="#4b5563">{v}</text>
              </g>
            ))}

            {/* Global average dashed reference */}
            {globalAvg > 0 && (
              <>
                <line
                  x1={PL} y1={Y(globalAvg)} x2={W - PR} y2={Y(globalAvg)}
                  stroke="rgba(99,102,241,0.4)" strokeWidth="1" strokeDasharray="5 4"
                />
                <text x={W - PR + 3} y={Y(globalAvg) + fSizeY * 0.38} fontSize={fSizeY} fill="#6366f1">moy</text>
              </>
            )}

            {/* Area fill (only for a single continuous segment) */}
            {segments.length === 1 && segments[0].length >= 2 && (() => {
              const seg = segments[0];
              const linePath = makePath(seg);
              const area = `${linePath} L ${X(seg[seg.length - 1].i).toFixed(1)} ${(PT + CH).toFixed(1)} L ${X(seg[0].i).toFixed(1)} ${(PT + CH).toFixed(1)} Z`;
              return <path d={area} fill="url(#pgAreaGrad)" />;
            })()}

            {/* Lines per segment */}
            {segments.map((seg, si) => {
              if (seg.length === 1) {
                return (
                  <circle key={si} cx={X(seg[0].i)} cy={Y(seg[0].score)} r="4"
                    fill="#ec4899" stroke="#030712" strokeWidth="2" />
                );
              }
              return (
                <path key={si} d={makePath(seg)}
                  fill="none"
                  stroke="url(#pgLineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#pgGlow)"
                />
              );
            })}

            {/* Dashed gap connectors between segments */}
            {segments.slice(0, -1).map((seg, si) => {
              const from = seg[seg.length - 1];
              const to = segments[si + 1][0];
              return (
                <line key={si}
                  x1={X(from.i)} y1={Y(from.score)} x2={X(to.i)} y2={Y(to.score)}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="4 3"
                />
              );
            })}

            {/* Hover zones + data points */}
            {pts.map((p) => (
              <g key={p.i}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(p)}
                onTouchEnd={() => setTimeout(() => setHover(null), 1500)}
              >
                <rect
                  x={X(p.i) - CW / (N * 2)}
                  y={PT}
                  width={CW / N}
                  height={CH}
                  fill="transparent"
                />
                {p.score !== null && (
                  <>
                    {hover?.i === p.i && (
                      <line
                        x1={X(p.i)} y1={PT} x2={X(p.i)} y2={PT + CH}
                        stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 3"
                      />
                    )}
                    <circle
                      cx={X(p.i)} cy={Y(p.score)}
                      r={hover?.i === p.i ? 6 : 4}
                      fill={hover?.i === p.i ? "#f9a8d4" : "#ec4899"}
                      stroke="#030712" strokeWidth="2.5"
                      style={{ transition: "r 0.1s" }}
                    />
                  </>
                )}
              </g>
            ))}

            {/* X axis day labels */}
            {pts.map((p) => (
              <text
                key={p.i}
                x={X(p.i)} y={H - PB * 0.2}
                textAnchor="middle" fontSize={fSize}
                fill={hover?.i === p.i ? "#9ca3af" : p.score !== null ? "#6b7280" : "#374151"}
              >
                {p.label}
              </text>
            ))}
          </svg>

          {/* Tooltip strip below chart */}
          <div className="mt-1.5 h-7 flex items-center justify-center">
            {hover?.score != null ? (
              <motion.p
                key={hover.i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-pink-400"
              >
                {hover.label} —{" "}
                <span className={hover.score >= 75 ? "text-emerald-400" : hover.score >= 50 ? "text-orange-400" : "text-red-400"}>
                  {Number(hover.score).toFixed(0)}%
                </span>
              </motion.p>
            ) : (
              <p className="text-xs text-gray-600 text-center">Survolez / touchez le graphique pour le score exact</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded mb-3" />
      <div className="h-8 w-16 bg-white/10 rounded" />
    </div>
  );
}

export default function ProgressSection() {
  const [summary,          setSummary]          = useState(null);
  const [dashboard,        setDashboard]        = useState(null);
  const [srsItems,         setSrsItems]         = useState([]);
  const [dailyChallenges,  setDailyChallenges]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");

  const [weaknessText, setWeaknessText] = useState("");
  const [weaknessLoading, setWeaknessLoading] = useState(false);
  const [weaknessError, setWeaknessError] = useState("");

  const [reviewingId, setReviewingId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sum, dash, srs, challenges] = await Promise.allSettled([
        getAnalyticsSummary(),
        getAnalyticsDashboard(),
        getSRSDue(),
        getDailyChallenges(),
      ]);
      if (sum.status === "fulfilled") setSummary(sum.value);
      if (dash.status === "fulfilled") setDashboard(dash.value);
      if (srs.status === "fulfilled") setSrsItems(Array.isArray(srs.value) ? srs.value : (srs.value?.items ?? []));
      if (challenges.status === "fulfilled" && Array.isArray(challenges.value)) setDailyChallenges(challenges.value);
    } catch {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAnalyzeWeaknesses = async () => {
    setWeaknessLoading(true);
    setWeaknessError("");
    setWeaknessText("");
    try {
      const data = await getAIWeaknesses();
      setWeaknessText(data.analysis || "Aucune analyse disponible.");
    } catch (err) {
      setWeaknessError(err.message || "Erreur lors de l'analyse.");
    } finally {
      setWeaknessLoading(false);
    }
  };

  const handleMarkReviewed = async (item) => {
    setReviewingId(item.id);
    try {
      await updateSRS(item.document_id, 85);
      setSrsItems((prev) => prev.filter((s) => s.id !== item.id));
    } catch {
      // silent fail
    } finally {
      setReviewingId(null);
    }
  };

  const xp = summary?.xp ?? dashboard?.xp ?? 0;
  const level = summary?.level ?? dashboard?.level ?? 1;
  const xpInLevel = xp % 100;
  const xpToNext = dashboard?.xp_to_next_level ?? (100 - xpInLevel);

  const getMasteryColor = (v) => {
    if (v < 40) return "#ef4444";
    if (v <= 70) return "#f97316";
    return "#22c55e";
  };

  const statCards = [
    {
      label: "Quiz complétés",
      value: summary?.total_quizzes ?? 0,
      icon: <FiTarget size={20} />,
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-400",
      grad: "from-indigo-500 to-indigo-700",
    },
    {
      label: "Score moyen",
      value: summary?.avg_score != null ? `${Number(summary.avg_score).toFixed(0)}%` : "—",
      icon: <FiTrendingUp size={20} />,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      grad: "from-emerald-500 to-emerald-700",
    },
    {
      label: "Série actuelle",
      value: summary?.current_streak != null ? `${summary.current_streak}j` : "0j",
      icon: <FiZap size={20} />,
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      grad: "from-orange-500 to-orange-700",
    },
    {
      label: "Niveau",
      value: `Niv. ${level}`,
      icon: <FiStar size={20} />,
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      grad: "from-purple-500 to-purple-700",
    },
  ];

  const dailyData = dashboard?.progression_7d ?? [];

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-10">
      <motion.div {...fadeInUp}>
        <h2 className="section-title">Ma Progression</h2>
        <p className="text-gray-500 text-fluid-sm mt-1">Performances, gamification et révisions espacées</p>
      </motion.div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-fluid-sm">{error}</div>
      )}

      {/* Stat Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <motion.div
                key={card.label}
                variants={staggerItem}
                className={`glass-card rounded-2xl p-3 sm:p-4 md:p-5 border ${card.border} ${card.bg} flex items-center gap-2 sm:gap-3 md:gap-4`}
              >
                <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${card.grad} text-white shadow-lg flex-shrink-0`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest leading-tight">{card.label}</p>
                  <p className={`text-fluid-xl sm:text-fluid-2xl font-black ${card.text} leading-tight`}>{card.value}</p>
                </div>
              </motion.div>
            ))}
      </motion.div>

      {/* XP / Level bar + Échelle de niveaux — même carte */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-purple-500/20"
      >
        {/* XP bar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-widest">Expérience</p>
            <p className="text-fluid-3xl font-black text-purple-400 leading-tight">Niveau {level}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">XP total</p>
            <p className="text-fluid-xl font-bold text-white">{xp} XP</p>
          </div>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpInLevel}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-6">{xpInLevel} / 100 XP · encore {xpToNext} XP pour le niveau suivant</p>

        {/* Séparateur */}
        <div className="border-t border-white/8 mb-5" />

        {/* Échelle de niveaux */}
        <div className="flex items-center gap-2 mb-1">
          <FiShield className="text-purple-400" size={18} />
          <h3 className="text-fluid-lg font-bold text-white">Échelle de niveaux</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">De Novice à Dieu — niveau actuel : <span className="text-purple-400 font-bold">{LEVEL_NAMES[(level - 1) % 10]}</span></p>
        <LevelScale currentLevel={Math.min(level, 10)} />
      </motion.div>

      {/* Défis quotidiens */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.27 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiSun className="text-emerald-400" size={18} />
          <h3 className="text-fluid-lg font-bold text-white">Défis quotidiens</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">Relevez les défis du jour pour gagner des récompenses</p>
        <DailyChallenges challenges={dailyChallenges} />
      </motion.div>

      {/* Heatmap faiblesses */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.32 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-orange-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiTarget className="text-orange-400" size={18} />
          <h3 className="text-fluid-lg font-bold text-white">Faiblesses par thème</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          <span className="text-emerald-400">Vert</span> = fort · <span className="text-yellow-400">Jaune</span> = moyen · <span className="text-orange-400">Orange</span> = faible · <span className="text-red-400">Rouge</span> = critique
        </p>
        {(summary?.mastery_levels ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Aucun document analysé — faites des quiz pour voir vos résultats ici.</p>
        ) : (
          <WeaknessHeatmap themes={
            summary.mastery_levels.map((m) => ({
              name: (m.title || "").split("/").pop().replace(/\.[^.]+$/, "") || `Doc #${m.document_id}`,
              score: Math.round(m.mastery ?? 0),
            }))
          } />
        )}
      </motion.div>

      {/* Récompenses cosmétiques */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.37 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-yellow-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiGift className="text-yellow-400" size={18} />
          <h3 className="text-fluid-lg font-bold text-white">Récompenses cosmétiques</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">Avatars, badges, thèmes — débloqués en progressant</p>
        <CosmeticRewards items={
          COSMETICS_CATALOG.map((item) => ({
            ...item,
            unlocked: (summary?.badges ?? []).some((b) =>
              (b?.name ?? b)?.toLowerCase().includes(item.badgeKey.toLowerCase())
            ),
          }))
        } />
      </motion.div>

      {/* Benchmark */}
      {dashboard?.benchmark && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="glass-card rounded-2xl p-4 sm:p-6 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
        >
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex-shrink-0">
            <FiUsers size={28} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Benchmark anonyme</p>
            <p className="text-white font-bold text-fluid-lg">
              Moyenne globale : <span className="text-indigo-400">{Number(dashboard.benchmark.global_avg ?? 0).toFixed(0)}%</span>
            </p>
            {dashboard.benchmark.user_percentile != null && (
              <p className="text-fluid-sm text-gray-400 mt-0.5">
                Vous êtes dans le <span className="text-indigo-300 font-semibold">top {100 - Math.round(dashboard.benchmark.user_percentile)}%</span> des utilisateurs
              </p>
            )}
          </div>
          {dashboard.projected_next_score != null && (
            <div className="flex-shrink-0 text-left">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Prochaine session</p>
              <p className="text-fluid-2xl font-black text-pink-400">{Number(dashboard.projected_next_score).toFixed(0)}%</p>
              <p className="text-xs text-gray-600">score estimé</p>
            </div>
          )}
        </motion.div>
      )}

      {/* 7-day progression chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-fluid-lg font-bold text-white flex items-center gap-2">
              <FiBarChart2 className="text-pink-400" size={18} /> Progression (7 jours)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Score moyen par session · survolez pour le détail</p>
          </div>
          {dashboard?.benchmark?.global_avg > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-block w-6 border-t border-dashed border-indigo-500/60" />
              Moyenne globale
            </div>
          )}
        </div>
        <ProgressChart data={dailyData} globalAvg={dashboard?.benchmark?.global_avg} />
      </motion.div>

      {/* SRS — Documents à réviser */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-cyan-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiRefreshCw className="text-cyan-400" size={18} />
          <h3 className="text-fluid-lg font-bold text-white">Documents à réviser</h3>
        </div>
        <p className="text-xs text-gray-500 mb-6">Répétition espacée (SRS) — révisions recommandées aujourd'hui</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : srsItems.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <FiCheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
            <p className="text-sm text-emerald-300">Aucun document à réviser pour l'instant — tout est à jour !</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {srsItems.map((item) => (
              <motion.div
                key={item.id}
                variants={staggerItem}
                className="flex items-center gap-3 sm:gap-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {item.document_title ?? `Document #${item.document_id}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Intervalle : {item.interval_days}j ·{" "}
                    {item.last_score != null ? `Dernier score : ${Number(item.last_score).toFixed(0)}%` : "Pas encore révisé"}
                  </p>
                </div>
                <button
                  onClick={() => handleMarkReviewed(item)}
                  disabled={reviewingId === item.id}
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 min-h-[40px] bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {reviewingId === item.id ? (
                    <span className="w-3 h-3 border border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                  ) : (
                    <FiCheckCircle size={13} />
                  )}
                  Révisé
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Analyse des faiblesses IA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-amber-500/20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <FiCpu className="text-amber-400" size={18} />
            <h3 className="text-fluid-lg font-bold text-white">Analyse IA des faiblesses</h3>
          </div>
          <button
            onClick={handleAnalyzeWeaknesses}
            disabled={weaknessLoading}
            className="flex items-center justify-center gap-2 px-4 min-h-[40px] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {weaknessLoading ? (
              <span className="w-3 h-3 border border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
            ) : (
              <FiCpu size={13} />
            )}
            {weaknessLoading ? "Analyse..." : "Analyser"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">L'IA analyse vos erreurs récentes et suggère des axes d'amélioration</p>

        {weaknessError && (
          <p className="text-sm text-red-400 mb-3">{weaknessError}</p>
        )}

        {weaknessText && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl prose prose-invert prose-sm max-w-none text-gray-300 text-sm leading-relaxed">
            <ReactMarkdown>{weaknessText}</ReactMarkdown>
          </div>
        )}

        {!weaknessText && !weaknessLoading && !weaknessError && (
          <p className="text-gray-600 text-sm">Cliquez sur "Analyser" pour obtenir une analyse personnalisée de vos points faibles.</p>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiAward className="text-yellow-400" size={18} />
          <h3 className="text-fluid-lg font-bold text-white">Badges débloqués</h3>
        </div>
        <p className="text-xs text-gray-500 mb-6">Récompenses obtenues grâce à votre assiduité</p>

        {!summary?.badges || summary.badges.length === 0 ? (
          <div className="text-center py-6">
            <FiStar className="mx-auto mb-3 text-gray-600" size={32} />
            <p className="text-gray-500 text-sm">Aucun badge encore — continuez à faire des quiz !</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {summary.badges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full"
              >
                <FiAward size={14} className="text-yellow-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-yellow-300">{badge?.name ?? badge}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Maîtrise par document (from dashboard weakest_documents) */}
      {dashboard?.weakest_documents && dashboard.weakest_documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10"
        >
          <h3 className="text-fluid-lg font-bold text-white mb-1">Documents les plus faibles</h3>
          <p className="text-xs text-gray-500 mb-6">Concentrez vos révisions sur ces documents</p>
          <div className="space-y-4">
            {dashboard.weakest_documents.map((item, i) => {
              const score = item.mastery ?? item.avg_score ?? 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-gray-300 truncate max-w-[70%]">
                      {item.title ?? `Document #${item.document_id}`}
                    </p>
                    <span className="text-sm font-bold" style={{ color: getMasteryColor(score) }}>
                      {Number(score).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + 0.05 * i, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getMasteryColor(score) }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
