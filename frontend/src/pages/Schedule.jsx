import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import Panel from "@/components/Panel";
import { initials, memberTileClass, formatCivilDate } from "@/lib/liturgical";

const EVENT_TYPES = ["family", "liturgical", "date_night", "school", "medical", "other"];
const TASK_CATEGORIES = ["general", "chore", "errand", "maintenance"];

// Map common axios/server failures into a single readable message for toasts.
function explainError(err, fallback = "Something went wrong.") {
  // Validation surfaced from FastAPI / our HTTPException
  const data = err?.response?.data;
  if (data?.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const m = data.detail[0];
      const field = Array.isArray(m?.loc) ? m.loc[m.loc.length - 1] : "field";
      return `${field}: ${m?.msg || "invalid value"}`;
    }
  }
  if (err?.response?.status === 401) return "Session expired. Please sign in again.";
  if (err?.response?.status === 403) return "You don't have access to this household.";
  if (err?.message === "Network Error") return "Network error — check your connection.";
  return fallback;
}

const EMPTY_EVENT = { title: "", event_date: "", event_time: "", type: "family", notes: "", member_ids: [] };
const EMPTY_TASK  = { title: "", due_date: "", assigned_member_id: "", category: "general" };
const EMPTY_RHYTHM = { name: "", cadence: "weekly", last_observed: "", notes: "" };

