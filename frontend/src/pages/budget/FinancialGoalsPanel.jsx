import { useState } from "react";
import Panel from "@/components/Panel";

const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const GOAL_TYPES = [
  { key: "savings", label: "Savings" },
  { key: "debt_payoff", label: "Debt Payoff" },
  { key: "giving", label: "Giving" },
  { key: "other", label: "Other" },
];
const GOAL_COLORS = ["green", "violet", "white", "red", "rose", "slate"];

function fmtTargetDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch { return iso; }
}

export default function FinancialGoalsPanel({ goals, onChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    name: "", goal_type: "savings", target_amount: "", current_amount: "0",
    target_date: "", monthly_contribution: "", color: "green",
  });

  const addGoal = async () => {
    if (!draft.name.trim() || !draft.target_amount) return;
    await onChange("create", {
      name: draft.name,
      goal_type: draft.goal_type,
      target_amount: parseFloat(draft.target_amount),
      current_amount: parseFloat(draft.current_amount) || 0,
      target_date: draft.target_date || null,
      monthly_contribution: draft.monthly_contribution ? parseFloat(draft.monthly_contribution) : null,
      color: draft.color,
    });
    setDraft({ name: "", goal_type: "savings", target_amount: "", current_amount: "0", target_date: "", monthly_contribution: "", color: "green" });
    setAdding(false);
  };

  const updateCurrent = async (g, value) => {
    const v = parseFloat(value) || 0;
    if (g.legacy) {
      // Legacy savings_goal — keep updating in place via legacy endpoint
      await onChange("update_legacy", { goal_id: g.goal_id, current_amount: v });
    } else {
      await onChange("update", { goal_id: g.goal_id, current_amount: v });
    }
  };

  const removeGoal = async (g) => {
    if (!confirm("Remove this financial goal?")) return;
    if (g.legacy) {
      await onChange("delete_legacy", { goal_id: g.goal_id });
    } else {
      await onChange("delete", { goal_id: g.goal_id });
    }
  };

  return (
    <Panel
      testId="budget-financial-goals-panel"
      label="Financial Goals"
      action={
        <button
          onClick={() => setAdding((a) => !a)}
          data-testid="budget-fgoal-add-button"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {adding ? "Cancel" : "+ Add goal"}
        </button>
      }
    >
      {goals.length === 0 && !adding && (
        <div className="text-sm text-muted-foreground py-2">
          No financial goals yet. Track an emergency fund, a debt payoff plan, or a savings target the family is working toward.
        </div>
      )}

      <ul className="space-y-5">
        {goals.map((g) => {
          const target = g.target_amount || 0;
          const current = g.current_amount || 0;
          const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);
          const remaining = Math.max(0, target - current);
          const typeLabel = GOAL_TYPES.find((t) => t.key === g.goal_type)?.label || "Goal";
          const isDebt = g.goal_type === "debt_payoff";
          return (
            <li key={g.goal_id} data-testid={`budget-fgoal-${g.goal_id}`}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="font-serif text-base">{g.name}</div>
                <span className="font-mono text-xs text-muted-foreground">{typeLabel} · {pct}%</span>
              </div>
              <div className="text-sm text-muted-foreground mb-2" data-testid={`budget-fgoal-progress-${g.goal_id}`}>
                {isDebt ? (
                  <>
                    {fmtMoney(remaining)} remaining of {fmtMoney(target)} original balance
                  </>
                ) : (
                  <>
                    {fmtMoney(current)} of {fmtMoney(target)} saved · {fmtMoney(remaining)} remaining
                  </>
                )}
                {g.target_date && <span className="ml-1.5">· Target: {fmtTargetDate(g.target_date)}</span>}
                {g.monthly_contribution && <span className="ml-1.5">· {fmtMoney(g.monthly_contribution)}/mo</span>}
              </div>
              <div className="h-px bg-border relative mb-2">
                <div className={`absolute left-0 top-0 h-px bg-liturgical-${g.color || "green"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isDebt ? "Paid down" : "Current"}
                </span>
                <input
                  type="number"
                  defaultValue={current}
                  data-testid={`budget-fgoal-current-${g.goal_id}`}
                  onBlur={(e) => updateCurrent(g, e.target.value)}
                  className="w-28 bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
                />
                {g.legacy && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground opacity-70" title="From the legacy savings_goals collection — still editable.">
                    · legacy
                  </span>
                )}
                <button
                  onClick={() => removeGoal(g)}
                  data-testid={`budget-fgoal-remove-${g.goal_id}`}
                  className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                >Remove</button>
              </div>
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className="mt-5 border-t border-border pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1 md:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Goal name</div>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                data-testid="budget-fgoal-new-name"
                placeholder="e.g., Emergency Fund"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm"
              />
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Type</div>
              <select
                value={draft.goal_type}
                onChange={(e) => setDraft({ ...draft, goal_type: e.target.value })}
                data-testid="budget-fgoal-new-type"
                className="w-full bg-transparent border border-border py-1.5 px-2 text-sm"
              >
                {GOAL_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {draft.goal_type === "debt_payoff" ? "Original balance (USD)" : "Target (USD)"}
              </div>
              <input
                type="number"
                value={draft.target_amount}
                onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })}
                data-testid="budget-fgoal-new-target"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {draft.goal_type === "debt_payoff" ? "Paid down so far (USD)" : "Current (USD)"}
              </div>
              <input
                type="number"
                value={draft.current_amount}
                onChange={(e) => setDraft({ ...draft, current_amount: e.target.value })}
                data-testid="budget-fgoal-new-current"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Target date (optional)</div>
              <input
                type="date"
                value={draft.target_date}
                onChange={(e) => setDraft({ ...draft, target_date: e.target.value })}
                data-testid="budget-fgoal-new-date"
                className="bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Monthly contribution (optional)</div>
              <input
                type="number"
                value={draft.monthly_contribution}
                onChange={(e) => setDraft({ ...draft, monthly_contribution: e.target.value })}
                data-testid="budget-fgoal-new-monthly"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Color</div>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft({ ...draft, color: c })}
                  data-testid={`budget-fgoal-new-color-${c}`}
                  className={`w-6 h-6 bg-liturgical-${c} ${draft.color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70"}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAdding(false)} className="text-sm text-muted-foreground" data-testid="budget-fgoal-new-cancel">Cancel</button>
            <button onClick={addGoal} className="bg-primary text-primary-foreground text-sm px-4 py-2" data-testid="budget-fgoal-new-submit">Set goal</button>
          </div>
        </div>
      )}
    </Panel>
  );
}
