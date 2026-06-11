import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FiMail, FiArrowLeft, FiSend, FiCheckCircle, FiShield } from "react-icons/fi";
import { fadeInUp, popIn } from "../../lib/motion";

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
          <p className="text-gray-500 text-sm">Réinitialisez votre mot de passe</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
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
                {...popIn}
                className="text-center py-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
                  <FiCheckCircle size={28} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Email envoyé !</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Si un compte existe pour <span className="text-indigo-400 font-semibold">{email}</span>, un code de vérification a été envoyé. Redirection en cours...
                </p>
                <Link to="/verify-code" className="btn-primary text-sm px-6 py-2.5">
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
                      className="input-field pl-11"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5"
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
