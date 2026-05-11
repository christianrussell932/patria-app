import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { initials, memberTileClass } from "@/lib/liturgical";
import Panel from "@/components/Panel";

const COLORS = ["violet", "green", "white", "red", "rose", "slate"];

export default function Members() {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [score, setScore] = useState(null);
  const [draft, setDraft] = useState({ name: "", role: "child", color: "green", patron_saint: "" });

  const refresh = async () => {
    const [r, d] = await Promise.all([
      api.get("/household/me"),
      api.get("/dashboard"),
    ]);
    setHousehold(r.data.household);
    setMembers(r.data.members);
    setScore(d.data.weekly_score);
  };

  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!draft.name.trim()) return;
    await api.post("/household/members", draft);
    setDraft({ name: "", role: "child", color: "green", patron_saint: "" });
    refresh();
  };

  const remove = async (member_id) => {
    if (!confirm("Remove this member?")) return;
    try {
      await api.delete(`/household/members/${member_id}`);
      refresh();
    } catch (e) {
      alert(e.response?.data?.detail || "Could not remove");
    }
  };

  const parents = members.filter((m) => m.role === "parent");
  const children = members.filter((m) => m.role === "child");

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12" data-testid="members-page">
      <header className="border-b border-border pb-6 mb-10">
        <div className="overline mb-2">Members</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">{household?.name || "—"}</h1>
        {household?.patron_saint && (
          <div className="mt-2 italic text-muted-foreground">under the patronage of {household.patron_saint}</div>
        )}
      </header>

      {/* Mission preview + score */}
      <div className="grid lg:grid-cols-12 gap-6 mb-10">
        <Panel
          testId="members-mission-panel"
          className="lg:col-span-8"
          label="Mission"
          action={<Link to="/mission" className="text-xs text-muted-foreground hover:text-foreground" data-testid="members-mission-edit-link">Edit →</Link>}
        >
          {household?.mission_statement ? (
            <p className="font-serif text-2xl leading-snug">“{household.mission_statement}”</p>
          ) : (
            <div className="text-sm text-muted-foreground">
              Write a one-sentence statement of who this household is and what it is for.{" "}
              <Link to="/mission" className="underline hover:text-foreground">Begin →</Link>
            </div>
          )}
          {household?.values?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {household.values.map((v) => (
                <span key={v} className="text-xs border border-border px-2 py-0.5 font-mono uppercase tracking-wider">{v}</span>
              ))}
            </div>
          )}
        </Panel>

        <Panel testId="members-health-panel" className="lg:col-span-4" label="Household health" hint="Composite this-week score">
          <div className="font-serif text-6xl tracking-tighter mb-2">{score?.total ?? 0}</div>
          <div className="font-mono text-xs text-muted-foreground mb-5">/ 100</div>
          <div className="space-y-2 text-xs">
            <Row label="Rule of Life" pct={score?.rule_pct ?? 0} />
            <Row label="Prayer" pct={score?.prayer_pct ?? 0} />
            <Row label="Tasks" pct={score?.tasks_pct ?? 0} />
            <Row label="Budget" pct={score?.budget_pct ?? 0} />
          </div>
        </Panel>
      </div>

      {/* Roles are managed in Mission & Goals; MemberRow already displays each member's role. */}

      {/* Parents */}
      <section className="mb-10">
        <div className="overline mb-4">Parents</div>
        <ul className="border-y border-border divide-y divide-border">
          {parents.map((m) => (
            <MemberRow key={m.member_id} m={m} household={household} onRemove={remove} />
          ))}
          {parents.length === 0 && <li className="py-4 text-sm text-muted-foreground">No parents listed.</li>}
        </ul>
      </section>

      {/* Children */}
      <section className="mb-10">
        <div className="overline mb-4">Children</div>
        <ul className="border-y border-border divide-y divide-border">
          {children.map((m) => (
            <MemberRow key={m.member_id} m={m} household={household} onRemove={remove} />
          ))}
          {children.length === 0 && <li className="py-4 text-sm text-muted-foreground">No children added yet.</li>}
        </ul>
      </section>

      {/* Add member */}
      <Panel testId="members-add-panel" label="Add a member">
        <div className="grid md:grid-cols-12 gap-3 items-end">
          <input
            data-testid="members-new-name-input"
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="md:col-span-4 bg-transparent border-b border-border focus:border-foreground outline-none py-2"
          />
          <input
            data-testid="members-new-saint-input"
            placeholder="Patron saint (optional)"
            value={draft.patron_saint}
            onChange={(e) => setDraft({ ...draft, patron_saint: e.target.value })}
            className="md:col-span-3 bg-transparent border-b border-border focus:border-foreground outline-none py-2"
          />
          <select data-testid="members-new-role-select" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="md:col-span-2 bg-transparent border border-border py-2 px-3 text-sm">
            <option value="parent">Parent</option>
            <option value="child">Child</option>
          </select>
          <select data-testid="members-new-color-select" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="md:col-span-2 bg-transparent border border-border py-2 px-3 text-sm">
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={add} data-testid="members-add-button" className="md:col-span-1 bg-primary text-primary-foreground px-4 py-2 text-sm">Add</button>
        </div>
      </Panel>

      {household?.technology_policy && (
        <Panel testId="members-tech-panel" className="mt-10" label="Technology policy">
          <p className="text-sm leading-relaxed whitespace-pre-line">{household.technology_policy}</p>
        </Panel>
      )}
    </div>
  );
}

function MemberRow({ m, household, onRemove }) {
  const role = household?.roles?.[m.member_id];
  return (
    <li className="py-3 flex items-center gap-3" data-testid={`members-row-${m.member_id}`}>
      <span className={`w-10 h-10 flex items-center justify-center text-sm font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
      <div className="flex-1">
        <div className="text-sm">
          <span className="font-serif text-base">{m.name}</span>
          {m.linked_user_id && <span className="text-xs text-muted-foreground font-mono ml-2">(you)</span>}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {m.role}
          {m.patron_saint && ` · ${m.patron_saint}`}
          {role && ` · ${role}`}
        </div>
      </div>
      {!m.linked_user_id && (
        <button onClick={() => onRemove(m.member_id)} data-testid={`members-remove-${m.member_id}`} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
      )}
    </li>
  );
}

function Row({ label, pct }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-px bg-border relative">
        <div className="absolute left-0 top-0 h-px bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
