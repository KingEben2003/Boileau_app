import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiUser, FiUserPlus, FiArrowLeft, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../AuthContext";
import { fadeInUp } from "../../lib/motion";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
}

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input-field pl-11 pr-11"
        required
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
      >
        {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
      </button>
    </div>
  );
};

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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

  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) return "Prénom et nom sont requis.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Adresse email invalide.";
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (password !== confirmPassword) return "Les mots de passe ne correspondent pas.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/register/`,
        {
          email,
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: email.split("@")[0],
        },
        { withCredentials: true }
      );
      // Server sets httpOnly cookies — auto-login, no redirect to /login needed
      login(res.data.user);
      navigate("/");
    } catch (err) {
      const d = err?.response?.data;
      const msg = d?.error
        || d?.email?.[0]
        || d?.password?.[0]
        || d?.username?.[0]
        || d?.non_field_errors?.[0]
        || (d && typeof d === "object" ? Object.values(d).flat()[0] : null)
        || "Une erreur est survenue lors de l'inscription.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-indigo-600/25 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <motion.div {...fadeInUp} className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="inline-block text-4xl sm:text-5xl font-black tracking-tighter text-gradient mb-2">
            BOILEAU
          </h1>
          <p className="text-gray-500 text-sm">Créez votre compte en quelques secondes</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors mb-7 group"
          >
            <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Retour à l'accueil
          </Link>

          <h2 className="text-2xl font-bold text-white mb-7">Créer un compte</h2>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-start gap-3"
              >
                <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Prénom
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Nom
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Mot de passe
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
              />
              {password.length > 0 && password.length < 8 && (
                <p className="text-[11px] text-amber-400 mt-1.5 ml-1">
                  Encore {8 - password.length} caractère{8 - password.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Confirmer le mot de passe
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1.5 ml-1">Les mots de passe ne correspondent pas</p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && password.length >= 8 && (
                <p className="text-[11px] text-emerald-400 mt-1.5 ml-1">Mots de passe identiques</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-2">
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <FiUserPlus size={18} />
              )}
              {loading ? "Inscription..." : "Créer mon compte"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-ink-700 px-3 text-xs text-gray-500 uppercase tracking-widest">
                ou s'inscrire avec
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
              text="signup_with"
              locale="fr"
            />
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
