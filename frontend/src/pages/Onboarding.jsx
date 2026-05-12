import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const LITURGICAL_COLORS = ["violet", "green", "white", "red", "rose"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [patronSaint, setPatronSaint] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentColor, setParentColor] = useState("violet");
  const [calendarVariant, setCalendarVariant] = useState("roman");
  const [members, setMembers] = useState([]);
  const [memberDraft, setMemberDraft] = useState({ name: "", role: "child", color: "green" });
  const [submitting, setSubmitting] = useState(false);

  const addMember = () => {
    if (!memberDraft.name.trim()) return;
    setMembers([...members, { ...memberDraft, id: Math.random().toString(36).slice(2) }]);
    setMemberDraft({ name: "", role: "child", color: "green" });
  };

  const removeMember = (id) => setMembers(members.filter((m) => m.id !== id));

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/household", {
        name,
        patron_saint: patronSaint || null,
        calendar_variant: calendarVariant,
        parent_name: parentName || null,
        parent_color: parentColor,
      });
      // Add additional members
      for (const m of members) {
        await api.post("/household/members", {
          name: m.name,
          role: m.role,
          color: m.color,
        });
      }
      await refresh();
      navigate("/dashboard", { replace: true });
    } finally {
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
        <div className="overline mb-12 text-center">Setting up the household · {String(step).padStart(2, "0")} / 03</div>

        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="font-serif text-4xl tracking-tight leading-tight mb-3">Name your household.</h1>
              <p className="text-sm text-muted-foreground">A house has a name before it has a rhythm. Choose well.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="overline block mb-2">Household name</label>
                <input
                  data-testid="onboarding-household-name-input"
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-lg"
                  placeholder="The Aquinas Household"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="overline block mb-2">Patron saint <span className="lowercase tracking-normal opacity-60">(optional)</span></label>
                <input
                  data-testid="onboarding-patron-saint-input"
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-lg"
                  placeholder="St. Joseph"
                  value={patronSaint}
                  onChange={(e) => setPatronSaint(e.target.value)}
                />
              </div>
              <div>
                <label className="overline block mb-2">Liturgical calendar</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { v: "roman", l: "Roman" },
                    { v: "traditional", l: "Traditional Roman — 1962" },
                    { v: "byzantine", l: "Byzantine" },
                  ].map((c) => (
                    <button
                      key={c.v}
                      data-testid={`onboarding-calendar-${c.v}-button`}
                      onClick={() => setCalendarVariant(c.v)}
                      className={`px-4 py-2 text-sm border transition-opacity ${
                        calendarVariant === c.v ? "border-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {c.l}
                    </button>
                  ))}
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
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="font-serif text-4xl tracking-tight leading-tight mb-3">Who lives here?</h1>
              <p className="text-sm text-muted-foreground">Begin with yourself. We&rsquo;ll add the rest in a moment.</p>
            </div>
            <div className="space-y-5">
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
              <div>
                <label className="overline block mb-2">Your tile color</label>
                <div className="flex gap-2 mt-2">
                  {LITURGICAL_COLORS.map((c) => (
                    <button
                      key={c}
                      data-testid={`onboarding-parent-color-${c}-button`}
                      onClick={() => setParentColor(c)}
                      className={`w-8 h-8 ${`bg-liturgical-${c}`} ${
                        parentColor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70"
                      }`}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(1)} className="text-sm text-muted-foreground" data-testid="onboarding-step-2-back-button">← Back</button>
              <button
                data-testid="onboarding-step-2-next-button"
                onClick={() => setStep(3)}
                className="bg-primary text-primary-foreground px-5 py-2 text-sm"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="font-serif text-4xl tracking-tight leading-tight mb-3">Add the rest.</h1>
              <p className="text-sm text-muted-foreground">Spouse, children, anyone who walks the rule with you. You can edit later.</p>
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-b border-border pb-2" data-testid={`onboarding-member-row-${m.id}`}>
                  <span className={`w-2 h-2 rounded-full ${`bg-liturgical-${m.color}`}`} />
                  <span className="flex-1 text-sm">{m.name}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{m.role}</span>
                  <button onClick={() => removeMember(m.id)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`onboarding-remove-member-${m.id}`}>Remove</button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <div className="grid grid-cols-12 gap-3">
                <input
                  data-testid="onboarding-member-name-input"
                  className="col-span-12 md:col-span-6 bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base"
                  placeholder="Member name"
                  value={memberDraft.name}
                  onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                />
                <select
                  data-testid="onboarding-member-role-select"
                  className="col-span-6 md:col-span-3 bg-transparent border border-border py-2 px-3 text-sm"
                  value={memberDraft.role}
                  onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                </select>
                <select
                  data-testid="onboarding-member-color-select"
                  className="col-span-6 md:col-span-3 bg-transparent border border-border py-2 px-3 text-sm"
                  value={memberDraft.color}
                  onChange={(e) => setMemberDraft({ ...memberDraft, color: e.target.value })}
                >
                  {LITURGICAL_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                data-testid="onboarding-add-member-button"
                onClick={addMember}
                className="text-sm border border-border px-4 py-2 hover:bg-secondary"
              >
                + Add member
              </button>
            </div>

            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(2)} className="text-sm text-muted-foreground" data-testid="onboarding-step-3-back-button">← Back</button>
              <button
                disabled={submitting}
                data-testid="onboarding-finish-button"
                onClick={submit}
                className="bg-primary text-primary-foreground px-5 py-2 text-sm disabled:opacity-50"
              >
                {submitting ? "Establishing…" : "Establish household →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
