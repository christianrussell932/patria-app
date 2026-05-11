import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { liturgicalDot, liturgicalText } from "@/lib/liturgical";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Calendar({ embedded = false }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [variant, setVariant] = useState("roman");

  useEffect(() => {
    api.get("/household/me").then((r) => {
      const v = r.data.household?.calendar_variant || "roman";
      setVariant(v);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/liturgical/calendar?year=${year}&month=${month}&variant=${variant}`).then((r) => setDays(r.data.days));
  }, [year, month, variant]);

  const prev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
  };
  const next = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="calendar-page">
      <header className={`${embedded ? "" : "border-b border-border"} pb-6 mb-8 flex items-end justify-between gap-4`}>
        <div>
          {!embedded && <div className="overline mb-2">Liturgical Calendar</div>}
          <h1 className="font-serif text-3xl md:text-4xl tracking-tighter">{MONTHS[month - 1]} <span className="text-muted-foreground">{year}</span></h1>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {variant === "traditional" ? "Traditional Roman calendar" : "Roman calendar"}
          </div>
        </div>
        <div className="flex gap-2 font-mono">
          <button onClick={prev} data-testid="calendar-prev-button" className="border border-border px-3 py-1.5 text-sm hover:bg-secondary">←</button>
          <button onClick={next} data-testid="calendar-next-button" className="border border-border px-3 py-1.5 text-sm hover:bg-secondary">→</button>
        </div>
      </header>

      <div className="border border-border divide-y divide-border">
        {days.map((d) => {
          const dt = new Date(d.date + "T12:00:00");
          const isToday = d.date === today.toISOString().slice(0, 10);
          return (
            <button
              key={d.date}
              data-testid={`calendar-day-${d.date}`}
              onClick={() => setSelected(d)}
              className={`w-full text-left flex items-center gap-4 py-3 px-4 hover:bg-secondary transition-opacity ${
                isToday ? "bg-secondary" : ""
              }`}
            >
              <span className={`w-1 self-stretch ${liturgicalDot(d.color)}`} />
              <div className="w-16 font-mono text-xs text-muted-foreground">
                {dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} {String(dt.getDate()).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{d.name}</div>
                <div className={`text-xs ${liturgicalText(d.color)}`}>{d.season}</div>
              </div>
              <div className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{d.rank}</span>
                {d.fasting && <span className="text-liturgical-violet">FAST</span>}
                {d.abstinence && <span className="text-liturgical-red">ABST</span>}
              </div>
            </button>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" data-testid="calendar-day-sheet" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <div className={`w-1 h-12 ${liturgicalDot(selected.color)}`} />
                <SheetTitle className="font-serif text-3xl tracking-tight leading-tight pt-3">{selected.name}</SheetTitle>
                <SheetDescription className="sr-only">Liturgical day details for {selected.date}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-sm">
                <div className="grid grid-cols-3 gap-3 text-xs font-mono uppercase tracking-wider">
                  <div>
                    <div className="text-muted-foreground mb-1">Date</div>
                    <div>{selected.date}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Season</div>
                    <div className={liturgicalText(selected.color)}>{selected.season}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Rank</div>
                    <div>{selected.rank}</div>
                  </div>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Liturgical color</span><span className={liturgicalText(selected.color)}>{selected.color}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fasting</span><span>{selected.fasting ? "Yes" : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Abstinence</span><span>{selected.abstinence ? "Yes" : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lord&rsquo;s Day</span><span>{selected.is_sunday ? "Yes" : "—"}</span></div>
                </div>
                <p className="text-muted-foreground italic pt-3 border-t border-border">
                  &ldquo;Sanctify this day, O Lord, that we may walk worthily of the calling we have received.&rdquo;
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
