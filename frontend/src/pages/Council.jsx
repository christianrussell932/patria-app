import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import Panel from "@/components/Panel";
import { CrestDivider } from "@/components/Crest";
import { initials, memberTileClass, formatCivilDate, liturgicalDot, liturgicalText } from "@/lib/liturgical";

export default function Council() {
  const [agenda, setAgenda] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [meeting, setMeeting] = useState(null);
  const [members, setMembers] = useState([]);
  const [creating, setCreating] = useState(false);

  // Local editable buffers
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [priorities, setPriorities] = useState([]);
  const [priorityDraft, setPriorityDraft] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [assignmentDraft, setAssignmentDraft] = useState({ title: "", member_id: "", due_date: "" });

  const refresh = async () => {
    try {
      const [a, ms, hm] = await Promise.all([
        api.get("/council/agenda"),
        api.get("/council/meetings"),
        api.get("/household/me"),
      ]);
      setAgenda(a.data);
      setMeetings(ms.data.meetings);
      setMembers(hm.data.members);

      // If there's a draft meeting for current week, open it
      const draft = ms.data.meetings.find((m) => m.status === "draft" && m.week_start === a.data.week_start);
      if (draft) loadMeeting(draft);
      else setMeeting(null);
    } catch (err) {
      toast.error(explainError(err, "Could not load the council agenda."));
    }
  };

  const loadMeeting = (m) => {
    setMeeting(m);
    setNotes(m.notes || "");
    setDecisions(m.decisions || "");
    setPriorities(m.priorities || []);
    setAssignments(m.assignments || []);
  };

  useEffect(() => { refresh(); }, []);

  const startMeeting = async () => {
    setCreating(true);
    try {
      const r = await api.post("/council/meeting", {});
      const m = await api.get(`/council/meeting/${r.data.meeting_id}`);
      loadMeeting(m.data);
      const ms = await api.get("/council/meetings");
      setMeetings(ms.data.meetings);
    } catch (err) {
      toast.error(explainError(err, "Could not start the meeting."));
    } finally {
      setCreating(false);
    }
  };

  const save = async (patch) => {
    if (!meeting) return;
    try {
      await api.patch(`/council/meeting/${meeting.meeting_id}`, patch);
    } catch (err) {
      toast.error(explainError(err, "Could not save the meeting."));
    }
  };

  const addPriority = () => {
    if (!priorityDraft.trim()) return;
    const next = [...priorities, priorityDraft.trim()];
    setPriorities(next);
    setPriorityDraft("");
    save({ priorities: next });
  };
  const removePriority = (i) => {
    const next = priorities.filter((_, idx) => idx !== i);
    setPriorities(next);
    save({ priorities: next });
  };

  const addAssignment = () => {
    if (!assignmentDraft.title.trim()) return;
    const next = [...assignments, { ...assignmentDraft, due_date: assignmentDraft.due_date || null, member_id: assignmentDraft.member_id || null }];
    setAssignments(next);
    setAssignmentDraft({ title: "", member_id: "", due_date: "" });
    save({ assignments: next });
  };
  const removeAssignment = (i) => {
    const next = assignments.filter((_, idx) => idx !== i);
    setAssignments(next);
    save({ assignments: next });
  };

  const finalize = async () => {
    if (!meeting) return;
    if (!confirm("Finalize this council meeting? Assignments will become household tasks.")) return;
    try {
      await api.post(`/council/meeting/${meeting.meeting_id}/finalize`);
      toast.success("Meeting finalized.");
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not finalize the meeting."));
    }
  };

  if (!agenda) return <div className="p-10 text-muted-foreground">Preparing the agenda…</div>;

  const weekStart = new Date(agenda.week_start + "T12:00:00");
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-12 print:py-6" data-testid="council-page">
      <header className="border-b border-border pb-6 mb-10 print:hidden">
        <div className="overline mb-2">Family Council</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">A standing meeting of the household.</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
          Twenty quiet minutes once a week to look back, look forward, and align as a family.
          The agenda is composed from the past week of your operating system; decisions and
          assignments flow back into it.
        </p>
      </header>

      {/* Print header (only visible when printing) */}
      <header className="hidden print:block mb-6">
        <div className="font-serif text-3xl">Family Council · {formatCivilDate(weekStart)}</div>
        <div className="text-sm text-muted-foreground">Week of {weekStart.toLocaleDateString()} — {weekEnd.toLocaleDateString()}</div>
      </header>

      {/* Top bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 print:hidden">
        <div>
          <div className="overline mb-1">Week of</div>
          <div className="font-serif text-2xl">
            {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div className="flex gap-2">
          {meeting ? (
            <>
              <button onClick={() => window.print()} data-testid="council-print-button" className="border border-border text-sm px-4 py-2 hover:bg-secondary">Print one-page summary</button>
              {meeting.status === "draft" && (
                <button onClick={finalize} data-testid="council-finalize-button" className="bg-primary text-primary-foreground text-sm px-4 py-2">Finalize meeting →</button>
              )}
            </>
          ) : (
            <button disabled={creating} onClick={startMeeting} data-testid="council-start-meeting-button" className="bg-primary text-primary-foreground text-sm px-5 py-2 disabled:opacity-50">
              {creating ? "Preparing…" : "Begin this week's meeting →"}
            </button>
          )}
        </div>
      </div>

      {/* Agenda — last week / look ahead */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        <Panel testId="council-review-panel" className="lg:col-span-7" label="Last week in review">
          <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
            <ReviewStat label="Prayers logged" value={agenda.last_week.prayer_count} />
            <ReviewStat label="Rule check-ins" value={agenda.last_week.rule_checkins} />
            <ReviewStat label="Tasks completed" value={agenda.last_week.tasks_completed} />
          </div>

          {agenda.tasks.overdue.length > 0 && (
            <div className="mt-6">
              <div className="overline mb-2">Overdue · {agenda.tasks.overdue.length}</div>
              <ul className="divide-y divide-border border-y border-border">
                {agenda.tasks.overdue.slice(0, 6).map((t) => (
                  <li key={t.task_id} className="py-2 flex items-center gap-3 text-sm" data-testid={`council-overdue-${t.task_id}`}>
                    <span className="w-1 h-4 bg-liturgical-red" />
                    <span className="flex-1">{t.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{t.due_date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {agenda.budget_overages.length > 0 && (
            <div className="mt-6">
              <div className="overline mb-2">Over budget this month</div>
              <ul className="divide-y divide-border border-y border-border">
                {agenda.budget_overages.map((c) => (
                  <li key={c.name} className="py-2 flex items-center gap-3 text-sm">
                    <span className="w-1 h-4 bg-liturgical-red" />
                    <span className="flex-1">{c.name}</span>
                    <span className="font-mono text-xs">${Math.round(c.spent)} / ${Math.round(c.limit)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel testId="council-ahead-panel" className="lg:col-span-5" label="Looking ahead · next 14 days">
          {agenda.upcoming_events.length === 0 ? (
            <div className="text-sm text-muted-foreground">No events on the calendar.</div>
          ) : (
            <ul className="divide-y divide-border border-y border-border mb-5">
              {agenda.upcoming_events.slice(0, 6).map((e) => (
                <li key={e.event_id} className="py-2 flex items-center gap-3 text-sm" data-testid={`council-upcoming-${e.event_id}`}>
                  <span className="font-mono text-xs text-muted-foreground w-16">{e.event_date.slice(5)}</span>
                  <span className="flex-1">{e.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{e.type?.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}

          {agenda.liturgical_reminders.length > 0 && (
            <>
              <div className="overline mb-2">Liturgical reminders</div>
              <ul className="space-y-2">
                {agenda.liturgical_reminders.map((l) => (
                  <li key={l.date + l.name} className="flex items-center gap-3 text-sm">
                    <span className={`w-1 h-4 ${liturgicalDot(l.color)}`} />
                    <span className="flex-1">{l.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{l.date.slice(5)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel testId="council-goals-panel" className="lg:col-span-12" label="Goals in flight">
          {agenda.goals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active family goals.</div>
          ) : (
            <ul className="grid md:grid-cols-2 gap-x-10 gap-y-3">
              {agenda.goals.map((g) => (
                <li key={g.goal_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{g.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{g.progress}%</span>
                  </div>
                  <div className="h-px bg-border relative">
                    <div className="absolute left-0 top-0 h-px bg-foreground" style={{ width: `${g.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {meeting ? (
        <>
          <CrestDivider />

          {/* Working session */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel testId="council-priorities-panel" className="lg:col-span-6" label="Weekly priorities" hint="What this household will choose to actually do this week.">
              <ol className="space-y-2 mb-3">
                {priorities.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-border pb-2" data-testid={`council-priority-${i}`}>
                    <span className="font-mono text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <span className="flex-1 text-sm">{p}</span>
                    <button onClick={() => removePriority(i)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`council-priority-remove-${i}`}>×</button>
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <input
                  data-testid="council-priority-input"
                  placeholder="Add a priority"
                  value={priorityDraft}
                  onChange={(e) => setPriorityDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPriority()}
                  className="flex-1 bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm"
                />
                <button onClick={addPriority} data-testid="council-priority-add-button" className="text-sm border border-border px-3 py-1.5 hover:bg-secondary">Add</button>
              </div>
            </Panel>

            <Panel testId="council-assignments-panel" className="lg:col-span-6" label="Assignments" hint="Concrete asks. Become tasks on finalize.">
              <ul className="space-y-2 mb-4">
                {assignments.map((a, i) => {
                  const m = members.find((x) => x.member_id === a.member_id);
                  return (
                    <li key={i} className="flex items-center gap-3 border-b border-border pb-2" data-testid={`council-assignment-${i}`}>
                      {m ? (
                        <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                      ) : (
                        <span className="w-6 h-6 border border-dashed border-border" />
                      )}
                      <span className="flex-1 text-sm">{a.title}</span>
                      {a.due_date && <span className="font-mono text-xs text-muted-foreground">{a.due_date}</span>}
                      <button onClick={() => removeAssignment(i)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`council-assignment-remove-${i}`}>×</button>
                    </li>
                  );
                })}
              </ul>
              <div className="grid grid-cols-12 gap-2">
                <input
                  data-testid="council-assignment-title-input"
                  placeholder="What needs doing"
                  value={assignmentDraft.title}
                  onChange={(e) => setAssignmentDraft({ ...assignmentDraft, title: e.target.value })}
                  className="col-span-12 md:col-span-6 bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm"
                />
                <select
                  data-testid="council-assignment-member-select"
                  value={assignmentDraft.member_id}
                  onChange={(e) => setAssignmentDraft({ ...assignmentDraft, member_id: e.target.value })}
                  className="col-span-6 md:col-span-3 bg-transparent border border-border py-2 px-2 text-sm"
                >
                  <option value="">— anyone —</option>
                  {members.map((m) => <option key={m.member_id} value={m.member_id}>{m.name}</option>)}
                </select>
                <input
                  type="date"
                  data-testid="council-assignment-due-input"
                  value={assignmentDraft.due_date}
                  onChange={(e) => setAssignmentDraft({ ...assignmentDraft, due_date: e.target.value })}
                  className="col-span-4 md:col-span-2 bg-transparent border border-border py-2 px-2 text-sm font-mono"
                />
                <button onClick={addAssignment} data-testid="council-assignment-add-button" className="col-span-2 md:col-span-1 bg-primary text-primary-foreground text-sm">Add</button>
              </div>
            </Panel>

            <Panel testId="council-notes-panel" className="lg:col-span-7" label="Notes & conversation">
              <textarea
                rows={6}
                data-testid="council-notes-input"
                placeholder="What was discussed. How everyone is doing. What needs prayer."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => save({ notes })}
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm leading-relaxed resize-none"
              />
            </Panel>

            <Panel testId="council-decisions-panel" className="lg:col-span-5" label="Decisions" hint="Resolved here. Not revisited until next council.">
              <textarea
                rows={6}
                data-testid="council-decisions-input"
                placeholder='e.g., "Cancel Netflix. Move bedtime to 9pm. Confession on Saturday."'
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                onBlur={() => save({ decisions })}
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm leading-relaxed resize-none"
              />
            </Panel>
          </div>
        </>
      ) : (
        <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground" data-testid="council-empty-state">
          The agenda for this week is composed.
          <div className="mt-3">
            <button onClick={startMeeting} disabled={creating} data-testid="council-empty-begin-button" className="bg-primary text-primary-foreground px-5 py-2 text-sm">
              Begin the meeting →
            </button>
          </div>
        </div>
      )}

      {/* Past meetings */}
      {meetings.filter((m) => m.status !== "draft").length > 0 && (
        <>
          <CrestDivider className="print:hidden" />
          <section className="print:hidden">
            <div className="overline mb-4">Past meetings</div>
            <ul className="divide-y divide-border border-y border-border">
              {meetings.filter((m) => m.status !== "draft").map((m) => (
                <li key={m.meeting_id} className="py-3 flex items-center gap-4 text-sm" data-testid={`council-past-${m.meeting_id}`}>
                  <span className="font-mono text-xs w-24 text-muted-foreground">{m.week_start}</span>
                  <span className="flex-1">
                    {m.priorities?.length ? m.priorities.slice(0, 2).join(" · ") : <span className="italic text-muted-foreground">no priorities recorded</span>}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{(m.assignments || []).length} asgn</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function ReviewStat({ label, value }) {
  return (
    <div className="py-4 px-5">
      <div className="font-serif text-3xl tracking-tighter">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
