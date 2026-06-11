import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FiMenu, FiSearch, FiBell, FiUser, FiLogOut, FiChevronDown,
  FiUsers, FiUserPlus, FiCheck, FiX, FiZap, FiTrendingUp, FiAward,
  FiLoader,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../AuthContext";
import {
  getFriends, getFriendRequests, acceptFriendRequest, declineFriendRequest,
  syncOneSignalPlayer,
} from "../../services/api";
import {
  dispatchInAppNotification, requestPushPermission,
  registerPushSubscription, getPushPermission,
} from "../../utils/webPush";

/* ─── Panneau amis ────────────────────────────────────────────────── */
function FriendsPanel({ onClose, onSectionChange, onChallengeFriend, onCountChange }) {
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFriends(), getFriendRequests()])
      .then(([f, r]) => {
        setFriends(f);
        setRequests(r);
        onCountChange(r.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onCountChange]);

  const handleAccept = async (req) => {
    try {
      await acceptFriendRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      onCountChange((c) => Math.max(0, c - 1));
      dispatchInAppNotification("Ami ajouté !", `Vous êtes maintenant ami avec ${req.from_user?.username}.`, "friend_request");
    } catch {}
  };

  const handleDecline = async (id) => {
    try {
      await declineFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      onCountChange((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleChallenge = (friend) => {
    onChallengeFriend(friend);
    onClose();
    dispatchInAppNotification("Défi lancé !", `Vous défiez ${friend.username}`, "challenge");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute right-0 top-full mt-3 w-[min(20rem,calc(100vw-2rem))] bg-ink-700 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
    >
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { key: "requests", label: "Demandes", count: requests.length },
          { key: "friends",  label: "Amis",     count: friends.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${
              tab === key ? "text-white border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                tab === key ? "bg-indigo-600 text-white" : "bg-white/10 text-gray-500"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FiLoader size={20} className="text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Demandes reçues */}
            {tab === "requests" && (
              <div className="p-2">
                {requests.length === 0 ? (
                  <p className="text-center text-xs text-gray-600 py-8">Aucune demande en attente</p>
                ) : requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-black text-indigo-300 flex-shrink-0">
                      {(req.from_user?.username || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{req.from_user?.username}</p>
                      <p className="text-[10px] text-gray-600">{req.sent_at || "Récemment"}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleAccept(req)}
                        className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 transition">
                        <FiCheck size={13} strokeWidth={3} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleDecline(req.id)}
                        className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 flex items-center justify-center text-red-400 transition">
                        <FiX size={13} />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Liste amis */}
            {tab === "friends" && (
              <div className="p-2">
                {friends.length === 0 ? (
                  <p className="text-center text-xs text-gray-600 py-8">Aucun ami pour l'instant</p>
                ) : friends.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-black text-purple-300 flex-shrink-0">
                      {(f.username || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{f.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <FiTrendingUp size={9} /> Niv.{f.level ?? 1}
                        </span>
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <FiAward size={9} /> {f.score ?? 0}%
                        </span>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                      onClick={() => handleChallenge(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-[10px] font-black transition shadow-lg shadow-indigo-500/20">
                      <FiZap size={10} /> Défier
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <button
          onClick={() => { onSectionChange("amis"); onClose(); }}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
        >
          <FiUserPlus size={13} /> Gérer mes amis & ajouter
        </button>
      </div>
    </motion.div>
  );
}

/* ─── TopBar principal ────────────────────────────────────────────── */
export default function TopBar({ toggleSidebar, onSectionChange, onChallengeFriend, searchQuery = "", onSearchChange }) {
  const { user, logout } = useAuth();
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [friendsOpen,    setFriendsOpen]    = useState(false);
  const [pendingCount,   setPendingCount]   = useState(0);
  const [pushPermission, setPushPermission] = useState(getPushPermission());

  const dropdownRef = useRef(null);
  const friendsRef  = useRef(null);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Utilisateur";

  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  /* Charge le nombre de demandes au montage */
  useEffect(() => {
    getFriendRequests()
      .then((reqs) => setPendingCount(Array.isArray(reqs) ? reqs.length : 0))
      .catch(() => {});
  }, []);

  /* Fermeture au clic extérieur */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (friendsRef.current  && !friendsRef.current.contains(e.target))  setFriendsOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const handleEnablePush = async () => {
    const perm = await requestPushPermission();
    if (perm === "granted") {
      const playerId = await registerPushSubscription();
      setPushPermission("granted");
      if (playerId) {
        syncOneSignalPlayer(playerId).catch(() => {});
      }
      dispatchInAppNotification("Notifications activées", "Vous recevrez des alertes même hors connexion.", "info");
    } else {
      setPushPermission(perm);
    }
  };

  const handleCountChange = useCallback((val) => {
    setPendingCount((prev) => (typeof val === "function" ? val(prev) : val));
  }, []);

  return (
    <header className="safe-top min-h-14 sm:min-h-16 md:min-h-20 bg-white/5 backdrop-blur-md flex items-center px-3 sm:px-4 md:px-10 justify-between border-b border-white/10 shrink-0">
      {/* Gauche */}
      <div className="flex items-center gap-2 md:gap-6 min-w-0">
        <button
          onClick={toggleSidebar}
          aria-label="Ouvrir le menu"
          className="md:hidden p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all flex-shrink-0"
        >
          <FiMenu size={19} />
        </button>

        <span className="md:hidden text-base sm:text-lg font-black tracking-tighter text-gradient truncate">BOILEAU</span>

        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl w-72 lg:w-80 focus-within:border-indigo-500/50 transition-all duration-300">
          <FiSearch className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Rechercher un document..."
            className="bg-transparent border-none outline-none text-sm w-full text-gray-300 placeholder:text-gray-600"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.("")}
              className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
              aria-label="Effacer la recherche"
            >
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Droite — relative sert de contexte de positionnement pour FriendsPanel */}
      <div className="relative flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0" ref={friendsRef}>

        {/* Icône amis — relative pour le badge uniquement */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => { setFriendsOpen((v) => !v); setDropdownOpen(false); }}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-all relative"
            title="Amis"
          >
            <FiUsers size={20} />
            {pendingCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-indigo-500 rounded-full text-[9px] font-black text-white flex items-center justify-center border-2 border-[#030712]"
              >
                {pendingCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Panel positionné depuis le bord droit de la section droite (right-0 = ~12px du viewport) */}
        <AnimatePresence>
          {friendsOpen && (
            <FriendsPanel
              onClose={() => setFriendsOpen(false)}
              onSectionChange={onSectionChange}
              onChallengeFriend={onChallengeFriend}
              onCountChange={handleCountChange}
            />
          )}
        </AnimatePresence>

        {/* Cloche notifs */}
        <button
          onClick={pushPermission !== "granted" ? handleEnablePush : undefined}
          title={pushPermission === "granted" ? "Notifications activées" : "Activer les notifications push"}
          className={`p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all relative group ${
            pushPermission === "granted" ? "text-emerald-400" : "text-gray-400"
          }`}
        >
          <FiBell size={20} />
          {pushPermission !== "granted" && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-[#030712] group-hover:scale-110 transition-transform" />
          )}
        </button>

        <div className="h-8 w-px bg-white/10 mx-1 hidden md:block" />

        {/* Profil dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setDropdownOpen((v) => !v); setFriendsOpen(false); }}
            className="flex items-center gap-1.5 sm:gap-2.5 group cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Plan Premium</p>
            </div>

            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                <span className="text-xs font-black text-white tracking-widest">{initials}</span>
              </div>
            </div>

            <FiChevronDown size={14} className={`text-gray-500 hidden sm:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-3 w-52 max-w-[calc(100vw-1rem)] bg-ink-700 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email || ""}</p>
                </div>

                <div className="p-2">
                  {pushPermission !== "granted" && (
                    <button
                      onClick={handleEnablePush}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-pink-300 hover:bg-pink-500/10 transition-all text-left"
                    >
                      <FiBell size={15} className="text-pink-400" />
                      Activer les notifs push
                    </button>
                  )}
                  <button
                    onClick={() => { setDropdownOpen(false); onSectionChange("profil"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all text-left"
                  >
                    <FiUser size={15} className="text-indigo-400" />
                    Mon profil
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-left"
                  >
                    <FiLogOut size={15} />
                    Se déconnecter
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
