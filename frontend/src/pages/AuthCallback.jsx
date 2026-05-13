import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

// Module-level dedupe: React 18 StrictMode mounts components twice in dev mode,
// and each mount creates a NEW useRef(false). A module-scoped Set survives the
// unmount/remount cycle, so the OAuth `session_id` (which is one-time-use)
// cannot be exchanged twice and get a 401 on the second attempt.
const processedSessionIds = new Set();

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Read from URL fragment per Emergent OAuth playbook (#session_id=...)
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const session_id = params.get("session_id");

    if (!session_id) {
      navigate("/", { replace: true });
      return;
    }

    // If this same session_id was already exchanged in this tab's session
    // (StrictMode double-mount, or user used browser back), do NOT POST again.
    // The first call's response cookie is already set; just resolve via /auth/me.
    if (processedSessionIds.has(session_id)) {
      (async () => {
        try {
          const me = await api.get("/auth/me");
          setUser(me.data);
          window.history.replaceState(null, "", window.location.pathname);
          if (!me.data.current_household_id) {
            navigate("/onboarding", { replace: true, state: { user: me.data } });
          } else {
            navigate("/dashboard", { replace: true, state: { user: me.data } });
          }
        } catch (_e) {
          navigate("/", { replace: true });
        }
      })();
      return;
    }

    processedSessionIds.add(session_id);

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        setUser(r.data.user);
        window.history.replaceState(null, "", window.location.pathname);
        if (!r.data.user.current_household_id) {
          navigate("/onboarding", { replace: true, state: { user: r.data.user } });
        } else {
          navigate("/dashboard", { replace: true, state: { user: r.data.user } });
        }
      } catch (err) {
        // The session exchange failed. Before redirecting back to Landing,
        // check whether the cookie was already established by a prior call
        // (e.g., StrictMode race where the first effect already succeeded but
        // we're observing the second mount's 401). If /auth/me works, the
        // user IS authenticated and we should continue into the app rather
        // than producing the redirect loop the user reported.
        try {
          const me = await api.get("/auth/me");
          setUser(me.data);
          window.history.replaceState(null, "", window.location.pathname);
          if (!me.data.current_household_id) {
            navigate("/onboarding", { replace: true, state: { user: me.data } });
          } else {
            navigate("/dashboard", { replace: true, state: { user: me.data } });
          }
        } catch (_e2) {
          // Truly failed — surface a readable message so the user understands
          // they're back at the splash because Google sign-in didn't complete,
          // not because the page just silently bounced.
          const detail = err?.response?.data?.detail;
          toast.error(detail || "Google sign-in didn't complete. Please try again.");
          navigate("/", { replace: true });
        }
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
