import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Panel from "@/components/Panel";
import { initials, memberTileClass, formatCivilDate } from "@/lib/liturgical";

const EVENT_TYPES = ["family", "liturgical", "date_night", "school", "medical", "other"];
const TASK_CATEGORIES = ["general", "chore", "errand", "maintenance"];

export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [rhythms, setRhythms] = useState([]);
  const [showEvent, setShowEvent] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: "", event_date: "", event_time: "", type: "family", notes: "", member_ids: [] });
  const [showTask, setShowTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState({ title: "", due_date: "", assigned_member_id: "", category: "general" });
  const [showRhythm, setShowRhythm] = useState(false);
  const [rhythmDraft, setRhythmDraft] = useState({ name: "", cadence: "weekly", last_observed: "", notes: "" });

  const refresh = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const inAMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [e, t, hm, ry] = await Promise.all([
      api.get(`/schedule/events?start=${today}&end=${inAMonth}`),
      api.get("/tasks"),
      api.get("/household/me"),
      api.get("/rhythms"),
    ]);
    setEvents(e.data.events);
    setTasks(t.data.tasks);
    setMembers(hm.data.members);
    setRhythms(ry.data.rhythms);
  };

  useEffect(() => { refresh(); }, []);

  const addEvent = async () => {
    if (!eventDraft.title.trim() || !eventDraft.event_date) return;
    await api.post("/schedule/events", eventDraft);
    setShowEvent(false);
    setEventDraft({ title: "", event_date: "", event_time: "", type: "family", notes: "", member_ids: [] });
    refresh();
  };

  const removeEvent = async (id) => {
    await api.delete(`/schedule/events/${id}`);
    refresh();
  };

  const addTask = async () => {
    if (!taskDraft.title.trim()) return;
    await api.post("/tasks", {
      ...taskDraft,
      due_date: taskDraft.due_date || null,
      assigned_member_id: taskDraft.assigned_member_id || null,
    });
    setShowTask(false);
    setTaskDraft({ title: "", due_date: "", assigned_member_id: "", category: "general" });
    refresh();
  };

  const toggleTask = async (t) => {
    await api.patch(`/tasks/${t.task_id}`, { completed: !t.completed });
    refresh();
  };

  const removeTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    refresh();
  };

  const addRhythm = async () => {
    if (!rhythmDraft.name.trim()) return;
    await api.post("/rhythms", {
      name: rhythmDraft.name,
      cadence: rhythmDraft.cadence,
      last_observed: rhythmDraft.last_observed || null,
      notes: rhythmDraft.notes || null,
    });
    setShowRhythm(false);
    setRhythmDraft({ name: "", cadence: "weekly", last_observed: "", notes: "" });
    refresh();
  };

  const observeRhythm = async (rid) => {
    await api.post(`/rhythms/${rid}/observe`);
    refresh();
  };

  const removeRhythm = async (rid) => {
    if (!confirm("Remove this rhythm?")) return;
    await api.delete(`/rhythms/${rid}`);
    refresh();
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
      <Panel testId="schedule-rhythms-panel" className="mb-6" label="Household rhythms" hint="Recurring commitments the family keeps — cyclical, seasonal, intentional. Not a to-do list.">
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
        <Panel testId="schedule-events-panel" className="lg:col-span-8" label="Events">
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
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{e.type.replace("_", " ")}</span>
                          <div className="flex items-center gap-1">
                            {e.member_ids?.map((mid) => {
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
        <Panel testId="schedule-tasks-panel" className="lg:col-span-4" label="Tasks">
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
            <input autoFocus data-testid="schedule-event-title-input" placeholder="Title" value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base mb-4" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="date" data-testid="schedule-event-date-input" value={eventDraft.event_date} onChange={(e) => setEventDraft({ ...eventDraft, event_date: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
              <input type="time" data-testid="schedule-event-time-input" value={eventDraft.event_time} onChange={(e) => setEventDraft({ ...eventDraft, event_time: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
            </div>
            <div className="overline mb-2">Type</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {EVENT_TYPES.map((t) => (
                <button key={t} data-testid={`schedule-event-type-${t}`} onClick={() => setEventDraft({ ...eventDraft, type: t })} className={`px-3 py-1.5 text-xs border ${eventDraft.type === t ? "border-foreground" : "border-border text-muted-foreground"}`}>{t.replace("_", " ")}</button>
              ))}
            </div>
            <textarea data-testid="schedule-event-notes-input" rows={2} placeholder="Notes" value={eventDraft.notes} onChange={(e) => setEventDraft({ ...eventDraft, notes: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm mb-4 resize-none" />
            <div className="overline mb-2">Members</div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const sel = eventDraft.member_ids.includes(m.member_id);
                return (
                  <button key={m.member_id} data-testid={`schedule-event-member-${m.member_id}`} onClick={() => setEventDraft({ ...eventDraft, member_ids: sel ? eventDraft.member_ids.filter((x) => x !== m.member_id) : [...eventDraft.member_ids, m.member_id] })} className={`flex items-center gap-2 px-2 py-1 text-xs border ${sel ? "border-foreground" : "border-border text-muted-foreground"}`}>
                    <span className={`w-4 h-4 flex items-center justify-center text-[8px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                    {m.name}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowEvent(false)} className="text-sm text-muted-foreground" data-testid="schedule-event-cancel">Cancel</button>
              <button onClick={addEvent} data-testid="schedule-event-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Add event</button>
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
