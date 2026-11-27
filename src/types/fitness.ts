export type UnitSystem = "metric" | "imperial";
export type Language = "en" | "id";
export type ThemeMode = "light" | "dark" | "system";
export type BiologicalSex = "female" | "male";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type GoalType = "lose_weight" | "gain_muscle" | "maintain" | "improve_running";
export type RunningTargetType = "distance" | "pace";

export type ActivityType =
  "gym_strength" | "casual_run" | "interval_run" | "tempo_run" | "long_run" | "rest";

export type SessionStatus = "planned" | "done" | "skipped" | "missed";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Mon ... 6 = Sun

export interface HealthScreening {
  pregnancy: boolean;
  heartCondition: boolean;
  jointOrInjury: boolean;
  eatingDisorderHistory: boolean;
  notes?: string | undefined;
}

export interface ConsentRecord {
  id: string;
  acceptedMedicalDisclaimer: boolean;
  acceptedAge18Plus: boolean;
  acceptedHealthDataProcessing: boolean;
  locationPermission: "granted" | "denied" | "prompt";
  notificationPermission: "granted" | "denied" | "prompt";
  healthKitSyncEnabled: boolean; // v1.1 preview
  consentedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  experienceLevel: ExperienceLevel;
  gymAccess: boolean;
  availableDays: DayOfWeek[]; // sorted 0..6 (Mon..Sun)
  unitSystem: UnitSystem;
  language: Language;
  themeMode: ThemeMode;
  reduceMotionOverride: boolean | null; // null = follow OS prefers-reduced-motion
  dynamicTypeScale: "standard" | "large" | "xlarge";
  selfReported5kMinutes?: number | undefined;
  screening: HealthScreening;
  createdAt: string;
  updatedAt: string;
}

export interface UserGoal {
  id: string;
  type: GoalType;
  targetWeightKg?: number | undefined;
  targetDate?: string | undefined; // YYYY-MM-DD
  runningTargetType?: RunningTargetType | undefined;
  runningTargetDescription?: string | undefined;
  weeklyRunningCapMinutes?: number | undefined;
  updatedAt: string;
}

export interface CalorieGuidance {
  bmr: number;
  activityMultiplier: number;
  maintenanceCalories: number;
  dailyTarget: number;
  rangeMin: number;
  rangeMax: number;
  dailyAdjustment: number;
  weeklyWeightChangeKg: number;
  bmi: number;
  calorieFloor: number;
  wasFloorApplied: boolean;
  wasLossRateCapped: boolean;
  wasBmiRestricted: boolean;
  wasScreeningRestricted: boolean;
  isGoalBlocked: boolean;
  warnings: string[];
  formulaSummary: string;
}

export interface SourceCitation {
  id: string;
  title: string;
  organization: string;
  url: string;
  retrievalDate: string;
  contentHash: string;
  passage: string;
  termsChecked: boolean;
}

export type ReviewStatus = "approved" | "pending_review" | "rejected";

export interface RecommendationRecord {
  id: string;
  version: string;
  activityType: ActivityType;
  level: ExperienceLevel | "all";
  goal: GoalType | "all";
  weeklyFrequencyMin: number;
  weeklyFrequencyMax: number;
  sessionDurationMin: number;
  sessionDurationMax: number;
  intensityGuidance: string;
  recoveryGuidance: string;
  caveats: string;
  whyThisSummary: string;
  sourceId: string;
  source: SourceCitation;
  reviewStatus: ReviewStatus;
  reviewerName?: string | undefined;
  reviewerCredential?: string | undefined;
  reviewedAt?: string | undefined;
  modelVersion: string;
  isConservativeFallback?: boolean | undefined;
}

export interface RecommendationReport {
  id: string;
  recordId: string;
  reason: string;
  details: string;
  createdAt: string;
  status: "open" | "resolved";
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: "gym" | "bodyweight";
  description: string;
  formTips: string[];
}

export interface GymTemplate {
  id: string;
  name: string;
  splitLabel: string;
  goal: GoalType | "all";
  level: ExperienceLevel | "all";
  requiresGym: boolean;
  estimatedMinutes: number;
  exercises: ExerciseItem[];
}

