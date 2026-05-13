import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import Panel from "@/components/Panel";

export default function MissionGoals() {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [goals, setGoals] = useState([]);

  // Edit fields
  const [mission, setMission] = useState("");
  const [valuesText, setValuesText] = useState("");
  const [techPolicy, setTechPolicy] = useState("");
  const [rolesDraft, setRolesDraft] = useState({});

  // Goal modal
  const [showGoal, setShowGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ title: "", description: "", scope: "short", deadline: "", progress: 0 });

  const refresh = async () => {
    try {
      const [hm, g] = await Promise.all([api.get("/household/me"), api.get("/goals")]);
      setHousehold(hm.data.household);
      setMembers(hm.data.members);
      setGoals(g.data.goals);
      if (hm.data.household) {
        setMission(hm.data.household.mission_statement || "");
        setValuesText((hm.data.household.values || []).join(", "));
        setTechPolicy(hm.data.household.technology_policy || "");
        setRolesDraft(hm.data.household.roles || {});
      }
    } catch (err) {
      toast.error(explainError(err, "Could not load mission & goals."));
    }
  };

  useEffect(() => { refresh(); }, []);

  const saveHousehold = async () => {
    try {
      await api.patch("/household", {
        mission_statement: mission,
        values: valuesText.split(",").map((s) => s.trim()).filter(Boolean),
        technology_policy: techPolicy,
        roles: rolesDraft,
      });
      toast.success("Mission saved.");
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not save the mission."));
    }
  };

  const addGoal = async () => {
    if (!goalDraft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    try {
      await api.post("/goals", {
        ...goalDraft,
        progress: parseInt(goalDraft.progress) || 0,
        deadline: goalDraft.deadline || null,
      });
      setShowGoal(false);
      setGoalDraft({ title: "", description: "", scope: "short", deadline: "", progress: 0 });
      toast.success("Goal added.");
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not add the goal."));
    }
  };

  const updateProgress = async (gid, progress) => {
    try {
      await api.patch(`/goals/${gid}`, { progress });
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not update progress."));
    }
  };

  const removeGoal = async (gid) => {
    if (!confirm("Remove this goal?")) return;
    try {
      await api.delete(`/goals/${gid}`);
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not remove the goal."));
    }
  };

  const shortGoals = goals.filter((g) => g.scope === "short");
  const longGoals = goals.filter((g) => g.scope === "long");

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12" data-testid="mission-page">
      <header className="border-b border-border pb-6 mb-10">
        <div className="overline mb-2">Mission & Goals</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">What this household is for.</h1>
      </header>

      {/* Mission statement */}
      <Panel testId="mission-statement-panel" className="mb-6" label="Family mission statement">
        <textarea
          rows={3}
          data-testid="mission-statement-input"
          placeholder="In one or two sentences: who we are, what we are for, and where we are going."
          className="w-full bg-transparent border-b border-border focus:border-foreground outline-none font-serif text-xl leading-snug py-2 resize-none"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
        />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel testId="mission-values-panel" label="Family values" hint="Comma-separated. These appear on the Dashboard.">
          <textarea
            rows={3}
            data-testid="mission-values-input"
            placeholder="Reverence, Hospitality, Diligence, Hilarity, Generosity"
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base resize-none"
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
          />
          {valuesText && (
            <div className="mt-4 flex flex-wrap gap-2">
              {valuesText.split(",").map((v) => v.trim()).filter(Boolean).map((v, i) => (
                <span key={i} className="text-xs border border-border px-2 py-0.5 font-mono uppercase tracking-wider">{v}</span>
              ))}
            </div>
          )}
        </Panel>

        <Panel testId="mission-tech-panel" label="Technology policy" hint="The house's standing rule on screens, devices, content.">
          <textarea
            rows={5}
            data-testid="mission-tech-input"
            placeholder="No phones at the table. No screens in bedrooms. Sabbath from sundown Saturday to Sunday Mass."
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm leading-relaxed resize-none"
            value={techPolicy}
            onChange={(e) => setTechPolicy(e.target.value)}
          />
        </Panel>
      </div>

      <Panel testId="mission-roles-panel" className="mt-6" label="Family roles">
        <div className="grid md:grid-cols-2 gap-3">
          {members.map((m) => (
            <div key={m.member_id} className="flex items-center gap-3 border-b border-border pb-2">
              <span className="font-serif text-sm w-32 truncate">{m.name}</span>
              <input
                data-testid={`mission-role-input-${m.member_id}`}
                placeholder="e.g., Provider · Homemaker · Lector"
                value={rolesDraft[m.member_id] || ""}
                onChange={(e) => setRolesDraft({ ...rolesDraft, [m.member_id]: e.target.value })}
                className="flex-1 bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-6 flex justify-end">
        <button onClick={saveHousehold} data-testid="mission-save-button" className="bg-primary text-primary-foreground px-5 py-2 text-sm">Save mission</button>
      </div>

      {/* Goals */}
      <div className="mt-12 grid lg:grid-cols-2 gap-6">
        <Panel
          testId="mission-short-goals-panel"
          label="Short-term goals · this season"
          action={<button onClick={() => { setGoalDraft({ ...goalDraft, scope: "short" }); setShowGoal(true); }} data-testid="mission-add-short-goal-button" className="text-xs text-muted-foreground hover:text-foreground">+ Add</button>}
        >
          <GoalList goals={shortGoals} onProgress={updateProgress} onRemove={removeGoal} testPrefix="mission-short" />
        </Panel>
        <Panel
          testId="mission-long-goals-panel"
          label="Long-term goals · this year & beyond"
          action={<button onClick={() => { setGoalDraft({ ...goalDraft, scope: "long" }); setShowGoal(true); }} data-testid="mission-add-long-goal-button" className="text-xs text-muted-foreground hover:text-foreground">+ Add</button>}
        >
          <GoalList goals={longGoals} onProgress={updateProgress} onRemove={removeGoal} testPrefix="mission-long" />
        </Panel>
      </div>

      {showGoal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="mission-goal-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <div className="overline mb-2">{goalDraft.scope === "short" ? "Short-term" : "Long-term"} goal</div>
            <h2 className="font-serif text-2xl mb-6">A goal to share.</h2>
            <input data-testid="mission-goal-title-input" autoFocus placeholder="Title" value={goalDraft.title} onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base mb-4" />
            <textarea data-testid="mission-goal-description-input" rows={3} placeholder="Why this goal matters." value={goalDraft.description} onChange={(e) => setGoalDraft({ ...goalDraft, description: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm mb-4 resize-none" />
            <div className="flex items-center gap-4 mb-4">
              <label className="overline">Deadline</label>
              <input data-testid="mission-goal-deadline-input" type="date" value={goalDraft.deadline} onChange={(e) => setGoalDraft({ ...goalDraft, deadline: e.target.value })} className="bg-transparent border-b border-border py-1 font-mono text-sm" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGoal(false)} className="text-sm text-muted-foreground" data-testid="mission-goal-cancel">Cancel</button>
              <button onClick={addGoal} data-testid="mission-goal-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Add goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalList({ goals, onProgress, onRemove, testPrefix }) {
  if (goals.length === 0) return <div className="text-sm text-muted-foreground">No goals yet.</div>;
  return (
    <ul className="space-y-5">
      {goals.map((g) => (
        <li key={g.goal_id} data-testid={`${testPrefix}-goal-${g.goal_id}`} className="border-b border-border pb-4 last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-serif text-lg leading-snug">{g.title}</div>
              {g.description && <div className="text-xs text-muted-foreground mt-1">{g.description}</div>}
              {g.deadline && <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">due {g.deadline}</div>}
            </div>
            <button onClick={() => onRemove(g.goal_id)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`${testPrefix}-goal-remove-${g.goal_id}`}>×</button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <input
              type="range"
              min="0"
              max="100"
              value={g.progress}
              data-testid={`${testPrefix}-goal-progress-${g.goal_id}`}
              onChange={(e) => onProgress(g.goal_id, parseInt(e.target.value))}
              className="flex-1 accent-foreground"
            />
            <span className="font-mono text-xs w-10 text-right">{g.progress}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
