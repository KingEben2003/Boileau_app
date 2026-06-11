import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUser, FiLock, FiEye, FiEyeOff, FiShield, FiLogIn } from "react-icons/fi";
import { useAuth } from "../AuthContext";
import { useTilt } from "../hooks/useTilt";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, isLoading } = useAuth();
  const tilt = useTilt({ max: 14 });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoading && user) return <Navigate to={location.state?.from || "/"} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError("Veuillez remplir tous les champs."); return; }
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-indigo-600/25 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-pink-600/15 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8 perspective">
          <div
            ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gradient shadow-glow mb-4 will-change-transform transition-transform duration-200"
          >
            <FiShield size={30} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-gradient">BOILEAU Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Console d'administration — accès réservé</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Identifiant</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin" className="input-field pl-11" autoComplete="username" autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Mot de passe</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="input-field pl-11 pr-12" autoComplete="current-password"
                />
                <button
                  type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
              {loading
                ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : <FiLogIn size={18} />}
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-6">
            Réservé aux comptes disposant du statut <span className="text-gray-400 font-semibold">staff</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