export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [rhythms, setRhythms] = useState([]);
  const [windowEnd, setWindowEnd] = useState("");
  const [windowStart, setWindowStart] = useState("");

  const [showEvent, setShowEvent] = useState(false);
  const [eventDraft, setEventDraft] = useState(EMPTY_EVENT);
  const [eventErrors, setEventErrors] = useState({});
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const [showTask, setShowTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState(EMPTY_TASK);
  const [taskErrors, setTaskErrors] = useState({});

  const [showRhythm, setShowRhythm] = useState(false);
  const [rhythmDraft, setRhythmDraft] = useState(EMPTY_RHYTHM);
  const [rhythmErrors, setRhythmErrors] = useState({});

  const refresh = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const inAMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setWindowStart(today);
    setWindowEnd(inAMonth);
    try {
      const [e, t, hm, ry] = await Promise.all([
        api.get(`/schedule/events?start=${today}&end=${inAMonth}`),
        api.get("/tasks"),
        api.get("/household/me"),
        api.get("/rhythms"),
      ]);
      setEvents(e.data.events || []);
      setTasks(t.data.tasks || []);
      setMembers(hm.data.members || []);
      setRhythms(ry.data.rhythms || []);
    } catch (err) {
      console.error("Schedule refresh failed", err);
      toast.error(explainError(err, "Could not load the schedule."));
    }
  };

  useEffect(() => { refresh(); }, []);

  const validateEvent = (d) => {
    const errs = {};
    if (!d.title?.trim()) errs.title = "Title is required.";
    if (!d.event_date) errs.event_date = "Pick a date.";
    if (d.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(d.event_date)) errs.event_date = "Date must be YYYY-MM-DD.";
    if (d.event_time && !/^\d{2}:\d{2}$/.test(d.event_time)) errs.event_time = "Time must be HH:MM.";
    if (!EVENT_TYPES.includes(d.type)) errs.type = "Pick a valid type.";
    return errs;
  };

  const addEvent = async () => {
    const errs = validateEvent(eventDraft);
    setEventErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    // Clean payload — omit empty strings for optional fields so the DB stays tidy.
    const payload = {
      title: eventDraft.title.trim(),
      event_date: eventDraft.event_date,
      event_time: eventDraft.event_time || null,
      type: eventDraft.type,
      notes: eventDraft.notes?.trim() || null,
      member_ids: Array.isArray(eventDraft.member_ids) ? eventDraft.member_ids : [],
    };
    setSubmittingEvent(true);
    try {
      await api.post("/schedule/events", payload);
      setShowEvent(false);
      setEventDraft(EMPTY_EVENT);
      setEventErrors({});
      // If the new event falls OUTSIDE the visible 30-day window, the refreshed
      // list won't include it — tell the user so they aren't confused.
      const outsideWindow = windowEnd && (payload.event_date > windowEnd || payload.event_date < windowStart);
      toast.success(outsideWindow
        ? `Event created (${payload.event_date}) — outside the next 30 days, so it isn't shown here.`
        : "Event created."
      );
      await refresh();
    } catch (err) {
      console.error("Event create failed", err);
      toast.error(explainError(err, "Could not create the event."));
    } finally {
      setSubmittingEvent(false);
    }
  };

  const removeEvent = async (id) => {
    try {
      await api.delete(`/schedule/events/${id}`);
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not remove the event."));
    }
  };

  const addTask = async () => {
    const errs = {};
    if (!taskDraft.title?.trim()) errs.title = "Title is required.";
    if (taskDraft.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(taskDraft.due_date)) errs.due_date = "Date must be YYYY-MM-DD.";
    setTaskErrors(errs);
    if (Object.keys(errs).length > 0) { toast.error(Object.values(errs)[0]); return; }
    try {
      await api.post("/tasks", {
        title: taskDraft.title.trim(),
        category: taskDraft.category,
        due_date: taskDraft.due_date || null,
        assigned_member_id: taskDraft.assigned_member_id || null,
      });
      setShowTask(false);
      setTaskDraft(EMPTY_TASK);
      setTaskErrors({});
      toast.success("Task added.");
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not add the task."));
    }
  };

  const toggleTask = async (t) => {
    try {
      await api.patch(`/tasks/${t.task_id}`, { completed: !t.completed });
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not update the task."));
    }
  };

  const removeTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not remove the task."));
    }
  };

  const addRhythm = async () => {
    const errs = {};
    if (!rhythmDraft.name?.trim()) errs.name = "Name is required.";
    if (rhythmDraft.last_observed && !/^\d{4}-\d{2}-\d{2}$/.test(rhythmDraft.last_observed)) errs.last_observed = "Date must be YYYY-MM-DD.";
    setRhythmErrors(errs);
    if (Object.keys(errs).length > 0) { toast.error(Object.values(errs)[0]); return; }
    try {
      await api.post("/rhythms", {
        name: rhythmDraft.name.trim(),
        cadence: rhythmDraft.cadence,
        last_observed: rhythmDraft.last_observed || null,
        notes: rhythmDraft.notes?.trim() || null,
      });
      setShowRhythm(false);
      setRhythmDraft(EMPTY_RHYTHM);
      setRhythmErrors({});
      toast.success("Rhythm added.");
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not add the rhythm."));
    }
  };

  const observeRhythm = async (rid) => {
    try {
      await api.post(`/rhythms/${rid}/observe`);
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not mark the rhythm."));
    }
  };

  const removeRhythm = async (rid) => {
    if (!confirm("Remove this rhythm?")) return;
    try {
      await api.delete(`/rhythms/${rid}`);
      await refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not remove the rhythm."));
    }
  };

  // Group events by date
  const grouped = events.reduce((acc, e) => {
    (acc[e.event_date] = acc[e.event_date] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12" data-testid="schedule-page">
      <header className="border-b border-border pb-6 mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="overline mb-2">Schedule</div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">The next thirty days.</h1>
          <p className="mt-2 text-sm text-muted-foreground italic max-w-xl">
            One-off events. Standing rhythms. Tasks. The household&rsquo;s execution layer — kept quiet.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEvent(true)} data-testid="schedule-add-event-button" className="bg-primary text-primary-foreground text-sm px-4 py-2">+ Event</button>
          <button onClick={() => setShowTask(true)} data-testid="schedule-add-task-button" className="border border-border text-sm px-4 py-2">+ Task</button>
          <button onClick={() => setShowRhythm(true)} data-testid="schedule-add-rhythm-button" className="border border-border text-sm px-4 py-2">+ Rhythm</button>
        </div>
      </header>

      {/* Rhythms */}
      <Panel testId="schedule-rhythms-panel" className="mb-6" label="Household rhythms" hint="Recurring commitments the family keeps — cyclical, seasonal, intentional. (Not one-off tasks.)">
        {rhythms.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No rhythms yet. Common ones: <em>weekly date night, monthly Confession, quarterly retreat, yearly pilgrimage.</em>
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
            {rhythms.map((r) => {
              const overdue = r.next_due && r.next_due < new Date().toISOString().slice(0, 10);
              return (
                <li key={r.rhythm_id} className="border-b border-border pb-3 group" data-testid={`schedule-rhythm-${r.rhythm_id}`}>
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground w-16 mt-1">{r.cadence}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-base">{r.name}</div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.notes}</div>}
                      <div className={`font-mono text-[10px] mt-1 ${overdue ? "text-liturgical-red" : "text-muted-foreground"}`}>
                        {r.last_observed ? `last · ${r.last_observed}` : "never observed"}
                        {r.next_due && ` · next · ${r.next_due}`}
                      </div>
                    </div>
                    <button onClick={() => observeRhythm(r.rhythm_id)} data-testid={`schedule-rhythm-observe-${r.rhythm_id}`} className="text-xs border border-border px-2 py-1 hover:bg-secondary">Mark</button>
                    <button onClick={() => removeRhythm(r.rhythm_id)} data-testid={`schedule-rhythm-remove-${r.rhythm_id}`} className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">×</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline */}
        <Panel testId="schedule-events-panel" className="lg:col-span-8" label="Events" hint="Time-bound appointments and gatherings.">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">Nothing on the docket. The road is clear.</div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([d, evts]) => {
                const dt = new Date(d + "T12:00:00");
                return (
                  <div key={d}>
                    <div className="overline mb-3">{formatCivilDate(dt)}</div>
                    <ul className="divide-y divide-border border-y border-border">
                      {evts.map((e) => (
                        <li key={e.event_id} className="py-3 flex items-center gap-4" data-testid={`schedule-event-${e.event_id}`}>
                          <span className="font-mono text-xs text-muted-foreground w-14">{e.event_time || "—"}</span>
                          <div className="flex-1">
                            <div className="text-sm">{e.title}</div>
                            {e.notes && <div className="text-xs text-muted-foreground mt-0.5">{e.notes}</div>}
                          </div>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{(e.type || "event").replace("_", " ")}</span>
                          <div className="flex items-center gap-1">
                            {(e.member_ids || []).map((mid) => {
                              const m = members.find((x) => x.member_id === mid);
                              if (!m) return null;
                              return <span key={mid} className={`w-5 h-5 flex items-center justify-center text-[8px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>;
                            })}
                          </div>
                          <button onClick={() => removeEvent(e.event_id)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`schedule-event-remove-${e.event_id}`}>×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Tasks */}
        <Panel testId="schedule-tasks-panel" className="lg:col-span-4" label="Tasks" hint="Things that need to be done — one-offs.">
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">No open tasks.</div>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => {
                const m = members.find((x) => x.member_id === t.assigned_member_id);
                const overdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <li key={t.task_id} className="py-3 flex items-center gap-3" data-testid={`schedule-task-${t.task_id}`}>
                    <button
                      onClick={() => toggleTask(t)}
                      data-testid={`schedule-task-toggle-${t.task_id}`}
                      className={`w-5 h-5 border ${t.completed ? "bg-foreground border-foreground" : "border-border"} flex items-center justify-center text-[10px] text-background`}
                    >
                      {t.completed ? "✓" : ""}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t.category}{t.due_date ? ` · ${overdue ? "OVERDUE " : ""}${t.due_date}` : ""}
                      </div>
                    </div>
                    {m && (
                      <span className={`w-5 h-5 flex items-center justify-center text-[8px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                    )}
                    <button onClick={() => removeTask(t.task_id)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`schedule-task-remove-${t.task_id}`}>×</button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {showEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="schedule-event-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <h2 className="font-serif text-2xl mb-6">New event</h2>
            <input autoFocus data-testid="schedule-event-title-input" placeholder="Title" value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base mb-1" />
            {eventErrors.title && <div className="text-xs text-liturgical-red mb-3" data-testid="schedule-event-title-error">{eventErrors.title}</div>}
            <div className="grid grid-cols-2 gap-4 mt-4 mb-1">
              <input type="date" data-testid="schedule-event-date-input" value={eventDraft.event_date} onChange={(e) => setEventDraft({ ...eventDraft, event_date: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
              <input type="time" data-testid="schedule-event-time-input" value={eventDraft.event_time} onChange={(e) => setEventDraft({ ...eventDraft, event_time: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
            </div>
            {(eventErrors.event_date || eventErrors.event_time) && (
              <div className="text-xs text-liturgical-red mb-3" data-testid="schedule-event-date-error">
                {eventErrors.event_date || eventErrors.event_time}
              </div>
            )}
            <div className="overline mt-4 mb-2">Type</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {EVENT_TYPES.map((t) => (
                <button key={t} type="button" data-testid={`schedule-event-type-${t}`} onClick={() => setEventDraft({ ...eventDraft, type: t })} className={`px-3 py-1.5 text-xs border ${eventDraft.type === t ? "border-foreground" : "border-border text-muted-foreground"}`}>{t.replace("_", " ")}</button>
              ))}
            </div>
            <textarea data-testid="schedule-event-notes-input" rows={2} placeholder="Notes" value={eventDraft.notes} onChange={(e) => setEventDraft({ ...eventDraft, notes: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm mb-4 resize-none" />
            <div className="overline mb-2">Members</div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const sel = eventDraft.member_ids.includes(m.member_id);
                return (
                  <button key={m.member_id} type="button" data-testid={`schedule-event-member-${m.member_id}`} onClick={() => setEventDraft({ ...eventDraft, member_ids: sel ? eventDraft.member_ids.filter((x) => x !== m.member_id) : [...eventDraft.member_ids, m.member_id] })} className={`flex items-center gap-2 px-2 py-1 text-xs border ${sel ? "border-foreground" : "border-border text-muted-foreground"}`}>
                    <span className={`w-4 h-4 flex items-center justify-center text-[8px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                    {m.name}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => { setShowEvent(false); setEventErrors({}); }} className="text-sm text-muted-foreground" data-testid="schedule-event-cancel">Cancel</button>
              <button type="button" onClick={addEvent} disabled={submittingEvent} data-testid="schedule-event-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
                {submittingEvent ? "Adding…" : "Add event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTask && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="schedule-task-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <h2 className="font-serif text-2xl mb-6">New task</h2>
            <input autoFocus data-testid="schedule-task-title-input" placeholder="Title" value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base mb-4" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="date" data-testid="schedule-task-due-input" value={taskDraft.due_date} onChange={(e) => setTaskDraft({ ...taskDraft, due_date: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
              <select data-testid="schedule-task-category-select" value={taskDraft.category} onChange={(e) => setTaskDraft({ ...taskDraft, category: e.target.value })} className="bg-transparent border border-border py-2 px-3 text-sm">
                {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="overline mb-2">Assign to</div>
            <select data-testid="schedule-task-assignee-select" value={taskDraft.assigned_member_id} onChange={(e) => setTaskDraft({ ...taskDraft, assigned_member_id: e.target.value })} className="w-full bg-transparent border border-border py-2 px-3 text-sm">
              <option value="">— anyone —</option>
              {members.map((m) => <option key={m.member_id} value={m.member_id}>{m.name}</option>)}
            </select>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowTask(false)} className="text-sm text-muted-foreground" data-testid="schedule-task-cancel">Cancel</button>
              <button onClick={addTask} data-testid="schedule-task-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Add task</button>
            </div>
          </div>
        </div>
      )}

      {showRhythm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="schedule-rhythm-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <h2 className="font-serif text-2xl mb-2">New rhythm</h2>
            <p className="text-xs text-muted-foreground mb-6">A recurring commitment the household keeps — not a one-off task.</p>
            <input autoFocus data-testid="schedule-rhythm-name-input" placeholder="e.g., Confession · Date night · Family retreat" value={rhythmDraft.name} onChange={(e) => setRhythmDraft({ ...rhythmDraft, name: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base mb-4" />
            <div className="overline mb-2">Cadence</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {["daily", "weekly", "monthly", "quarterly", "yearly"].map((c) => (
                <button key={c} data-testid={`schedule-rhythm-cadence-${c}`} onClick={() => setRhythmDraft({ ...rhythmDraft, cadence: c })} className={`px-3 py-1.5 text-xs border ${rhythmDraft.cadence === c ? "border-foreground" : "border-border text-muted-foreground"}`}>{c}</button>
              ))}
            </div>
            <div className="overline mb-2">Last observed (optional)</div>
            <input type="date" data-testid="schedule-rhythm-last-input" value={rhythmDraft.last_observed} onChange={(e) => setRhythmDraft({ ...rhythmDraft, last_observed: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono mb-4" />
            <textarea rows={2} data-testid="schedule-rhythm-notes-input" placeholder="Notes" value={rhythmDraft.notes} onChange={(e) => setRhythmDraft({ ...rhythmDraft, notes: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm resize-none" />
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowRhythm(false)} className="text-sm text-muted-foreground" data-testid="schedule-rhythm-cancel">Cancel</button>
              <button onClick={addRhythm} data-testid="schedule-rhythm-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Add rhythm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
