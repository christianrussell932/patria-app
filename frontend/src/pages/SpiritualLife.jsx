import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Calendar from "@/pages/Calendar";
import PrayerTracker from "@/pages/PrayerTracker";
import Challenges from "@/pages/Challenges";

const TABS = [
  { key: "calendar", label: "Liturgical Calendar" },
  { key: "prayer", label: "Prayer" },
  { key: "challenges", label: "Seasons" },
];

export default function SpiritualLife() {
  const [params, setParams] = useSearchParams();
  const initial = TABS.find((t) => t.key === params.get("tab"))?.key || "calendar";
  const [tab, setTab] = useState(initial);

  const setTabAndUrl = (k) => {
    setTab(k);
    setParams({ tab: k }, { replace: true });
  };

  return (
    <div data-testid="spiritual-page">
      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-10 md:pt-12">
          <div className="overline mb-2">Spiritual Life</div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tighter mb-6">
            The interior life of the household.
          </h1>
          <nav className="flex gap-6 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                data-testid={`spiritual-tab-${t.key}`}
                onClick={() => setTabAndUrl(t.key)}
                className={`pb-3 text-sm border-b-2 transition-opacity ${
                  tab === t.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div>
        {tab === "calendar" && <Calendar embedded />}
        {tab === "prayer" && <PrayerTracker embedded />}
        {tab === "challenges" && <Challenges embedded />}
      </div>
    </div>
  );
}
