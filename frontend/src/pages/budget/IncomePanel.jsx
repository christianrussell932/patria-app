import { useState } from "react";
import Panel from "@/components/Panel";

const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const SOURCE_TYPES = [
  { key: "paycheck", label: "Paycheck", defaultRecurring: true },
  { key: "spouse_paycheck", label: "Spouse Paycheck", defaultRecurring: true },
  { key: "gift", label: "Gift", defaultRecurring: false },
  { key: "tax_refund", label: "Tax Refund", defaultRecurring: false },
  { key: "miscellaneous", label: "Miscellaneous", defaultRecurring: false },
  { key: "custom", label: "Custom", defaultRecurring: false },
];

const typeLabel = (k) => SOURCE_TYPES.find((s) => s.key === k)?.label || "Income";

export default function IncomePanel({ data, monthName, onChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", source_type: "paycheck", expected_amount: "", received_amount: "0", recurring: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const sources = data?.sources || [];
  const expected = data?.expected_total || 0;
  const received = data?.received_total || 0;

  const addSource = async () => {
    if (!draft.name.trim()) {
      setError("Source name is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    const ok = await onChange("create", {
      name: draft.name.trim(),
      source_type: draft.source_type,
      expected_amount: parseFloat(draft.expected_amount) || 0,
      received_amount: parseFloat(draft.received_amount) || 0,
      recurring: draft.recurring,
    });
    setSubmitting(false);
    if (ok) {
      // Only reset and close the form on success — preserves user input on failure
      // so they can retry without re-typing.
      setDraft({ name: "", source_type: "paycheck", expected_amount: "", received_amount: "0", recurring: true });
      setAdding(false);
    } else {
      setError("Save failed. Check the toast for details and try again.");
    }
  };

  const updateField = async (source_id, field, value) => {
    const parsed = field === "received_amount" || field === "expected_amount"
      ? (parseFloat(value) || 0)
      : value;
    await onChange("update", { source_id, [field]: parsed });
  };

  const removeSource = async (source_id) => {
    if (!confirm("Remove this income source?")) return;
    await onChange("delete", { source_id });
  };

  return (
    <Panel
      testId="budget-income-panel"
      label={`Monthly Income · ${monthName}`}
      action={
        <button
          onClick={() => setAdding((a) => !a)}
          data-testid="budget-income-add-button"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {adding ? "Cancel" : "+ Add income source"}
        </button>
      }
    >
      {sources.length === 0 && !adding && (
        <div className="text-sm text-muted-foreground py-3">
          No income recorded for {monthName}.{" "}
          <button onClick={() => setAdding(true)} className="underline" data-testid="budget-income-empty-add">
            Add the first source →
          </button>
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-2">
          <div className="hidden md:grid md:grid-cols-12 gap-3 px-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Source</div>
            <div className="col-span-3 text-right">Expected</div>
            <div className="col-span-3 text-right">Received</div>
            <div className="col-span-1" />
          </div>
          <ul className="divide-y divide-border">
            {sources.map((s) => {
              const pending = (s.received_amount || 0) < (s.expected_amount || 0) - 0.001;
              return (
                <li
                  key={s.source_id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 py-3 items-baseline"
                  data-testid={`budget-income-${s.source_id}`}
                >
                  <div className="col-span-5 min-w-0">
                    <div className="text-sm truncate">{s.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {typeLabel(s.source_type)}
                      {s.recurring && <span className="ml-1.5">· recurring</span>}
                      {s.carried_from && <span className="ml-1.5 opacity-70">· carried from {s.carried_from}</span>}
                    </div>
                  </div>
                  <div className="col-span-3 md:text-right">
                    <input
                      type="number"
                      defaultValue={s.expected_amount}
                      data-testid={`budget-income-expected-${s.source_id}`}
                      onBlur={(e) => updateField(s.source_id, "expected_amount", e.target.value)}
                      className="w-24 md:ml-auto bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono md:text-right"
                    />
                  </div>
                  <div className="col-span-3 md:text-right">
                    <input
                      type="number"
                      defaultValue={s.received_amount}
                      data-testid={`budget-income-received-${s.source_id}`}
                      onBlur={(e) => updateField(s.source_id, "received_amount", e.target.value)}
                      className={`w-24 md:ml-auto bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono md:text-right ${pending ? "text-muted-foreground italic" : ""}`}
                    />
                  </div>
                  <div className="col-span-1 md:text-right">
                    <button
                      onClick={() => removeSource(s.source_id)}
                      data-testid={`budget-income-remove-${s.source_id}`}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      title="Remove"
                    >×</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-12 gap-3 pt-3 mt-2 border-t border-border text-sm">
            <div className="col-span-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Totals</div>
            <div className="col-span-3 text-right font-mono">{fmtMoney(expected)}</div>
            <div className="col-span-3 text-right font-mono">
              <span className={received < expected ? "text-muted-foreground" : ""}>{fmtMoney(received)}</span>
            </div>
            <div className="col-span-1" />
          </div>
        </div>
      )}

      {adding && (
        <div className="mt-4 border-t border-border pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source name</div>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                data-testid="budget-income-new-name"
                placeholder="e.g., Paycheck"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm"
              />
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Type</div>
              <select
                value={draft.source_type}
                onChange={(e) => {
                  const t = SOURCE_TYPES.find((x) => x.key === e.target.value);
                  setDraft({ ...draft, source_type: e.target.value, recurring: t?.defaultRecurring ?? false });
                }}
                data-testid="budget-income-new-type"
                className="w-full bg-transparent border border-border py-1.5 px-2 text-sm"
              >
                {SOURCE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Expected (USD)</div>
              <input
                type="number"
                value={draft.expected_amount}
                onChange={(e) => setDraft({ ...draft, expected_amount: e.target.value })}
                data-testid="budget-income-new-expected"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Received (USD)</div>
              <input
                type="number"
                value={draft.received_amount}
                onChange={(e) => setDraft({ ...draft, received_amount: e.target.value })}
                data-testid="budget-income-new-received"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.recurring}
              onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })}
              data-testid="budget-income-new-recurring"
            />
            <span>Recurring — auto-carry expected amount to future months</span>
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { if (!submitting) { setAdding(false); setError(""); } }} className="text-sm text-muted-foreground" data-testid="budget-income-new-cancel">Cancel</button>
            <button type="button" onClick={addSource} disabled={submitting} className="bg-primary text-primary-foreground text-sm px-4 py-2 disabled:opacity-50" data-testid="budget-income-new-submit">
              {submitting ? "Adding…" : "Add"}
            </button>
          </div>
          {error && (
            <div className="text-xs text-liturgical-red" data-testid="budget-income-new-error">
              {error}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
