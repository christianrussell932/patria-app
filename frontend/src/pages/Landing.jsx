// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Landing() {
  const beginWithGoogle = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="font-serif text-2xl tracking-tight">
            Patria<span className="text-liturgical-white">.</span>
          </div>
          <button
            onClick={beginWithGoogle}
            data-testid="landing-login-button"
            className="text-sm border border-border px-4 py-2 hover:bg-secondary transition-opacity"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero — ornate logo (full mark) used ceremonially on the public page */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-32 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="overline mb-6">Anno Domini · MMXXVI</div>
            <h1 className="font-serif text-5xl md:text-7xl tracking-tighter leading-[0.95]">
              An operating system <br className="hidden md:block" />
              for intentional <br className="hidden md:block" />
              <span className="italic">Catholic family life.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Patria is the executive layer of household life — a single, calm place for
              your rule, your budget, your schedule, your formation, and your interior
              life. Quietly powerful. Deeply intentional.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={beginWithGoogle}
                data-testid="hero-cta-button"
                className="bg-primary text-primary-foreground px-6 py-3 text-sm tracking-wide hover:opacity-90 transition-opacity"
              >
                Begin with Google →
              </button>
              <span className="text-xs text-muted-foreground">
                Free during the founding-household beta · No credit card
              </span>
            </div>
          </div>
          <div className="md:col-span-5 flex justify-center">
            <img
              src="/patria-logo.png"
              alt="Patria"
              data-testid="landing-mark"
              className="w-full max-w-sm h-auto select-none"
              draggable="false"
            />
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 grid md:grid-cols-2 gap-16">
          <div>
            <div className="overline mb-3">Not another devotional app</div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight leading-tight">
              Most apps add to your spiritual to-do list. <br />
              <span className="italic">Patria runs your household.</span>
            </h2>
          </div>
          <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>
              You already have a Bible, a missal, and a phone full of prayer apps.
              What you don&rsquo;t have is a structured way to <em>actually run</em> a
              Catholic family — a single place for the rule, the budget, the calendar,
              the formation, and the prayer rhythm of the home.
            </p>
            <p className="text-foreground">
              Patria is the executive operating system beneath the life of your house.
              Spiritual disciplines are <em>part</em> of the system — not the entire app.
            </p>
          </div>
        </div>
      </section>

      {/* Modules — described, never numbered as 'systems' */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div className="overline mb-10">What lives inside</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {[
              { title: "Dashboard", body: "The command center. Today's liturgical day, your schedule, prayer rhythm, tasks due, budget alerts, date night, goal progress — at a glance." },
              { title: "Family Council", body: "A standing weekly meeting. Patria composes the agenda from your week and turns decisions into tasks. The executive ritual of the household." },
              { title: "Spiritual Life", body: "The interior rhythm of the home. Liturgical calendar (Roman or 1962), prayer rhythm, seasons, and a quietly sacred Sacred Heart anchor — entirely optional." },
              { title: "Household Order", body: "The seven systems of the family — Spiritual, Financial, Order, Marriage, Child Formation, Health, Hospitality. Define your practices and assign by member." },
              { title: "Budget & Stewardship", body: "Tithing, monthly categories, savings goals, debt reduction. Calm and premium — not Mint, not YNAB, not corporate fintech." },
              { title: "Mission & Goals", body: "A family mission statement, a list of values, a technology policy, short- and long-term goals tracked together." },
              { title: "Schedule", body: "Events, tasks and recurring household rhythms — date night, monthly confession, quarterly retreat. The execution layer of the home." },
              { title: "Members", body: "The relational center. Mission, household health, parents, children, roles. Who walks with us." },
            ].map((m) => (
              <div key={m.title} className="bg-background p-8 md:p-10">
                <h3 className="font-serif text-2xl mt-2 mb-3">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-8">
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight">
              Order the day. <span className="italic">Then the year.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl">
              Set up your household in under five minutes. Sign in, name the family,
              add the members, and the operating system is yours.
            </p>
          </div>
          <div className="md:col-span-4 md:text-right">
            <button
              onClick={beginWithGoogle}
              data-testid="footer-cta-button"
              className="bg-primary text-primary-foreground px-6 py-3 text-sm tracking-wide hover:opacity-90"
            >
              Begin with Google →
            </button>
          </div>
        </div>
      </section>

      <footer className="py-10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="font-serif text-base text-foreground">Patria<span className="text-liturgical-white">.</span></div>
          <div>Ad maiorem Dei gloriam.</div>
        </div>
      </footer>
    </div>
  );
}
