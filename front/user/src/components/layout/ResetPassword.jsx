import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiLock, FiCheckCircle, FiArrowLeft, FiShield, FiEye, FiEyeOff } from "react-icons/fi";
import { fadeInUp, popIn } from "../../lib/motion";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const email = sessionStorage.getItem("reset_email");
  const code = sessionStorage.getItem("reset_code");

  useEffect(() => {
    if (!email || !code) navigate("/forgot-password");
  }, [email, code, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/reset-password/", { email, code, password });
      sessionStorage.removeItem("reset_email");
      sessionStorage.removeItem("reset_code");
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || "Une erreur est survenue. Veuillez recommencer.");
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

      <motion.div
        {...fadeInUp}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-5 shadow-lg shadow-indigo-500/10">
            <FiShield size={24} className="text-indigo-400" />
          </div>
          <h1 className="inline-block text-4xl sm:text-5xl font-black tracking-tighter text-gradient mb-2">
            BOILEAU
          </h1>
          <p className="text-gray-500 text-sm">Nouveau mot de passe</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                {...popIn}
                className="text-center py-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
                  <FiCheckCircle size={28} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Mot de passe réinitialisé !</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Votre nouveau mot de passe est actif. Redirection vers la connexion...
                </p>
                <Link to="/login" className="btn-primary text-sm px-6 py-2.5">
                  <FiArrowLeft size={15} />
                  Se connecter maintenant
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form">
                <Link
                  to="/verify-code"
                  className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors mb-7 group"
                >
                  <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                  Retour
                </Link>

                <h2 className="text-2xl font-bold text-white mb-2">Nouveau mot de passe</h2>
                <p className="text-gray-400 text-sm mb-7">
                  Choisissez un mot de passe sécurisé d'au moins 8 caractères.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        className="input-field pl-11 pr-11"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        className="input-field pl-11 pr-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3.5"
                  >
                    {loading ? (
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <FiShield size={17} />
                    )}
                    {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
