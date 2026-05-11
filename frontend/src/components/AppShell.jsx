import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { initials, memberTileClass } from "@/lib/liturgical";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Crest } from "@/components/Crest";

const NAV = [
  { to: "/dashboard", label: "Dashboard", num: "01" },
  { to: "/council", label: "Family Council", num: "02" },
  { to: "/spiritual", label: "Spiritual Life", num: "03" },
  { to: "/order", label: "Household Order", num: "04" },
  { to: "/budget", label: "Budget & Stewardship", num: "05" },
  { to: "/mission", label: "Mission & Goals", num: "06" },
  { to: "/schedule", label: "Schedule", num: "07" },
  { to: "/members", label: "Members", num: "08" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [household, setHousehold] = useState(null);

  useEffect(() => {
    api.get("/household/me").then((r) => setHousehold(r.data.household)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex md:flex-col w-64 border-r border-border shrink-0 print:hidden">
        <div className="px-6 py-7 border-b border-border">
          <Link to="/dashboard" className="block group" data-testid="brand-link">
            <div className="flex items-center gap-2 mb-1">
              <Crest size={14} className="text-muted-foreground/70" />
              <span className="overline">Household OS</span>
            </div>
            <div className="font-serif text-2xl tracking-tight leading-tight">Patria<span className="text-liturgical-white">.</span></div>
          </Link>
          {household && (
            <div className="mt-4 text-sm text-muted-foreground" data-testid="sidebar-household-name">
              {household.name}
              {household.patron_saint && (
                <div className="text-xs mt-1 italic">under {household.patron_saint}</div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}-link`}
              className={({ isActive }) =>
                `flex items-baseline gap-3 px-3 py-2 text-sm transition-opacity duration-200 ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <span className="font-mono text-[10px] w-6 opacity-60">{n.num}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs ${memberTileClass("violet")}`}>
                {initials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={() => navigate("/settings")} data-testid="settings-link" className="text-xs text-muted-foreground hover:text-foreground">Settings</button>
            <span className="text-xs text-muted-foreground">·</span>
            <button onClick={logout} data-testid="logout-button" className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-background border-b border-border print:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="brand-link-mobile">
            <Crest size={14} className="text-muted-foreground" />
            <span className="font-serif text-lg">Patria<span className="text-liturgical-white">.</span></span>
          </Link>
          <button onClick={logout} className="text-xs text-muted-foreground" data-testid="logout-button-mobile">Sign out</button>
        </div>
        <nav className="flex overflow-x-auto border-t border-border">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-mobile-${n.label.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}-link`}
              className={({ isActive }) =>
                `px-4 py-2 text-xs whitespace-nowrap ${isActive ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"}`
              }
            >{n.label}</NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 min-w-0 pt-28 md:pt-0">
        {children}
      </main>
    </div>
  );
}
