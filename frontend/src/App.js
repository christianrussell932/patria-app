import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import SpiritualLife from "@/pages/SpiritualLife";
import HouseholdOrder from "@/pages/HouseholdOrder";
import Budget from "@/pages/Budget";
import MissionGoals from "@/pages/MissionGoals";
import Schedule from "@/pages/Schedule";
import Members from "@/pages/Household";
import Settings from "@/pages/Settings";
import Council from "@/pages/Council";
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
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/onboarding"
        element={<ProtectedRoute requireHousehold={false}><Onboarding /></ProtectedRoute>}
      />

      {/* New IA */}
      <Route path="/dashboard" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
      <Route path="/council" element={<ProtectedRoute><AppShell><Council /></AppShell></ProtectedRoute>} />
      <Route path="/spiritual" element={<ProtectedRoute><AppShell><SpiritualLife /></AppShell></ProtectedRoute>} />
      <Route path="/order" element={<ProtectedRoute><AppShell><HouseholdOrder /></AppShell></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute><AppShell><Budget /></AppShell></ProtectedRoute>} />
      <Route path="/mission" element={<ProtectedRoute><AppShell><MissionGoals /></AppShell></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><AppShell><Schedule /></AppShell></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute><AppShell><Members /></AppShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />

      {/* Legacy redirects */}
      <Route path="/today" element={<Navigate to="/dashboard" replace />} />
      <Route path="/calendar" element={<Navigate to="/spiritual?tab=calendar" replace />} />
      <Route path="/rule" element={<Navigate to="/order" replace />} />
      <Route path="/prayer" element={<Navigate to="/spiritual?tab=prayer" replace />} />
      <Route path="/challenges" element={<Navigate to="/spiritual?tab=challenges" replace />} />
      <Route path="/household" element={<Navigate to="/members" replace />} />

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
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
