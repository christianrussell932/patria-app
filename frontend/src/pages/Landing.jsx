import { useNavigate } from "react-router-dom";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Landing() {
  const navigate = useNavigate();

  const beginWithGoogle = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="font-serif text-2xl tracking-tight">
            Domus<span className="text-liturgical-white">.</span>
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

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-32 grid md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-8">
            <div className="overline mb-6">Anno Domini · MMXXVI</div>
            <h1 className="font-serif text-5xl md:text-7xl tracking-tighter leading-[0.95]">
              An operating system <br className="hidden md:block" />
              for the intentional <br className="hidden md:block" />
              <span className="italic">Catholic household.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Domus is the digital backbone of family life — a structured rule of life,
              a shared prayer rhythm, a liturgical calendar that actually shapes your week,
              and seasons of formation you walk through together.
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
                Free during the Lenten beta · No credit card
              </span>
            </div>
          </div>
          <div className="md:col-span-4 hidden md:block">
            <div className="border-l border-border pl-6 space-y-6">
              {[
                { c: "violet", k: "Advent", d: "Jesse Tree, Gaudete" },
                { c: "white", k: "Christmas", d: "Octave, Epiphany" },
                { c: "violet", k: "Lent", d: "40 days, ashes to fire" },
                { c: "white", k: "Easter", d: "50 days of glory" },
                { c: "green", k: "Ordinary Time", d: "the long faithful walk" },
              ].map((s) => (
                <div key={s.k} className="flex items-baseline gap-3">
                  <span className={`w-1 h-6 ${`bg-liturgical-${s.c}`}`} />
                  <div className="flex-1">
                    <div className="text-sm">{s.k}</div>
                    <div className="text-xs text-muted-foreground">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 grid md:grid-cols-2 gap-16">
          <div>
            <div className="overline mb-3">Not another devotional app</div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight leading-tight">
              Most apps give your family content. <br />
              <span className="italic">Domus gives your family form.</span>
            </h2>
          </div>
          <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>
              You already have a Bible, a missal, and a hundred bookmarked reflections.
              What you don&rsquo;t have is a structured way to <em>actually live</em> a
              rule of life with your spouse and children — to know what today asks of
              your household, who has prayed and who has not, and what season you are
              walking through together.
            </p>
            <p className="text-foreground">
              Domus is the operating layer beneath the spiritual life of your home.
            </p>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div className="overline mb-10">Four pillars · One household</div>
          <div className="grid md:grid-cols-2 gap-px bg-border">
            {[
              {
                num: "I",
                title: "Rule of Life",
                body: "Build your family rule across seven pillars — Prayer, Fasting, Almsgiving, Work, Rest, Formation, Hospitality. Assign by member. Track streaks without shame.",
              },
              {
                num: "II",
                title: "Shared Prayer Tracker",
                body: "Log Morning Offering, the Rosary, Divine Mercy, Examen, Lectio. See the household chain — twelve rosaries this week, and whose.",
              },
              {
                num: "III",
                title: "Liturgical Calendar",
                body: "The Church&rsquo;s year, beautifully typeset. Today&rsquo;s feast, season color, fasting status, the saint to invoke — visible the moment you open the app.",
              },
              {
                num: "IV",
                title: "Seasons & Challenges",
                body: "Advent Jesse Tree, Lent 40, Marian Consecration, the Ninety. Walk a structured arc together with daily check-ins for every member.",
              },
            ].map((m) => (
              <div key={m.num} className="bg-background p-8 md:p-10">
                <div className="font-mono text-xs text-muted-foreground">{m.num}</div>
                <h3 className="font-serif text-2xl mt-2 mb-3">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: m.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 text-center md:text-left grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-8">
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight">
              Sanctify the day. <span className="italic">Then the next.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl">
              The household that prays together — measures together. Begin with Google
              and have your house set up before Compline.
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
          <div className="font-serif text-base text-foreground">Domus<span className="text-liturgical-white">.</span></div>
          <div>Ad maiorem Dei gloriam.</div>
        </div>
      </footer>
    </div>
  );
}
