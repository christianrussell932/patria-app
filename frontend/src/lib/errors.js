// Shared error formatter used by every page that calls a Patria API and
// wants to surface a readable toast instead of letting an unhandled axios
// rejection escape into React's dev-mode "Uncaught Runtime Error" overlay.
//
// Usage:
//   try { await api.post(...); }
//   catch (err) { toast.error(explainError(err, "Could not save the X.")); }
export function explainError(err, fallback = "Something went wrong.") {
  const data = err?.response?.data;
  if (data?.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const m = data.detail[0];
      const field = Array.isArray(m?.loc) ? m.loc[m.loc.length - 1] : "field";
      return `${field}: ${m?.msg || "invalid value"}`;
    }
  }
  const status = err?.response?.status;
  if (status === 401) return "Session expired. Please sign in again.";
  if (status === 403) return "You don't have access to this household.";
  if (status === 404) return "That endpoint isn't available — try reloading the page.";
  if (err?.message === "Network Error") return "Network error — check your connection.";
  return fallback;
}
