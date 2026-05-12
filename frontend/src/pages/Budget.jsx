import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Panel from "@/components/Panel";
import IncomePanel from "@/pages/budget/IncomePanel";
import FinancialGoalsPanel from "@/pages/budget/FinancialGoalsPanel";
import CategoryGroupsPanel from "@/pages/budget/CategoryGroupsPanel";

const COLORS = ["green", "violet", "white", "red", "rose", "slate"];
const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const CATEGORY_GROUPS = [
  { key: "giving",         label: "Giving" },
  { key: "housing",        label: "Housing & Utilities" },
  { key: "food",           label: "Food & Household" },
  { key: "transportation", label: "Transportation" },
  { key: "insurance",      label: "Insurance & Health" },
  { key: "debt",           label: "Debt & Obligations" },
  { key: "savings",        label: "Savings & Goals" },
  { key: "other",          label: "Custom" },
];

const PRINCIPLES = [
  { ref: "Mt 6:21", text: "“Where your treasure is, there will your heart be also.”" },
  { ref: "1 Cor 4:2", text: "“It is required of stewards that they be found trustworthy.”" },
  { ref: "Sir 35:10", text: "“Give to the Most High as he has given to you.”" },
  { ref: "Lk 12:48", text: "“To whom much is given, much will be required.”" },
];

