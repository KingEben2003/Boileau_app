import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FiMail, FiArrowLeft, FiSend, FiCheckCircle, FiShield } from "react-icons/fi";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Veuillez entrer une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/forgot-password/", { email });
      sessionStorage.setItem("reset_email", email);
      setSuccess(true);
      setTimeout(() => navigate("/verify-code"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(236,72,153,0.08) 0%, transparent 55%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-5 shadow-lg shadow-indigo-500/10">
            <FiShield size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
            BOILEAU
          </h1>
          <p className="text-gray-500 text-sm">Réinitialisez votre mot de passe</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl shadow-black/20">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors mb-7 group"
          >
            <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Retour à la connexion
          </Link>

          <h2 className="text-2xl font-bold text-white mb-2">Mot de passe oublié ?</h2>
          <p className="text-gray-400 text-sm mb-7 leading-relaxed">
            Pas de panique. Entrez votre email et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
          </p>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-center py-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
                  <FiCheckCircle size={28} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Email envoyé !</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Si un compte existe pour <span className="text-indigo-400 font-semibold">{email}</span>, un code de vérification a été envoyé. Redirection en cours...
                </p>
                <Link
                  to="/verify-code"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
                >
                  Saisir le code
                </Link>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <FiSend size={17} />
                  )}
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {!success && (
            <p className="text-center text-gray-500 text-sm mt-6">
              Vous vous souvenez ?{" "}
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold"
              >
                Se connecter
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
