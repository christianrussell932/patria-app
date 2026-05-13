import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";

export default function Settings() {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [name, setName] = useState("");
  const [saint, setSaint] = useState("");
  const [variant, setVariant] = useState("roman");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/household/me")
      .then((r) => {
        setHousehold(r.data.household);
        if (r.data.household) {
          setName(r.data.household.name || "");
          setSaint(r.data.household.patron_saint || "");
          setVariant(r.data.household.calendar_variant || "roman");
        }
      })
      .catch((err) => toast.error(explainError(err, "Could not load settings.")));
  }, []);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/household", { name, patron_saint: saint, calendar_variant: variant });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(explainError(err, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="settings-page">
      <header className="border-b border-border pb-6 mb-10">
        <div className="overline mb-2">Settings</div>
        <h1 className="font-serif text-4xl tracking-tighter">House configuration.</h1>
      </header>

      <section className="space-y-6 mb-12">
        <div className="overline">Household</div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Name</label>
          <input data-testid="settings-name-input" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Patron saint</label>
          <input data-testid="settings-saint-input" value={saint} onChange={(e) => setSaint(e.target.value)} className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-2">Calendar variant</label>
          <div className="flex flex-wrap gap-2">
            {[
              { v: "roman", l: "Roman" },
              { v: "traditional", l: "Traditional Roman — 1962" },
              { v: "byzantine", l: "Byzantine" },
            ].map((c) => (
              <button
                key={c.v}
                data-testid={`settings-calendar-${c.v}`}
                onClick={() => setVariant(c.v)}
                className={`px-4 py-2 text-sm border ${variant === c.v ? "border-foreground" : "border-border text-muted-foreground"}`}
              >{c.l}</button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving} data-testid="settings-save-button" className="bg-primary text-primary-foreground px-5 py-2 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </section>

      <section className="space-y-4 mb-12">
        <div className="overline">Theme</div>
        <div className="flex gap-2">
          {[
            { v: "light", l: "Bone white" },
            { v: "dark", l: "Candlelight" },
          ].map((t) => (
            <button
              key={t.v}
              data-testid={`settings-theme-${t.v}`}
              onClick={() => setTheme(t.v)}
              className={`px-4 py-2 text-sm border ${theme === t.v ? "border-foreground" : "border-border text-muted-foreground"}`}
            >{t.l}</button>
          ))}
        </div>
      </section>

      <section className="text-sm text-muted-foreground border-t border-border pt-6">
        <div>Signed in as <span className="text-foreground">{user?.email}</span></div>
      </section>
    </div>
  );
}
