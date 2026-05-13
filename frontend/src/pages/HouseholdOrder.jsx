import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { initials, memberTileClass } from "@/lib/liturgical";

// Match the helper used in Schedule.jsx — turns axios / FastAPI failures into
// a single readable string for toasts so the user always sees WHY a save failed.
function explainError(err, fallback = "Something went wrong.") {
  const data = err?.response?.data;
  if (data?.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const m = data.detail[0];
      const field = Array.isArray(m?.loc) ? m.loc[m.loc.length - 1] : "field";
      return `${field}: ${m?.msg || "invalid value"}`;
    }
  }
  const status = err?.response?.status;
  if (status === 401) return "Session expired. Please sign in again.";
  if (status === 403) return "You don't have access to this household.";
  if (status === 404) return "That endpoint isn't available — try reloading the page.";
  if (err?.message === "Network Error") return "Network error — check your connection.";
  return fallback;
}

const PILLARS = [
  {
    key: "spiritual", label: "Spiritual Life", num: "01",
    hint: "Prayer, sacraments, formation",
    placeholder: 'e.g., "Pray night prayer before bed" · "Family Rosary every Sunday evening"',
  },
  {
    key: "financial", label: "Financial Stewardship", num: "02",
    hint: "Tithing, budget, savings",
    placeholder: 'e.g., "Review the household budget every Sunday evening"',
  },
  {
    key: "order", label: "Household Order", num: "03",
    hint: "Routines, rhythms, environment",
    placeholder: 'e.g., "Kitchen reset before bed" · "Laundry done by Saturday noon"',
  },
  {
    key: "marriage", label: "Marriage", num: "04",
    hint: "Date nights, communication, unity",
    placeholder: 'e.g., "Plan one intentional date night each week"',
  },
  {
    key: "children", label: "Child Formation", num: "05",
    hint: "Catechesis, virtues, education",
    placeholder: 'e.g., "Read catechism with the children twice weekly"',
  },
  {
    key: "health", label: "Health & Discipline", num: "06",
    hint: "Sleep, food, fitness, screens",
    placeholder: 'e.g., "Screens off by 9:00 PM" · "Family walk on Saturdays"',
  },
  {
    key: "hospitality", label: "Hospitality & Service", num: "07",
    hint: "Guests, parish, almsgiving",
    placeholder: 'e.g., "Host another family once each month"',
  },
];

const LEGACY_TO_NEW = {
  prayer: "spiritual", fasting: "spiritual", almsgiving: "hospitality",
  formation: "children", work: "order", rest: "health",
};

