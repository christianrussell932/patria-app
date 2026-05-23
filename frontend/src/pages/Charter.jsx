// v0.16 — Permanent revisitable Household Charter artifact.
//
// Renders the same CharterCard used at the end of onboarding, populated from
// the household's saved fields. Empty-state for households that have not yet
// completed the First Rule of the Home flow.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { explainError } from "@/lib/errors";
import CharterCard from "@/components/CharterCard";

export default function Charter() {
  const navigate = useNavigate();
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/household/me")
      .then((r) => setHousehold(r.data.household))
      .catch((err) => toast.error(explainError(err, "Could not load the charter.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-16 text-sm text-muted-foreground" data-testid="charter-loading">…</div>
    );
  }

  const completed = !!household?.first_charter_completed_at;

  // Parse stored ISO datetime "YYYY-MM-DDTHH:MM"
  const [councilDate, councilTime] = household?.first_council_at
    ? household.first_council_at.split("T")
    : [null, null];

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-16" data-testid="charter-page">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-10 border-b border-border pb-6 print:hidden">
        <div>
          <div className="overline mb-2">The Household</div>
          <h1 className="font-serif text-3xl md:text-4xl tracking-tighter">
            First Rule of the Home
          </h1>
        </div>
        {completed && (
          <button
            data-testid="charter-print-button"
            onClick={() => window.print()}
            className="text-sm border border-border px-4 py-2 hover:bg-secondary"
          >
            Print →
          </button>
        )}
      </header>

      {completed ? (
        <div data-testid="charter-completed">
          <CharterCard
            name={household.name}
            driftAreas={household.drift_areas || []}
            peace={household.peace_to_protect}
            firstRule={household.first_household_rule}
            councilDate={councilDate}
            councilTime={councilTime ? councilTime.slice(0, 5) : null}
            patronSaint={household.patron_saint}
            completedAt={household.first_charter_completed_at}
          />
          <p className="mt-6 text-xs text-muted-foreground italic max-w-xl print:hidden">
            The charter ages with the household. Review and refine it at each Family Council.
          </p>
        </div>
      ) : (
        <div
          data-testid="charter-empty"
          className="border border-dashed border-border p-10 sm:p-14 text-center"
        >
          <h2 className="font-serif text-xl md:text-2xl mb-3">
            Your Household Charter has not been created yet.
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Patria can help you draft your household&rsquo;s first Rule of the Home —
            the small, lived rhythm your family is trying to keep.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <button
              data-testid="charter-begin-button"
              onClick={() => navigate("/onboarding")}
              className="bg-primary text-primary-foreground px-5 py-2 text-sm"
            >
              Begin the charter →
            </button>
            <Link
              to="/dashboard"
              data-testid="charter-back-to-dashboard"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
