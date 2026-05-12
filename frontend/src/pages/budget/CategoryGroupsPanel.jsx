import Panel from "@/components/Panel";

const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const GROUP_ORDER = [
  { key: "giving",         label: "A · Giving" },
  { key: "housing",        label: "B · Housing & Utilities" },
  { key: "food",           label: "C · Food & Household" },
  { key: "transportation", label: "D · Transportation" },
  { key: "insurance",      label: "E · Insurance & Health" },
  { key: "debt",           label: "F · Debt & Obligations" },
  { key: "savings",        label: "G · Savings & Goals" },
  { key: "other",          label: "Custom" },
];

export default function CategoryGroupsPanel({ categories, hasCategories, onSeedDefaults, onAddCategory, onRemoveCategory, onUpdateLimit }) {
  // Group by category.group (default "other")
  const grouped = GROUP_ORDER.map((g) => ({
    ...g,
    items: categories.filter((c) => (c.group || "other") === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <Panel
      testId="budget-categories-panel"
      label="Budget Categories"
      action={
        <div className="flex items-center gap-3">
          {!hasCategories && (
            <button
              onClick={onSeedDefaults}
              data-testid="budget-seed-defaults-button"
              className="text-xs text-muted-foreground hover:text-foreground border-b border-dotted border-border"
            >
              Start with default categories
            </button>
          )}
          <button
            onClick={onAddCategory}
            data-testid="budget-add-category-action"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add category
          </button>
        </div>
      }
    >
      {!hasCategories && (
        <div className="text-sm text-muted-foreground py-4">
          A clean budget starts with grouped categories. Click <em>Start with default categories</em> to seed the seven stewardship groups (Giving, Housing, Food, Transportation, Insurance &amp; Health, Debt &amp; Obligations, Savings &amp; Goals). You can edit or remove any of them.
        </div>
      )}

      {grouped.length === 0 && hasCategories && (
        <div className="text-sm text-muted-foreground py-3">
          No categories in any group. Add one to begin.
        </div>
      )}

      <div className="space-y-7">
        {grouped.map((g) => {
          const groupSpent = g.items.reduce((s, c) => s + (c.spent || 0), 0);
          const groupLimit = g.items.reduce((s, c) => s + (c.monthly_limit || 0), 0);
          return (
            <section key={g.key} data-testid={`budget-group-${g.key}`}>
              <header className="flex items-baseline justify-between mb-2 border-b border-border pb-1.5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {g.label}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Spent {fmtMoney(groupSpent)} of {groupLimit > 0 ? `Allocated ${fmtMoney(groupLimit)}` : "Unallocated"}
                </span>
              </header>
              <ul className="divide-y divide-border">
                {g.items.map((c) => {
                  const limit = c.monthly_limit || 0;
                  const spent = c.spent || 0;
                  const overBy = c.over_by || 0;
                  const pct = Math.min(100, c.pct || 0);
                  const muted = limit === 0 && spent === 0;
                  return (
                    <li
                      key={c.category_id}
                      className={`py-2.5 ${muted ? "opacity-55" : ""}`}
                      data-testid={`budget-category-${c.category_id}`}
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`w-1 h-5 bg-liturgical-${c.color || "green"} shrink-0`} />
                          <span className="truncate">{c.name}</span>
                          {c.kind && c.kind !== "expense" && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {c.kind}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm" data-testid={`budget-category-progress-${c.category_id}`}>
                            <span className="font-mono">Spent {fmtMoney(spent)}</span>
                            <span className="text-muted-foreground"> · </span>
                            {limit > 0 ? (
                              <>
                                <span className="font-mono text-muted-foreground">Allocated {fmtMoney(limit)}</span>
                                {overBy > 0 && (
                                  <>
                                    <span className="text-muted-foreground"> · </span>
                                    <span className="font-mono text-liturgical-red">Over by {fmtMoney(overBy)}</span>
                                  </>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => onUpdateLimit(c)}
                                className="font-mono text-muted-foreground underline decoration-dotted hover:text-foreground"
                                data-testid={`budget-category-set-limit-${c.category_id}`}
                              >
                                Set allocation
                              </button>
                            )}
                          </span>
                          <button
                            onClick={() => onRemoveCategory(c.category_id)}
                            data-testid={`budget-remove-category-${c.category_id}`}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >×</button>
                        </div>
                      </div>
                      {limit > 0 && (
                        <div className="h-px bg-border mt-2 relative">
                          <div
                            className={`absolute left-0 top-0 h-px ${overBy > 0 ? "bg-liturgical-red" : `bg-liturgical-${c.color || "green"}`}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
