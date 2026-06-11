import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Login";
import Spinner from "./components/ui/Spinner";

// Pages chargées à la demande (bundle initial léger)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const Documents = lazy(() => import("./pages/Documents"));
const Quizzes = lazy(() => import("./pages/Quizzes"));
const Summaries = lazy(() => import("./pages/Summaries"));
const Culture = lazy(() => import("./pages/Culture"));
const Friends = lazy(() => import("./pages/Friends"));
const SRS = lazy(() => import("./pages/SRS"));
const GameSounds = lazy(() => import("./pages/GameSounds"));
const GameSettings = lazy(() => import("./pages/GameSettings"));

const FullLoader = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-ink-900">
    <Spinner size={28} />
  </div>
);

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Dashboard /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Users /></Suspense>} />
        <Route path="documents" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Documents /></Suspense>} />
        <Route path="quizzes" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Quizzes /></Suspense>} />
        <Route path="summaries" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Summaries /></Suspense>} />
        <Route path="culture" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Culture /></Suspense>} />
        <Route path="friends" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><Friends /></Suspense>} />
        <Route path="srs" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><SRS /></Suspense>} />
        <Route path="game-sounds" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><GameSounds /></Suspense>} />
        <Route path="game-settings" element={<Suspense fallback={<div className="py-20 flex justify-center"><Spinner /></div>}><GameSettings /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-[100dvh] bg-ink-900 font-sans text-white">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}
