import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUser, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import { useAuth } from "../AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { useTilt } from "../hooks/useTilt";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const tilt = useTilt({ max: 14 });

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    const decoded = decodeJwt(credentialResponse.credential);
    if (!decoded) { setError("Impossible de lire les données Google."); return; }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/google-login/`,
        {
          token: credentialResponse.credential,
          email: decoded.email,
          given_name: decoded.given_name || "",
          family_name: decoded.family_name || "",
          sub: decoded.sub,
        },
        { withCredentials: true }
      );
      login(res.data.user);
      navigate("/");
    } catch {
      setError("Échec de la connexion via Google.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/login/`,
        { identifier, password, remember_me: rememberMe },
        { withCredentials: true }
      );
      login(res.data.user);
      navigate("/");
    } catch (err) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      setError(detail || "Erreur de connexion. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Décor : profondeur 3D légère (orbes flottants, GPU) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-indigo-600/25 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo avec tilt 3D au survol */}
        <div className="text-center mb-8 perspective">
          <h1
            ref={tilt.ref}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
            className="inline-block text-4xl sm:text-5xl font-black tracking-tighter text-gradient mb-2 transition-transform duration-200 will-change-transform"
          >
            BOILEAU
          </h1>
          <p className="text-gray-500 text-sm">Connectez-vous pour continuer</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-7">Connexion</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Email ou nom d'utilisateur
              </label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="vous@exemple.com ou votre pseudo"
                  className="input-field pl-11"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-400 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 flex-shrink-0"
                />
                Se souvenir de moi
              </label>
              <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <FiLogIn size={18} />
              )}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-ink-700 px-3 text-xs text-gray-500 uppercase tracking-widest">
                ou continuer avec
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Connexion Google échouée.")}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="signin_with"
              locale="fr"
            />
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Pas de compte ?{" "}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
              Créer un compte
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
