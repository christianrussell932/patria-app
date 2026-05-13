import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import Panel from "@/components/Panel";
import { SacredHeartEngraving, CrestDivider } from "@/components/Crest";

export default function SacredHeart() {
  const [state, setState] = useState(null);
  const [notes, setNotes] = useState("");
  const [enthroneOpen, setEnthroneOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date().toISOString().slice(0, 10));

  const refresh = async () => {
    try {
      const r = await api.get("/sacred-heart/state");
      setState(r.data);
      setNotes(r.data.notes || "");
    } catch (err) {
      toast.error(explainError(err, "Could not load Sacred Heart state."));
    }
  };

  useEffect(() => { refresh(); }, []);

  const enthrone = async () => {
    if (!draftDate) {
      toast.error("Pick a date for the enthronement.");
      return;
    }
    try {
      await api.post("/sacred-heart/enthrone", { enthroned_at: draftDate, notes });
      setEnthroneOpen(false);
      toast.success("Home consecrated to the Sacred Heart.");
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not record the enthronement."));
    }
  };

  const renew = async () => {
    if (!confirm("Mark today as the renewal of your consecration?")) return;
    try {
      await api.post("/sacred-heart/renew");
      toast.success("Renewal recorded.");
      refresh();
    } catch (err) {
      toast.error(explainError(err, "Could not record the renewal."));
    }
  };

  if (!state) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="sacred-heart-page">
      {/* Hero */}
      <header className="grid md:grid-cols-12 gap-10 items-center mb-14">
        <div className="md:col-span-7">
          <div className="overline mb-3">An optional anchor</div>
          <h1 className="font-serif text-4xl md:text-6xl tracking-tighter leading-[1.0]">
            The home under <br />
            the <span className="italic">Sacred Heart.</span>
          </h1>
          <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-xl">
            A traditional Catholic practice of intentionally dedicating the home and family
            life to Christ. Families gather in prayer, place an image of the Sacred Heart
            within the household, and consecrate their life together to His care.
          </p>
        </div>
        <div className="md:col-span-5 flex justify-center text-foreground/80">
          <SacredHeartEngraving size={220} />
        </div>
      </header>

      {/* Status */}
      <Panel testId="sacred-heart-status-panel" className="mb-10">
        {state.is_enthroned ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="overline mb-2">This house is enthroned</div>
              <div className="font-serif text-2xl">Consecrated on {state.enthroned_at}</div>
              <div className="font-mono text-xs text-muted-foreground mt-2">
                {state.renewal_at ? `Last renewed ${state.renewal_at}` : "Awaiting first renewal"}
                {state.next_renewal && ` · suggested next renewal ${state.next_renewal}`}
              </div>
            </div>
            <button onClick={renew} data-testid="sacred-heart-renew-button" className="border border-border px-4 py-2 text-sm hover:bg-secondary">
              Renew today
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="overline mb-2">Not yet enthroned</div>
              <div className="font-serif text-2xl">A gentle next step, when the household is ready.</div>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                There is no requirement. The Sacred Heart is an offered anchor — Patria simply
                holds the date and the prayers if you choose to dedicate your home.
              </p>
            </div>
            <button onClick={() => setEnthroneOpen(true)} data-testid="sacred-heart-enthrone-button" className="bg-primary text-primary-foreground px-5 py-2 text-sm">
              Begin enthronement →
            </button>
          </div>
        )}
      </Panel>

      {/* How it works */}
      <section className="mb-14" data-testid="sacred-heart-how-it-works">
        <div className="overline mb-6">How it works</div>
        <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
          {STEPS.map((s) => (
            <div key={s.num} className="bg-background p-6 md:p-8">
              <div className="font-mono text-xs text-muted-foreground mb-3">Step {s.num}</div>
              <h3 className="font-serif text-2xl mb-3">{s.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-foreground/40">·</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <CrestDivider />

      {/* Ceremony guide */}
      <section className="mb-12" data-testid="sacred-heart-ceremony">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="overline mb-3">Ceremony guide</div>
            <h2 className="font-serif text-3xl tracking-tighter leading-tight">
              A simple, sacred order for the day.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Use whichever form is right for your household. The two are interchangeable —
              both are blessed. The priest-led form is fuller; the family form is gentle.
            </p>
            <button
              onClick={() => window.print()}
              data-testid="sacred-heart-print-button"
              className="mt-6 border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Print ceremony guide
            </button>
          </div>

          <div className="md:col-span-8 grid md:grid-cols-2 gap-6">
            <div className="border border-border p-6" data-testid="sacred-heart-form-priest">
              <div className="overline mb-2">Form A · Priest-led</div>
              <h3 className="font-serif text-xl mb-4">Solemn enthronement</h3>
              <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground list-decimal pl-5 marker:font-mono marker:text-foreground">
                <li>Welcome and Sign of the Cross</li>
                <li>Reading: Mt 11:28–30 — &ldquo;Come to me, all you who labour…&rdquo;</li>
                <li>Blessing of the Sacred Heart image</li>
                <li>Litany of the Sacred Heart</li>
                <li>Act of Consecration — read by the head of the household</li>
                <li>Placing the image in its prominent place</li>
                <li>Priest's blessing of the home</li>
                <li>Closing prayer; Salve Regina or Our Father together</li>
              </ol>
            </div>

            <div className="border border-border p-6" data-testid="sacred-heart-form-family">
              <div className="overline mb-2">Form B · Family</div>
              <h3 className="font-serif text-xl mb-4">Domestic enthronement</h3>
              <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground list-decimal pl-5 marker:font-mono marker:text-foreground">
                <li>Sign of the Cross; light a candle</li>
                <li>Read together: Mt 11:28–30 (RSV-CE)</li>
                <li>A moment of silence</li>
                <li>The head of the household reads the Act of Consecration</li>
                <li>Each member kisses the image and places it</li>
                <li>One decade of the Rosary — Sorrowful or Glorious mystery</li>
                <li>Our Father · Hail Mary · Glory Be</li>
                <li>Sign of the Cross to close</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <CrestDivider />

      {/* Act of Consecration */}
      <section className="mb-12" data-testid="sacred-heart-act">
        <div className="overline mb-4">Act of Consecration</div>
        <div className="max-w-3xl">
          <p className="font-serif text-xl leading-relaxed">
            &ldquo;Most Sacred Heart of Jesus, we consecrate to Thee our home and our
            family. We desire that Thou shouldst be its King — that Thy peace and Thy
            love may dwell here always. We promise to honor Thee in our prayers, in
            our work, in our rest, and in our hospitality. Be Thou for us a refuge in
            sorrow, a strength in temptation, and a quiet joy in the ordinary hours.
            Sacred Heart of Jesus, have mercy on us. Amen.&rdquo;
          </p>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-4">
            Family form · adapted from the Act of Consecration to the Sacred Heart
          </div>
        </div>
      </section>

      {/* Optional yearly renewal */}
      {state.is_enthroned && (
        <Panel testId="sacred-heart-renewal-panel" label="Yearly renewal · optional">
          <p className="text-sm text-muted-foreground max-w-2xl mb-4">
            The Church encourages families to renew their consecration each year — often on
            the Solemnity of the Sacred Heart, or on the anniversary of the enthronement.
            Patria can hold a gentle reminder; nothing more.
          </p>
          <div className="font-mono text-xs">
            Next suggested renewal: <span className="text-foreground">{state.next_renewal || "—"}</span>
          </div>
        </Panel>
      )}

      {enthroneOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="sacred-heart-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <div className="flex justify-center mb-4 text-foreground/70">
              <SacredHeartEngraving size={80} />
            </div>
            <h2 className="font-serif text-2xl mb-3 text-center">Begin enthronement</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Choose a date for the ceremony. We&rsquo;ll hold the date and the prayers.
            </p>
            <div className="space-y-4">
              <div>
                <div className="overline mb-2">Date</div>
                <input data-testid="sacred-heart-date-input" type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} className="bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-mono" />
              </div>
              <div>
                <div className="overline mb-2">Notes (optional)</div>
                <textarea
                  rows={3}
                  data-testid="sacred-heart-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="The image chosen, who is invited, where it will be placed."
                  className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setEnthroneOpen(false)} className="text-sm text-muted-foreground" data-testid="sacred-heart-cancel">Cancel</button>
              <button onClick={enthrone} data-testid="sacred-heart-submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Consecrate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS = [
  {
    num: "01",
    title: "Prepare the home",
    points: [
      "Choose a Sacred Heart image or statue",
      "Select a meaningful date (often a First Friday or the Solemnity)",
      "Prepare a place — a small table, candle, perhaps fresh flowers",
    ],
  },
  {
    num: "02",
    title: "Gather the household",
    points: [
      "Pray together in the chosen place",
      "Read the prescribed Scripture and prayers",
      "Invite a priest if your parish offers the blessing (optional)",
    ],
  },
  {
    num: "03",
    title: "Consecrate the home",
    points: [
      "Place the image prominently",
      "Read the Act of Consecration aloud",
      "Commit, as a family, to a life of peace and prayer beneath His Heart",
    ],
  },
];
