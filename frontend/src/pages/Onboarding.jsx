import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";

const TOTAL_STEPS = 8;

const CALENDAR_OPTIONS = [
  { v: "roman",       l: "Roman",                    hint: "Used by most parishes today." },
  { v: "traditional", l: "Traditional Roman — 1962", hint: "Traditional Latin calendar and rubrics." },
  { v: "byzantine",   l: "Byzantine",                hint: "Eastern Catholic calendar (limited support)." },
];

const DRIFT_OPTIONS = [
  { v: "schedules",      l: "Schedules",                  hint: "Calendar pressure and overcommitment." },
  { v: "prayer",         l: "Prayer rhythm",              hint: "The hours of the day no longer belonging to God." },
  { v: "responsibilities", l: "Household responsibilities", hint: "Chores, repair, the order of the home." },
  { v: "couple",         l: "Couple alignment",           hint: "Quiet erosion between spouses." },
  { v: "priorities",     l: "Family priorities",          hint: "Saying yes too quickly to the wrong things." },
  { v: "technology",     l: "Technology boundaries",      hint: "Devices governing the family rather than the reverse." },
  { v: "stewardship",    l: "Stewardship",                hint: "Money, time, and possessions out of right order." },
];

const PEACE_OPTIONS = [
  { v: "evenings",       l: "Peaceful evenings",            hint: "A house that quiets after the workday." },
  { v: "sunday",         l: "Sunday rest",                  hint: "A protected Lord's day, week after week." },
  { v: "family_prayer",  l: "Family prayer",                hint: "A rhythm the children remember as adults." },
  { v: "less_chaos",     l: "Less schedule chaos",          hint: "Fewer collisions on the calendar." },
  { v: "clearer_roles",  l: "Clearer responsibilities",     hint: "Each person knowing the work that is theirs." },
  { v: "spouse",         l: "Less spouse friction",         hint: "A marriage that breathes more freely." },
];

const RULE_OPTIONS = [
  { v: "council_sunday", l: "We hold a Family Council every Sunday evening.",
    hint: "A twenty-minute weekly look back, look forward, and align." },
  { v: "dinner_night",   l: "We protect one family dinner night during the week.",
    hint: "A fixed table, no commitments allowed past its hour." },
  { v: "priorities_first", l: "We set household priorities before accepting new commitments.",
    hint: "The yes is given by the family, not by the calendar." },
  { v: "shared_rhythm",  l: "We keep one shared spiritual rhythm.",
    hint: "Rosary, Examen, Liturgy of the Hours, or another devotion — kept together." },
];

