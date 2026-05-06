import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import Today from "@/pages/Today";
import Calendar from "@/pages/Calendar";
import RuleOfLife from "@/pages/RuleOfLife";
import PrayerTracker from "@/pages/PrayerTracker";
import Challenges from "@/pages/Challenges";
import HouseholdPage from "@/pages/Household";
import Settings from "@/pages/Settings";
import AppShell from "@/components/AppShell";

function ProtectedRoute({ children, requireHousehold = true }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (requireHousehold && !user.current_household_id) return <Navigate to="/onboarding" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen" />;
  if (user) {
    if (!user.current_household_id) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/today" replace />;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Synchronous detection of OAuth callback (URL hash). Process FIRST.
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireHousehold={false}>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route path="/today" element={<ProtectedRoute><AppShell><Today /></AppShell></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><AppShell><Calendar /></AppShell></ProtectedRoute>} />
      <Route path="/rule" element={<ProtectedRoute><AppShell><RuleOfLife /></AppShell></ProtectedRoute>} />
      <Route path="/prayer" element={<ProtectedRoute><AppShell><PrayerTracker /></AppShell></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><AppShell><Challenges /></AppShell></ProtectedRoute>} />
      <Route path="/household" element={<ProtectedRoute><AppShell><HouseholdPage /></AppShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
