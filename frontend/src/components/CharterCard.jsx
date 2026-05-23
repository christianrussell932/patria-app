// v0.16 — Reusable First Household Charter artifact.
//
// Used by:
// - pages/Onboarding.jsx (final step 8 — the just-finished charter)
// - pages/Charter.jsx    (permanent revisitable artifact at /charter)
//
// Visual style: editorial parchment, restrained typography. Print-friendly
// (consumers wrap in `print:bg-white print:border-0` etc. as needed).

import { useMemo } from "react";

export const DRIFT_OPTIONS = [
  { v: "schedules",        l: "Schedules" },
  { v: "prayer",           l: "Prayer rhythm" },
  { v: "responsibilities", l: "Household responsibilities" },
  { v: "couple",           l: "Couple alignment" },
  { v: "priorities",       l: "Family priorities" },
  { v: "technology",       l: "Technology boundaries" },
  { v: "stewardship",      l: "Stewardship" },
];

export const PEACE_OPTIONS = [
  { v: "evenings",      l: "Peaceful evenings" },
  { v: "sunday",        l: "Sunday rest" },
  { v: "family_prayer", l: "Family prayer" },
  { v: "less_chaos",    l: "Less schedule chaos" },
  { v: "clearer_roles", l: "Clearer responsibilities" },
  { v: "spouse",        l: "Less spouse friction" },
];

export const RULE_OPTIONS = [
  { v: "council_sunday",   l: "We hold a Family Council every Sunday evening." },
  { v: "dinner_night",     l: "We protect one family dinner night during the week." },
  { v: "priorities_first", l: "We set household priorities before accepting new commitments." },
  { v: "shared_rhythm",    l: "We keep one shared spiritual rhythm." },
];

const DRIFT_LABEL = Object.fromEntries(DRIFT_OPTIONS.map((d) => [d.v, d.l.toLowerCase()]));
const PEACE_LABEL = Object.fromEntries(PEACE_OPTIONS.map((p) => [p.v, p.l.toLowerCase()]));
const RULE_LABEL  = Object.fromEntries(RULE_OPTIONS.map((r)  => [r.v, r.l]));

const labelByValue = (options, v) => options.find((o) => o.v === v)?.l;

export function buildDraft({ name, driftAreas = [], peace, firstRule }) {
  const houseName = name?.trim() || "Our household";
  const driftText = driftAreas.length === 0
    ? null
    : driftAreas.map((v) => DRIFT_LABEL[v]).filter(Boolean).join(", ");
  const peaceText = peace ? PEACE_LABEL[peace] : null;
  const ruleText  = firstRule ? RULE_LABEL[firstRule] : null;

  const parts = [];
  if (driftText) parts.push(`${houseName} is drifting most in: ${driftText}.`);
  if (peaceText) parts.push(`The peace we are trying to protect is ${peaceText}.`);
  if (ruleText)  parts.push(`Our first Rule of the Home: ${ruleText}`);
  parts.push("We will review and refine this together at our first Family Council.");
  return parts.join(" ");
}

export function CharterDraft({ name, driftAreas, peace, firstRule, testId = "charter-draft" }) {
  const draft = useMemo(
    () => buildDraft({ name, driftAreas, peace, firstRule }),
    [name, driftAreas, peace, firstRule]
  );
  return (
    <div className="border border-border bg-secondary/20 p-6 sm:p-8" data-testid={testId}>
      <div className="overline mb-3">Rule of the Home — draft</div>
      <p className="font-serif text-base sm:text-lg leading-relaxed">{draft}</p>
      <p className="mt-5 text-xs text-muted-foreground italic">
        Plain words for now. The charter ages with the household.
      </p>
    </div>
  );
}

export default function CharterCard({
  name,
  driftAreas = [],
  peace,
  firstRule,
  councilDate,
  councilTime,
  patronSaint,
  completedAt,
  testId = "charter-card",
}) {
  const draft = useMemo(
    () => buildDraft({ name, driftAreas, peace, firstRule }),
    [name, driftAreas, peace, firstRule]
  );
  return (
    <div
      className="border border-border bg-background shadow-sm print:border-0 print:shadow-none"
      data-testid={testId}
    >
      <div className="p-6 sm:p-10 border-b border-border print:border-b print:p-8">
        <div className="overline mb-2">First Household Charter</div>
        <h2 className="font-serif text-3xl sm:text-4xl tracking-tighter leading-tight">
          {name?.trim() || "The Household"}
        </h2>
        {patronSaint && (
          <div className="mt-2 italic text-sm text-muted-foreground">
            under the patronage of {patronSaint}
          </div>
        )}
      </div>
      <div className="p-6 sm:p-10 space-y-6 print:p-8">
        <CharterRow
          label="Areas we will tend"
          value={driftAreas.length === 0 ? "—" : driftAreas.map((v) => labelByValue(DRIFT_OPTIONS, v)).filter(Boolean).join(" · ")}
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
          value={(councilDate && councilTime)
            ? `${formatFriendlyDate(councilDate)} · ${formatTime(councilTime)}`
            : "Not yet scheduled"}
        />
        <div className="pt-4 border-t border-border">
          <p className="font-serif text-base leading-relaxed italic text-foreground/90">{draft}</p>
        </div>
        {completedAt && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono pt-2">
            Established {formatFriendlyDate(completedAt.slice(0, 10))}
          </p>
        )}
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

export function formatFriendlyDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return iso; }
}

export function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
