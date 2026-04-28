import { lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { createPortal } from "react-dom";
import { useUIStore } from "@/store";
import { getStoredAuthToken } from "@/utils/storage/session";

const LandingPage = lazy(() => import("@/pages/landing/LandingClient"));
const LoginPage = lazy(() => import("@/pages/auth/login/LoginClient"));
const RegisterPage = lazy(() => import("@/pages/auth/register/RegisterClient"));
const ImportIdentityPage = lazy(
  () => import("@/pages/auth/import/ImportIdentityClient"),
);
const ChatDashboard = lazy(() => import("@/pages/chat/ChatClient"));

/**
 * 1. Main Application Router with Smart Routing
 * @returns {JSX.Element}
 */
function App() {
  const { toast } = useUIStore();

  const isReturningUser =
    !!getStoredAuthToken() || !!localStorage.getItem("chat_app_keystore");

  return (
    <>
      <Router>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
          <Routes>
            <Route
              path="/"
              element={
                isReturningUser ? (
                  <Navigate to="/login" replace />
                ) : (
                  <LandingPage />
                )
              }
            />

            <Route path="/landing" element={<LandingPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/import" element={<ImportIdentityPage />} />

            <Route path="/chat" element={<ChatDashboard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>

      {toast.show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed top-18 right-4 md:right-8 z-9999 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200 ${
              toast.type === "error"
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}
          >
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>,
          document.body,
        )}
    </>
  );
}

export default App;
