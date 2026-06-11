import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { FiArrowRight, FiUploadCloud, FiZap, FiTarget, FiTrendingUp, FiGlobe, FiUsers } from "react-icons/fi";
import { EASE, staggerContainer, staggerItem } from "../lib/motion";

/* ─── Data ────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: FiUploadCloud,
    title: "Import PDF",
    desc: "Téléversez n'importe quel document : cours, articles, manuels. L'IA fait le reste.",
    color: "from-indigo-500/20 to-indigo-600/5",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
    glow: "rgba(99,102,241,0.25)",
  },
  {
    icon: FiZap,
    title: "Résumés IA",
    desc: "Des synthèses claires et structurées générées en quelques secondes par Gemini.",
    color: "from-purple-500/20 to-purple-600/5",
    border: "border-purple-500/20",
    iconColor: "text-purple-400",
    glow: "rgba(168,85,247,0.25)",
  },
  {
    icon: FiTarget,
    title: "Quiz adaptatifs",
    desc: "QCM et vrai/faux ciblés sur vos lacunes. Réponses immédiates, explications incluses.",
    color: "from-pink-500/20 to-pink-600/5",
    border: "border-pink-500/20",
    iconColor: "text-pink-400",
    glow: "rgba(236,72,153,0.25)",
  },
  {
    icon: FiTrendingUp,
    title: "Progression",
    desc: "Suivez votre score moyen, votre série quotidienne et vos points faibles dans le temps.",
    color: "from-cyan-500/20 to-cyan-600/5",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    glow: "rgba(6,182,212,0.25)",
  },
  {
    icon: FiGlobe,
    title: "Culture Générale",
    desc: "12 thèmes (géo, sport, sciences…) sous forme de quiz survie pour ne jamais décrocher.",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    glow: "rgba(16,185,129,0.25)",
  },
  {
    icon: FiUsers,
    title: "Duels en temps réel",
    desc: "Défiez vos amis en multijoueur WebSocket. Élimination directe ou meilleur score.",
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    glow: "rgba(245,158,11,0.25)",
  },
];

const STEPS = [
  { n: "01", title: "Téléversez votre PDF", desc: "Importez n'importe quel document depuis votre appareil en quelques secondes." },
  { n: "02", title: "L'IA analyse et génère", desc: "Gemini produit résumés et quiz personnalisés adaptés au contenu de votre document." },
  { n: "03", title: "Apprenez et progressez", desc: "Entraînez-vous avec les quiz, suivez vos progrès et défiez vos amis." },
];

/* ─── Sous-composants ─────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Composant principal ─────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 sm:px-8 lg:px-16 h-16 bg-ink-900/80 backdrop-blur-xl border-b border-white/5">
        <span className="text-xl font-black tracking-tighter text-gradient">BOILEAU</span>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors">
            Connexion
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-xl text-sm font-bold bg-brand text-white hover:bg-indigo-500 transition-colors shadow-glow"
          >
            Commencer
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-8 pt-24 pb-16 text-center overflow-hidden">
        {/* blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-indigo-600/20 blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-32 w-[36rem] h-[36rem] rounded-full bg-pink-600/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-purple-600/15 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Plateforme e-learning propulsée par l'IA
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
          className="text-fluid-3xl font-black tracking-tighter text-white max-w-3xl mb-5"
        >
          Transformez vos PDFs{" "}
          <span className="text-gradient">en savoir actif</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
          className="text-gray-400 text-fluid-base max-w-xl mb-10 leading-relaxed"
        >
          Importez un document, obtenez un résumé en secondes et entraînez-vous avec des quiz personnalisés.
          Suivez vos progrès et défiez vos amis en temps réel.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.26 }}
          className="flex flex-col min-[400px]:flex-row items-center gap-3"
        >
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-glow transition-all duration-200 text-base"
          >
            Créer un compte gratuit <FiArrowRight size={17} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 text-base"
          >
            Se connecter
          </Link>
        </motion.div>

        {/* Floating preview cards */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
          className="relative mt-16 w-full max-w-2xl mx-auto"
        >
          {/* Main card */}
          <div className="glass-panel rounded-[2rem] p-5 sm:p-7 border border-white/10 shadow-soft text-left">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-gray-500 font-mono">boileau.app</span>
            </div>
            <div className="space-y-3">
              {/* Simulated summary */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <FiZap size={14} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-2.5 bg-white/15 rounded-full w-3/4 mb-1.5" />
                  <div className="h-2 bg-white/8 rounded-full w-full" />
                  <div className="h-2 bg-white/8 rounded-full w-2/3 mt-1" />
                </div>
              </div>
              {/* Simulated quiz */}
              <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/8">
                <div className="h-2.5 bg-white/20 rounded-full w-4/5 mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-8 rounded-xl border ${i === 2 ? "bg-emerald-500/20 border-emerald-500/40" : "bg-white/5 border-white/10"}`} />
                  ))}
                </div>
              </div>
              {/* Simulated progress */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "72%" }}
                    transition={{ duration: 1.2, ease: EASE, delay: 1 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
                <span className="text-xs text-gray-500 font-mono">72%</span>
              </div>
            </div>
          </div>

          {/* Floating badge — score */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
            className="absolute -top-4 -right-2 sm:-right-6 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl px-3 py-2 text-xs font-bold text-emerald-300 shadow-soft"
          >
            🏆 Score : 94%
          </motion.div>

          {/* Floating badge — streak */}
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity, delay: 1.5 }}
            className="absolute -bottom-4 -left-2 sm:-left-6 bg-amber-500/20 border border-amber-500/40 rounded-2xl px-3 py-2 text-xs font-bold text-amber-300 shadow-soft"
          >
            🔥 Série : 12 jours
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-16 py-20 sm:py-28">
        <FadeUp className="text-center mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Fonctionnalités</p>
          <h2 className="text-fluid-2xl font-black text-white mb-4">Tout ce dont vous avez besoin</h2>
          <p className="text-gray-500 text-fluid-base max-w-lg mx-auto">
            Un outil complet pour transformer n'importe quel document en expérience d'apprentissage.
          </p>
        </FadeUp>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={staggerItem}
                className={`relative p-5 sm:p-6 rounded-2xl border bg-gradient-to-br ${f.color} ${f.border} overflow-hidden group`}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at 30% 30%, ${f.glow}, transparent 70%)` }}
                />
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${f.iconColor}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-white font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-16 py-20 sm:py-28 bg-white/[0.02] border-y border-white/5">
        <FadeUp className="text-center mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3">Simple comme bonjour</p>
          <h2 className="text-fluid-2xl font-black text-white">Comment ça marche ?</h2>
        </FadeUp>

        <div className="flex flex-col md:flex-row items-stretch gap-6 sm:gap-8 max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.1} className="flex-1">
              <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 h-full flex flex-col gap-4">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
                <span className="text-4xl font-black text-white/10 leading-none">{step.n}</span>
                <div>
                  <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-16 py-24 sm:py-32 text-center relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[20rem] rounded-full bg-brand-gradient opacity-10 blur-3xl" />
        </div>

        <FadeUp>
          <h2 className="text-fluid-2xl font-black text-white mb-4 max-w-2xl mx-auto">
            Prêt à apprendre{" "}
            <span className="text-gradient">plus vite ?</span>
          </h2>
          <p className="text-gray-500 text-fluid-base mb-10 max-w-md mx-auto">
            Inscription gratuite, aucune carte bancaire requise. Commencez en moins d'une minute.
          </p>

          <div className="flex flex-col min-[400px]:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-glow transition-all duration-200 text-base"
            >
              Créer mon compte <FiArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-4 rounded-2xl font-semibold text-gray-400 hover:text-white transition-colors text-base"
            >
              Déjà inscrit ? Connexion →
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="px-5 sm:px-8 lg:px-16 py-6 border-t border-white/5 flex items-center justify-between flex-wrap gap-4">
        <span className="text-sm font-black tracking-tighter text-gradient">BOILEAU</span>
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} Boileau. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
