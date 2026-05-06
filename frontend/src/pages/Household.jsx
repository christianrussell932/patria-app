import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { initials, memberTileClass } from "@/lib/liturgical";

const COLORS = ["violet", "green", "white", "red", "rose", "slate"];

export default function HouseholdPage() {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [draft, setDraft] = useState({ name: "", role: "child", color: "green", patron_saint: "" });

  const refresh = async () => {
    const r = await api.get("/household/me");
    setHousehold(r.data.household);
    setMembers(r.data.members);
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

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="household-page">
      <header className="border-b border-border pb-6 mb-10">
        <div className="overline mb-2">Household</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tighter">{household?.name || "—"}</h1>
        {household?.patron_saint && (
          <div className="mt-2 italic text-muted-foreground">under the patronage of {household.patron_saint}</div>
        )}
      </header>

      <section className="mb-12">
        <div className="overline mb-4">Members</div>
        <ul className="border-y border-border divide-y divide-border">
          {members.map((m) => (
            <li key={m.member_id} className="py-3 flex items-center gap-3" data-testid={`household-member-${m.member_id}`}>
              <span className={`w-9 h-9 flex items-center justify-center text-sm font-mono ${memberTileClass(m.color)}`}>{initials(m.name)}</span>
              <div className="flex-1">
                <div className="text-sm">{m.name} {m.linked_user_id && <span className="text-xs text-muted-foreground font-mono ml-2">(you)</span>}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{m.role}{m.patron_saint ? ` · ${m.patron_saint}` : ""}</div>
              </div>
              {!m.linked_user_id && (
                <button onClick={() => remove(m.member_id)} data-testid={`household-remove-${m.member_id}`} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="overline mb-4">Add a member</div>
        <div className="grid md:grid-cols-12 gap-3 items-end">
          <input
            data-testid="household-new-name-input"
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="md:col-span-4 bg-transparent border-b border-border focus:border-foreground outline-none py-2"
          />
          <input
            data-testid="household-new-saint-input"
            placeholder="Patron saint (optional)"
            value={draft.patron_saint}
            onChange={(e) => setDraft({ ...draft, patron_saint: e.target.value })}
            className="md:col-span-3 bg-transparent border-b border-border focus:border-foreground outline-none py-2"
          />
          <select
            data-testid="household-new-role-select"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            className="md:col-span-2 bg-transparent border border-border py-2 px-3 text-sm"
          >
            <option value="parent">Parent</option>
            <option value="child">Child</option>
          </select>
          <select
            data-testid="household-new-color-select"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            className="md:col-span-2 bg-transparent border border-border py-2 px-3 text-sm"
          >
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={add} data-testid="household-add-button" className="md:col-span-1 bg-primary text-primary-foreground px-4 py-2 text-sm">Add</button>
        </div>
      </section>
    </div>
  );
}
