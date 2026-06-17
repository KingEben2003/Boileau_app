import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiCheckCircle, FiRefreshCw, FiClock, FiShield } from "react-icons/fi";
import { fadeInUp } from "../../lib/motion";

const VerifyCode = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);
  const navigate = useNavigate();
  const email = sessionStorage.getItem("reset_email");

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
      return;
    }
    inputs.current[0]?.focus();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Veuillez saisir le code complet à 6 chiffres.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await axios.post("/api/verify-code/", { email, code: fullCode });
      sessionStorage.setItem("reset_code", fullCode);
      navigate("/reset-password");
    } catch (err) {
      setError(err.response?.data?.error || "Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await axios.post("/api/forgot-password/", { email });
      setTimer(30);
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch {
      setError("Erreur lors du renvoi. Réessayez dans quelques instants.");
    } finally {
      setResending(false);
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
          <p className="text-gray-500 text-sm">Vérification en deux étapes</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors mb-7 group"
          >
            <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Retour
          </Link>

          <h2 className="text-2xl font-bold text-white mb-2">Code de vérification</h2>
          <p className="text-gray-400 text-sm mb-7 leading-relaxed">
            Un code à 6 chiffres a été envoyé à{" "}
            <span className="text-indigo-400 font-semibold">{email}</span>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code inputs */}
            <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`min-w-0 flex-1 aspect-square max-h-14 rounded-xl border-2 bg-white/5 text-center text-fluid-xl font-bold text-white focus:outline-none transition-all ${
                    digit
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/15 focus:border-indigo-500/60 focus:bg-white/[0.07]"
                  }`}
                />
              ))}
            </div>

            {/* Resend cooldown */}
            {timer > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <FiClock size={14} />
                <span>Renvoyer dans {timer}s</span>
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
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
                <FiCheckCircle size={17} />
              )}
              {loading ? "Vérification..." : "Valider le code"}
            </button>

            {timer === 0 && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw size={14} className={resending ? "animate-spin" : ""} />
                {resending ? "Envoi en cours..." : "Renvoyer un code"}
              </button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyCode;