export default function Budget() {
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [income, setIncome] = useState({ sources: [], expected_total: 0, received_total: 0 });
  const [fgoals, setFgoals] = useState([]);
  const [txns, setTxns] = useState([]);

  const [showCat, setShowCat] = useState(false);
  const [catDraft, setCatDraft] = useState({ name: "", monthly_limit: "", color: "green", kind: "expense", group: "other" });
  const [showTxn, setShowTxn] = useState(false);
  const [txnDraft, setTxnDraft] = useState({ amount: "", type: "expense", category_id: "", note: "" });

  const refresh = async () => {
    const [s, inc, fg, t] = await Promise.all([
      api.get(`/budget/summary?year=${year}&month=${month}`),
      api.get(`/budget/income-sources?year=${year}&month=${month}`),
      api.get(`/budget/financial-goals`),
      api.get(`/budget/transactions?year=${year}&month=${month}`),
    ]);
    setSummary(s.data);
    setIncome(inc.data);
    setFgoals(fg.data.goals);
    setTxns(t.data.transactions);
  };
  useEffect(() => { refresh(); }, []);

  const seedDefaults = async () => {
    await api.post("/budget/seed-defaults", {});
    refresh();
  };

  const handleIncome = async (action, payload) => {
    if (action === "create") await api.post("/budget/income-sources", { ...payload, month, year });
    if (action === "update") {
      const { source_id, ...rest } = payload;
      await api.patch(`/budget/income-sources/${source_id}`, rest);
    }
    if (action === "delete") await api.delete(`/budget/income-sources/${payload.source_id}`);
    refresh();
  };

  const handleFgoal = async (action, payload) => {
    if (action === "create") await api.post("/budget/financial-goals", payload);
    if (action === "update") {
      const { goal_id, ...rest } = payload;
      await api.patch(`/budget/financial-goals/${goal_id}`, rest);
    }
    if (action === "delete") await api.delete(`/budget/financial-goals/${payload.goal_id}`);
    if (action === "update_legacy") {
      const { goal_id, ...rest } = payload;
      await api.patch(`/budget/savings-goals/${goal_id}`, rest);
    }
    if (action === "delete_legacy") await api.delete(`/budget/savings-goals/${payload.goal_id}`);
    refresh();
  };

  const addCat = async () => {
    if (!catDraft.name.trim()) return;
    await api.post("/budget/categories", {
      name: catDraft.name,
      monthly_limit: parseFloat(catDraft.monthly_limit) || 0,
      color: catDraft.color, kind: catDraft.kind, group: catDraft.group,
    });
    setShowCat(false);
    setCatDraft({ name: "", monthly_limit: "", color: "green", kind: "expense", group: "other" });
    refresh();
  };

  const addTxn = async () => {
    if (!txnDraft.amount) return;
    await api.post("/budget/transactions", {
      amount: parseFloat(txnDraft.amount),
      type: txnDraft.type,
      category_id: txnDraft.category_id || null,
      note: txnDraft.note || null,
    });
    setShowTxn(false);
    setTxnDraft({ amount: "", type: "expense", category_id: "", note: "" });
    refresh();
  };

  const removeTxn = async (id) => {
    await api.delete(`/budget/transactions/${id}`);
    refresh();
  };

  const removeCat = async (id) => {
    if (!confirm("Remove this category and all its transactions?")) return;
    await api.delete(`/budget/categories/${id}`);
    refresh();
  };

  const promptSetLimit = async (c) => {
    const v = prompt(`Monthly allocation for "${c.name}" (USD):`, c.monthly_limit || "");
    if (v === null) return;
    await api.patch(`/budget/categories/${c.category_id}`, { monthly_limit: parseFloat(v) || 0 });
    refresh();
  };

  if (!summary) return <div className="p-10 text-muted-foreground">Loading…</div>;

  const dt = new Date(year, month - 1, 1);
  const monthName = dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const hasCategories = summary.categories.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12" data-testid="budget-page">
      {/* Header */}
      <header className="border-b border-border pb-6 mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="overline mb-2">Budget & Stewardship</div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">{monthName}</h1>
          <p className="mt-2 text-sm text-muted-foreground italic max-w-xl">
            “The earth is the Lord&rsquo;s and everything in it.” — Ps 24:1
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowTxn(true)}
            data-testid="budget-add-txn-button"
            className="bg-primary text-primary-foreground text-sm px-4 py-2"
          >+ Transaction</button>
          <button
            onClick={() => setShowCat(true)}
            data-testid="budget-add-category-button"
            className="border border-border text-sm px-4 py-2"
          >+ Category</button>
        </div>
      </header>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border mb-10" data-testid="budget-summary-strip">
        <BigStat
          label="Income"
          value={fmtMoney(summary.income)}
          sub={summary.income_expected > 0 ? `${fmtMoney(summary.income_expected)} expected` : null}
          testId="budget-stat-income"
        />
        <BigStat label="Expenses" value={fmtMoney(summary.expense)} testId="budget-stat-expense" />
        <BigStat
          label="Given"
          value={fmtMoney(summary.giving)}
          sub={`${summary.tithe_pct}% of income`}
          accent="liturgical-rose"
          testId="budget-stat-giving"
        />
        <BigStat
          label="Net"
          value={fmtMoney(summary.net)}
          accent={summary.net >= 0 ? "liturgical-green" : "liturgical-red"}
          testId="budget-stat-net"
        />
      </div>

      {/* Row: Income + Financial Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-7">
          <IncomePanel data={income} monthName={monthName} onChange={handleIncome} />
        </div>
        <div className="lg:col-span-5">
          <FinancialGoalsPanel goals={fgoals} onChange={handleFgoal} />
        </div>
      </div>

      {/* Grouped budget categories */}
      <div className="mb-10">
        <CategoryGroupsPanel
          categories={summary.categories}
          hasCategories={hasCategories}
          onSeedDefaults={seedDefaults}
          onAddCategory={() => setShowCat(true)}
          onRemoveCategory={removeCat}
          onUpdateLimit={promptSetLimit}
        />
      </div>

      {/* Ledger + Stewardship */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel testId="budget-transactions-panel" className="lg:col-span-8" label="Ledger · this month">
          {txns.length === 0 ? (
            <div className="text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {txns.slice(0, 25).map((t) => {
                const cat = summary.categories.find((c) => c.category_id === t.category_id);
                return (
                  <li key={t.txn_id} className="py-2.5 flex items-center gap-4 text-sm" data-testid={`budget-txn-${t.txn_id}`}>
                    <span className="font-mono text-xs text-muted-foreground w-16">{t.txn_date.slice(5)}</span>
                    <span className="flex-1 truncate">
                      {t.note || (cat?.name ?? "—")}
                      {cat && t.note && <span className="ml-2 text-xs text-muted-foreground">· {cat.name}</span>}
                    </span>
                    <span className={`font-mono text-sm ${t.type === "income" ? "text-liturgical-green" : t.type === "giving" ? "text-liturgical-rose" : ""}`}>
                      {t.type === "income" ? "+" : "−"}{fmtMoney(t.amount)}
                    </span>
                    <button onClick={() => removeTxn(t.txn_id)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`budget-txn-remove-${t.txn_id}`}>×</button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel testId="budget-principles-panel" className="lg:col-span-4" label="Stewardship">
          <ul className="space-y-4">
            {PRINCIPLES.map((p) => (
              <li key={p.ref} className="border-l border-border pl-4">
                <div className="font-serif text-sm leading-snug italic">{p.text}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{p.ref}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Modals */}
      {showCat && (
        <Modal title="New category" onClose={() => setShowCat(false)}>
          <Field label="Name">
            <input data-testid="budget-cat-name-input" value={catDraft.name} onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2" />
          </Field>
          <Field label="Group">
            <select
              data-testid="budget-cat-group-select"
              value={catDraft.group}
              onChange={(e) => setCatDraft({ ...catDraft, group: e.target.value })}
              className="w-full bg-transparent border border-border py-2 px-3 text-sm"
            >
              {CATEGORY_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Monthly allocation (USD)">
            <input data-testid="budget-cat-limit-input" type="number" value={catDraft.monthly_limit} onChange={(e) => setCatDraft({ ...catDraft, monthly_limit: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
          </Field>
          <Field label="Kind">
            <div className="flex gap-2">
              {["expense", "giving", "savings"].map((k) => (
                <button key={k} onClick={() => setCatDraft({ ...catDraft, kind: k })} data-testid={`budget-cat-kind-${k}`} className={`px-3 py-1.5 text-sm border ${catDraft.kind === k ? "border-foreground" : "border-border text-muted-foreground"}`}>{k}</button>
              ))}
            </div>
          </Field>
          <Field label="Color">
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setCatDraft({ ...catDraft, color: c })} data-testid={`budget-cat-color-${c}`} className={`w-7 h-7 bg-liturgical-${c} ${catDraft.color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70"}`} />
              ))}
            </div>
          </Field>
          <ModalFooter onCancel={() => setShowCat(false)} onSubmit={addCat} submitLabel="Add" submitTestId="budget-cat-submit" />
        </Modal>
      )}

      {showTxn && (
        <Modal title="New transaction" onClose={() => setShowTxn(false)}>
          <Field label="Type">
            <div className="flex gap-2">
              {["expense", "income", "giving"].map((t) => (
                <button key={t} onClick={() => setTxnDraft({ ...txnDraft, type: t })} data-testid={`budget-txn-type-${t}`} className={`px-3 py-1.5 text-sm border ${txnDraft.type === t ? "border-foreground" : "border-border text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          </Field>
          <Field label="Amount (USD)">
            <input data-testid="budget-txn-amount-input" type="number" autoFocus value={txnDraft.amount} onChange={(e) => setTxnDraft({ ...txnDraft, amount: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono text-lg" />
          </Field>
          <Field label="Category">
            <select data-testid="budget-txn-category-select" value={txnDraft.category_id} onChange={(e) => setTxnDraft({ ...txnDraft, category_id: e.target.value })} className="w-full bg-transparent border border-border py-2 px-3 text-sm">
              <option value="">— uncategorized —</option>
              {summary.categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Note">
            <input data-testid="budget-txn-note-input" value={txnDraft.note} onChange={(e) => setTxnDraft({ ...txnDraft, note: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2" />
          </Field>
          <ModalFooter onCancel={() => setShowTxn(false)} onSubmit={addTxn} submitLabel="Record" submitTestId="budget-txn-submit" />
        </Modal>
      )}
    </div>
  );
}

function BigStat({ label, value, sub, accent, testId }) {
  return (
    <div className="bg-background p-6" data-testid={testId}>
      <div className="overline mb-2">{label}</div>
      <div className={`font-serif text-3xl tracking-tighter ${accent ? `text-${accent}` : ""}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{sub}</div>}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="budget-modal" onClick={onClose}>
      <div className="bg-background border border-border max-w-md w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-2xl mb-6">{title}</h2>
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <div className="overline mb-2">{label}</div>
      {children}
    </div>
  );
}
function ModalFooter({ onCancel, onSubmit, submitLabel, submitTestId }) {
  return (
    <div className="flex justify-end gap-3 mt-8">
      <button onClick={onCancel} className="text-sm text-muted-foreground" data-testid="budget-modal-cancel">Cancel</button>
      <button onClick={onSubmit} data-testid={submitTestId} className="bg-primary text-primary-foreground px-4 py-2 text-sm">{submitLabel}</button>
    </div>
  );
}
