import React, { useState, useEffect, Suspense, lazy } from "react";
import axios from "axios";
import OneSignal from "react-onesignal";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import DashboardLayout from "./components/layout/DashboardLayout";
import NotificationToast from "./components/ui/NotificationToast";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { getDocuments } from "./services/api";
import { AuthProvider, useAuth } from "./AuthContext";
import { GameSoundProvider } from "./GameSoundContext";
import { pageTransition } from "./lib/motion";

// ── Sections chargées à la demande (code-splitting → bundle initial plus léger) ──
import Login from "./components/Login";
const Landing         = lazy(() => import("./components/Landing"));
const Register        = lazy(() => import("./components/layout/Register"));
const ForgotPassword  = lazy(() => import("./components/layout/ForgotPassword"));
const VerifyCode      = lazy(() => import("./components/layout/VerifyCode"));
const ResetPassword   = lazy(() => import("./components/layout/ResetPassword"));
const NotFound        = lazy(() => import("./components/ui/NotFound"));

const UploadSection          = lazy(() => import("./components/Sections/Upload"));
const SummaryHistory         = lazy(() => import("./components/Sections/summaryHistory"));
const QuizPlayer             = lazy(() => import("./components/Sections/quizPlayer"));
const ProfileSection         = lazy(() => import("./components/Sections/profil"));
const ProgressSection        = lazy(() => import("./components/Sections/Progress"));
const FriendsSection         = lazy(() => import("./components/Sections/Friends"));
const CultureGeneraleSection = lazy(() => import("./components/Sections/CultureGenerale"));

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

// ── Indicateur de chargement réutilisable ──────────────────────────────────────
const Spinner = () => (
  <span className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full" />
);

const FullScreenLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Spinner />
  </div>
);

// ── Route protégée (routes hors accueil) ─────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-[100dvh]"><Spinner /></div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ── Route d'accueil : Landing pour les visiteurs, Dashboard pour les connectés ──
const HomeRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-[100dvh]"><Spinner /></div>;
  return user ? <MainDashboard /> : <Landing />;
};

// Invite à uploader un document quand aucune sélection n'est disponible
const EmptyDocPrompt = ({ onGo }) => (
  <div className="text-center py-16">
    <p className="text-gray-400 mb-6">Veuillez d'abord uploader un document.</p>
    <button onClick={onGo} className="btn-primary mx-auto">
      Uploader un document
    </button>
  </div>
);

// ── Dashboard principal ───────────────────────────────────────────────────────
function MainDashboard() {
  const [currentSection, setCurrentSection] = useState("upload");
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [challengedFriend, setChallengedFriend] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await getDocuments();
        setDocuments(docs);
        setSelectedDocId((prev) => prev ?? (docs.length > 0 ? docs[0].id : null));
      } catch {
        // Documents loading failure is non-fatal — sections requiring a doc show EmptyDocPrompt
      }
    };
    loadDocuments();
    window.addEventListener("documents:refresh", loadDocuments);
    return () => window.removeEventListener("documents:refresh", loadDocuments);
  }, []);

  const handleSectionChange = (section) => {
    setCurrentSection(section);
    setSearchQuery("");
  };

  const filteredDocuments = searchQuery.trim()
    ? documents.filter((d) =>
        (d.title || d.file?.split("/").pop() || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : documents;

  const renderSection = () => {
    switch (currentSection) {
      case "upload":
        return <UploadSection />;
      case "summaries":
        return selectedDocId ? (
          <SummaryHistory
            documentId={selectedDocId}
            document={documents.find((d) => d.id === selectedDocId)}
            onBack={() => handleSectionChange("upload")}
          />
        ) : (
          <EmptyDocPrompt onGo={() => handleSectionChange("upload")} />
        );
      case "quizzes":
        return selectedDocId ? (
          <QuizPlayer documentId={selectedDocId} onBack={() => handleSectionChange("upload")} />
        ) : (
          <EmptyDocPrompt onGo={() => handleSectionChange("upload")} />
        );
      case "progress":
        return <ProgressSection />;
      case "amis":
        return (
          <FriendsSection
            challengedFriend={challengedFriend}
            onClearChallenge={() => setChallengedFriend(null)}
          />
        );
      case "culture":
        return <CultureGeneraleSection />;
      case "profil":
        return <ProfileSection />;
      default:
        return <UploadSection />;
    }
  };

  return (
    <>
      <DashboardLayout
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        selectedDocId={selectedDocId}
        onSelectDoc={setSelectedDocId}
        documents={filteredDocuments}
        onChallengeFriend={(friend) => {
          setChallengedFriend(friend);
          handleSectionChange("amis");
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="max-w-6xl mx-auto w-full">
          <Suspense fallback={<FullScreenLoader />}>
            <AnimatePresence mode="wait">
              <motion.div key={currentSection} {...pageTransition}>
                <ErrorBoundary key={currentSection}>
                  {renderSection()}
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </DashboardLayout>
      <NotificationToast />
    </>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-[100dvh]"><Spinner /></div>}>
    <Routes>
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-code"     element={<VerifyCode />} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/" element={<HomeRoute />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

// ── Composant racine ──────────────────────────────────────────────────────────
export default function App() {
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/public-config/`)
      .then((res) => setAppConfig(res.data))
      .catch(() => setAppConfig({ google_client_id: "", onesignal_app_id: "" }));
  }, []);

  useEffect(() => {
    if (!appConfig?.onesignal_app_id) return;
    OneSignal.init({
      appId: appConfig.onesignal_app_id,
      allowLocalhostAsSecureOrigin: true,
      welcomeNotification: { disable: true },
    });
  }, [appConfig]);

  if (!appConfig) {
    return (
      <div className="min-h-[100dvh] bg-ink-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage="Une erreur critique s'est produite. Veuillez rafraîchir la page.">
      <GoogleOAuthProvider clientId={appConfig.google_client_id || ""}>
        <AuthProvider>
          <GameSoundProvider>
            <Router>
              <div className="min-h-[100dvh] bg-ink-900 font-sans text-white">
                <AppRoutes />
              </div>
            </Router>
          </GameSoundProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
