import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { liturgicalDot, liturgicalText, memberTileClass, initials, formatCivilDate, toRoman } from "@/lib/liturgical";

const PRAYER_TYPES = [
  { key: "morning_offering", label: "Morning Offering" },
  { key: "angelus", label: "Angelus" },
  { key: "rosary", label: "Holy Rosary" },
  { key: "divine_mercy", label: "Divine Mercy Chaplet" },
  { key: "examen", label: "Examen" },
  { key: "lectio_divina", label: "Lectio Divina" },
];

export default function Today() {
  const [lit, setLit] = useState(null);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [rules, setRules] = useState([]);
  const [prayerLogs, setPrayerLogs] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_type: {} });
  const [activeMember, setActiveMember] = useState(null);
  const today = new Date();

  const refresh = async () => {
    const [l, hm, r, p, c, st] = await Promise.all([
      api.get("/liturgical/today"),
      api.get("/household/me"),
      api.get("/rules"),
      api.get("/prayer/log"),
      api.get("/challenges/active"),
      api.get("/prayer/stats"),
    ]);
    setLit(l.data);
    setHousehold(hm.data.household);
    setMembers(hm.data.members);
    if (!activeMember && hm.data.members?.length) {
      const me = hm.data.members.find((m) => m.linked_user_id) || hm.data.members[0];
      setActiveMember(me.member_id);
    }
    setRules(r.data.rules);
    setPrayerLogs(p.data.logs);
    setActiveChallenges(c.data.challenges);
    setStats(st.data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const dailyRules = rules.filter((r) => r.cadence === "daily");

  const toggleRule = async (rule) => {
    if (!activeMember) return;
    const completed = !rule.completed_today_member_ids?.includes(activeMember);
    await api.post(`/rules/${rule.rule_id}/checkin`, { member_id: activeMember, completed });
    refresh();
  };

  const logPrayer = async (prayer_type) => {
    if (!activeMember) return;
    await api.post("/prayer/log", { member_id: activeMember, prayer_type });
    refresh();
  };

  const checkinChallenge = async (ch) => {
    if (!activeMember) return;
    const done = ch.completed_today_member_ids?.includes(activeMember);
    await api.post(`/challenges/${ch.challenge_id}/checkin`, { member_id: activeMember, completed: !done });
    refresh();
  };

  if (!lit) {
    return <div className="p-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="today-page">
      {/* Breviary header */}
      <header className="border-b border-border pb-8 mb-12">
        <div className="flex items-start gap-6">
          <span className={`mt-2 w-1 self-stretch ${liturgicalDot(lit.color)}`} />
          <div className="flex-1">
            <div className="overline mb-3">{formatCivilDate(today)}</div>
            <h1 className="font-serif text-4xl md:text-6xl tracking-tighter leading-[0.95]">
              {lit.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className={liturgicalText(lit.color)}>● {lit.season}</span>
              <span className="font-mono uppercase tracking-wider text-xs">{lit.rank}</span>
              {lit.fasting && <span className="text-liturgical-violet">FAST</span>}
              {lit.abstinence && <span className="text-liturgical-red">ABSTINENCE</span>}
              {lit.is_sunday && <span>Lord&rsquo;s Day</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Member switcher */}
      {members.length > 0 && (
        <div className="mb-10">
          <div className="overline mb-3">Logging as</div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.member_id}
                data-testid={`today-member-switch-${m.member_id}`}
                onClick={() => setActiveMember(m.member_id)}
                className={`flex items-center gap-2 px-3 py-1.5 border text-sm ${
                  activeMember === m.member_id ? "border-foreground" : "border-border text-muted-foreground"
                }`}
              >
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono ${memberTileClass(m.color)}`}>
                  {initials(m.name)}
                </span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-12">
        {/* Prayer rhythm */}
        <section data-testid="today-prayer-section">
          <div className="overline mb-4">{toRoman(1)} · Prayer rhythm</div>
          <ul className="divide-y divide-border border-y border-border">
            {PRAYER_TYPES.map((pt) => {
              const memberLogs = prayerLogs.filter(
                (l) => l.prayer_type === pt.key && l.member_id === activeMember
              );
              const householdLogs = prayerLogs.filter((l) => l.prayer_type === pt.key);
              return (
                <li key={pt.key} className="py-3 flex items-center gap-3">
                  <button
                    onClick={() => logPrayer(pt.key)}
                    data-testid={`today-prayer-log-${pt.key}`}
                    className={`w-5 h-5 border ${memberLogs.length > 0 ? "bg-foreground border-foreground" : "border-border"} flex items-center justify-center text-[10px] text-background`}
                  >
                    {memberLogs.length > 0 ? "✓" : ""}
                  </button>
                  <span className="flex-1 text-sm">{pt.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {householdLogs.length > 0 ? `${householdLogs.length}× household` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 text-xs text-muted-foreground font-mono">
            {stats.total} prayers · last 7 days
          </div>
        </section>

        {/* Rule of life today */}
        <section data-testid="today-rule-section">
          <div className="overline mb-4">{toRoman(2)} · Today&rsquo;s rule</div>
          {dailyRules.length === 0 ? (
            <div className="border border-border p-6 text-sm text-muted-foreground">
              No daily rules yet.{" "}
              <Link to="/rule" className="underline hover:text-foreground" data-testid="today-build-rule-link">
                Build your rule of life →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {dailyRules.map((rule) => {
                const done = rule.completed_today_member_ids?.includes(activeMember);
                const householdDone = rule.completed_today_member_ids?.length || 0;
                const assigned = rule.assigned_member_ids?.length || members.length;
                return (
                  <li key={rule.rule_id} className="py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleRule(rule)}
                      data-testid={`today-rule-toggle-${rule.rule_id}`}
                      className={`w-5 h-5 border ${done ? "bg-foreground border-foreground" : "border-border"} flex items-center justify-center text-[10px] text-background`}
                    >
                      {done ? "✓" : ""}
                    </button>
                    <span className="flex-1 text-sm">{rule.title}</span>
                    <span className="font-mono text-xs text-muted-foreground capitalize">{rule.pillar}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {householdDone}/{assigned}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Challenges */}
        {activeChallenges.length > 0 && (
          <section className="md:col-span-2" data-testid="today-challenges-section">
            <div className="overline mb-4">{toRoman(3)} · Active seasons</div>
            <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
              {activeChallenges.map((c) => {
                const done = c.completed_today_member_ids?.includes(activeMember);
                return (
                  <div key={c.challenge_id} className="bg-background p-6">
                    <div className="flex items-start gap-3">
                      <span className={`w-1 self-stretch ${liturgicalDot(c.color)}`} />
                      <div className="flex-1">
                        <div className="overline mb-1">Day {c.current_day} of {c.days_total}</div>
                        <div className="font-serif text-xl mb-3">{c.title}</div>
                        <div className="h-px bg-border mb-3 relative">
                          <div className={`absolute left-0 top-0 h-px ${liturgicalDot(c.color)}`} style={{ width: `${c.completion_pct}%` }} />
                        </div>
                        <button
                          onClick={() => checkinChallenge(c)}
                          data-testid={`today-challenge-checkin-${c.challenge_id}`}
                          className={`text-xs px-3 py-1.5 border ${done ? "bg-foreground text-background border-foreground" : "border-border"}`}
                        >
                          {done ? "✓ Checked in for today" : "Check in for today"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {household && (
        <footer className="mt-20 pt-8 border-t border-border text-xs text-muted-foreground font-mono">
          {household.name.toUpperCase()}{household.patron_saint ? ` · sub patrocinio ${household.patron_saint}` : ""}
        </footer>
      )}
    </div>
  );
}
