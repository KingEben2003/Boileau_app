import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiCheckCircle, FiRefreshCw, FiClock, FiShield } from "react-icons/fi";

const VerifyCode = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
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
    if (timer <= 0) return;

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
      setTimer(60);
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch {
      setError("Erreur lors du renvoi. Réessayez dans quelques instants.");
    } finally {
      setResending(false);
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
          <p className="text-gray-500 text-sm">Vérification en deux étapes</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl shadow-black/20">
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
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
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
                  className={`h-14 w-14 rounded-xl border-2 bg-white/5 text-center text-2xl font-bold text-white focus:outline-none transition-all ${
                    digit
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/15 focus:border-indigo-500/60 focus:bg-white/8"
                  }`}
                />
              ))}
            </div>

            {/* Timer */}
            <div className={`flex items-center justify-center gap-2 text-sm ${timer <= 10 ? "text-pink-400" : "text-gray-500"}`}>
              <FiClock size={14} className={timer <= 10 ? "animate-pulse" : ""} />
              <span className={timer <= 10 ? "font-bold" : ""}>
                {timer > 0 ? `Expire dans ${timer}s` : "Code expiré"}
              </span>
            </div>

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
              disabled={loading || timer <= 0}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
