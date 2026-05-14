import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import { formatCivilDate } from "@/lib/liturgical";

// Household prayer rhythms — practices the family is trying to live, not a
// per-person compliance matrix. Each row asks one question: "Did the
// household pray this today?"
const PRAYER_RHYTHMS = [
  { key: "morning_offering", label: "Morning Offering", hint: "An act of consecration at the day's beginning." },
  { key: "angelus",          label: "Angelus",          hint: "At noon, the mystery of the Incarnation." },
  { key: "rosary",           label: "Family Rosary",    hint: "The Joyful, Sorrowful, Glorious, or Luminous mysteries together." },
  { key: "divine_mercy",     label: "Divine Mercy Chaplet", hint: "Prayed at 3 PM or in the late afternoon." },
  { key: "examen",           label: "Evening Examen",   hint: "A nightly review of the day before God." },
  { key: "lectio_divina",    label: "Lectio Divina",    hint: "Slow, prayerful reading of the day's Scripture." },
];

export default function PrayerTracker({ embedded = false }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ by_type: {}, total: 0 });
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));

  const refresh = async () => {
    try {
      const [p, st] = await Promise.all([
        api.get(`/prayer/log?log_date=${logDate}`),
        api.get("/prayer/stats"),
      ]);
      setLogs(p.data.logs || []);
      setStats(st.data || { by_type: {}, total: 0 });
    } catch (err) {
      toast.error(explainError(err, "Could not load prayer rhythm."));
    }
  };

  useEffect(() => { refresh(); }, [logDate]);

  // The household has "prayed X today" if there exists at least one prayer_log
  // for this household, prayer_type, and date — regardless of member.
  const logsForType = (prayer_type) => logs.filter((l) => l.prayer_type === prayer_type);

  const markPrayed = async (prayer_type) => {
    try {
      // No member_id — this is a household-level act, not a per-person check-in.
      await api.post("/prayer/log", { prayer_type, log_date: logDate });
      toast.success("Prayer logged.");
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not log the prayer."));
    }
  };

  const unmarkPrayed = async (prayer_type) => {
    const existing = logsForType(prayer_type);
    if (existing.length === 0) return;
    // Remove the most recent log of this type for this date.
    const target = existing[existing.length - 1];
    try {
      await api.delete(`/prayer/log/${target.log_id}`);
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not remove the prayer log."));
    }
  };

  const dt = new Date(logDate + "T12:00:00");
  const isToday = logDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="prayer-page">
      <header className={`${embedded ? "" : "border-b border-border"} pb-6 mb-12 flex flex-wrap items-end justify-between gap-4`}>
        <div>
          {!embedded && <div className="overline mb-2">Prayer Rhythm</div>}
          <h1 className="font-serif text-3xl md:text-4xl tracking-tighter">{formatCivilDate(dt)}</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            The prayer rhythms this household is trying to live. Not a checklist —
            a quiet ledger of the day&rsquo;s spiritual breath.
          </p>
        </div>
        <input
          type="date"
          data-testid="prayer-date-input"
          value={logDate}
          onChange={(e) => setLogDate(e.target.value)}
          className="bg-transparent border border-border px-3 py-2 text-sm font-mono"
        />
      </header>

      {/* Last 7 days — household-level aggregate, no per-person breakdown */}
      <section className="mb-14" data-testid="prayer-week-overview">
        <div className="overline mb-3">Last 7 days · household</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border">
          {PRAYER_RHYTHMS.map((p) => {
            const count = stats.by_type[p.key] || 0;
            return (
              <div key={p.key} className="bg-background p-4" data-testid={`prayer-week-${p.key}`}>
                <div className="font-mono text-xl">{count}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.label}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground font-mono">
          {stats.total} {stats.total === 1 ? "prayer" : "prayers"} lived as a household · last 7 days
        </div>
      </section>

      {/* Today's rhythm — household-level mark/unmark */}
      <section data-testid="prayer-rhythms-list">
        <div className="overline mb-4">{isToday ? "Today's rhythm" : "Rhythm for this day"}</div>
        <ul className="divide-y divide-border border-y border-border">
          {PRAYER_RHYTHMS.map((p) => {
            const existing = logsForType(p.key);
            const prayed = existing.length > 0;
            return (
              <li
                key={p.key}
                data-testid={`prayer-rhythm-${p.key}`}
                className="py-4 flex items-center gap-4"
              >
                <button
                  onClick={() => (prayed ? unmarkPrayed(p.key) : markPrayed(p.key))}
                  data-testid={`prayer-mark-${p.key}`}
                  aria-label={prayed ? `Unmark ${p.label}` : `Mark ${p.label} as prayed`}
                  className={`shrink-0 w-7 h-7 border flex items-center justify-center text-sm transition-colors ${
                    prayed
                      ? "bg-foreground border-foreground text-background"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {prayed ? "✓" : ""}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-base leading-snug">{p.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.hint}</div>
                </div>
                {prayed && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap" data-testid={`prayer-status-${p.key}`}>
                    {existing.length > 1 ? `lived ${existing.length}×` : "lived"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground italic max-w-xl">
          A rhythm is not measured by who in the family said which prayer. It is
          measured by whether, together, the household kept its hour with God.
        </p>
      </section>
    </div>
  );
}
