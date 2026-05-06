import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const session_id = params.get("session_id");

    if (!session_id) {
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        setUser(r.data.user);
        // Clear hash
        window.history.replaceState(null, "", window.location.pathname);
        if (!r.data.user.current_household_id) {
          navigate("/onboarding", { replace: true, state: { user: r.data.user } });
        } else {
          navigate("/today", { replace: true, state: { user: r.data.user } });
        }
      } catch (_e) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground" data-testid="auth-callback">
      <div className="text-center">
        <div className="overline mb-2">Establishing session</div>
        <div className="font-serif text-2xl">One moment.</div>
      </div>
    </div>
  );
}
