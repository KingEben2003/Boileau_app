import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import { useAuth } from "../AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api";

function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    const decoded = decodeJwt(credentialResponse.credential);
    if (!decoded) { setError("Impossible de lire les données Google."); return; }
    try {
      const res = await axios.post(`${API_BASE_URL}/google-login/`, {
        token: credentialResponse.credential,
        email: decoded.email,
        given_name: decoded.given_name || "",
        family_name: decoded.family_name || "",
        sub: decoded.sub,
      });
      const { access, refresh, user } = res.data;
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);
      login(user, rememberMe);
      navigate("/");
    } catch (err) {
      setError("Échec de la connexion via Google.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Obtenir les tokens JWT
      const tokenRes = await axios.post(`${API_BASE_URL}/token/`, {
        username,
        password,
      });

      const { access, refresh } = tokenRes.data;
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // Récupérer le profil utilisateur
      const profileRes = await axios.get(`${API_BASE_URL}/me/`, {
        headers: { Authorization: `Bearer ${access}` },
      });

      const userData = profileRes.data;
      login(userData, rememberMe);
      navigate("/");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "No active account found with the given credentials") {
        setError("Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe.");
      } else {
        setError(detail || "Erreur de connexion. Vérifiez vos identifiants.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo / titre */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent mb-2">
            BOILEAU
          </h1>
          <p className="text-gray-500 text-sm">Connectez-vous pour continuer</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-8">Connexion</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom d'utilisateur */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="votre_nom"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Mot de passe */}
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Se souvenir + mot de passe oublié */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-indigo-500"
                />
                Se souvenir de moi
              </label>
              <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton soumettre */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
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
              <span className="bg-[#0d1117] px-3 text-xs text-gray-500 uppercase tracking-widest">
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
