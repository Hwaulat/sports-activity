import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BatteryFull,
  CalendarDays,
  Compass,
  Flame,
  LineChart,
  Signal,
  UserRound,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { CloudSyncModal } from "@/components/sports/CloudSyncModal";
import { GymLoggerModal } from "@/components/sports/GymLoggerModal";
import { OnboardingWizard } from "@/components/sports/OnboardingWizard";
import { PlanScreen } from "@/components/sports/PlanScreen";
import { ProfileSettingsScreen } from "@/components/sports/ProfileSettingsScreen";
import { ProgressScreen } from "@/components/sports/ProgressScreen";
import { ReviewerConsoleScreen } from "@/components/sports/ReviewerConsoleScreen";
import { RunTrackerScreen } from "@/components/sports/RunTrackerScreen";
import { TodayScreen } from "@/components/sports/TodayScreen";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { calculateCalorieGuidance, evaluateWeeklyAdaptation } from "@/lib/fitness-engine";
import { COPY } from "@/lib/i18n";
import { buildWeeklyPlan, moveSessionToDay } from "@/lib/plan-builder";
import { clearAppState, createInitialAppState, loadAppState, saveAppState } from "@/lib/storage";
import {
  type CloudSyncStatus,
  deleteUserCloudData,
  ensureSupabaseSession,
  fetchApprovedKnowledgeBase,
  pullUserTransactions,
  syncAllTransactions,
  syncGymLog,
  syncProfileAndGoal,
  syncReport,
  syncRunLog,
  syncWeeklyCheckIn,
  syncWeeklyPlan,
  syncWeightEntry,
} from "@/lib/supabase-sync";
import type {
  AppState,
  DayOfWeek,
  GymLog,
  PlannedSession,
  RecommendationRecord,
  RunLog,
} from "@/types/fitness";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stride & Iron — Weekly Training & Calorie Planner" },
      {
        name: "description",
        content:
          "Evidence-based weekly gym and running plans, Mifflin-St Jeor calorie guidance, local session reminders, and GPS run tracking.",
      },
      {
        property: "og:title",
        content: "Stride & Iron — Weekly Training & Calorie Planner",
      },
      {
        property: "og:description",
        content:
          "Personalized weekly plans backed by reviewed expert sources, deterministic safety rules, GPS run tracking, and gym logging.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SportsActivityApp,
});

type TabKey = "today" | "plan" | "run" | "progress" | "profile";
type SubScreen = TabKey | "onboarding" | "edit-profile" | "reviewer";

