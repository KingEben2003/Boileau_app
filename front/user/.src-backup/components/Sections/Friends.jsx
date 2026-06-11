import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUsers, FiUserPlus, FiMail, FiHash, FiSend, FiX,
  FiZap, FiCheck, FiTrendingUp, FiAward, FiClock, FiArrowLeft,
  FiStar, FiShield, FiRefreshCw,
} from "react-icons/fi";
import { dispatchInAppNotification } from "../../utils/webPush";
import {
  getFriends,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
} from "../../services/api";

/* ─── Thèmes & questions pour le duel local ─────────────────────── */
const THEMES = [
  { key: "geo",      label: "Géographie",  icon: "🌍" },
  { key: "sport",    label: "Sport",        icon: "⚽" },
  { key: "histoire", label: "Histoire",     icon: "📜" },
  { key: "sciences", label: "Sciences",     icon: "🔬" },
  { key: "musique",  label: "Musique",      icon: "🎵" },
  { key: "cinema",   label: "Cinéma",       icon: "🎬" },
  { key: "art",      label: "Art",          icon: "🎨" },
  { key: "techno",   label: "Technologie",  icon: "💻" },
];

const QUESTION_POOL = {
  geo:      [
    { q: "Capitale de l'Australie ?",        opts: ["Sydney", "Melbourne", "Canberra", "Perth"],   ans: "Canberra" },
    { q: "Plus grand pays du monde ?",        opts: ["Canada", "Chine", "Russie", "USA"],          ans: "Russie" },
    { q: "Fleuve le plus long ?",             opts: ["Amazone", "Nil", "Yangtsé", "Mississippi"],  ans: "Nil" },
    { q: "Capitale du Brésil ?",             opts: ["Rio", "São Paulo", "Brasília", "Salvador"],  ans: "Brasília" },
  ],
  sport:    [
    { q: "Joueurs dans une équipe de foot ?", opts: ["9", "10", "11", "12"],                       ans: "11" },
    { q: "Coupe du Monde 2018 ?",             opts: ["Brésil", "Allemagne", "France", "Argentine"], ans: "France" },
    { q: "JO d'été 2024 ?",                   opts: ["Tokyo", "Los Angeles", "Paris", "Brisbane"], ans: "Paris" },
    { q: "Nombre de sets au tennis (Grand Chelem homme) ?", opts: ["3", "5", "7", "4"],           ans: "5" },
  ],
  histoire: [
    { q: "Révolution française ?",            opts: ["1778", "1789", "1795", "1802"],              ans: "1789" },
    { q: "Qui a peint la Joconde ?",          opts: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"], ans: "Léonard de Vinci" },
    { q: "Plus grand empire de l'histoire ?", opts: ["Mongol", "Romain", "Britannique", "Ottoman"], ans: "Mongol" },
    { q: "1er homme sur la Lune ?",           opts: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarine", "John Glenn"], ans: "Neil Armstrong" },
  ],
  sciences: [
    { q: "Formule chimique de l'eau ?",       opts: ["H2O", "CO2", "O2", "H2SO4"],               ans: "H2O" },
    { q: "Nb d'os du corps humain adulte ?",  opts: ["196", "206", "226", "246"],                 ans: "206" },
    { q: "Vitesse de la lumière ?",           opts: ["200 000 km/s", "300 000 km/s", "400 000 km/s", "150 000 km/s"], ans: "300 000 km/s" },
    { q: "Planète la plus proche du Soleil ?", opts: ["Vénus", "Mercure", "Mars", "Terre"],       ans: "Mercure" },
  ],
  musique:  [
    { q: "Guitare standard : combien de cordes ?", opts: ["4", "5", "6", "7"],                    ans: "6" },
    { q: "Nationalité de Mozart ?",           opts: ["Allemand", "Autrichien", "Suisse", "Tchèque"], ans: "Autrichien" },
    { q: "Do, Ré, Mi … quelle note suit ?",   opts: ["Si", "Sol", "Fa", "La"],                   ans: "Fa" },
    { q: "Instrument de Jimi Hendrix ?",      opts: ["Basse", "Batterie", "Guitare", "Clavier"],  ans: "Guitare" },
  ],
  cinema:   [
    { q: "Réalisateur de Titanic ?",          opts: ["Spielberg", "Cameron", "Nolan", "Scott"],   ans: "Cameron" },
    { q: "1er film de la saga Star Wars (sortie) ?", opts: ["Épisode I", "Épisode III", "Épisode IV", "Épisode II"], ans: "Épisode IV" },
    { q: "Oscar du meilleur film 2020 ?",     opts: ["1917", "Joker", "Parasite", "Ford v Ferrari"], ans: "Parasite" },
    { q: "Acteur de Iron Man ?",              opts: ["Chris Evans", "Robert Downey Jr.", "Mark Ruffalo", "Chris Hemsworth"], ans: "Robert Downey Jr." },
  ],
  art:      [
    { q: "Qui a peint La Nuit étoilée ?",     opts: ["Monet", "Van Gogh", "Picasso", "Dalí"],    ans: "Van Gogh" },
    { q: "Mouvement de Picasso ?",            opts: ["Impressionnisme", "Surréalisme", "Cubisme", "Baroque"], ans: "Cubisme" },
    { q: "Où est la Joconde ?",               opts: ["Louvre", "Prado", "Uffizi", "MoMA"],       ans: "Louvre" },
    { q: "Auguste Rodin est connu pour ?",    opts: ["Peinture", "Sculpture", "Photographie", "Gravure"], ans: "Sculpture" },
  ],
  techno:   [
    { q: "Langage du web côté client ?",      opts: ["Python", "Java", "JavaScript", "Ruby"],     ans: "JavaScript" },
    { q: "Fondateur d'Apple ?",               opts: ["Bill Gates", "Elon Musk", "Steve Jobs", "Jeff Bezos"], ans: "Steve Jobs" },
    { q: "HTTP signifie ?",                   opts: ["HyperText Transfer Protocol", "High Tech Transfer Page", "Home Text Transport Protocol", "HyperText Transport Page"], ans: "HyperText Transfer Protocol" },
    { q: "Octet = combien de bits ?",         opts: ["4", "8", "16", "32"],                      ans: "8" },
  ],
};

const EMOJIS_LIST = ["🔥", "😅", "💪", "😂", "😤", "🎉", "👏", "😱", "🤩", "💀"];
const TIMER_OPTIONS = [10, 20, 30];
const ROUND_OPTIONS  = [3, 5, 7, 10];

/* ─── Avatar lettre ──────────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-blue-500",
];

function LetterAvatar({ username, size = "w-11 h-11", textSize = "text-base" }) {
  const letter = (username || "?")[0].toUpperCase();
  const grad = AVATAR_GRADIENTS[(username?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black ${textSize} flex-shrink-0`}>
      {letter}
    </div>
  );
}

/* ─── Utilitaires ────────────────────────────────────────────────── */
function buildQuestions(themes, rounds) {
  const pool = themes.flatMap((key) =>
    (QUESTION_POOL[key] || []).map((q, i) => ({ ...q, id: `${key}-${i}`, theme: key }))
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, rounds);
}

/* ─── Timer circulaire ───────────────────────────────────────────── */
function CircularTimer({ value, max }) {
  const R = 22;
  const circ = 2 * Math.PI * R;
  const progress = circ * (1 - value / max);
  const color = value <= 5 ? "#ef4444" : value <= 10 ? "#f97316" : "#6366f1";
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={R}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="absolute text-base font-black" style={{ color, transition: "color 0.3s" }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Emoji flottant ─────────────────────────────────────────────── */
function FloatingEmoji({ emoji, fromRight }) {
  return (
    <motion.div
      initial={{ opacity: 1, x: fromRight ? 80 : -80, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, x: 0, y: -60, scale: 1.6 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="pointer-events-none absolute text-4xl z-30"
      style={{ top: "40%", [fromRight ? "right" : "left"]: "12%" }}
    >
      {emoji}
    </motion.div>
  );
}

/* ─── Jeu duel ───────────────────────────────────────────────────── */
function DuelGame({ config, onEnd }) {
  const { questions, timerSec, friend, mode } = config;
  const [roundIdx,     setRoundIdx]    = useState(0);
  const [timeLeft,     setTimeLeft]    = useState(timerSec);
  const [phase,        setPhase]       = useState("playing");
  const [myAnswers,    setMyAnswers]   = useState({});
  const [myEmojis,     setMyEmojis]    = useState([]);
  const [theirEmojis,  setTheirEmojis] = useState([]);
  const [scores,       setScores]      = useState({ me: 0, opp: 0 });
  const [roundResults, setRoundResults] = useState([]);

  const friendName = friend?.username || "Adversaire";
  const q = questions[roundIdx];

  const advanceRound = useCallback((forcedAnswer) => {
    const answer = forcedAnswer ?? myAnswers[roundIdx];
    const myOk   = answer?.toLowerCase() === q?.ans?.toLowerCase();
    const oppOk  = Math.random() > 0.42;

    const newScores = { me: scores.me + (myOk ? 1 : 0), opp: scores.opp + (oppOk ? 1 : 0) };
    setScores(newScores);
    setRoundResults((r) => [...r, { round: roundIdx + 1, myOk, oppOk }]);

    if (roundIdx >= questions.length - 1) {
      setPhase("done");
    } else {
      setPhase("reviewing");
      setTimeout(() => {
        setRoundIdx((i) => i + 1);
        setTimeLeft(timerSec);
        setPhase("playing");
      }, 1800);
    }
  }, [myAnswers, roundIdx, q, scores, questions.length, timerSec]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) { advanceRound(null); return; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, advanceRound]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      if (Math.random() > 0.65) {
        const id    = Date.now();
        const emoji = EMOJIS_LIST[Math.floor(Math.random() * EMOJIS_LIST.length)];
        setTheirEmojis((p) => [...p, { id, emoji }]);
        setTimeout(() => setTheirEmojis((p) => p.filter((e) => e.id !== id)), 2500);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [phase]);

  const sendEmoji = (emoji) => {
    const id = Date.now();
    setMyEmojis((p) => [...p, { id, emoji }]);
    setTimeout(() => setMyEmojis((p) => p.filter((e) => e.id !== id)), 2500);
  };

  const selectAnswer = (opt) => {
    if (myAnswers[roundIdx] || phase !== "playing") return;
    setMyAnswers((prev) => ({ ...prev, [roundIdx]: opt }));
    setTimeout(() => advanceRound(opt), 600);
  };

  if (phase === "done") {
    const win = scores.me > scores.opp ? "win" : scores.me < scores.opp ? "lose" : "draw";
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="glass-card rounded-[2rem] p-8 text-center border border-white/10">
          <div className="text-6xl mb-4">{win === "win" ? "🏆" : win === "lose" ? "😅" : "🤝"}</div>
          <h3 className="text-2xl font-black text-white mb-1">
            {win === "win" ? "Victoire !" : win === "lose" ? mode === "solo" ? "Essayez encore !" : `${friendName} gagne !` : "Égalité !"}
          </h3>
          <div className="flex items-center justify-center gap-6 mt-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-black text-pink-400">{scores.me}</p>
              <p className="text-xs text-gray-500">Vous</p>
            </div>
            <div className="text-gray-600 text-xl font-bold">vs</div>
            <div className="text-center">
              <p className="text-3xl font-black text-indigo-400">{scores.opp}</p>
              <p className="text-xs text-gray-500">{mode === "solo" ? "IA" : friendName}</p>
            </div>
          </div>

          <div className="space-y-1.5 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
            {roundResults.map((r) => (
              <div key={r.round} className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl text-xs">
                <span className="text-gray-500 w-16">Manche {r.round}</span>
                <span className={`font-bold ${r.myOk ? "text-emerald-400" : "text-red-400"}`}>
                  {r.myOk ? "✓ Correct" : "✗ Raté"}
                </span>
                <span className="text-gray-600 mx-auto">·</span>
                <span className={`font-bold ${r.oppOk ? "text-indigo-400" : "text-orange-400"}`}>
                  {mode === "solo" ? "IA" : friendName} : {r.oppOk ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onEnd}
              className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-gray-300 font-bold rounded-xl transition">
              <FiArrowLeft size={15} className="inline mr-2" /> Retour
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setRoundIdx(0); setTimeLeft(timerSec); setPhase("playing"); setMyAnswers({}); setScores({ me: 0, opp: 0 }); setRoundResults([]); }}
              className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-pink-500/20">
              <FiRefreshCw size={15} className="inline mr-2" /> Rejouer
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  const userAnswer  = myAnswers[roundIdx];
  const timeWarning = timeLeft <= 5;

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 border border-white/10">
        <div className="grid grid-cols-3 items-center">
          <div className="text-left">
            <p className="text-xs text-gray-500">Vous</p>
            <p className="text-2xl font-black text-pink-400">{scores.me}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Manche {roundIdx + 1}/{questions.length}
            </p>
            <CircularTimer value={timeLeft} max={timerSec} warning={timeWarning} />
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{mode === "solo" ? "IA" : friendName}</p>
            <p className="text-2xl font-black text-indigo-400">{scores.opp}</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] p-7 border border-white/10 relative overflow-hidden min-h-64">
        <AnimatePresence>
          {myEmojis.map((e)    => <FloatingEmoji key={e.id} emoji={e.emoji} fromRight={false} />)}
          {theirEmojis.map((e) => <FloatingEmoji key={e.id} emoji={e.emoji} fromRight={true} />)}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={roundIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
                {THEMES.find((t) => t.key === q?.theme)?.icon} {THEMES.find((t) => t.key === q?.theme)?.label}
              </span>
              {phase === "reviewing" && (
                <span className="text-[10px] text-gray-500 ml-auto">Prochaine manche…</span>
              )}
            </div>

            <p className="text-lg font-bold text-white mb-5 leading-snug">{q?.q}</p>

            <div className="space-y-2.5">
              {(q?.opts || []).map((opt) => {
                const selected  = userAnswer === opt;
                const isCorrect = opt.toLowerCase() === q.ans.toLowerCase();
                let cls = "bg-white/5 border-white/10 text-gray-300 hover:border-pink-500/30 hover:bg-white/8";
                if (selected && phase === "reviewing") {
                  cls = isCorrect
                    ? "bg-emerald-500/20 border-emerald-500/50 text-white"
                    : "bg-red-500/20 border-red-500/50 text-white";
                } else if (!userAnswer && phase === "reviewing" && isCorrect) {
                  cls = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
                } else if (selected) {
                  cls = "bg-pink-500/20 border-pink-500/50 text-white";
                }
                return (
                  <motion.button
                    key={opt}
                    whileHover={!userAnswer && phase === "playing" ? { scale: 1.01 } : {}}
                    whileTap={!userAnswer && phase === "playing" ? { scale: 0.99 } : {}}
                    onClick={() => selectAnswer(opt)}
                    disabled={!!userAnswer || phase === "reviewing"}
                    className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-all text-sm font-medium ${cls}`}
                  >
                    <span className="flex-1">{opt}</span>
                    {phase === "reviewing" && isCorrect && <FiCheck className="text-emerald-400 flex-shrink-0" size={15} strokeWidth={3} />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="glass-card rounded-2xl p-3 border border-white/10">
        <p className="text-[10px] text-gray-600 text-center mb-2 uppercase tracking-widest">Envoyer un émoji</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {EMOJIS_LIST.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => sendEmoji(emoji)}
              className="text-2xl p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Setup du défi ──────────────────────────────────────────────── */
function SetupDuel({ friend, onStart, onCancel }) {
  const [rounds,         setRounds]         = useState(5);
  const [timerSec,       setTimerSec]       = useState(20);
  const [selectedThemes, setSelectedThemes] = useState(["geo", "sport", "histoire"]);

  const toggleTheme = (key) => {
    setSelectedThemes((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((k) => k !== key) : prev
        : [...prev, key]
    );
  };

  const handleStart = () => {
    const questions = buildQuestions(selectedThemes, rounds);
    onStart({ questions, timerSec, rounds, selectedThemes, friend, mode: friend ? "multi" : "solo" });
  };

  const friendName = friend?.username || null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 transition">
          <FiArrowLeft size={18} />
        </button>
        <div>
          <h3 className="text-lg font-black text-white">
            {friendName ? `Défier ${friendName}` : "Défi solo"}
          </h3>
          <p className="text-xs text-gray-500">Configurez votre affrontement</p>
        </div>
        {friend && (
          <div className="ml-auto">
            <LetterAvatar username={friend.username} size="w-10 h-10" textSize="text-sm" />
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5 border border-pink-500/20">
        <p className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-3 flex items-center gap-2">
          <FiShield size={13} /> Nombre de manches
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ROUND_OPTIONS.map((r) => (
            <button key={r} onClick={() => setRounds(r)}
              className={`py-3 rounded-xl text-sm font-black border transition-all ${
                rounds === r
                  ? "bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-lg shadow-pink-500/10"
                  : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-indigo-500/20">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
          <FiClock size={13} /> Temps par question
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TIMER_OPTIONS.map((t) => (
            <button key={t} onClick={() => setTimerSec(t)}
              className={`py-3 rounded-xl text-sm font-black border transition-all ${
                timerSec === t
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-lg shadow-indigo-500/10"
                  : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
              }`}>
              {t}s
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-purple-500/20">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-2">
          <FiStar size={13} /> Rubriques ({selectedThemes.length} sélectionnée{selectedThemes.length > 1 ? "s" : ""})
        </p>
        <p className="text-[10px] text-gray-600 mb-4">Sélectionnez au moins une rubrique</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {THEMES.map(({ key, label, icon }) => {
            const active = selectedThemes.includes(key);
            return (
              <motion.button key={key} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                onClick={() => toggleTheme(key)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                  active
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                    : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
                }`}>
                <span className="text-xl">{icon}</span>
                <span className="leading-tight text-center">{label}</span>
                {active && <FiCheck size={10} className="text-purple-400" strokeWidth={3} />}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center gap-4">
        <div className="flex-1 text-xs text-gray-500 space-y-1">
          <p><span className="text-white font-bold">{rounds}</span> manches · <span className="text-white font-bold">{timerSec}s</span>/question</p>
          <p><span className="text-white font-bold">{selectedThemes.length}</span> rubrique{selectedThemes.length > 1 ? "s" : ""} · ~<span className="text-white font-bold">{rounds * timerSec}s</span> max</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(236,72,153,0.35)" }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black rounded-xl shadow-lg shadow-pink-500/20 transition-all">
          <FiZap size={16} /> Lancer !
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Composant principal ────────────────────────────────────────── */
export default function FriendsSection({ challengedFriend, onClearChallenge }) {
  const [phase,          setPhase]          = useState("list");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [duelConfig,     setDuelConfig]     = useState(null);
  const [friends,        setFriends]        = useState([]);
  const [requests,       setRequests]       = useState([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [method,         setMethod]         = useState("pseudo");
  const [input,          setInput]          = useState("");
  const [addError,       setAddError]       = useState("");
  const [addSuccess,     setAddSuccess]     = useState("");
  const [adding,         setAdding]         = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [fr, req] = await Promise.allSettled([getFriends(), getFriendRequests()]);
        if (fr.status === "fulfilled") setFriends(Array.isArray(fr.value) ? fr.value : []);
        if (req.status === "fulfilled") setRequests(Array.isArray(req.value) ? req.value : []);
      } catch {}
      finally { setLoadingData(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (challengedFriend) {
      setSelectedFriend(challengedFriend);
      setPhase("setup");
      if (onClearChallenge) onClearChallenge();
    }
  }, [challengedFriend, onClearChallenge]);

  const acceptRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    try {
      await acceptFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (req) {
        const fromUser = req.from_user || {};
        const username = fromUser.username || "Utilisateur";
        setFriends((prev) => [
          { id: fromUser.id || Date.now(), username, level: fromUser.level || 1, score: fromUser.score || 0 },
          ...prev,
        ]);
        dispatchInAppNotification("Ami ajouté !", `${username} est maintenant votre ami.`, "friend_request");
      }
    } catch (err) {
      console.error("Erreur acceptation:", err);
    }
  };

  const declineRequest = async (id) => {
    try {
      await declineFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Erreur refus:", err);
    }
  };

  const handleAdd = async () => {
    if (!input.trim()) { setAddError("Champ vide."); return; }
    setAdding(true); setAddError(""); setAddSuccess("");
    try {
      await sendFriendRequest(
        method === "pseudo" ? { pseudo: input.trim() } : { email: input.trim() }
      );
      setAddSuccess(`Demande envoyée à ${input.trim()} !`);
      setInput("");
      dispatchInAppNotification("Demande envoyée", `${input.trim()} recevra votre invitation.`, "friend_request");
    } catch (err) {
      setAddError(err.message || "Impossible d'envoyer la demande.");
    } finally {
      setAdding(false);
    }
  };

  const startDuel = (config) => { setDuelConfig(config); setPhase("game"); };

  /* ── Écran de jeu ── */
  if (phase === "game" && duelConfig) {
    return (
      <div className="w-full max-w-xl mx-auto pb-10 space-y-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">En cours</p>
          <h2 className="text-2xl font-black text-white">
            {duelConfig.mode === "solo" ? "Défi solo" : `vs ${duelConfig.friend?.username}`}
          </h2>
        </motion.div>
        <DuelGame config={duelConfig} onEnd={() => { setPhase("list"); setDuelConfig(null); }} />
      </div>
    );
  }

  /* ── Setup duel ── */
  if (phase === "setup") {
    return (
      <div className="w-full max-w-xl mx-auto pb-10">
        <SetupDuel
          friend={selectedFriend}
          onStart={startDuel}
          onCancel={() => { setPhase("list"); setSelectedFriend(null); }}
        />
      </div>
    );
  }

  /* ── Liste principale ── */
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-black text-white tracking-tight">Amis & Défis</h2>
        <p className="text-gray-500 text-sm mt-1">Gérez vos amis, relevez des défis et affrontez-vous</p>
      </motion.div>

      {/* Défi solo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card rounded-2xl p-5 border border-pink-500/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-2xl flex-shrink-0">
          🎯
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-white">Mode Solo</p>
          <p className="text-xs text-gray-500">Affrontez l'IA sur les thèmes de votre choix avec timer</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setSelectedFriend(null); setPhase("setup"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-pink-500/20">
          <FiZap size={13} /> Solo
        </motion.button>
      </motion.div>

      {/* Demandes reçues */}
      {requests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-4">
            <FiUsers size={16} className="text-indigo-400" />
            <h3 className="text-sm font-black text-white">Demandes reçues</h3>
            <span className="ml-auto text-[10px] font-black px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full">
              {requests.length}
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {requests.map((req) => {
                const fromUser = req.from_user || {};
                const username = fromUser.username || "Utilisateur";
                return (
                  <motion.div key={req.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <LetterAvatar username={username} size="w-9 h-9" textSize="text-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{username}</p>
                      <p className="text-[10px] text-gray-600">{req.sent_at}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => acceptRequest(req.id)}
                        className="w-8 h-8 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 transition">
                        <FiCheck size={14} strokeWidth={3} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => declineRequest(req.id)}
                        className="w-8 h-8 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 flex items-center justify-center text-red-400 transition">
                        <FiX size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Ajouter un ami */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card rounded-2xl p-5 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <FiUserPlus size={16} className="text-gray-400" />
          <h3 className="text-sm font-black text-white">Ajouter un ami</h3>
        </div>
        <div className="flex gap-2 mb-3 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {[{ key: "pseudo", icon: <FiHash size={12} />, label: "Pseudo" },
            { key: "email",  icon: <FiMail size={12} />, label: "Email"  }].map(({ key, icon, label }) => (
            <button key={key} onClick={() => { setMethod(key); setInput(""); setAddError(""); setAddSuccess(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                method === key ? "bg-indigo-600 text-white shadow shadow-indigo-500/30" : "text-gray-400 hover:text-white"
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type={method === "email" ? "email" : "text"}
            value={input}
            onChange={(e) => { setInput(e.target.value); setAddError(""); setAddSuccess(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={method === "pseudo" ? "Pseudo de l'ami…" : "Email de l'ami…"}
            className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all"
          />
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            onClick={handleAdd} disabled={adding}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-indigo-500/20">
            {adding ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={14} />}
          </motion.button>
        </div>
        <AnimatePresence>
          {addError   && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-red-400 mt-2">{addError}</motion.p>}
          {addSuccess && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><FiCheck size={11} />{addSuccess}</motion.p>}
        </AnimatePresence>
      </motion.div>

      {/* Liste d'amis */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Mes amis — {friends.length}
        </p>
        <div className="space-y-2">
          <AnimatePresence>
            {friends.map((f, i) => (
              <motion.div key={f.id}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-4">
                <LetterAvatar username={f.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{f.username}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-gray-600 flex items-center gap-1"><FiTrendingUp size={9} /> Niv.{f.level ?? 1}</span>
                    <span className="text-[10px] text-gray-600 flex items-center gap-1"><FiAward size={9} /> {Math.round(f.score ?? 0)}%</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.07, boxShadow: "0 0 16px rgba(99,102,241,0.35)" }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => { setSelectedFriend(f); setPhase("setup"); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <FiZap size={12} /> Défier
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loadingData && friends.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <FiUsers size={22} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium text-sm">Aucun ami pour l'instant</p>
              <p className="text-xs text-gray-600 mt-1">Utilisez le formulaire ci-dessus pour en ajouter.</p>
            </div>
          )}

          {loadingData && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
