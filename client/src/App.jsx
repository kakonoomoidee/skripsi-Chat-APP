import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Import komponen dari struktur folder yang baru
import LoginPage from "./pages/auth/login/page";
import RegisterPage from "./pages/auth/register/page";
import ChatDashboard from "./pages/chat/page";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* Default Route: Otomatis lempar ke Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Main Dashboard Route */}
          <Route path="/chat" element={<ChatDashboard />} />

          {/* Fallback 404: Kalo user ketik URL ngasal, balikin ke Login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
