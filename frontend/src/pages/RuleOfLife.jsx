import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { initials, memberTileClass } from "@/lib/liturgical";

const PILLARS = [
  { key: "prayer", label: "Prayer", num: "I" },
  { key: "fasting", label: "Fasting", num: "II" },
  { key: "almsgiving", label: "Almsgiving", num: "III" },
  { key: "work", label: "Work", num: "IV" },
  { key: "rest", label: "Rest", num: "V" },
  { key: "formation", label: "Formation", num: "VI" },
  { key: "hospitality", label: "Hospitality", num: "VII" },
];

export default function RuleOfLife() {
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

  const byPillar = (key) => rules.filter((r) => r.pillar === key);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="rule-page">
      <header className="border-b border-border pb-6 mb-10">
        <div className="overline mb-2">The Rule of Life</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">Seven pillars of household discipline.</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-xl">
          Define the rule that shapes your week. Assign each rule to the members who walk it. Keep it spare; keep it real.
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
        {PILLARS.map((p) => (
          <div key={p.key} className="bg-background p-5" data-testid={`rule-pillar-${p.key}`}>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-xs text-muted-foreground">{p.num}</span>
              <h3 className="font-serif text-2xl">{p.label}</h3>
            </div>
            <ul className="space-y-2 mb-4">
              {byPillar(p.key).map((r) => (
                <li key={r.rule_id} className="border-b border-border pb-2 group" data-testid={`rule-item-${r.rule_id}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-sm">{r.title}</div>
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
                    <button onClick={() => remove(r.rule_id)} data-testid={`rule-delete-${r.rule_id}`} className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">×</button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              data-testid={`rule-add-${p.key}-button`}
              onClick={() => openDraft(p.key)}
              className="w-full border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground"
            >
              + Add rule
            </button>
          </div>
        ))}
      </div>

      {draftPillar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="rule-draft-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <div className="overline mb-2">{PILLARS.find((p) => p.key === draftPillar)?.label}</div>
            <h2 className="font-serif text-2xl mb-6">A new rule.</h2>
            <input
              data-testid="rule-draft-title-input"
              autoFocus
              placeholder='e.g., "Family Rosary at 8pm"'
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
                      data-testid={`rule-draft-cadence-${c}`}
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
                        data-testid={`rule-draft-assign-${m.member_id}`}
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
              <button onClick={() => setDraftPillar(null)} data-testid="rule-draft-cancel" className="text-sm text-muted-foreground">Cancel</button>
              <button onClick={submit} data-testid="rule-draft-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Add rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
