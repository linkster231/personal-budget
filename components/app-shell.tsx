"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Repeat,
  Wallet,
  Receipt,
  Target,
  Settings,
  PiggyBank,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { pendingActionCount } from "@/lib/selectors";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  showMobile?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard, showMobile: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, showMobile: true },
  { href: "/recurring", label: "Recurring", icon: Repeat, showMobile: true },
  { href: "/income", label: "Income", icon: Wallet, showMobile: false },
  { href: "/expenses", label: "Expenses", icon: Receipt, showMobile: false },
  { href: "/budget", label: "Budget", icon: Target, showMobile: false },
  { href: "/reports", label: "Reports", icon: BarChart3, showMobile: true },
  { href: "/settings", label: "Settings", icon: Settings, showMobile: true },
];

function usePendingCount(): number {
  const hydrated = useHydrated();
  const schedules = useBudget((s) => s.schedules);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const skipped = useBudget((s) => s.skippedScheduleInstances);
  if (!hydrated) return 0;
  return pendingActionCount(
    { schedules, incomeEntries, expenses, skippedScheduleInstances: skipped },
    new Date(),
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-8 md:pt-10">{children}</div>
      </main>
      <MobileTabs />
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const pending = usePendingCount();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-card md:px-4 md:py-6">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <PiggyBank className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Budget</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showBadge = href === "/recurring" && pending > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileTabs() {
  const pathname = usePathname();
  const pending = usePendingCount();
  const items = NAV.filter((n) => n.showMobile);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
      <div
        className="mx-auto flex max-w-lg items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showBadge = href === "/recurring" && pending > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {showBadge && (
                <span className="absolute right-[18%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
