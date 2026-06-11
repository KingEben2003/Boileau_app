import React from "react";
import { useAuth } from "../../AuthContext";
import { motion } from "framer-motion";
import { FiLogOut, FiUser, FiMail, FiShield } from "react-icons/fi";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#030712]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg rounded-3xl bg-white/5 border border-white/10 p-12 text-center shadow-2xl backdrop-blur-sm"
      >
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-indigo-500/20 p-6">
            <FiUser className="h-16 w-16 text-indigo-400" />
          </div>
        </div>

        <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">Bienvenue !</h1>
        <p className="mb-8 text-lg text-gray-400">
          Vous êtes connecté avec succès à votre compte.
        </p>

        <div className="mb-12 space-y-4 rounded-2xl bg-white/5 border border-white/10 p-6 text-left">
          <div className="flex items-center space-x-3">
            <FiMail className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-300">{user?.email || "—"}</span>
          </div>
          <div className="flex items-center space-x-3">
            <FiShield className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-400">Compte vérifié et sécurisé</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 focus-visible:outline-none"
        >
          <FiLogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </button>
      </motion.div>
    </div>
  );
};

export default Dashboard;
