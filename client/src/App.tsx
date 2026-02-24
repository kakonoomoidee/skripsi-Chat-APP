import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LandingPage from "@/pages/landing/LandingClient";
import LoginPage from "@/pages/auth/login/LoginClient";
import RegisterPage from "@/pages/auth/register/RegisterClient";
import ImportIdentityPage from "@/pages/auth/import/ImportIdentityClient";
import ChatDashboard from "@/pages/chat/ChatClient";

/**
 * 1. Main Application Router with Smart Routing
 * @returns {JSX.Element}
 */
function App() {
  const isReturningUser =
    !!localStorage.getItem("token") ||
    !!localStorage.getItem("encryptedIdentity");

  return (
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
  );
}

export default App;