export interface IntervalSegment {
  phase: "warmup" | "work" | "rest" | "cooldown";
  label: string;
  durationSec: number;
  targetEffort: string;
}

export interface RunPrescription {
  runKind: "casual_run" | "interval_run" | "tempo_run" | "long_run";
  targetDurationMinutes: number;
  estimatedDistanceKm: number;
  paceMinPerKmLow: number;
  paceMinPerKmHigh: number;
  effortLabel: string;
  explanation: string;
  segments?: IntervalSegment[] | undefined;
  repeats?: number | undefined;
}

export interface PlannedSession {
  id: string;
  planId: string;
  dayIndex: DayOfWeek;
  dateISO: string; // YYYY-MM-DD
  activityType: ActivityType;
  title: string;
  targetDurationMinutes: number;
  status: SessionStatus;
  recommendationRecordId?: string | undefined;
  isHardSession: boolean;
  gymTemplateId?: string | undefined;
  runPrescription?: RunPrescription | undefined;
  completedLogId?: string | undefined;
  snoozedUntil?: string | undefined;
}

export interface WeeklyPlan {
  id: string;
  weekStartISO: string; // Monday YYYY-MM-DD
  generatedAt: string;
  previousWeekRunMinutes: number;
  plannedRunMinutes: number;
  progressionPercent: number;
  knowledgeBaseVersion: string;
  safetyChecks: {
    hasRestDay: boolean;
    noConsecutiveHardDays: boolean;
    withinFrequencyBounds: boolean;
    withinVolumeProgressionCap: boolean;
    screeningRespected: boolean;
  };
  sessions: PlannedSession[];
  warnings: string[];
}

export interface LoggedExerciseSet {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsPerSet: string;
  weightKg?: number | undefined;
}

export interface GymLog {
  id: string;
  plannedSessionId?: string | undefined;
  templateId?: string | undefined;
  title: string;
  dateISO: string;
  durationMinutes: number;
  exercises: LoggedExerciseSet[];
  notes: string;
  createdAt: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestampMs: number;
  altitudeM?: number | undefined;
}

export interface RunSplit {
  splitNumber: number; // 1km or 1mi
  durationSec: number;
  paceMinPerKm: number;
}

export interface RunLog {
  id: string;
  plannedSessionId?: string | undefined;
  runKind: "casual_run" | "interval_run" | "tempo_run" | "long_run";
  title: string;
  dateISO: string;
  distanceKm: number;
  durationSec: number;
  avgPaceMinPerKm: number;
  splits: RunSplit[];
  routePoints: RoutePoint[];
  entrySource: "gps" | "simulated_gps" | "manual";
  intervalSegmentsCompleted?: number | undefined;
  notes?: string | undefined;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  dateISO: string;
  weightKg: number;
  note?: string | undefined;
}

export interface NotificationSettings {
  enabled: boolean;
  leadTimeMinutes: number; // 15 | 30 | 60
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  perActivity: Record<Exclude<ActivityType, "rest">, boolean>;
  nudges: {
    missedSession: boolean;
    weeklyPlanReady: boolean;
    weeklySummary: boolean;
  };
}

export interface ScheduledNotificationItem {
  id: string;
  sessionId?: string | undefined;
  title: string;
  body: string;
  scheduledAtISO: string;
  activityType: ActivityType | "system";
  suppressedByQuietHours: boolean;
}

export interface WeeklyCheckIn {
  id: string;
  weekStartISO: string;
  adherenceRate: number;
  weightDeltaKg: number;
  energyRating: "low" | "good" | "high";
  adaptationApplied: string;
  createdAt: string;
}

export interface AppState {
  onboardingComplete: boolean;
  profile: UserProfile;
  goal: UserGoal;
  consent: ConsentRecord;
  knowledgeBaseVersion: string;
  recommendationRecords: RecommendationRecord[];
  reports: RecommendationReport[];
  currentPlan: WeeklyPlan;
  gymLogs: GymLog[];
  runLogs: RunLog[];
  weightEntries: WeightEntry[];
  notificationSettings: NotificationSettings;
  checkIns: WeeklyCheckIn[];
  reviewerMode: boolean;
  v11AdaptationEnabled: boolean;
}
