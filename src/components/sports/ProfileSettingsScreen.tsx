import { useEffect, useState } from "react";
import {
  Bell,
  Cloud,
  Download,
  Edit3,
  Heart,
  Languages,
  Lock,
  MoonStar,
  Share,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";

import { ArcSegmentedTabs } from "@/components/arc/ArcPrimitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { calculateBMI, formatHeight, formatWeight } from "@/lib/fitness-engine";
import { ACTIVITY_LABELS, COPY, GOAL_LABELS } from "@/lib/i18n";
import { buildRollingNotifications } from "@/lib/plan-builder";
import { buildExportBundle } from "@/lib/storage";
import type { CloudSyncStatus } from "@/lib/supabase-sync";
import type { ActivityType, AppState, Language, ThemeMode, UnitSystem } from "@/types/fitness";

export function ProfileSettingsScreen({
  state,
  cloudStatus,
  onEditProfile,
  onOpenCloudSync,
  onChangeUnits,
  onChangeLanguage,
  onChangeTheme,
  onToggleReduceMotion,
  onChangeDynamicType,
  onUpdateNotifications,
  onToggleHealthKit,
  onToggleV11Adaptation,
  onOpenReviewerConsole,
  onExportSuccess,
  onDeleteAllData,
}: {
  state: AppState;
  cloudStatus: CloudSyncStatus;
  onEditProfile: () => void;
  onOpenCloudSync: () => void;
  onChangeUnits: (units: UnitSystem) => void;
  onChangeLanguage: (lang: Language) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onToggleReduceMotion: (val: boolean | null) => void;
  onChangeDynamicType: (scale: AppState["profile"]["dynamicTypeScale"]) => void;
  onUpdateNotifications: (settings: AppState["notificationSettings"]) => void;
  onToggleHealthKit: (enabled: boolean) => void;
  onToggleV11Adaptation: (enabled: boolean) => void;
  onOpenReviewerConsole: () => void;
  onExportSuccess: () => void;
  onDeleteAllData: () => void;
}) {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      (window.navigator as { standalone?: boolean }).standalone === true ||
      window.matchMedia?.("(display-mode: standalone)")?.matches === true;
    setIsStandalonePwa(standalone);
  }, []);

  const lang = state.profile.language;
  const copy = COPY[lang];
  const activityLabels = ACTIVITY_LABELS[lang];
  const rollingQueue = buildRollingNotifications(state.currentPlan, state.notificationSettings);
  const bmi = calculateBMI(state.profile.weightKg, state.profile.heightCm);

  function handleExportData() {
    const json = buildExportBundle(state);
    if (typeof window !== "undefined" && typeof Blob !== "undefined") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stride-iron-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportSuccess(true);
    onExportSuccess();
    window.setTimeout(() => setExportSuccess(false), 3000);
  }

  return (
    <div className="space-y-4 pb-5 arc-enter">
      <header className="flex items-center justify-between gap-2 pt-1">
        <div>
          <p className="text-xs text-muted-foreground">{copy.profileSubtitle}</p>
          <h1 className="text-xl font-bold tracking-tight">{copy.profileTitle}</h1>
        </div>
        <Button
          variant="outline"
          className="rounded-xl min-h-[38px] px-3 text-xs font-semibold"
          onClick={onEditProfile}
        >
          <Edit3 className="h-3.5 w-3.5" /> {copy.editProfileBtn}
        </Button>
      </header>

      {/* Profile Summary Card */}
      <section className="arc-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {state.profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-bold">{state.profile.name}</h2>
            <p className="text-xs text-muted-foreground capitalize">
              {GOAL_LABELS[lang][state.goal.type]} · {state.profile.experienceLevel}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
          <div className="rounded-2xl bg-muted/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">Weight</span>
            <p className="font-bold mt-0.5 tabular-nums">
              {formatWeight(state.profile.weightKg, state.profile.unitSystem)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">Height</span>
            <p className="font-bold mt-0.5 tabular-nums">
              {formatHeight(state.profile.heightCm, state.profile.unitSystem)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">BMI / Age</span>
            <p className="font-bold mt-0.5 tabular-nums">
              {bmi} · {state.profile.age}y
            </p>
          </div>
        </div>
      </section>

      {/* Appearance, Units, Language & Accessibility (US-12 & PRD 4.4) */}
      <section className="arc-card p-4 space-y-3.5 text-xs">
        <h2 className="text-sm font-bold">{copy.appearanceTitle}</h2>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <MoonStar className="h-3.5 w-3.5" /> Appearance Theme
          </p>
          <ArcSegmentedTabs
            ariaLabel="Appearance theme"
            value={state.profile.themeMode}
            onChange={onChangeTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Measurement Units</p>
          <ArcSegmentedTabs
            ariaLabel="Unit system"
            value={state.profile.unitSystem}
            onChange={onChangeUnits}
            options={[
              { value: "metric", label: "Metric (kg, km)" },
              { value: "imperial", label: "Imperial (lb, mi)" },
            ]}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <Languages className="h-3.5 w-3.5" /> App Language
          </p>
          <ArcSegmentedTabs
            ariaLabel="Language"
            value={state.profile.language}
            onChange={onChangeLanguage}
            options={[
              { value: "en", label: "English" },
              { value: "id", label: "Bahasa Indonesia" },
            ]}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Dynamic Type Scale</p>
          <ArcSegmentedTabs
            ariaLabel="Dynamic Type"
            value={state.profile.dynamicTypeScale}
            onChange={onChangeDynamicType}
            options={[
              { value: "standard", label: "Standard" },
              { value: "large", label: "Large" },
              { value: "xlarge", label: "X-Large" },
            ]}
          />
        </div>
        <div className="flex items-center justify-between pt-1 min-h-[40px]">
          <div>
            <p className="font-semibold">Reduce Motion</p>
            <p className="text-[11px] text-muted-foreground">
              Follows iOS Reduce Motion or force-disable animations
            </p>
          </div>
          <Switch
            checked={state.profile.reduceMotionOverride === true}
            onCheckedChange={(checked) => onToggleReduceMotion(checked ? true : null)}
            aria-label="Reduce Motion"
          />
        </div>
      </section>

      {/* Notification Preferences (US-07) */}
      <section className="arc-card p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h2 className="text-sm font-bold">{copy.remindersTitle}</h2>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Rolling offline queue: {rollingQueue.length}/64 pending · Quiet{" "}
                {state.notificationSettings.quietHoursStart}–
                {state.notificationSettings.quietHoursEnd}
              </p>
            </div>
          </div>
          <Switch
            checked={state.notificationSettings.enabled}
            onCheckedChange={(enabled) =>
              onUpdateNotifications({ ...state.notificationSettings, enabled })
            }
            aria-label="Enable reminders"
          />
        </div>

        {(
          ["gym_strength", "casual_run", "interval_run", "tempo_run", "long_run"] as Exclude<
            ActivityType,
            "rest"
          >[]
        ).map((type) => (
          <div key={type} className="flex items-center justify-between pl-1 min-h-[34px]">
            <span className="text-muted-foreground">{activityLabels[type]}</span>
            <Switch
              checked={state.notificationSettings.perActivity[type]}
              onCheckedChange={(checked) =>
                onUpdateNotifications({
                  ...state.notificationSettings,
                  perActivity: {
                    ...state.notificationSettings.perActivity,
                    [type]: checked,
                  },
                })
              }
              aria-label={`Reminder for ${activityLabels[type]}`}
            />
          </div>
        ))}
      </section>

      {/* v1.1 Features Preview: Apple Health & Adaptation */}
      <section className="arc-card p-4 space-y-3 text-xs">
        <h2 className="text-sm font-bold">v1.1 Capabilities</h2>
        <div className="flex items-center justify-between min-h-[40px]">
          <div className="flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-rose-500 shrink-0" />
            <div>
              <p className="font-semibold">Apple Health Sync (US-13)</p>
              <p className="text-[11px] text-muted-foreground">
                Explicit read weight / write completed workouts
              </p>
            </div>
          </div>
          <Switch
            checked={state.consent.healthKitSyncEnabled}
            onCheckedChange={onToggleHealthKit}
            aria-label="Apple Health sync"
          />
        </div>
        <div className="flex items-center justify-between min-h-[40px]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-semibold">Plan Adaptation Check-Ins (US-11)</p>
              <p className="text-[11px] text-muted-foreground">
                Adjust volume & calories from adherence
              </p>
            </div>
          </div>
          <Switch
            checked={state.v11AdaptationEnabled}
            onCheckedChange={onToggleV11Adaptation}
            aria-label="Plan adaptation check-ins"
          />
        </div>
      </section>

      {/* iPhone Home Screen App (PWA) Guide */}
      <section className="arc-card p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h2 className="text-sm font-bold">
                {lang === "id" ? "Pasang di Layar Utama iPhone" : "Install on iPhone Home Screen"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {isStandalonePwa
                  ? "Running in full-screen standalone iPhone app mode"
                  : lang === "id"
                    ? "Buka di Safari iPhone agar tampil penuh seperti app native"
                    : "Open in Safari on iPhone to launch full-screen like a native app"}
              </p>
            </div>
          </div>
          {isStandalonePwa && (
            <span className="badge-emerald rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0">
              Installed ✓
            </span>
          )}
        </div>
        {!isStandalonePwa && (
          <ol className="rounded-2xl bg-muted/60 p-3 space-y-1.5 text-[11px] text-foreground">
            <li>
              1.{" "}
              {lang === "id"
                ? "Buka link HTTPS aplikasi ini menggunakan browser Safari di iPhone."
                : "Open this app's HTTPS link in Safari on your iPhone."}
            </li>
            <li className="flex items-center gap-1.5">
              <span>2.</span>
              <Share className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {lang === "id"
                  ? "Ketuk tombol Share di bawah layar Safari."
                  : "Tap the Share button at the bottom of Safari."}
              </span>
            </li>
            <li>
              3.{" "}
              {lang === "id"
                ? 'Pilih "Add to Home Screen" (Tambahkan ke Layar Utama) lalu ketuk Add.'
                : 'Select "Add to Home Screen" and tap Add.'}
            </li>
          </ol>
        )}
      </section>

      {/* Supabase Cloud Database Sync */}
      <section className="arc-card p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Cloud className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h2 className="text-sm font-bold">Supabase Cloud Database</h2>
              <p className="text-[11px] text-muted-foreground">
                {cloudStatus.state === "synced"
                  ? `Synced (${cloudStatus.email ?? "Anonymous session"})`
                  : cloudStatus.state === "auth_required"
                    ? "Sign in required to sync transactions"
                    : "Offline local mode active"}
              </p>
            </div>
          </div>
          <span
            className={
              cloudStatus.state === "synced"
                ? "badge-emerald rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                : "badge-amber rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            }
          >
            {cloudStatus.state === "synced" ? "Connected" : "Local Only"}
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl min-h-[42px] text-xs font-semibold"
          onClick={onOpenCloudSync}
        >
          Manage Supabase Sync & Account
        </Button>
      </section>

      {/* Internal Content Reviewer Console Portal (Persona 3, MVP) */}
      <section className="arc-card p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold">{copy.reviewerConsole}</h2>
              <p className="text-[11px] text-muted-foreground">
                Approve AI source summaries, inspect grounding, and run safety checks
              </p>
            </div>
          </div>
          {state.reports.length > 0 && (
            <span className="badge-rose rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0">
              {state.reports.length} report
            </span>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl min-h-[42px] text-xs font-semibold"
          onClick={onOpenReviewerConsole}
        >
          Open Reviewer Console
        </Button>
      </section>

      {/* Privacy & Data Control (US-12 & Section 4.5) */}
      <section className="arc-card p-4 space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Privacy & Data Control</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <ShieldCheck className="inline h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 mr-1" />
          Your profile, weight, health screening, and GPS routes stay strictly on this device and
          are <strong>never sent to the AI service</strong>.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl min-h-[42px] text-xs font-semibold"
            onClick={handleExportData}
          >
            <Download className="h-3.5 w-3.5" />
            {exportSuccess ? "Exported JSON ✓" : "Export All Data"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="rounded-xl min-h-[42px] px-3.5 text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[380px] rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all personal data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your profile, plans, GPS routes, gym logs, and consents
                  from this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteAllData}>Delete & Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
