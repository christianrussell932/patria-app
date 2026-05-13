import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import { liturgicalDot, liturgicalText, formatCivilDate, initials, memberTileClass } from "@/lib/liturgical";
import Panel from "@/components/Panel";
import { CrestDivider } from "@/components/Crest";

const fmtMoney = (n) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard")
      .then((r) => setData(r.data))
      .catch((err) => toast.error(explainError(err, "Could not load the dashboard.")));
  }, []);

  if (!data) return <div className="p-10 text-muted-foreground">Loading…</div>;

  const { liturgical: lit, household, weekly_score, todays_events, upcoming_events,
    date_night, tasks, prayer, budget, active_challenge, goals } = data;
  const today = new Date();

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-12" data-testid="dashboard-page">
      {/* Top: liturgical day + snapshot */}
      <header className="border-b border-border pb-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex items-start gap-5">
            <span className={`mt-1 w-1 self-stretch ${liturgicalDot(lit.color)}`} />
            <div>
              <div className="overline mb-2">{formatCivilDate(today)}</div>
              <h1 className="font-serif text-3xl md:text-5xl tracking-tighter leading-[1.0]">
                {lit.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className={liturgicalText(lit.color)} data-testid="liturgical-season-label">● {lit.season_label || lit.season}</span>
                {lit.rank !== "feria" && lit.rank !== "sunday" && (
                  <span className="font-mono text-xs uppercase tracking-wider">{lit.rank}</span>
                )}
                {lit.fasting && <span className="text-liturgical-violet">FAST</span>}
                {lit.abstinence && <span className="text-liturgical-red">ABSTINENCE</span>}
              </div>
              {lit.optional_memorials && lit.optional_memorials.length > 0 && (
                <div
                  className="mt-2 text-sm italic text-muted-foreground/85"
                  data-testid="liturgical-optional-memorials"
                >
                  Also commemorated:{" "}
                  {lit.optional_memorials.map((m, i) => (
                    <span key={i}>
                      <span className={liturgicalText(m.color)}>{m.name}</span>
                      {i < lit.optional_memorials.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <Snapshot value={weekly_score?.total ?? 0} suffix="" label="Household health" />
            <Snapshot value={prayer.streak_days} label="Prayer streak" />
            <Snapshot value={tasks.open_count} label="Open tasks" />
            <Snapshot value={data.members_count} label="Members" />
          </div>
        </div>

        {/* Family Mission & Values — single prominent home (no duplicate card below) */}
        {(household?.mission_statement || (household?.values && household.values.length > 0)) && (
          <div className="mt-8 pt-6 border-t border-border grid md:grid-cols-12 gap-6 md:gap-10">
            {household?.mission_statement && (
              <div className="md:col-span-7" data-testid="dashboard-mission-line">
                <div className="overline mb-2">Family Mission</div>
                <p className="font-serif text-xl md:text-2xl leading-snug italic">
                  &ldquo;{household.mission_statement}&rdquo;
                </p>
              </div>
            )}
            {household?.values?.length > 0 && (
              <div className="md:col-span-5" data-testid="dashboard-values-line">
                <div className="overline mb-2">Family Values</div>
                <div className="font-serif text-base md:text-lg leading-relaxed">
                  {household.values.join(" · ")}
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Primary grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's schedule */}
        <Panel
          testId="dashboard-schedule-panel"
          className="lg:col-span-7"
          label="Today · Schedule"
          action={<Link to="/schedule" className="text-xs text-muted-foreground hover:text-foreground" data-testid="dashboard-schedule-link">Open →</Link>}
        >
          {todays_events.length === 0 ? (
            <EmptyLine to="/schedule" testId="dashboard-empty-schedule">No events on the docket today.</EmptyLine>
          ) : (
            <ul className="divide-y divide-border">
              {todays_events.map((e) => (
                <li key={e.event_id} className="py-3 flex items-center gap-4" data-testid={`dashboard-event-${e.event_id}`}>
                  <span className="font-mono text-xs text-muted-foreground w-14">
                    {e.event_time || "—"}
                  </span>
                  <span className="flex-1 text-sm">{e.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.type.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {upcoming_events.length > 0 && (
            <>
              <div className="overline mt-6 mb-3">Upcoming · 7 days</div>
              <ul className="divide-y divide-border border-t border-border">
                {upcoming_events.slice(0, 5).map((e) => (
                  <li key={e.event_id} className="py-2 flex items-center gap-4 text-sm">
                    <span className="font-mono text-xs text-muted-foreground w-20">{e.event_date.slice(5)}</span>
                    <span className="flex-1">{e.title}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        {/* Weekly score */}
        <Panel testId="dashboard-score-panel" className="lg:col-span-5" label="Household Health" hint="Diagnostic across rule, prayer, tasks, and budget — last 7 days">
          <div className="font-serif text-7xl tracking-tighter leading-none mb-2">{weekly_score.total}</div>
          <div className="font-mono text-xs text-muted-foreground mb-6">/ 100 · reflective, not a trophy</div>
          <div className="space-y-3">
            <ScoreBar label="Rule of Life" pct={weekly_score.rule_pct} color="green" />
            <ScoreBar label="Prayer" pct={weekly_score.prayer_pct} color="violet" />
            <ScoreBar label="Tasks" pct={weekly_score.tasks_pct} color="white" />
            <ScoreBar label="Budget" pct={weekly_score.budget_pct} color="rose" />
          </div>
        </Panel>

        {/* Tasks due */}
        <Panel
          testId="dashboard-tasks-panel"
          className="lg:col-span-5"
          label="Household tasks"
          action={<Link to="/schedule" className="text-xs text-muted-foreground hover:text-foreground" data-testid="dashboard-tasks-link">Manage →</Link>}
        >
          {tasks.due_today.length === 0 && tasks.overdue.length === 0 ? (
            <EmptyLine>Nothing due today.</EmptyLine>
          ) : (
            <ul className="divide-y divide-border">
              {[...tasks.overdue, ...tasks.due_today].slice(0, 6).map((t) => (
                <li key={t.task_id} className="py-2.5 flex items-center gap-3 text-sm" data-testid={`dashboard-task-${t.task_id}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tasks.overdue.includes(t) ? "bg-liturgical-red" : "bg-liturgical-green"}`} />
                  <span className="flex-1">{t.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.due_date ? t.due_date.slice(5) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Budget */}
        <Panel
          testId="dashboard-budget-panel"
          className="lg:col-span-7"
          label="Budget · This month"
          action={<Link to="/budget" className="text-xs text-muted-foreground hover:text-foreground" data-testid="dashboard-budget-link">Open →</Link>}
        >
          <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
            <Stat label="Income" value={fmtMoney(budget.income)} />
            <Stat label="Spent" value={fmtMoney(budget.expense)} />
            <Stat label="Given" value={fmtMoney(budget.giving)} sub={`${budget.tithe_pct}% tithe`} />
          </div>
          {budget.over_categories?.length > 0 ? (
            <div className="mt-5">
              <div className="overline mb-2">⚠ Over budget</div>
              <ul className="divide-y divide-border border-t border-border">
                {budget.over_categories.map((c) => (
                  <li key={c.name} className="py-2 flex items-center gap-3 text-sm">
                    <span className="w-1 h-4 bg-liturgical-red" />
                    <span className="flex-1">{c.name}</span>
                    <span className="font-mono text-xs">{fmtMoney(c.spent)} / {fmtMoney(c.limit)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-5 text-xs text-muted-foreground">All categories within their monthly limits.</div>
          )}
        </Panel>

        {/* Prayer */}
        <Panel
          testId="dashboard-prayer-panel"
          className="lg:col-span-4"
          label="Family prayer"
          action={<Link to="/spiritual" className="text-xs text-muted-foreground hover:text-foreground" data-testid="dashboard-prayer-link">Open →</Link>}
        >
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-serif text-5xl tracking-tighter">{prayer.streak_days}</span>
            <span className="font-mono text-xs text-muted-foreground">day streak</span>
          </div>
          <div className="text-xs text-muted-foreground">{prayer.week_count} prayers logged · last 7 days</div>
        </Panel>

        {/* Date night */}
        <Panel
          testId="dashboard-date-night-panel"
          className="lg:col-span-4"
          label="Date night"
        >
          {date_night ? (
            <div>
              <div className="font-serif text-2xl mb-1">{date_night.title}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {date_night.event_date} {date_night.event_time ? `· ${date_night.event_time}` : ""}
              </div>
              {date_night.notes && <p className="mt-3 text-sm text-muted-foreground">{date_night.notes}</p>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No date night scheduled. <Link to="/schedule" className="underline" data-testid="dashboard-date-night-cta">Plan one →</Link>
            </div>
          )}
        </Panel>

        {/* Goals progress */}
        <Panel
          testId="dashboard-goals-panel"
          className="lg:col-span-4"
          label="Family goals"
          action={<Link to="/mission" className="text-xs text-muted-foreground hover:text-foreground" data-testid="dashboard-goals-link">Open →</Link>}
        >
          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-serif text-5xl tracking-tighter">{goals.avg_progress}%</span>
            <span className="font-mono text-xs text-muted-foreground">avg progress</span>
          </div>
          {goals.items.length > 0 ? (
            <ul className="space-y-2">
              {goals.items.map((g) => (
                <li key={g.goal_id} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="truncate pr-2">{g.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{g.progress}%</span>
                  </div>
                  <div className="h-px bg-border relative">
                    <div className="absolute left-0 top-0 h-px bg-foreground" style={{ width: `${g.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-muted-foreground">No active goals.</div>
          )}
        </Panel>

        {/* Active season — full width if present */}
        {active_challenge && (
          <Panel
            testId="dashboard-challenge-panel"
            className="lg:col-span-7"
            label="Active season"
          >
            <div className="flex items-start gap-4">
              <span className={`w-1 self-stretch min-h-[60px] ${liturgicalDot(active_challenge.color)}`} />
              <div className="flex-1">
                <div className={`overline mb-1 ${liturgicalText(active_challenge.color)}`}>
                  Day {active_challenge.current_day} of {active_challenge.days_total}
                </div>
                <h3 className="font-serif text-2xl mb-3">{active_challenge.title}</h3>
                <div className="h-px bg-border relative">
                  <div className={`absolute left-0 top-0 h-px ${liturgicalDot(active_challenge.color)}`} style={{ width: `${active_challenge.completion_pct}%` }} />
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Family Council CTA */}
        <Panel
          testId="dashboard-council-panel"
          className={active_challenge ? "lg:col-span-5" : "lg:col-span-12"}
          label="This week's council"
          action={<Link to="/council" className="text-xs text-muted-foreground hover:text-foreground" data-testid="dashboard-council-link">Open →</Link>}
        >
          <p className="font-serif text-lg leading-snug mb-2">
            Twenty quiet minutes, once a week.
          </p>
          <p className="text-sm text-muted-foreground">
            Patria has composed an agenda from the last seven days. Open it together when the
            household is gathered.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Snapshot({ value, label, suffix = "" }) {
  return (
    <div data-testid={`snapshot-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="font-serif text-3xl md:text-4xl tracking-tighter leading-none">{value}{suffix}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function ScoreBar({ label, pct, color = "green" }) {
  const c = `bg-liturgical-${color}`;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-px bg-border relative">
        <div className={`absolute left-0 top-0 h-px ${c}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="py-4 px-5">
      <div className="overline mb-1">{label}</div>
      <div className="font-serif text-2xl">{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{sub}</div>}
    </div>
  );
}

function EmptyLine({ children, to, testId }) {
  return (
    <div className="text-sm text-muted-foreground py-2" data-testid={testId}>
      {to ? <Link to={to} className="underline hover:text-foreground">{children}</Link> : children}
    </div>
  );
}
