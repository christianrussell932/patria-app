import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { initials, memberTileClass } from "@/lib/liturgical";

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

  const refresh = async () => {
    const [r, hm] = await Promise.all([api.get("/rules"), api.get("/household/me")]);
    setRules(r.data.rules);
    setMembers(hm.data.members);
  };

  useEffect(() => { refresh(); }, []);

  const openDraft = (pillar) => {
    setDraftPillar(pillar);
    setDraftTitle("");
    setDraftCadence("daily");
    setDraftAssigned([]);
  };

  const submit = async () => {
    if (!draftTitle.trim() || !draftPillar) return;
    await api.post("/rules", {
      pillar: draftPillar,
      title: draftTitle,
      cadence: draftCadence,
      assigned_member_ids: draftAssigned,
    });
    setDraftPillar(null);
    refresh();
  };

  const remove = async (rule_id) => {
    await api.delete(`/rules/${rule_id}`);
    refresh();
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

      {/* 7 tiles in 1 / 2 / 3 / and 3+3+1 (lg) — no orphan 8th cell because we cap at lg:grid-cols-3 */}
      <div className="grid gap-px bg-border border border-border grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p, i) => {
          const isLast = i === PILLARS.length - 1;
          // The last (7th) card spans full width on lg so the row resolves cleanly with no empty cells.
          const span = isLast ? "lg:col-span-3 sm:col-span-2 lg:col-span-3" : "";
          return (
          <div key={p.key} className={`bg-background p-5 flex flex-col ${span}`} data-testid={`order-pillar-${p.key}`}>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-xs text-muted-foreground">{p.num}</span>
              <h3 className="font-serif text-xl">{p.label}</h3>
            </div>
            <div className="text-xs text-muted-foreground mb-5">{p.hint}</div>
            <ul className={`space-y-2 mb-4 flex-1 ${isLast ? "lg:grid lg:grid-cols-3 lg:gap-x-8 lg:space-y-0" : ""}`}>
              {byPillar(p.key).map((r) => (
                <li key={r.rule_id} className="border-b border-border pb-2 group" data-testid={`order-rule-${r.rule_id}`}>
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
              ))}
              {byPillar(p.key).length === 0 && (
                <li className="text-xs text-muted-foreground italic">No practices defined.</li>
              )}
            </ul>
            <button
              data-testid={`order-add-${p.key}-button`}
              onClick={() => openDraft(p.key)}
              className={`${isLast ? "lg:max-w-xs" : ""} w-full border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground`}
            >
              + Add practice
            </button>
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
                  {["daily", "weekly"].map((c) => (
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
              <button onClick={submit} data-testid="order-draft-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Add practice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
