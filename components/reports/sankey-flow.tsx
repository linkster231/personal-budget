"use client";

import { useMemo } from "react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency, monthKey } from "@/lib/format";

/**
 * This month's cash flow as a Sankey: income sources → categories
 * (plus a "Saved/left" sink so totals balance when income exceeds expenses).
 */
export function SankeyFlow() {
  const hydrated = useHydrated();
  const incomeSources = useBudget((s) => s.incomeSources);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const categories = useBudget((s) => s.categories);
  const expenses = useBudget((s) => s.expenses);
  const currency = useBudget((s) => s.settings.currency);

  const graph = useMemo(() => {
    const cur = monthKey(new Date());

    // Sum income per source
    const incomeBySrc: Record<string, number> = {};
    for (const e of incomeEntries) {
      if (monthKey(e.date) !== cur) continue;
      incomeBySrc[e.sourceId] = (incomeBySrc[e.sourceId] ?? 0) + e.amount;
    }
    // Sum expense per category
    const expenseByCat: Record<string, number> = {};
    for (const e of expenses) {
      if (monthKey(e.date) !== cur) continue;
      expenseByCat[e.categoryId] = (expenseByCat[e.categoryId] ?? 0) + e.amount;
    }

    const totalIncome = Object.values(incomeBySrc).reduce((s, v) => s + v, 0);
    const totalExpense = Object.values(expenseByCat).reduce((s, v) => s + v, 0);
    const leftover = Math.max(0, totalIncome - totalExpense);

    // Sankey needs nodes + links by index
    const nodes: Array<{ name: string; color?: string }> = [];
    const pushNode = (n: { name: string; color?: string }) => {
      nodes.push(n);
      return nodes.length - 1;
    };
    const incomeNodeIdx: Record<string, number> = {};
    const expenseNodeIdx: Record<string, number> = {};

    for (const s of incomeSources) {
      if ((incomeBySrc[s.id] ?? 0) > 0) {
        incomeNodeIdx[s.id] = pushNode({ name: s.name, color: s.color });
      }
    }
    // Central "Pool" node to split income into categories. Using a pool avoids
    // creating a fully-connected bipartite graph that gets noisy.
    const poolIdx = pushNode({ name: "Budget", color: "hsl(var(--primary))" });
    for (const c of categories) {
      if ((expenseByCat[c.id] ?? 0) > 0) {
        expenseNodeIdx[c.id] = pushNode({ name: c.name, color: c.color });
      }
    }
    const savedIdx = leftover > 0 ? pushNode({ name: "Saved / left", color: "hsl(var(--success))" }) : -1;

    const links: Array<{ source: number; target: number; value: number }> = [];

    for (const s of incomeSources) {
      const v = incomeBySrc[s.id];
      if (v && v > 0) {
        links.push({ source: incomeNodeIdx[s.id], target: poolIdx, value: v });
      }
    }
    for (const c of categories) {
      const v = expenseByCat[c.id];
      if (v && v > 0) {
        links.push({ source: poolIdx, target: expenseNodeIdx[c.id], value: v });
      }
    }
    if (savedIdx >= 0 && leftover > 0) {
      links.push({ source: poolIdx, target: savedIdx, value: leftover });
    }

    return { nodes, links, totalIncome, totalExpense };
  }, [incomeSources, incomeEntries, categories, expenses]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-56 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const hasData = graph.nodes.length > 0 && graph.links.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <CardDescription>
          This month · income {formatCurrency(graph.totalIncome, currency)} → expenses {formatCurrency(graph.totalExpense, currency)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Log some income and expenses this month to see how dollars flow.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={graph}
                nodePadding={20}
                nodeWidth={12}
                margin={{ left: 4, right: 80, top: 4, bottom: 4 }}
                link={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.25 }}
                node={<SankeyNode />}
              >
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom node: color comes from data
function SankeyNode(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name?: string; color?: string };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const color = payload?.color ?? "hsl(var(--primary))";
  const name = payload?.name ?? "";
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} />
      <text
        x={x + width + 6}
        y={y + height / 2}
        dominantBaseline="middle"
        className="fill-foreground"
        fontSize={11}
      >
        {name}
      </text>
    </Layer>
  );
}
