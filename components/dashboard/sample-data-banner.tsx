"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { createSampleState } from "@/lib/sample-data";

/**
 * Shown on the Dashboard when the user has zero real entries (both income
 * and expenses are empty). Offers to populate sample data so they can see
 * the app with data before committing to logging their own.
 */
export function SampleDataBanner() {
  const hydrated = useHydrated();
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const bulkReplace = useBudget((s) => s.bulkReplace);
  const resetAll = useBudget((s) => s.resetAll);
  const [dismissed, setDismissed] = useState(false);

  if (!hydrated) return null;
  if (dismissed) return null;

  // Heuristic: zero user entries AND zero user schedules = "new user"
  const isEmpty = incomeEntries.length === 0 && expenses.length === 0;
  if (!isEmpty) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Welcome — try it with sample data?
          </CardTitle>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <CardDescription>
          Loads a realistic demo budget so you can poke around every feature before
          setting up your own. Remove it at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            bulkReplace(createSampleState());
            setDismissed(true);
          }}
        >
          Load sample data
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm("Clear the sample and start fresh?")) {
              resetAll();
            }
          }}
        >
          Start mine fresh
        </Button>
      </CardContent>
    </Card>
  );
}
