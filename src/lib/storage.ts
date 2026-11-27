import { INITIAL_KB_VERSION, INITIAL_RECOMMENDATION_RECORDS } from "@/data/knowledge-base";
import { buildWeeklyPlan, getMondayOfWeekISO } from "@/lib/plan-builder";
import type { AppState, GoalType, UserGoal, UserProfile } from "@/types/fitness";

export const STORAGE_KEY = "sports_activity_app_state_v1";

export function createDefaultProfile(): UserProfile {
  return {
    id: "user-dimas",
    name: "Dimas A.",
    age: 28,
    sex: "male",
    weightKg: 74,
    heightCm: 175,
    activityLevel: "moderate",
    experienceLevel: "intermediate",
    gymAccess: true,
    availableDays: [0, 1, 3, 5, 6], // Mon, Tue, Thu, Sat, Sun
    unitSystem: "metric",
    language: "en",
    themeMode: "light",
    reduceMotionOverride: null,
    dynamicTypeScale: "standard",
    selfReported5kMinutes: 27,
    screening: {
      pregnancy: false,
      heartCondition: false,
      jointOrInjury: false,
      eatingDisorderHistory: false,
    },
    createdAt: "2026-11-20T08:00:00Z",
    updatedAt: "2026-11-27T08:00:00Z",
  };
}

export function createDefaultGoal(type: GoalType = "improve_running"): UserGoal {
  return {
    id: "goal-primary",
    type,
    targetWeightKg: 71,
    targetDate: "2027-02-20",
    runningTargetType: "pace",
    runningTargetDescription: "Run 5K under 24:00 steadily",
    weeklyRunningCapMinutes: 140,
    updatedAt: "2026-11-27T08:00:00Z",
  };
}

export function createInitialAppState(onboardingComplete = true): AppState {
  const profile = createDefaultProfile();
  const goal = createDefaultGoal("improve_running");
  const weekStartISO = getMondayOfWeekISO("2026-11-27");

  const recentRuns = [
    {
      id: "run-seed-1",
      runKind: "casual_run" as const,
      title: "Morning Park Casual Run",
      dateISO: "2026-11-21",
      distanceKm: 5.2,
      durationSec: 1860,
      avgPaceMinPerKm: 5.96,
      splits: [
        { splitNumber: 1, durationSec: 362, paceMinPerKm: 6.03 },
        { splitNumber: 2, durationSec: 356, paceMinPerKm: 5.93 },
        { splitNumber: 3, durationSec: 358, paceMinPerKm: 5.97 },
        { splitNumber: 4, durationSec: 354, paceMinPerKm: 5.9 },
        { splitNumber: 5, durationSec: 352, paceMinPerKm: 5.87 },
      ],
      routePoints: [
        { lat: -6.2088, lng: 106.8456, timestampMs: 0 },
        { lat: -6.2062, lng: 106.8471, timestampMs: 420000 },
        { lat: -6.2041, lng: 106.8495, timestampMs: 920000 },
        { lat: -6.2069, lng: 106.8504, timestampMs: 1420000 },
        { lat: -6.2088, lng: 106.8456, timestampMs: 1860000 },
      ],
      entrySource: "gps" as const,
      notes: "Felt steady; easy breathing throughout.",
      createdAt: "2026-11-21T07:15:00Z",
    },
  ];

  const plan = buildWeeklyPlan({
    profile,
    goal,
    records: INITIAL_RECOMMENDATION_RECORDS,
    recentRuns,
    weekStartISO,
    previousWeekRunMinutes: 120,
  });

  // Mark Monday & Tuesday as completed so Progress & Reference history feel realistic on first load
  plan.sessions = plan.sessions.map((s) =>
    s.dayIndex === 0 || s.dayIndex === 1 ? { ...s, status: "done" } : s,
  );

  return {
    onboardingComplete,
    profile,
    goal,
    consent: {
      id: "consent-1",
      acceptedMedicalDisclaimer: onboardingComplete,
      acceptedAge18Plus: onboardingComplete,
      acceptedHealthDataProcessing: onboardingComplete,
      locationPermission: "prompt",
      notificationPermission: "granted",
      healthKitSyncEnabled: false,
      consentedAt: "2026-11-20T08:00:00Z",
    },
    knowledgeBaseVersion: INITIAL_KB_VERSION,
    recommendationRecords: INITIAL_RECOMMENDATION_RECORDS,
    reports: [],
    currentPlan: plan,
    gymLogs: [
      {
        id: "gym-seed-1",
        templateId: "gym-runners-durability",
        title: "Runner's Strength & Durability",
        dateISO: "2026-11-24",
        durationMinutes: 38,
        exercises: [
          {
            exerciseId: "ex-split-squat",
            exerciseName: "Rear-Foot Elevated Split Squat",
            setsCompleted: 3,
            repsPerSet: "8 / side",
            weightKg: 24,
          },
          {
            exerciseId: "ex-calf-raise",
            exerciseName: "Weighted Standing Calf Raise",
            setsCompleted: 3,
            repsPerSet: "14",
            weightKg: 35,
          },
          {
            exerciseId: "ex-hip-thrust",
            exerciseName: "Barbell or Dumbbell Hip Thrust",
            setsCompleted: 3,
            repsPerSet: "10",
            weightKg: 50,
          },
        ],
        notes: "Good single-leg stability on left side.",
        createdAt: "2026-11-24T18:45:00Z",
      },
    ],
    runLogs: recentRuns,
    weightEntries: [
      { id: "w-1", dateISO: "2026-11-06", weightKg: 75.1 },
      { id: "w-2", dateISO: "2026-11-13", weightKg: 74.6 },
      { id: "w-3", dateISO: "2026-11-20", weightKg: 74.3 },
      { id: "w-4", dateISO: "2026-11-27", weightKg: 74.0 },
    ],
    notificationSettings: {
      enabled: true,
      leadTimeMinutes: 30,
      quietHoursStart: "22:00",
      quietHoursEnd: "06:30",
      perActivity: {
        gym_strength: true,
        casual_run: true,
        interval_run: true,
        tempo_run: true,
        long_run: true,
      },
      nudges: {
        missedSession: true,
        weeklyPlanReady: true,
        weeklySummary: true,
      },
    },
    checkIns: [],
    reviewerMode: false,
    v11AdaptationEnabled: true,
  };
}

export function loadAppState(): AppState {
  if (typeof window === "undefined") {
    return createInitialAppState(true);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialAppState(true);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed.profile || !parsed.currentPlan || !parsed.recommendationRecords) {
      return createInitialAppState(true);
    }
    return {
      ...createInitialAppState(true),
      ...parsed,
    };
  } catch {
    return createInitialAppState(true);
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearAppState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function buildExportBundle(state: AppState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      schema: "sports-activity-export-v1",
      profile: state.profile,
      goal: state.goal,
      consent: state.consent,
      currentPlan: state.currentPlan,
      gymLogs: state.gymLogs,
      runLogs: state.runLogs,
      weightEntries: state.weightEntries,
      notificationSettings: state.notificationSettings,
      checkIns: state.checkIns,
    },
    null,
    2,
  );
}
