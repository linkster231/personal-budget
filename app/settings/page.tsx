"use client";

import { useRef, useState } from "react";
import { Download, Upload, RefreshCw, Moon, Sun, Laptop, Bell, BellOff, Wallet, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import {
  notificationState,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "@/lib/notifications";
import { PaycheckSplitEditor } from "@/components/settings/paycheck-split-editor";
import { PayeeRulesEditor } from "@/components/settings/payee-rules-editor";
import { buildICS } from "@/lib/ics-export";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useBudget((s) => s.settings);
  const setSettings = useBudget((s) => s.setSettings);
  const exportJSON = useBudget((s) => s.exportJSON);
  const importJSON = useBudget((s) => s.importJSON);
  const resetAll = useBudget((s) => s.resetAll);
  const wholeState = useBudget();

  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [notifState, setNotifState] = useState<NotificationPermissionState>("default");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  // Resolve notification permission state on the client
  if (typeof window !== "undefined" && notifState === "default") {
    const current = notificationState();
    if (current !== notifState) setNotifState(current);
  }

  function download() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadICS() {
    const ics = buildICS(wholeState);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-bills-${new Date().toISOString().slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const res = importJSON(text);
    setImportMsg(res.ok ? "Import successful." : `Import failed: ${res.error}`);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function toggleNotifications(on: boolean) {
    if (on) {
      const state = await requestNotificationPermission();
      setNotifState(state);
      setSettings({ notificationsEnabled: state === "granted" });
    } else {
      setSettings({ notificationsEnabled: false });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Theme, balance, notifications, and data.</p>
      </header>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <ThemeButton active={settings.theme === "light"} icon={<Sun className="h-4 w-4" />} label="Light" onClick={() => applyTheme("light", setSettings)} />
            <ThemeButton active={settings.theme === "dark"} icon={<Moon className="h-4 w-4" />} label="Dark" onClick={() => applyTheme("dark", setSettings)} />
            <ThemeButton active={settings.theme === "system"} icon={<Laptop className="h-4 w-4" />} label="System" onClick={() => applyTheme("system", setSettings)} />
          </div>
        </CardContent>
      </Card>

      {/* Starting balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Starting balance
          </CardTitle>
          <CardDescription>
            Your current cash position across checking/savings. Powers the balance projection.
            Update whenever you reconcile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="start-balance">Current balance ({settings.currency})</Label>
            <Input
              id="start-balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={settings.startingBalance}
              onChange={(e) => setSettings({ startingBalance: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Baseline income */}
      <Card>
        <CardHeader>
          <CardTitle>Baseline income</CardTitle>
          <CardDescription>
            Used by the &quot;Minimum baseline&quot; strategy. Set this to the low end of a typical month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="baseline">Amount ({settings.currency})</Label>
            <Input
              id="baseline"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={settings.baselineIncome}
              onChange={(e) => setSettings({ baselineIncome: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Paycheck split presets */}
      <PaycheckSplitEditor />

      {/* Payee rules */}
      <PayeeRulesEditor />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Notifications
          </CardTitle>
          <CardDescription>
            When enabled, the app reminds you to log scheduled items when you open it.
            On iPhone: works after adding the app to the Home Screen (iOS 16.4+).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Remind me to log scheduled items</Label>
            <Switch
              checked={settings.notificationsEnabled && notifState === "granted"}
              onCheckedChange={toggleNotifications}
              disabled={notifState === "unsupported" || notifState === "denied"}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly check-in reminder</Label>
              <p className="text-[11px] text-muted-foreground">
                A gentle nudge once a week to log anything you missed.
              </p>
            </div>
            <Switch
              checked={settings.weeklyReminderEnabled === true && settings.notificationsEnabled && notifState === "granted"}
              onCheckedChange={(v) => setSettings({ weeklyReminderEnabled: v })}
              disabled={!settings.notificationsEnabled || notifState !== "granted"}
            />
          </div>
          {notifState === "unsupported" && (
            <p className="text-xs text-muted-foreground">
              This browser doesn&apos;t support notifications.
            </p>
          )}
          {notifState === "denied" && (
            <p className="text-xs text-destructive">
              Notifications blocked in browser settings. Enable them there first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Calendar export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Sync to Calendar app
          </CardTitle>
          <CardDescription>
            Export all active recurring schedules as an <code>.ics</code> file — open it on
            iPhone or Mac to add bills + paydays to your native Calendar with built-in
            reminders. Re-export whenever you change schedules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadICS} variant="outline">
            <Download className="h-4 w-4" />
            Download .ics
          </Button>
        </CardContent>
      </Card>

      {/* Your data */}
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Everything stays on this device. Export a JSON backup regularly so you don&apos;t lose data if the browser clears storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={download} variant="outline">
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4" />
              Import JSON
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleFile} />
            <Button
              onClick={() => {
                if (confirm("Erase all budget data on this device? This cannot be undone.")) {
                  resetAll();
                  setImportMsg("All data reset.");
                }
              }}
              variant="destructive"
            >
              <RefreshCw className="h-4 w-4" />
              Reset all
            </Button>
          </div>
          {importMsg && <p className="text-sm text-muted-foreground">{importMsg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function applyTheme(theme: "light" | "dark" | "system", setSettings: (p: { theme: "light" | "dark" | "system" }) => void) {
  setSettings({ theme });
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  if (theme === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
  } else {
    root.classList.add(theme);
  }
}

function ThemeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-sm transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