export function SportsActivityApp() {
  const [state, setState] = useState<AppState>(() => createInitialAppState(true));
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<SubScreen>("today");
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [osDarkTheme, setOsDarkTheme] = useState(false);
  const [activeRunSession, setActiveRunSession] = useState<PlannedSession | undefined>(undefined);
  const [gymModalSession, setGymModalSession] = useState<PlannedSession | undefined>(undefined);
  const [gymModalOpen, setGymModalOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>({ state: "checking" });

  const initializeCloudSync = useCallback(async (localSnapshot: AppState) => {
    if (import.meta.env.MODE === "test") {
      setCloudStatus({ state: "offline", message: "Test environment" });
      return;
    }
    setCloudStatus({ state: "checking" });
    const session = await ensureSupabaseSession();

    if (!session.ok) {
      // Public read-only fetch of approved Knowledge Base still works even before user login
      const kb = await fetchApprovedKnowledgeBase().catch(() => null);
      if (kb) {
        setState((prev) => ({
          ...prev,
          recommendationRecords: [
            ...kb,
            ...prev.recommendationRecords.filter((r) => r.reviewStatus !== "approved"),
          ],
        }));
      }
      setCloudStatus({
        state: session.reason === "auth_required" ? "auth_required" : "offline",
        message: session.message,
      });
      return;
    }

    setCloudStatus({
      state: "syncing",
      userId: session.userId,
      isAnonymous: session.isAnonymous,
      ...(session.email ? { email: session.email } : {}),
    });

    try {
      const merged = await pullUserTransactions(session.userId, localSnapshot);
      if (merged) {
        setState(merged);
      }
      setCloudStatus({
        state: "synced",
        userId: session.userId,
        isAnonymous: session.isAnonymous,
        ...(session.email ? { email: session.email } : {}),
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err) {
      setCloudStatus({
        state: "offline",
        message: err instanceof Error ? err.message : "Failed to sync with Supabase.",
      });
    }
  }, []);

  // Hydrate persisted offline state, OS preferences, and Supabase cloud sync client-side
  useEffect(() => {
    const loaded = loadAppState();
    setState(loaded);
    if (!loaded.onboardingComplete) {
      setScreen("onboarding");
    }
    void initializeCloudSync(loaded);

    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
      setOsReduceMotion(motionMq.matches);
      setOsDarkTheme(darkMq.matches);
      const onMotionChange = (ev: MediaQueryListEvent) => setOsReduceMotion(ev.matches);
      const onDarkChange = (ev: MediaQueryListEvent) => setOsDarkTheme(ev.matches);
      motionMq.addEventListener("change", onMotionChange);
      darkMq.addEventListener("change", onDarkChange);
      setHydrated(true);
      return () => {
        motionMq.removeEventListener("change", onMotionChange);
        darkMq.removeEventListener("change", onDarkChange);
      };
    }
    setHydrated(true);
    return undefined;
  }, [initializeCloudSync]);

  useEffect(() => {
    if (!hydrated) return;
    saveAppState(state);
  }, [state, hydrated]);

  const effectiveDark =
    state.profile.themeMode === "dark" || (state.profile.themeMode === "system" && osDarkTheme);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", effectiveDark);
    root.setAttribute("data-type-scale", state.profile.dynamicTypeScale);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", effectiveDark ? "#0f172a" : "#f8fafc");
    }
  }, [effectiveDark, state.profile.dynamicTypeScale]);

  useEffect(() => {
    if (import.meta.env.PROD && typeof window !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const effectiveReduceMotion =
    state.profile.reduceMotionOverride === null
      ? osReduceMotion
      : state.profile.reduceMotionOverride;

  const calories = useMemo(
    () => calculateCalorieGuidance(state.profile, state.goal),
    [state.profile, state.goal],
  );

  const lang = state.profile.language;
  const copy = COPY[lang];

  function runCloudTx(task: (userId: string) => Promise<void>) {
    if (cloudStatus.state !== "synced") return;
    const { userId, isAnonymous, email } = cloudStatus;
    void task(userId)
      .then(() => {
        setCloudStatus({
          state: "synced",
          userId,
          isAnonymous,
          ...(email ? { email } : {}),
          lastSyncAt: new Date().toISOString(),
        });
      })
      .catch((err) => {
        toast.error(
          `Saved locally; Supabase sync error: ${err instanceof Error ? err.message : "unknown"}`,
        );
      });
  }

  function rebuildPlanWith(nextState: AppState): AppState {
    const regenerated = buildWeeklyPlan({
      profile: nextState.profile,
      goal: nextState.goal,
      records: nextState.recommendationRecords,
      recentRuns: nextState.runLogs,
      weekStartISO: nextState.currentPlan.weekStartISO,
      previousWeekRunMinutes: nextState.currentPlan.previousWeekRunMinutes,
    });
    return {
      ...nextState,
      currentPlan: regenerated,
    };
  }

  function handleOnboardingOrEditComplete(result: {
    profile: AppState["profile"];
    goal: AppState["goal"];
    consent: AppState["consent"];
  }) {
    const updated = rebuildPlanWith({
      ...state,
      onboardingComplete: true,
      profile: result.profile,
      goal: result.goal,
      consent: result.consent,
    });
    setState(updated);
    runCloudTx(async (uid) => {
      await syncProfileAndGoal(uid, updated);
      await syncWeeklyPlan(uid, updated.currentPlan);
    });
    toast.success("Weekly plan & calorie range updated.");
    setScreen("today");
  }

  function handleStartSession(session: PlannedSession) {
    if (session.activityType === "gym_strength") {
      setGymModalSession(session);
      setGymModalOpen(true);
    } else if (session.activityType !== "rest") {
      setActiveRunSession(session);
      setScreen("run");
    }
  }

  function handleSnoozeSession(sessionId: string) {
    const snoozedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const updatedPlan = {
      ...state.currentPlan,
      sessions: state.currentPlan.sessions.map((s) =>
        s.id === sessionId ? { ...s, snoozedUntil } : s,
      ),
    };
    setState((prev) => ({ ...prev, currentPlan: updatedPlan }));
    runCloudTx((uid) => syncWeeklyPlan(uid, updatedPlan));
    toast.info("Reminder snoozed for 30 minutes.");
  }

  function handleUpdateSessionStatus(sessionId: string, status: PlannedSession["status"]) {
    const updatedPlan = {
      ...state.currentPlan,
      sessions: state.currentPlan.sessions.map((s) => (s.id === sessionId ? { ...s, status } : s)),
    };
    setState((prev) => ({ ...prev, currentPlan: updatedPlan }));
    runCloudTx((uid) => syncWeeklyPlan(uid, updatedPlan));
    toast.success(`Session marked as ${status}.`);
  }

  function handleMoveSession(sessionId: string, targetDay: DayOfWeek) {
    const result = moveSessionToDay(
      state.currentPlan,
      sessionId,
      targetDay,
      state.recommendationRecords,
      state.profile,
      state.goal,
    );
    if (!result.ok) {
      toast.error(result.reason);
      return { ok: false, reason: result.reason };
    }
    setState((prev) => ({ ...prev, currentPlan: result.plan }));
    runCloudTx((uid) => syncWeeklyPlan(uid, result.plan));
    toast.success("Session moved & safety rules re-verified.");
    return { ok: true };
  }

  function handleSaveRun(run: RunLog) {
    const updatedPlan = {
      ...state.currentPlan,
      sessions: state.currentPlan.sessions.map((s) =>
        run.plannedSessionId && s.id === run.plannedSessionId
          ? { ...s, status: "done" as const, completedLogId: run.id }
          : s,
      ),
    };
    setState((prev) => ({
      ...prev,
      runLogs: [run, ...prev.runLogs],
      currentPlan: updatedPlan,
    }));
    setActiveRunSession(undefined);
    runCloudTx(async (uid) => {
      await syncRunLog(uid, run);
      await syncWeeklyPlan(uid, updatedPlan);
    });
    toast.success("Run saved to history and Supabase.");
  }

  function handleSaveGymLog(log: GymLog) {
    const updatedPlan = {
      ...state.currentPlan,
      sessions: state.currentPlan.sessions.map((s) =>
        log.plannedSessionId && s.id === log.plannedSessionId
          ? { ...s, status: "done" as const, completedLogId: log.id }
          : s,
      ),
    };
    setState((prev) => ({
      ...prev,
      gymLogs: [log, ...prev.gymLogs],
      currentPlan: updatedPlan,
    }));
    runCloudTx(async (uid) => {
      await syncGymLog(uid, log);
      await syncWeeklyPlan(uid, updatedPlan);
    });
    toast.success("Gym workout logged & synced.");
  }

  function handleAddWeightEntry(weightKg: number) {
    const todayISO = "2026-11-27";
    const newEntry = { id: `w-${Date.now()}`, dateISO: todayISO, weightKg };
    const updated = rebuildPlanWith({
      ...state,
      profile: {
        ...state.profile,
        weightKg,
        updatedAt: new Date().toISOString(),
      },
      weightEntries: [...state.weightEntries.filter((e) => e.dateISO !== todayISO), newEntry],
    });
    setState(updated);
    runCloudTx(async (uid) => {
      await syncWeightEntry(uid, newEntry);
      await syncProfileAndGoal(uid, updated);
      await syncWeeklyPlan(uid, updated.currentPlan);
    });
    toast.success("Weight entry recorded & synced.");
  }

  function handleSubmitReport(recordId: string, reason: string) {
    const report = {
      id: `rep-${Date.now()}`,
      recordId,
      reason,
      details: "Submitted from Why this? view",
      createdAt: new Date().toISOString(),
      status: "open" as const,
    };
    setState((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
    }));
    runCloudTx((uid) => syncReport(uid, report));
    toast.success("Report submitted to Content Reviewer Console.");
  }

  function handleUpdateReviewerRecord(updated: RecommendationRecord) {
    const nextState = rebuildPlanWith({
      ...state,
      recommendationRecords: state.recommendationRecords.map((r) =>
        r.id === updated.id ? updated : r,
      ),
    });
    setState(nextState);
    runCloudTx((uid) => syncWeeklyPlan(uid, nextState.currentPlan));
    toast.success(`Record updated (${updated.reviewStatus.replace("_", " ")}).`);
  }

  function handleRunWeeklyCheckIn(): string {
    const nonRest = state.currentPlan.sessions.filter((s) => s.activityType !== "rest");
    const doneCount = nonRest.filter((s) => s.status === "done").length;
    const adherenceRate = nonRest.length > 0 ? doneCount / nonRest.length : 1;

    const adaptation = evaluateWeeklyAdaptation({
      adherenceRate,
      weightEntries: state.weightEntries,
      profile: state.profile,
      goal: state.goal,
      previousWeekRunMinutes: state.currentPlan.plannedRunMinutes,
    });

    const nextPlan = buildWeeklyPlan({
      profile: state.profile,
      goal: state.goal,
      records: state.recommendationRecords,
      recentRuns: state.runLogs,
      weekStartISO: state.currentPlan.weekStartISO,
      previousWeekRunMinutes: adaptation.recommendedRunVolumeMinutes,
    });

    setState((prev) => ({
      ...prev,
      currentPlan: nextPlan,
      checkIns: [adaptation.checkIn, ...prev.checkIns],
    }));

    runCloudTx(async (uid) => {
      await syncWeeklyCheckIn(uid, adaptation.checkIn);
      await syncWeeklyPlan(uid, nextPlan);
    });

    toast.success("Weekly check-in applied.");
    return adaptation.summary;
  }

  function handleDeleteAllData() {
    if (cloudStatus.state === "synced") {
      void deleteUserCloudData(cloudStatus.userId).catch(() => {});
    }
    clearAppState();
    const fresh = createInitialAppState(false);
    setState(fresh);
    setScreen("onboarding");
    toast.info("All personal data cleared.");
  }

  function updatePreferencesAndSync(updater: (prev: AppState) => AppState) {
    setState((prev) => {
      const next = updater(prev);
      runCloudTx((uid) => syncProfileAndGoal(uid, next));
      return next;
    });
  }

  const navItems: { id: TabKey; label: string; icon: typeof Flame }[] = [
    { id: "today", label: copy.navToday, icon: Flame },
    { id: "plan", label: copy.navPlan, icon: CalendarDays },
    { id: "run", label: copy.navRun, icon: Compass },
    { id: "progress", label: copy.navProgress, icon: LineChart },
    { id: "profile", label: copy.navProfile, icon: UserRound },
  ];

  const showBottomNav =
    screen !== "onboarding" && screen !== "edit-profile" && screen !== "reviewer";

  return (
    <div className="app-stage">
      <Toaster position="top-center" />
      <main
        className="app-frame"
        data-reduce-motion={effectiveReduceMotion ? "true" : "false"}
        data-type-scale={state.profile.dynamicTypeScale}
      >
        <StatusBar />

        {screen === "onboarding" || screen === "edit-profile" ? (
          <OnboardingWizard
            initialProfile={state.profile}
            initialGoal={state.goal}
            initialConsent={state.consent}
            isEditingExisting={screen === "edit-profile"}
            onCancel={() => setScreen("today")}
            onComplete={handleOnboardingOrEditComplete}
          />
        ) : (
          <section className="app-page" aria-live="polite">
            {screen === "today" && (
              <TodayScreen
                state={state}
                calories={calories}
                cloudStatus={cloudStatus}
                reduceMotion={effectiveReduceMotion}
                onStartSession={handleStartSession}
                onSnoozeSession={handleSnoozeSession}
                onSkipSession={(id) => handleUpdateSessionStatus(id, "skipped")}
                onOpenPlan={() => setScreen("plan")}
                onSubmitReport={handleSubmitReport}
                onEditProfile={() => setScreen("edit-profile")}
                onOpenCloudSync={() => setCloudModalOpen(true)}
              />
            )}

            {screen === "plan" && (
              <PlanScreen
                state={state}
                onMoveSession={handleMoveSession}
                onStartSession={handleStartSession}
                onMarkStatus={handleUpdateSessionStatus}
                onRegeneratePlan={() => {
                  const rebuilt = rebuildPlanWith(state);
                  setState(rebuilt);
                  runCloudTx((uid) => syncWeeklyPlan(uid, rebuilt.currentPlan));
                  toast.success("Weekly plan rebuilt from reviewed KB.");
                }}
                onRunWeeklyCheckIn={handleRunWeeklyCheckIn}
              />
            )}

            {screen === "run" && (
              <RunTrackerScreen
                state={state}
                activePlannedSession={activeRunSession}
                reduceMotion={effectiveReduceMotion}
                onPermissionChange={(permission) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    consent: { ...prev.consent, locationPermission: permission },
                  }))
                }
                onSaveRun={handleSaveRun}
              />
            )}

            {screen === "progress" && (
              <ProgressScreen state={state} onAddWeightEntry={handleAddWeightEntry} />
            )}

            {screen === "profile" && (
              <ProfileSettingsScreen
                state={state}
                cloudStatus={cloudStatus}
                onEditProfile={() => setScreen("edit-profile")}
                onOpenCloudSync={() => setCloudModalOpen(true)}
                onChangeUnits={(unitSystem) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, unitSystem },
                  }))
                }
                onChangeLanguage={(language) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, language },
                  }))
                }
                onChangeTheme={(themeMode) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, themeMode },
                  }))
                }
                onToggleReduceMotion={(reduceMotionOverride) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, reduceMotionOverride },
                  }))
                }
                onChangeDynamicType={(dynamicTypeScale) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, dynamicTypeScale },
                  }))
                }
                onUpdateNotifications={(notificationSettings) =>
                  updatePreferencesAndSync((prev) => ({ ...prev, notificationSettings }))
                }
                onToggleHealthKit={(healthKitSyncEnabled) =>
                  updatePreferencesAndSync((prev) => ({
                    ...prev,
                    consent: { ...prev.consent, healthKitSyncEnabled },
                  }))
                }
                onToggleV11Adaptation={(v11AdaptationEnabled) =>
                  updatePreferencesAndSync((prev) => ({ ...prev, v11AdaptationEnabled }))
                }
                onOpenReviewerConsole={() => setScreen("reviewer")}
                onExportSuccess={() => toast.success("Personal data bundle exported (JSON).")}
                onDeleteAllData={handleDeleteAllData}
              />
            )}

            {screen === "reviewer" && (
              <ReviewerConsoleScreen
                state={state}
                onBack={() => setScreen("profile")}
                onUpdateRecord={handleUpdateReviewerRecord}
                onResolveReport={(reportId) => {
                  const target = state.reports.find((r) => r.id === reportId);
                  setState((prev) => ({
                    ...prev,
                    reports: prev.reports.map((r) =>
                      r.id === reportId ? { ...r, status: "resolved" } : r,
                    ),
                  }));
                  if (target) {
                    runCloudTx((uid) => syncReport(uid, { ...target, status: "resolved" }));
                  }
                }}
              />
            )}
          </section>
        )}

        {showBottomNav && (
          <nav className="bottom-navigation" aria-label="Main navigation">
            {navItems.map((item) => {
              const NavIcon = item.icon;
              const isActive = screen === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  aria-current={isActive ? "page" : undefined}
                  className={`nav-item${isActive ? " nav-item-active" : ""}`}
                  onClick={() => setScreen(item.id)}
                >
                  <NavIcon />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>
        )}

        <GymLoggerModal
          open={gymModalOpen}
          state={state}
          plannedSession={gymModalSession}
          onClose={() => setGymModalOpen(false)}
          onSaveLog={handleSaveGymLog}
        />

        <CloudSyncModal
          open={cloudModalOpen}
          status={cloudStatus}
          onClose={() => setCloudModalOpen(false)}
          onAuthSuccess={async () => {
            await initializeCloudSync(state);
          }}
          onManualSync={async () => {
            if (cloudStatus.state !== "synced") return;
            await syncAllTransactions(cloudStatus.userId, state);
            setCloudStatus({
              ...cloudStatus,
              lastSyncAt: new Date().toISOString(),
            });
            toast.success("All local transactions synced to Supabase.");
          }}
        />
      </main>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-label="Device status">
      <span className="tabular-nums">9:41</span>
      <div className="status-icons" aria-hidden="true">
        <Signal />
        <Wifi />
        <BatteryFull />
      </div>
    </div>
  );
}
