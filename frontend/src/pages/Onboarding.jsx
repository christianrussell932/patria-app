import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";

const CALENDAR_OPTIONS = [
  { v: "roman",       l: "Roman",                       hint: "Used by most parishes today." },
  { v: "traditional", l: "Traditional Roman — 1962",    hint: "Traditional Latin calendar and rubrics." },
  { v: "byzantine",   l: "Byzantine",                   hint: "Eastern Catholic calendar (limited support)." },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh, user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [calendarVariant, setCalendarVariant] = useState("roman");
  const [parentName, setParentName] = useState(user?.name || "");
  const [members, setMembers] = useState([]);
  const [memberDraft, setMemberDraft] = useState({ name: "", role: "child" });
  const [submitting, setSubmitting] = useState(false);

  const addMember = () => {
    if (!memberDraft.name.trim()) return;
    setMembers([...members, { ...memberDraft, id: Math.random().toString(36).slice(2) }]);
    setMemberDraft({ name: "", role: "child" });
  };
  const removeMember = (id) => setMembers(members.filter((m) => m.id !== id));

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post("/household", {
        name,
        calendar_variant: calendarVariant,
        parent_name: parentName || null,
        // Parent tile color now defaults server-side; chosen later on Members page.
        parent_color: "violet",
      });
      for (const m of members) {
        await api.post("/household/members", {
          name: m.name,
          role: m.role,
          // Default color; can be changed on Members page.
          color: m.role === "parent" ? "violet" : "green",
        });
      }
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(explainError(err, "Could not establish the household."));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center bg-background text-foreground py-12">
      <div className="w-full max-w-xl mx-auto px-6">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/patria-logo.png"
            alt="Patria"
            data-testid="onboarding-mark"
            className="w-24 h-auto mb-3 select-none"
            draggable="false"
          />
          <div className="font-serif text-2xl">Patria<span className="text-liturgical-white">.</span></div>
        </div>
        <div className="overline mb-12 text-center" data-testid="onboarding-pacing">
          Setting up the household · {String(step).padStart(2, "0")} / 02
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-fade-in" data-testid="onboarding-step-1">
            <div>
              <h1 className="font-serif text-4xl tracking-tight leading-tight mb-3">Name your household.</h1>
              <p className="text-sm text-muted-foreground">A house has a name before it has a rhythm. Everything else can come later.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="overline block mb-2">Household name</label>
                <input
                  data-testid="onboarding-household-name-input"
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-lg"
                  placeholder="The Aquinas Household"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="overline block mb-3">Liturgical calendar</label>
                <div className="space-y-2">
                  {CALENDAR_OPTIONS.map((c) => {
                    const selected = calendarVariant === c.v;
                    return (
                      <button
                        key={c.v}
                        data-testid={`onboarding-calendar-${c.v}-button`}
                        onClick={() => setCalendarVariant(c.v)}
                        className={`w-full text-left px-4 py-3 border transition-colors ${
                          selected ? "border-foreground bg-secondary/30" : "border-border hover:border-foreground/60"
                        }`}
                      >
                        <div className={`text-sm ${selected ? "" : "text-foreground/80"}`}>{c.l}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{c.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button
                disabled={!name.trim()}
                data-testid="onboarding-step-1-next-button"
                onClick={() => setStep(2)}
                className="bg-primary text-primary-foreground px-5 py-2 text-sm disabled:opacity-30"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in" data-testid="onboarding-step-2">
            <div>
              <h1 className="font-serif text-4xl tracking-tight leading-tight mb-3">Who walks with you?</h1>
              <p className="text-sm text-muted-foreground">Begin with yourself. You can add the rest of the household now — or later, when the family is around.</p>
            </div>

            <div>
              <label className="overline block mb-2">Your display name</label>
              <input
                data-testid="onboarding-parent-name-input"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-lg"
                placeholder="Father · Mother · your name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>

            {members.length > 0 && (
              <ul className="space-y-2 border-y border-border py-3" data-testid="onboarding-member-list">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3" data-testid={`onboarding-member-row-${m.id}`}>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground w-16">{m.role}</span>
                    <span className="flex-1 text-sm">{m.name}</span>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      data-testid={`onboarding-remove-member-${m.id}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <label className="overline block mb-2">Add another household member <span className="lowercase tracking-normal opacity-60">(optional)</span></label>
              <div className="grid grid-cols-12 gap-3">
                <input
                  data-testid="onboarding-member-name-input"
                  className="col-span-12 md:col-span-8 bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base"
                  placeholder="Name"
                  value={memberDraft.name}
                  onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMember(); } }}
                />
                <select
                  data-testid="onboarding-member-role-select"
                  className="col-span-8 md:col-span-3 bg-transparent border border-border py-2 px-3 text-sm"
                  value={memberDraft.role}
                  onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                </select>
                <button
                  data-testid="onboarding-add-member-button"
                  onClick={addMember}
                  disabled={!memberDraft.name.trim()}
                  className="col-span-4 md:col-span-1 text-sm border border-border py-2 hover:bg-secondary disabled:opacity-30"
                  aria-label="Add member"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tile colors and patron saints can be set on the Members page once you&rsquo;re inside.
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                Patria begins with one weekly habit: a brief Family Council. Once you enter,
                we&rsquo;ll help you prepare the first one.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-muted-foreground hover:text-foreground self-start"
                data-testid="onboarding-step-2-back-button"
              >
                ← Back
              </button>
              <div className="flex items-center gap-5">
                <button
                  data-testid="onboarding-skip-members-button"
                  onClick={() => { setMembers([]); submit(); }}
                  disabled={submitting}
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Add members later
                </button>
                <button
                  data-testid="onboarding-finish-button"
                  onClick={submit}
                  disabled={submitting}
                  className="bg-primary text-primary-foreground px-5 py-2 text-sm disabled:opacity-50"
                >
                  {submitting ? "Establishing…" : "Establish household →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
