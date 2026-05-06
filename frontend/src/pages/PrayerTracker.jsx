import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { initials, memberTileClass, formatCivilDate } from "@/lib/liturgical";

const PRAYER_TYPES = [
  { key: "morning_offering", label: "Morning Offering" },
  { key: "angelus", label: "Angelus" },
  { key: "rosary", label: "Holy Rosary" },
  { key: "divine_mercy", label: "Divine Mercy Chaplet" },
  { key: "examen", label: "Examen" },
  { key: "lectio_divina", label: "Lectio Divina" },
];

export default function PrayerTracker({ embedded = false }) {
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ by_type: {}, total: 0 });
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));

  const refresh = async () => {
    const [hm, p, st] = await Promise.all([
      api.get("/household/me"),
      api.get(`/prayer/log?log_date=${logDate}`),
      api.get("/prayer/stats"),
    ]);
    setMembers(hm.data.members);
    setLogs(p.data.logs);
    setStats(st.data);
  };

  useEffect(() => { refresh(); }, [logDate]);

  const log = async (member_id, prayer_type) => {
    await api.post("/prayer/log", { member_id, prayer_type, log_date: logDate });
    refresh();
  };

  const remove = async (log_id) => {
    await api.delete(`/prayer/log/${log_id}`);
    refresh();
  };

  const countFor = (member_id, prayer_type) =>
    logs.filter((l) => l.member_id === member_id && l.prayer_type === prayer_type).length;

  const dt = new Date(logDate + "T12:00:00");

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="prayer-page">
      <header className={`${embedded ? "" : "border-b border-border"} pb-6 mb-10 flex flex-wrap items-end justify-between gap-4`}>
        <div>
          {!embedded && <div className="overline mb-2">Shared Prayer Tracker</div>}
          <h1 className="font-serif text-3xl md:text-4xl tracking-tighter">{formatCivilDate(dt)}</h1>
        </div>
        <input
          type="date"
          data-testid="prayer-date-input"
          value={logDate}
          onChange={(e) => setLogDate(e.target.value)}
          className="bg-transparent border border-border px-3 py-2 text-sm font-mono"
        />
      </header>

      {/* Weekly stats */}
      <section className="mb-12">
        <div className="overline mb-3">Last 7 days · household</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-border border border-border">
          {PRAYER_TYPES.map((pt) => (
            <div key={pt.key} className="bg-background p-4">
              <div className="font-mono text-3xl">{stats.by_type[pt.key] || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">{pt.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Matrix */}
      <section data-testid="prayer-matrix">
        <div className="overline mb-3">Today&rsquo;s log</div>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-normal overline">Member</th>
                {PRAYER_TYPES.map((pt) => (
                  <th key={pt.key} className="text-left p-3 font-normal text-xs">{pt.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.member_id} className="border-b border-border last:border-b-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                      <span>{m.name}</span>
                    </div>
                  </td>
                  {PRAYER_TYPES.map((pt) => {
                    const count = countFor(m.member_id, pt.key);
                    const logId = logs.find((l) => l.member_id === m.member_id && l.prayer_type === pt.key)?.log_id;
                    return (
                      <td key={pt.key} className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => log(m.member_id, pt.key)}
                            data-testid={`prayer-log-${m.member_id}-${pt.key}`}
                            className="text-xs border border-border px-2 py-0.5 hover:bg-secondary"
                          >+</button>
                          {count > 0 && (
                            <button onClick={() => logId && remove(logId)} className="font-mono text-xs" data-testid={`prayer-count-${m.member_id}-${pt.key}`}>
                              {count}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