const labelByValue = (options, v) => options.find((o) => o.v === v)?.l;

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh, user } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Existing v0.13 state (preserved)
  const [name, setName] = useState("");
  const [calendarVariant, setCalendarVariant] = useState("roman");
  const [parentName, setParentName] = useState(user?.name || "");
  const [members, setMembers] = useState([]);
  const [memberDraft, setMemberDraft] = useState({ name: "", role: "child" });
  const [householdCreated, setHouseholdCreated] = useState(false);

  // v0.15 — First Rule of the Home state
  const [driftAreas, setDriftAreas] = useState([]);
  const [peace, setPeace] = useState("");
  const [firstRule, setFirstRule] = useState("");
  const [councilDate, setCouncilDate] = useState(() => nextSundayISO());
  const [councilTime, setCouncilTime] = useState("19:00");
  const [charterSaved, setCharterSaved] = useState(false);

  function nextSundayISO() {
    const d = new Date();
    const dow = d.getDay();
    const add = dow === 0 ? 7 : 7 - dow;
    d.setDate(d.getDate() + add);
    return d.toISOString().slice(0, 10);
  }

  const addMember = () => {
    if (!memberDraft.name.trim()) return;
    setMembers([...members, { ...memberDraft, id: Math.random().toString(36).slice(2) }]);
    setMemberDraft({ name: "", role: "child" });
  };
  const removeMember = (id) => setMembers(members.filter((m) => m.id !== id));

  // Step 2 → 3 boundary: create the household + members (existing v0.13 behavior).
  // After this, household exists; remaining steps PATCH onto it.
  const createHouseholdAndAdvance = async () => {
    if (submitting || householdCreated) {
      setStep(3);
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/household", {
        name,
        calendar_variant: calendarVariant,
        parent_name: parentName || null,
        parent_color: "violet",
      });
      for (const m of members) {
        await api.post("/household/members", {
          name: m.name, role: m.role,
          color: m.role === "parent" ? "violet" : "green",
        });
      }
      await refresh();
      setHouseholdCreated(true);
      setStep(3);
    } catch (err) {
      toast.error(explainError(err, "Could not establish the household."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDrift = (v) => {
    setDriftAreas(driftAreas.includes(v) ? driftAreas.filter((x) => x !== v) : [...driftAreas, v]);
  };

  // Save charter — called from step 7 → step 8 transition (so the Charter card
  // on step 8 reflects persisted state) and again from "Enter Patria" if needed.
  const saveCharter = async () => {
    if (submitting || charterSaved) {
      setStep(8);
      return;
    }
    setSubmitting(true);
    try {
      const firstCouncilAt = (councilDate && councilTime) ? `${councilDate}T${councilTime}` : null;
      await api.post("/household/first-charter", {
        drift_areas: driftAreas,
        peace_to_protect: peace || null,
        first_household_rule: firstRule || null,
        first_council_at: firstCouncilAt,
      });
      setCharterSaved(true);
      setStep(8);
    } catch (err) {
      toast.error(explainError(err, "Could not save the charter."));
    } finally {
      setSubmitting(false);
    }
  };

  const skipToDashboard = () => navigate("/dashboard", { replace: true });

  // Once the household exists, "Skip charter" should land cleanly on the Dashboard.
  // Until then, "Skip" cancels back to the household-creation step.
  const enterPatria = () => navigate("/dashboard", { replace: true });

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
          {step <= 2 ? "Setting up the household" : step === 8 ? "Your First Charter" : "Build your first Rule of the Home"}
          {" · "}
          {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
        </div>

        {step === 1 && (
          <StepShell testId="onboarding-step-1"
            title="Name your household."
            subtitle="A house has a name before it has a rhythm. Everything else can come later.">
            <div className="space-y-6">
              <Field label="Household name">
                <input
                  data-testid="onboarding-household-name-input"
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-lg"
                  placeholder="The Aquinas Household"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Liturgical calendar">
                <div className="space-y-2">
                  {CALENDAR_OPTIONS.map((c) => (
                    <OptionRow
                      key={c.v}
                      testId={`onboarding-calendar-${c.v}-button`}
                      selected={calendarVariant === c.v}
                      onClick={() => setCalendarVariant(c.v)}
                      label={c.l}
                      hint={c.hint}
                    />
                  ))}
                </div>
              </Field>
            </div>
            <Footer
              right={
                <PrimaryBtn
                  disabled={!name.trim()}
                  testId="onboarding-step-1-next-button"
                  onClick={() => setStep(2)}
                >Continue →</PrimaryBtn>
              }
            />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell testId="onboarding-step-2"
            title="Who walks with you?"
            subtitle="Begin with yourself. You can add the rest now — or later, when the family is around.">
            <Field label="Your display name">
              <input
                data-testid="onboarding-parent-name-input"
                className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-lg"
                placeholder="Father · Mother · your name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </Field>

            {members.length > 0 && (
              <ul className="space-y-2 border-y border-border py-3 mt-6" data-testid="onboarding-member-list">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3" data-testid={`onboarding-member-row-${m.id}`}>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground w-16">{m.role}</span>
                    <span className="flex-1 text-sm">{m.name}</span>
                    <button onClick={() => removeMember(m.id)} className="text-xs text-muted-foreground hover:text-destructive" data-testid={`onboarding-remove-member-${m.id}`}>Remove</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6">
              <Field label={<>Add another household member <span className="lowercase tracking-normal opacity-60">(optional)</span></>}>
                <div className="grid grid-cols-12 gap-3">
                  <input
                    data-testid="onboarding-member-name-input"
                    className="col-span-12 sm:col-span-8 bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base"
                    placeholder="Name"
                    value={memberDraft.name}
                    onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMember(); } }}
                  />
                  <select
                    data-testid="onboarding-member-role-select"
                    className="col-span-8 sm:col-span-3 bg-transparent border border-border py-2 px-3 text-sm"
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
                    className="col-span-4 sm:col-span-1 text-sm border border-border py-2 hover:bg-secondary disabled:opacity-30"
                  >+</button>
                </div>
              </Field>
              <p className="mt-2 text-xs text-muted-foreground">
                Tile colors and patron saints can be set on the Members page once you&rsquo;re inside.
              </p>
            </div>

            <Footer
              left={<BackBtn onClick={() => setStep(1)} testId="onboarding-step-2-back-button" />}
              right={
                <div className="flex items-center gap-5">
                  <button
                    data-testid="onboarding-skip-members-button"
                    onClick={() => { setMembers([]); createHouseholdAndAdvance(); }}
                    disabled={submitting}
                    className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
                  >Add members later</button>
                  <PrimaryBtn
                    testId="onboarding-step-2-next-button"
                    disabled={submitting}
                    onClick={createHouseholdAndAdvance}
                  >{submitting ? "Establishing…" : "Continue →"}</PrimaryBtn>
                </div>
              }
            />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell testId="onboarding-step-3"
            title="Where is your household drifting?"
            subtitle="Choose one or more. A calm examen, not a corporate questionnaire — what would your household say if it were honest tonight?">
            <div className="space-y-2" data-testid="onboarding-drift-options">
              {DRIFT_OPTIONS.map((d) => (
                <OptionRow
                  key={d.v}
                  testId={`onboarding-drift-${d.v}`}
                  selected={driftAreas.includes(d.v)}
                  onClick={() => toggleDrift(d.v)}
                  label={d.l}
                  hint={d.hint}
                  multi
                />
              ))}
            </div>
            <Footer
              left={<BackBtn onClick={() => setStep(2)} />}
              right={
                <div className="flex items-center gap-5">
                  <SkipLink onClick={skipToDashboard} testId="onboarding-skip-charter-3" />
                  <PrimaryBtn
                    testId="onboarding-step-3-next-button"
                    onClick={() => setStep(4)}
                  >Continue →</PrimaryBtn>
                </div>
              }
            />
          </StepShell>
        )}

        {step === 4 && (
          <StepShell testId="onboarding-step-4"
            title="What peace are you trying to protect?"
            subtitle="The desire beneath the drift. Choose the one you would most like Patria to help your household keep.">
            <div className="space-y-2" data-testid="onboarding-peace-options">
              {PEACE_OPTIONS.map((p) => (
                <OptionRow
                  key={p.v}
                  testId={`onboarding-peace-${p.v}`}
                  selected={peace === p.v}
                  onClick={() => setPeace(p.v)}
                  label={p.l}
                  hint={p.hint}
                />
              ))}
            </div>
            <Footer
              left={<BackBtn onClick={() => setStep(3)} />}
              right={
                <div className="flex items-center gap-5">
                  <SkipLink onClick={skipToDashboard} testId="onboarding-skip-charter-4" />
                  <PrimaryBtn
                    testId="onboarding-step-4-next-button"
                    onClick={() => setStep(5)}
                  >Continue →</PrimaryBtn>
                </div>
              }
            />
          </StepShell>
        )}

        {step === 5 && (
          <StepShell testId="onboarding-step-5"
            title="Choose your first household rule."
            subtitle="Patria is not a task list. It is a help to building a Rule of the Home — small, lived, recoverable. Start with one.">
            <div className="space-y-2" data-testid="onboarding-rule-options">
              {RULE_OPTIONS.map((r) => (
                <OptionRow
                  key={r.v}
                  testId={`onboarding-rule-${r.v}`}
                  selected={firstRule === r.v}
                  onClick={() => setFirstRule(r.v)}
                  label={r.l}
                  hint={r.hint}
                />
              ))}
            </div>
            <Footer
              left={<BackBtn onClick={() => setStep(4)} />}
              right={
                <div className="flex items-center gap-5">
                  <SkipLink onClick={skipToDashboard} testId="onboarding-skip-charter-5" />
                  <PrimaryBtn
                    testId="onboarding-step-5-next-button"
                    onClick={() => setStep(6)}
                  >Continue →</PrimaryBtn>
                </div>
              }
            />
          </StepShell>
        )}

        {step === 6 && (
          <StepShell testId="onboarding-step-6"
            title="Draft your Rule of the Home."
            subtitle="A simple draft, in your household's own words. You will revisit and refine it at your first Family Council.">
            <CharterDraft
              name={name}
              driftAreas={driftAreas}
              peace={peace}
              firstRule={firstRule}
            />
            <Footer
              left={<BackBtn onClick={() => setStep(5)} />}
              right={
                <div className="flex items-center gap-5">
                  <SkipLink onClick={skipToDashboard} testId="onboarding-skip-charter-6" />
                  <PrimaryBtn
                    testId="onboarding-step-6-next-button"
                    onClick={() => setStep(7)}
                  >Continue →</PrimaryBtn>
                </div>
              }
            />
          </StepShell>
        )}

        {step === 7 && (
          <StepShell testId="onboarding-step-7"
            title="Schedule your first Family Council."
            subtitle="Twenty minutes, gathered. This is what Patria is built around. Choose a time the household can keep.">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  data-testid="onboarding-council-date-input"
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base font-mono"
                  value={councilDate}
                  onChange={(e) => setCouncilDate(e.target.value)}
                />
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  data-testid="onboarding-council-time-input"
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base font-mono"
                  value={councilTime}
                  onChange={(e) => setCouncilTime(e.target.value)}
                />
              </Field>
            </div>
            <p className="mt-4 text-xs text-muted-foreground italic">
              Pre-filled to the upcoming Sunday at 7:00 PM. Adjust to whatever your household
              can actually keep.
            </p>
            <Footer
              left={<BackBtn onClick={() => setStep(6)} />}
              right={
                <div className="flex items-center gap-5">
                  <SkipLink onClick={skipToDashboard} testId="onboarding-skip-charter-7" />
                  <PrimaryBtn
                    testId="onboarding-step-7-next-button"
                    onClick={saveCharter}
                    disabled={submitting}
                  >{submitting ? "Saving…" : "Continue →"}</PrimaryBtn>
                </div>
              }
            />
          </StepShell>
        )}

        {step === 8 && (
          <div className="animate-fade-in" data-testid="onboarding-step-8">
            <CharterCard
              name={name}
              driftAreas={driftAreas}
              peace={peace}
              firstRule={firstRule}
              councilDate={councilDate}
              councilTime={councilTime}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-8">
              <button
                onClick={() => setStep(7)}
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="onboarding-step-8-back-button"
              >← Adjust the council time</button>
              <PrimaryBtn
                testId="onboarding-enter-patria-button"
                onClick={enterPatria}
              >Enter Patria →</PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components

function StepShell({ children, title, subtitle, testId }) {
  return (
    <div className="space-y-8 animate-fade-in" data-testid={testId}>
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl tracking-tight leading-tight mb-3">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="overline block mb-2">{label}</label>
      {children}
    </div>
  );
}

function OptionRow({ selected, onClick, label, hint, testId, multi = false }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border transition-colors flex items-start gap-3 ${
        selected ? "border-foreground bg-secondary/30" : "border-border hover:border-foreground/60"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 shrink-0 w-4 h-4 border ${multi ? "" : "rounded-full"} flex items-center justify-center ${
          selected ? "bg-foreground border-foreground" : "border-border"
        }`}
      >
        {selected && (multi ? <span className="text-background text-[10px] leading-none">✓</span> : <span className="w-1.5 h-1.5 bg-background rounded-full" />)}
      </span>
      <span className="flex-1 min-w-0">
        <div className={`text-sm ${selected ? "" : "text-foreground/80"}`}>{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </span>
    </button>
  );
}

function Footer({ left = null, right = null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-6">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function PrimaryBtn({ children, ...props }) {
  return (
    <button
      data-testid={props.testId}
      onClick={props.onClick}
      disabled={props.disabled}
      className="bg-primary text-primary-foreground px-5 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick, testId }) {
  return (
    <button onClick={onClick} data-testid={testId} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
  );
}

function SkipLink({ onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
    >Skip · enter Patria</button>
  );
}

const DRIFT_LABEL = Object.fromEntries(DRIFT_OPTIONS.map((d) => [d.v, d.l.toLowerCase()]));
const PEACE_LABEL = Object.fromEntries(PEACE_OPTIONS.map((p) => [p.v, p.l.toLowerCase()]));
const RULE_LABEL = Object.fromEntries(RULE_OPTIONS.map((r) => [r.v, r.l]));

function CharterDraft({ name, driftAreas, peace, firstRule }) {
  const draft = useMemo(() => buildDraft({ name, driftAreas, peace, firstRule }), [name, driftAreas, peace, firstRule]);
  return (
    <div className="border border-border bg-secondary/20 p-6 sm:p-8" data-testid="onboarding-charter-draft">
      <div className="overline mb-3">Rule of the Home — draft</div>
      <p className="font-serif text-base sm:text-lg leading-relaxed">{draft}</p>
      <p className="mt-5 text-xs text-muted-foreground italic">
        Plain words for now. The charter ages with the household.
      </p>
    </div>
  );
}

function buildDraft({ name, driftAreas, peace, firstRule }) {
  const houseName = name?.trim() || "Our household";
  const driftText = driftAreas.length === 0
    ? null
    : driftAreas.map((v) => DRIFT_LABEL[v]).filter(Boolean).join(", ");
  const peaceText = peace ? PEACE_LABEL[peace] : null;
  const ruleText = firstRule ? RULE_LABEL[firstRule] : null;

  const parts = [];
  if (driftText) parts.push(`${houseName} is drifting most in: ${driftText}.`);
  if (peaceText) parts.push(`The peace we are trying to protect is ${peaceText}.`);
  if (ruleText) parts.push(`Our first Rule of the Home: ${ruleText}`);
  parts.push("We will review and refine this together at our first Family Council.");
  return parts.join(" ");
}

function CharterCard({ name, driftAreas, peace, firstRule, councilDate, councilTime }) {
  const draft = useMemo(() => buildDraft({ name, driftAreas, peace, firstRule }), [name, driftAreas, peace, firstRule]);
  const friendlyDate = formatFriendlyDate(councilDate);
  return (
    <div className="border border-border bg-background shadow-sm" data-testid="onboarding-charter-card">
      <div className="p-6 sm:p-10 border-b border-border">
        <div className="overline mb-2">First Household Charter</div>
        <h2 className="font-serif text-3xl sm:text-4xl tracking-tighter leading-tight">
          {name?.trim() || "The Household"}
        </h2>
      </div>
      <div className="p-6 sm:p-10 space-y-6">
        <CharterRow
          label="Areas we will tend"
          value={driftAreas.length === 0 ? "—" : driftAreas.map((v) => labelByValue(DRIFT_OPTIONS, v)).join(" · ")}
        />
        <CharterRow
          label="The peace we are protecting"
          value={peace ? labelByValue(PEACE_OPTIONS, peace) : "—"}
        />
        <CharterRow
          label="Our first Rule of the Home"
          serif
          value={firstRule ? RULE_LABEL[firstRule] : "—"}
        />
        <CharterRow
          label="First Family Council"
          serif
          value={(councilDate && councilTime) ? `${friendlyDate} · ${formatTime(councilTime)}` : "Not yet scheduled"}
        />
        <div className="pt-4 border-t border-border">
          <p className="font-serif text-base leading-relaxed italic text-foreground/90">{draft}</p>
        </div>
      </div>
    </div>
  );
}

function CharterRow({ label, value, serif = false }) {
  return (
    <div>
      <div className="overline mb-1">{label}</div>
      <div className={serif ? "font-serif text-lg leading-snug" : "text-sm leading-relaxed"}>{value}</div>
    </div>
  );
}

function formatFriendlyDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return iso; }
}
function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