export default function HouseholdOrder() {
  const [rules, setRules] = useState([]);
  const [members, setMembers] = useState([]);
  const [draftPillar, setDraftPillar] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCadence, setDraftCadence] = useState("daily");
  const [draftAssigned, setDraftAssigned] = useState([]);
  const [draftError, setDraftError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    try {
      const [r, hm] = await Promise.all([api.get("/rules"), api.get("/household/me")]);
      setRules(r.data.rules || []);
      setMembers(hm.data.members || []);
    } catch (err) {
      console.error("HouseholdOrder refresh failed", err);
      toast.error(explainError(err, "Could not load household practices."));
    }
  };

  useEffect(() => { refresh(); }, []);

  const openDraft = (pillar) => {
    setDraftPillar(pillar);
    setDraftTitle("");
    setDraftCadence("daily");
    setDraftAssigned([]);
    setDraftError("");
  };

  const submit = async () => {
    // Inline validation FIRST — never let an obviously bad payload reach the
    // server. Set an inline error in the modal so the user sees what's wrong.
    if (!draftTitle.trim()) {
      setDraftError("Practice name is required.");
      return;
    }
    if (!draftPillar) {
      setDraftError("Please pick a household system.");
      return;
    }
    if (!["daily", "weekly", "monthly"].includes(draftCadence)) {
      setDraftError("Cadence must be daily, weekly, or monthly.");
      return;
    }
    setDraftError("");
    setSubmitting(true);
    try {
      await api.post("/rules", {
        pillar: draftPillar,
        title: draftTitle.trim(),
        cadence: draftCadence,
        assigned_member_ids: Array.isArray(draftAssigned) ? draftAssigned : [],
      });
      setDraftPillar(null);
      toast.success("Practice added.");
      await refresh();
    } catch (err) {
      console.error("Add practice failed", err);
      // Modal stays open so the user can correct and retry — the original bug
      // was that an unhandled axios rejection became React's "Uncaught Runtime
      // Error" overlay and the modal closed on its own.
      const msg = explainError(err, "Could not add the practice.");
      setDraftError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (rule_id) => {
    if (!confirm("Remove this practice?")) return;
    try {
      await api.delete(`/rules/${rule_id}`);
      toast.success("Practice removed.");
      await refresh();
    } catch (err) {
      console.error("Remove practice failed", err);
      toast.error(explainError(err, "Could not remove the practice."));
    }
  };

  const byPillar = (key) => rules.filter((r) => {
    const p = LEGACY_TO_NEW[r.pillar] || r.pillar;
    return p === key;
  });

  const draftPillarObj = PILLARS.find((p) => p.key === draftPillar);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12" data-testid="order-page">
      <header className="border-b border-border pb-6 mb-10">
        <div className="overline mb-2">Household Order</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">Seven systems of the family.</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
          The practical architecture of an intentional household. Define your standing
          practices and recurring commitments across each system; assign by member; let
          the rule do the lifting.
        </p>
      </header>

      {/* 7 tiles in 1 / 2 / 3 columns — 7th (Hospitality) spans full width on lg so the row resolves cleanly. */}
      <div className="grid gap-px bg-border border border-border grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p, i) => {
          const isLast = i === PILLARS.length - 1;
          const span = isLast ? "sm:col-span-2 lg:col-span-3" : "";
          const rules_p = byPillar(p.key);
          return (
          <div key={p.key} className={`bg-background p-5 flex flex-col ${span}`} data-testid={`order-pillar-${p.key}`}>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-xs text-muted-foreground">{p.num}</span>
              <h3 className="font-serif text-xl">{p.label}</h3>
            </div>
            <div className="text-xs text-muted-foreground mb-5">{p.hint}</div>
            {isLast ? (
              <div className="lg:grid lg:grid-cols-3 lg:gap-8 flex-1">
                <ul className="space-y-2 mb-4 lg:mb-0 lg:col-span-2">
                  {rules_p.map((r) => (
                    <RuleLi key={r.rule_id} r={r} members={members} remove={remove} />
                  ))}
                  {rules_p.length === 0 && (
                    <li className="text-xs text-muted-foreground italic">No practices defined.</li>
                  )}
                </ul>
                <div className="flex flex-col justify-end">
                  <button
                    data-testid={`order-add-${p.key}-button`}
                    onClick={() => openDraft(p.key)}
                    className="w-full border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground"
                  >
                    + Add practice
                  </button>
                </div>
              </div>
            ) : (
              <>
                <ul className="space-y-2 mb-4 flex-1">
                  {rules_p.map((r) => (
                    <RuleLi key={r.rule_id} r={r} members={members} remove={remove} />
                  ))}
                  {rules_p.length === 0 && (
                    <li className="text-xs text-muted-foreground italic">No practices defined.</li>
                  )}
                </ul>
                <button
                  data-testid={`order-add-${p.key}-button`}
                  onClick={() => openDraft(p.key)}
                  className="w-full border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground"
                >
                  + Add practice
                </button>
              </>
            )}
          </div>
        );})}
      </div>

      {draftPillar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="order-draft-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <div className="overline mb-2">{draftPillarObj?.label}</div>
            <h2 className="font-serif text-2xl mb-2">A new household practice.</h2>
            <p className="text-xs text-muted-foreground mb-6">
              A standing expectation or recurring commitment. Different from a one-off task.
            </p>
            <input
              data-testid="order-draft-title-input"
              autoFocus
              placeholder={draftPillarObj?.placeholder || 'e.g., "Family Rosary at 8pm"'}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base mb-6"
            />
            <div className="space-y-4">
              <div>
                <div className="overline mb-2">Cadence</div>
                <div className="flex gap-2">
                  {["daily", "weekly", "monthly"].map((c) => (
                    <button
                      key={c}
                      data-testid={`order-draft-cadence-${c}`}
                      onClick={() => setDraftCadence(c)}
                      className={`px-3 py-1.5 text-sm border ${draftCadence === c ? "border-foreground" : "border-border text-muted-foreground"}`}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="overline mb-2">Assign to</div>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const sel = draftAssigned.includes(m.member_id);
                    return (
                      <button
                        key={m.member_id}
                        data-testid={`order-draft-assign-${m.member_id}`}
                        onClick={() => setDraftAssigned(sel ? draftAssigned.filter((x) => x !== m.member_id) : [...draftAssigned, m.member_id])}
                        className={`flex items-center gap-2 px-2 py-1 text-xs border ${sel ? "border-foreground" : "border-border text-muted-foreground"}`}
                      >
                        <span className={`w-4 h-4 flex items-center justify-center text-[8px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setDraftPillar(null)} data-testid="order-draft-cancel" className="text-sm text-muted-foreground">Cancel</button>
              <button onClick={submit} disabled={submitting} data-testid="order-draft-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
                {submitting ? "Adding…" : "Add practice"}
              </button>
            </div>
            {draftError && (
              <div className="mt-4 text-xs text-liturgical-red" data-testid="order-draft-error">
                {draftError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleLi({ r, members, remove }) {
  return (
    <li className="border-b border-border pb-2 group" data-testid={`order-rule-${r.rule_id}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="text-sm leading-snug">{r.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono uppercase tracking-wider">{r.cadence}</span>
            {r.assigned_member_ids?.length > 0 && (
              <span className="flex items-center gap-1">
                {r.assigned_member_ids.map((mid) => {
                  const m = members.find((x) => x.member_id === mid);
                  if (!m) return null;
                  return (
                    <span key={mid} className={`w-4 h-4 flex items-center justify-center text-[8px] font-mono ${memberTileClass(m.color)}`} title={m.name}>
                      {initials(m.name)}
                    </span>
                  );
                })}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => remove(r.rule_id)} data-testid={`order-rule-delete-${r.rule_id}`} className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">×</button>
      </div>
    </li>
  );
}
