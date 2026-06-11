import React, { useState, useEffect } from "react";
import axios from "axios";
import OneSignal from "react-onesignal";
import DashboardLayout from "./components/layout/DashboardLayout";
import UploadSection from "./components/Sections/Upload";
import SummaryHistory from "./components/Sections/summaryHistory";
import QuizPlayer from "./components/Sections/quizPlayer";
import ProfileSection from "./components/Sections/profil";
import ProgressSection from "./components/Sections/Progress";
import FriendsSection from "./components/Sections/Friends";
import CultureGeneraleSection from "./components/Sections/CultureGenerale";
import NotificationToast from "./components/ui/NotificationToast";
import { getDocuments } from "./services/api";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./components/Login";
import Register from "./components/layout/Register";
import ForgotPassword from "./components/layout/ForgotPassword";
import VerifyCode from "./components/layout/VerifyCode";
import ResetPassword from "./components/layout/ResetPassword";
import { GoogleOAuthProvider } from "@react-oauth/google";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

// ── Route protégée ────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-white">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

// ── Dashboard principal ───────────────────────────────────────────────────────
function MainDashboard() {
  const [currentSection, setCurrentSection] = useState("upload");
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [challengedFriend, setChallengedFriend] = useState(null);

  useEffect(() => {
    loadDocuments();
    window.addEventListener("documents:refresh", loadDocuments);
    return () => window.removeEventListener("documents:refresh", loadDocuments);
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des documents:", err);
    }
  };

  const handleSectionChange = (section) => setCurrentSection(section);

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
          <div className="text-center py-12">
            <p className="text-gray-400 mb-6">Veuillez d'abord uploader un document.</p>
            <button
              onClick={() => handleSectionChange("upload")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition font-bold"
            >
              Uploader un document
            </button>
          </div>
        );
      case "quizzes":
        return selectedDocId ? (
          <QuizPlayer documentId={selectedDocId} onBack={() => handleSectionChange("upload")} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-6">Veuillez d'abord uploader un document.</p>
            <button
              onClick={() => handleSectionChange("upload")}
              className="px-4 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition font-bold"
            >
              Uploader un document
            </button>
          </div>
        );
      case "progress":
        return <ProgressSection />;
      case "amis":
        return <FriendsSection challengedFriend={challengedFriend} onClearChallenge={() => setChallengedFriend(null)} />;
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
        documents={documents}
        onChallengeFriend={(friend) => {
          setChallengedFriend(friend);
          handleSectionChange("amis");
        }}
      >
        <div className="max-w-6xl mx-auto w-full">
          {renderSection()}
        </div>
      </DashboardLayout>
      <NotificationToast />
    </>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/verify-code" element={<VerifyCode />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
          <MainDashboard />
        </ProtectedRoute>
      }
    />
  </Routes>
);

// ── Composant racine ──────────────────────────────────────────────────────────
export default function App() {
  const [appConfig, setAppConfig] = useState(null);

  // Charge la config publique depuis le backend (Google Client ID, OneSignal App ID)
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/public-config/`)
      .then((res) => setAppConfig(res.data))
      .catch(() => setAppConfig({ google_client_id: "", onesignal_app_id: "" }));
  }, []);

  // Lance OneSignal dès que la config est disponible
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
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <span className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full" />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={appConfig.google_client_id || ""}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-[#030712] font-sans text-white">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
