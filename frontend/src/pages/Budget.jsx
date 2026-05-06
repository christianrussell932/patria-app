import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Panel from "@/components/Panel";

const COLORS = ["green", "violet", "white", "red", "rose", "slate"];
const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const PRINCIPLES = [
  { ref: "Mt 6:21", text: "“Where your treasure is, there will your heart be also.”" },
  { ref: "1 Cor 4:2", text: "“It is required of stewards that they be found trustworthy.”" },
  { ref: "Sir 35:10", text: "“Give to the Most High as he has given to you.”" },
  { ref: "Lk 12:48", text: "“To whom much is given, much will be required.”" },
];

export default function Budget() {
  const [summary, setSummary] = useState(null);
  const [savings, setSavings] = useState([]);
  const [txns, setTxns] = useState([]);
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth() + 1);

  // Modals
  const [showCat, setShowCat] = useState(false);
  const [catDraft, setCatDraft] = useState({ name: "", monthly_limit: "", color: "green", kind: "expense" });
  const [showTxn, setShowTxn] = useState(false);
  const [txnDraft, setTxnDraft] = useState({ amount: "", type: "expense", category_id: "", note: "" });
  const [showSg, setShowSg] = useState(false);
  const [sgDraft, setSgDraft] = useState({ name: "", target_amount: "", current_amount: "0", color: "green", deadline: "" });

  const refresh = async () => {
    const [s, sg, t] = await Promise.all([
      api.get(`/budget/summary?year=${year}&month=${month}`),
      api.get("/budget/savings-goals"),
      api.get(`/budget/transactions?year=${year}&month=${month}`),
    ]);
    setSummary(s.data);
    setSavings(sg.data.goals);
    setTxns(t.data.transactions);
  };
  useEffect(() => { refresh(); }, []);

  const addCat = async () => {
    if (!catDraft.name.trim()) return;
    await api.post("/budget/categories", {
      name: catDraft.name,
      monthly_limit: parseFloat(catDraft.monthly_limit) || 0,
      color: catDraft.color,
      kind: catDraft.kind,
    });
    setShowCat(false);
    setCatDraft({ name: "", monthly_limit: "", color: "green", kind: "expense" });
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

  const addSg = async () => {
    if (!sgDraft.name.trim() || !sgDraft.target_amount) return;
    await api.post("/budget/savings-goals", {
      name: sgDraft.name,
      target_amount: parseFloat(sgDraft.target_amount),
      current_amount: parseFloat(sgDraft.current_amount) || 0,
      color: sgDraft.color,
      deadline: sgDraft.deadline || null,
    });
    setShowSg(false);
    setSgDraft({ name: "", target_amount: "", current_amount: "0", color: "green", deadline: "" });
    refresh();
  };

  const updateSg = async (goal_id, amount) => {
    await api.patch(`/budget/savings-goals/${goal_id}`, { current_amount: amount });
    refresh();
  };

  const removeSg = async (goal_id) => {
    if (!confirm("Remove this goal?")) return;
    await api.delete(`/budget/savings-goals/${goal_id}`);
    refresh();
  };

  if (!summary) return <div className="p-10 text-muted-foreground">Loading…</div>;

  const dt = new Date(year, month - 1, 1);
  const monthName = dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12" data-testid="budget-page">
      <header className="border-b border-border pb-6 mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="overline mb-2">Budget & Stewardship</div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">{monthName}</h1>
          <p className="mt-2 text-sm text-muted-foreground italic max-w-xl">
            “The earth is the Lord&rsquo;s and everything in it.” — Ps 24:1
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTxn(true)} data-testid="budget-add-txn-button" className="bg-primary text-primary-foreground text-sm px-4 py-2">+ Transaction</button>
          <button onClick={() => setShowCat(true)} data-testid="budget-add-category-button" className="border border-border text-sm px-4 py-2">+ Category</button>
        </div>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-border border border-border mb-10">
        <BigStat label="Income" value={fmtMoney(summary.income)} />
        <BigStat label="Expenses" value={fmtMoney(summary.expense)} />
        <BigStat label="Given" value={fmtMoney(summary.giving)} sub={`${summary.tithe_pct}% of income`} accent="liturgical-rose" />
        <BigStat label="Net" value={fmtMoney(summary.net)} accent={summary.net >= 0 ? "liturgical-green" : "liturgical-red"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories */}
        <Panel testId="budget-categories-panel" className="lg:col-span-7" label="Spending categories">
          {summary.categories.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              No categories yet. <button onClick={() => setShowCat(true)} className="underline" data-testid="budget-empty-add-category">Create one →</button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {summary.categories.map((c) => {
                const pct = Math.min(100, c.pct);
                const over = c.pct > 100;
                return (
                  <li key={c.category_id} className="py-3" data-testid={`budget-category-${c.category_id}`}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`w-1 h-5 bg-liturgical-${c.color || "green"}`} />
                        <span>{c.name}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.kind}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs">
                          {fmtMoney(c.spent)} <span className="text-muted-foreground">/ {fmtMoney(c.monthly_limit)}</span>
                        </span>
                        <button onClick={() => removeCat(c.category_id)} data-testid={`budget-remove-category-${c.category_id}`} className="text-xs text-muted-foreground hover:text-destructive">×</button>
                      </div>
                    </div>
                    <div className="h-px bg-border mt-2 relative">
                      <div className={`absolute left-0 top-0 h-px ${over ? "bg-liturgical-red" : `bg-liturgical-${c.color || "green"}`}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Savings goals */}
        <Panel
          testId="budget-savings-panel"
          className="lg:col-span-5"
          label="Savings goals"
          action={<button onClick={() => setShowSg(true)} data-testid="budget-add-savings-button" className="text-xs text-muted-foreground hover:text-foreground">+ Add</button>}
        >
          {savings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">No goals yet.</div>
          ) : (
            <ul className="space-y-5">
              {savings.map((g) => {
                const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                return (
                  <li key={g.goal_id} data-testid={`budget-savings-${g.goal_id}`}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <div className="font-serif text-base">{g.name}</div>
                      <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                      {fmtMoney(g.current_amount)} / {fmtMoney(g.target_amount)}
                      {g.deadline && ` · by ${g.deadline}`}
                    </div>
                    <div className="h-px bg-border relative mb-2">
                      <div className={`absolute left-0 top-0 h-px bg-liturgical-${g.color || "green"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={g.current_amount}
                        data-testid={`budget-savings-input-${g.goal_id}`}
                        onBlur={(e) => updateSg(g.goal_id, parseFloat(e.target.value) || 0)}
                        className="w-24 bg-transparent border-b border-border focus:border-foreground outline-none py-1 text-sm font-mono"
                      />
                      <button onClick={() => removeSg(g.goal_id)} data-testid={`budget-savings-remove-${g.goal_id}`} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Transactions */}
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

        {/* Stewardship principles */}
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
          <Field label="Monthly limit (USD)">
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

      {showSg && (
        <Modal title="New savings goal" onClose={() => setShowSg(false)}>
          <Field label="Name"><input data-testid="budget-sg-name-input" value={sgDraft.name} onChange={(e) => setSgDraft({ ...sgDraft, name: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2" /></Field>
          <Field label="Target (USD)"><input data-testid="budget-sg-target-input" type="number" value={sgDraft.target_amount} onChange={(e) => setSgDraft({ ...sgDraft, target_amount: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" /></Field>
          <Field label="Current (USD)"><input data-testid="budget-sg-current-input" type="number" value={sgDraft.current_amount} onChange={(e) => setSgDraft({ ...sgDraft, current_amount: e.target.value })} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" /></Field>
          <Field label="Deadline (optional)"><input data-testid="budget-sg-deadline-input" type="date" value={sgDraft.deadline} onChange={(e) => setSgDraft({ ...sgDraft, deadline: e.target.value })} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" /></Field>
          <ModalFooter onCancel={() => setShowSg(false)} onSubmit={addSg} submitLabel="Set goal" submitTestId="budget-sg-submit" />
        </Modal>
      )}
    </div>
  );
}

function BigStat({ label, value, sub, accent }) {
  return (
    <div className="bg-background p-6">
      <div className="overline mb-2">{label}</div>
      <div className={`font-serif text-3xl tracking-tighter ${accent ? `text-${accent}` : ""}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{sub}</div>}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="budget-modal">
      <div className="bg-background border border-border max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
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
