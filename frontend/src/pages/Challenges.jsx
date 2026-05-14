import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { liturgicalDot, liturgicalText, initials, memberTileClass } from "@/lib/liturgical";

export default function Challenges({ embedded = false }) {
  const [templates, setTemplates] = useState([]);
  const [active, setActive] = useState([]);
  const [members, setMembers] = useState([]);
  const [pickerTpl, setPickerTpl] = useState(null);
  const [pickerMembers, setPickerMembers] = useState([]);

  const refresh = async () => {
    const [t, a, hm] = await Promise.all([
      api.get("/challenges/templates"),
      api.get("/challenges/active"),
      api.get("/household/me"),
    ]);
    setTemplates(t.data.templates);
    setActive(a.data.challenges);
    setMembers(hm.data.members);
  };

  useEffect(() => { refresh(); }, []);

  const start = async () => {
    if (!pickerTpl) return;
    await api.post("/challenges/start", {
      template_key: pickerTpl.key,
      member_ids: pickerMembers,
    });
    setPickerTpl(null);
    setPickerMembers([]);
    refresh();
  };

  const checkin = async (ch, member_id) => {
    const done = ch.completed_today_member_ids?.includes(member_id);
    await api.post(`/challenges/${ch.challenge_id}/checkin`, { member_id, completed: !done });
    refresh();
  };

  const end = async (ch) => {
    if (!confirm("End this season?")) return;
    await api.post(`/challenges/${ch.challenge_id}/end`);
    refresh();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="challenges-page">
      <header className={`${embedded ? "" : "border-b border-border"} pb-6 mb-10`}>
        {!embedded && <div className="overline mb-2">Seasons & Challenges</div>}
        <h1 className="font-serif text-3xl md:text-4xl tracking-tighter">Walk an arc together.</h1>
      </header>

      {/* Active */}
      <section className="mb-16">
        <div className="overline mb-4">Currently walking</div>
        {active.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-sm text-muted-foreground">
            Nothing active. Begin a season below.
          </div>
        ) : (
          <div className="space-y-px bg-border">
            {active.map((ch) => (
              <div key={ch.challenge_id} className="bg-background p-6" data-testid={`challenge-active-${ch.challenge_id}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`w-1 self-stretch min-h-[60px] ${liturgicalDot(ch.color)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                      <h3 className="font-serif text-2xl">{ch.title}</h3>
                      <div className={`overline ${liturgicalText(ch.color)}`}>Day {ch.current_day} / {ch.days_total}</div>
                    </div>
                    <div className="h-px bg-border mb-4 relative">
                      <div className={`absolute left-0 top-0 h-px ${liturgicalDot(ch.color)}`} style={{ width: `${ch.completion_pct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-2" data-testid={`challenge-checkins-${ch.challenge_id}`}>
                      {members.map((m) => {
                        const done = ch.completed_today_member_ids?.includes(m.member_id);
                        return (
                          <button
                            key={m.member_id}
                            data-testid={`challenge-checkin-${ch.challenge_id}-${m.member_id}`}
                            onClick={() => checkin(ch, m.member_id)}
                            aria-label={done ? `Unmark ${m.name} for today` : `Mark ${m.name} as having joined today`}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs border ${done ? "border-foreground" : "border-border text-muted-foreground"}`}
                          >
                            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                            <span>{m.name}</span>
                            {done && <span aria-hidden="true">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground italic">
                      A season walked together. Mark today&rsquo;s participation; the household arc holds the count.
                    </p>
                  </div>
                  <button onClick={() => end(ch)} data-testid={`challenge-end-${ch.challenge_id}`} className="text-xs text-muted-foreground hover:text-destructive">End</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Templates */}
      <section>
        <div className="overline mb-4">Begin a season</div>
        <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
          {templates.map((t) => (
            <div key={t.key} className="bg-background p-6" data-testid={`challenge-template-${t.key}`}>
              <div className="flex items-start gap-4">
                <span className={`w-1 self-stretch ${liturgicalDot(t.color)}`} />
                <div className="flex-1">
                  <div className={`overline ${liturgicalText(t.color)}`}>{t.subtitle}</div>
                  <h3 className="font-serif text-2xl mt-1 mb-2">{t.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{t.days_total} days</span>
                    <button
                      onClick={() => setPickerTpl(t)}
                      data-testid={`challenge-start-${t.key}`}
                      className="text-xs border border-border px-3 py-1.5 hover:bg-secondary"
                    >Begin →</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {pickerTpl && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="challenge-picker-modal">
          <div className="bg-background border border-border max-w-md w-full p-8">
            <div className={`overline ${liturgicalText(pickerTpl.color)}`}>{pickerTpl.subtitle}</div>
            <h2 className="font-serif text-2xl mt-1 mb-6">{pickerTpl.title}</h2>
            <div className="overline mb-3">Walk this together with</div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const sel = pickerMembers.includes(m.member_id);
                return (
                  <button
                    key={m.member_id}
                    data-testid={`challenge-picker-member-${m.member_id}`}
                    onClick={() => setPickerMembers(sel ? pickerMembers.filter((x) => x !== m.member_id) : [...pickerMembers, m.member_id])}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border ${sel ? "border-foreground" : "border-border text-muted-foreground"}`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
                    {m.name}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setPickerTpl(null)} data-testid="challenge-picker-cancel" className="text-sm text-muted-foreground">Cancel</button>
              <button onClick={start} data-testid="challenge-picker-confirm" className="bg-primary text-primary-foreground px-4 py-2 text-sm">Begin season</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
