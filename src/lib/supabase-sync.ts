import { getSupabaseClient } from "@/lib/supabase";
import type {
  ActivityLevel,
  ActivityType,
  AppState,
  BiologicalSex,
  ConsentRecord,
  DayOfWeek,
  ExperienceLevel,
  GoalType,
  GymLog,
  HealthScreening,
  Language,
  NotificationSettings,
  PlannedSession,
  RecommendationRecord,
  RecommendationReport,
  RunLog,
  ThemeMode,
  UnitSystem,
  UserGoal,
  WeeklyCheckIn,
  WeeklyPlan,
  WeightEntry,
} from "@/types/fitness";

export type CloudSyncStatus =
  | { state: "checking" }
  | { state: "synced"; userId: string; isAnonymous: boolean; email?: string; lastSyncAt: string }
  | { state: "syncing"; userId: string; isAnonymous: boolean; email?: string }
  | { state: "auth_required"; message: string }
  | { state: "offline"; message: string };

export async function ensureSupabaseSession(): Promise<
  | { ok: true; userId: string; isAnonymous: boolean; email?: string }
  | { ok: false; reason: "auth_required" | "offline"; message: string }
> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, reason: "offline", message: "Browser client unavailable." };
  }

  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      return { ok: false, reason: "offline", message: sessionErr.message };
    }

    if (sessionData.session?.user) {
      const u = sessionData.session.user;
      return {
        ok: true,
        userId: u.id,
        isAnonymous: Boolean(u.is_anonymous),
        ...(u.email ? { email: u.email } : {}),
      };
    }

    // Attempt automatic anonymous sign-in (works immediately once enabled in Supabase Auth)
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
    if (anonErr || !anonData.user) {
      const msg = anonErr?.message ?? "Sign in required for cloud sync.";
      const isDisabled = msg.toLowerCase().includes("anonymous");
      return {
        ok: false,
        reason: isDisabled ? "auth_required" : "offline",
        message: isDisabled
          ? "Anonymous sign-in is disabled on this Supabase project; sign in with email or enable anonymous sign-ins in Supabase Auth."
          : msg,
      };
    }

    return {
      ok: true,
      userId: anonData.user.id,
      isAnonymous: true,
    };
  } catch (err) {
    return {
      ok: false,
      reason: "offline",
      message: err instanceof Error ? err.message : "Network unavailable",
    };
  }
}

export async function fetchApprovedKnowledgeBase(): Promise<RecommendationRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sa_recommendation_records")
    .select("*, sa_sources(*)")
    .eq("review_status", "approved");

  if (error || !data || data.length === 0) return null;

  return data.map((row) => {
    const src = row["sa_sources"] as Record<string, unknown> | null;
    return {
      id: String(row["id"]),
      version: String(row["version"]),
      activityType: row["activity_type"] as ActivityType,
      level: row["level"] as ExperienceLevel | "all",
      goal: row["goal"] as GoalType | "all",
      weeklyFrequencyMin: Number(row["weekly_frequency_min"]),
      weeklyFrequencyMax: Number(row["weekly_frequency_max"]),
      sessionDurationMin: Number(row["session_duration_min"]),
      sessionDurationMax: Number(row["session_duration_max"]),
      intensityGuidance: String(row["intensity_guidance"]),
      recoveryGuidance: String(row["recovery_guidance"]),
      caveats: String(row["caveats"]),
      whyThisSummary: String(row["why_this_summary"]),
      sourceId: String(row["source_id"]),
      source: {
        id: String(src?.["id"] ?? row["source_id"]),
        title: String(src?.["title"] ?? ""),
        organization: String(src?.["organization"] ?? ""),
        url: String(src?.["url"] ?? "https://www.who.int"),
        retrievalDate: String(src?.["retrieval_date"] ?? "2026-11-10"),
        contentHash: String(src?.["content_hash"] ?? ""),
        passage: String(src?.["passage"] ?? ""),
        termsChecked: Boolean(src?.["terms_checked"] ?? true),
      },
      reviewStatus: "approved",
      reviewerName: row["reviewer_name"] ? String(row["reviewer_name"]) : undefined,
      reviewerCredential: row["reviewer_credential"]
        ? String(row["reviewer_credential"])
        : undefined,
      reviewedAt: row["reviewed_at"] ? String(row["reviewed_at"]) : undefined,
      modelVersion: String(row["model_version"]),
    };
  });
}

export async function syncProfileAndGoal(userId: string, state: AppState): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("sa_profiles").upsert(
    {
      user_id: userId,
      name: state.profile.name,
      age: Math.max(18, state.profile.age),
      sex: state.profile.sex,
      weight_kg: state.profile.weightKg,
      height_cm: state.profile.heightCm,
      activity_level: state.profile.activityLevel,
      experience_level: state.profile.experienceLevel,
      gym_access: state.profile.gymAccess,
      available_days: state.profile.availableDays,
      unit_system: state.profile.unitSystem,
      language: state.profile.language,
      theme_mode: state.profile.themeMode,
      reduce_motion_override: state.profile.reduceMotionOverride,
      dynamic_type_scale: state.profile.dynamicTypeScale,
      self_reported_5k_minutes: state.profile.selfReported5kMinutes ?? null,
      screening: state.profile.screening,
      goal: state.goal,
      consent: state.consent,
      notification_settings: state.notificationSettings,
      v11_adaptation_enabled: state.v11AdaptationEnabled,
      onboarding_complete: state.onboardingComplete,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function syncWeeklyPlan(userId: string, plan: WeeklyPlan): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: planRow, error: planErr } = await supabase
    .from("sa_weekly_plans")
    .upsert(
      {
        user_id: userId,
        client_id: plan.id,
        week_start_iso: plan.weekStartISO,
        previous_week_run_minutes: plan.previousWeekRunMinutes,
        planned_run_minutes: plan.plannedRunMinutes,
        progression_percent: plan.progressionPercent,
        knowledge_base_version: plan.knowledgeBaseVersion,
        safety_checks: plan.safetyChecks,
        warnings: plan.warnings,
        generated_at: plan.generatedAt,
      },
      { onConflict: "user_id,client_id" },
    )
    .select("id")
    .single();

  if (planErr || !planRow) throw planErr ?? new Error("Failed to upsert weekly plan");

  const planDbId = Number(planRow["id"]);
  const sessionRows = plan.sessions.map((s) => ({
    user_id: userId,
    plan_id: planDbId,
    client_id: s.id,
    day_index: s.dayIndex,
    date_iso: s.dateISO,
    activity_type: s.activityType,
    title: s.title,
    target_duration_minutes: s.targetDurationMinutes,
    status: s.status,
    recommendation_record_id: s.recommendationRecordId ?? null,
    is_hard_session: s.isHardSession,
    gym_template_id: s.gymTemplateId ?? null,
    run_prescription: s.runPrescription ?? null,
    completed_log_client_id: s.completedLogId ?? null,
    snoozed_until: s.snoozedUntil ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error: sessErr } = await supabase
    .from("sa_planned_sessions")
    .upsert(sessionRows, { onConflict: "user_id,client_id" });

  if (sessErr) throw sessErr;
}

export async function syncRunLog(userId: string, run: RunLog): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("sa_run_logs").upsert(
    {
      user_id: userId,
      client_id: run.id,
      planned_session_client_id: run.plannedSessionId ?? null,
      run_kind: run.runKind,
      title: run.title,
      date_iso: run.dateISO,
      distance_km: run.distanceKm,
      duration_sec: run.durationSec,
      avg_pace_min_per_km: run.avgPaceMinPerKm,
      splits: run.splits,
      route_points: run.routePoints,
      entry_source: run.entrySource,
      interval_segments_completed: run.intervalSegmentsCompleted ?? null,
      notes: run.notes ?? null,
      created_at: run.createdAt,
    },
    { onConflict: "user_id,client_id" },
  );

  if (error) throw error;
}

export async function syncGymLog(userId: string, gym: GymLog): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("sa_gym_logs").upsert(
    {
      user_id: userId,
      client_id: gym.id,
      planned_session_client_id: gym.plannedSessionId ?? null,
      template_id: gym.templateId ?? null,
      title: gym.title,
      date_iso: gym.dateISO,
      duration_minutes: gym.durationMinutes,
      exercises: gym.exercises,
      notes: gym.notes,
      created_at: gym.createdAt,
    },
    { onConflict: "user_id,client_id" },
  );

  if (error) throw error;
}

export async function syncWeightEntry(userId: string, entry: WeightEntry): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("sa_weight_entries").upsert(
    {
      user_id: userId,
      client_id: entry.id,
      date_iso: entry.dateISO,
      weight_kg: entry.weightKg,
      note: entry.note ?? null,
    },
    { onConflict: "user_id,date_iso" },
  );

  if (error) throw error;
}

export async function syncWeeklyCheckIn(userId: string, checkIn: WeeklyCheckIn): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("sa_weekly_checkins").upsert(
    {
      user_id: userId,
      client_id: checkIn.id,
      week_start_iso: checkIn.weekStartISO,
      adherence_rate: checkIn.adherenceRate,
      weight_delta_kg: checkIn.weightDeltaKg,
      energy_rating: checkIn.energyRating,
      adaptation_applied: checkIn.adaptationApplied,
      created_at: checkIn.createdAt,
    },
    { onConflict: "user_id,client_id" },
  );

  if (error) throw error;
}

export async function syncReport(userId: string, report: RecommendationReport): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("sa_recommendation_reports").upsert(
    {
      user_id: userId,
      client_id: report.id,
      record_id: report.recordId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      created_at: report.createdAt,
    },
    { onConflict: "user_id,client_id" },
  );

  if (error) throw error;
}

export async function syncAllTransactions(userId: string, state: AppState): Promise<void> {
  await syncProfileAndGoal(userId, state);
  await syncWeeklyPlan(userId, state.currentPlan);
  for (const run of state.runLogs) {
    await syncRunLog(userId, run);
  }
  for (const gym of state.gymLogs) {
    await syncGymLog(userId, gym);
  }
  for (const weight of state.weightEntries) {
    await syncWeightEntry(userId, weight);
  }
  for (const checkIn of state.checkIns) {
    await syncWeeklyCheckIn(userId, checkIn);
  }
  for (const report of state.reports) {
    await syncReport(userId, report);
  }
}

export async function pullUserTransactions(
  userId: string,
  fallbackState: AppState,
): Promise<AppState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [profileRes, plansRes, runsRes, gymsRes, weightsRes, checkInsRes, reportsRes, kbRecords] =
    await Promise.all([
      supabase.from("sa_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("sa_weekly_plans")
        .select("*, sa_planned_sessions(*)")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sa_run_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sa_gym_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sa_weight_entries")
        .select("*")
        .eq("user_id", userId)
        .order("date_iso", { ascending: true }),
      supabase
        .from("sa_weekly_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sa_recommendation_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      fetchApprovedKnowledgeBase(),
    ]);

  if (!profileRes.data) {
    // First-time cloud user: push local transactions up to Supabase
    await syncAllTransactions(userId, fallbackState);
    return kbRecords
      ? {
          ...fallbackState,
          recommendationRecords: [
            ...kbRecords,
            ...fallbackState.recommendationRecords.filter((r) => r.reviewStatus !== "approved"),
          ],
        }
      : null;
  }

  const p = profileRes.data as Record<string, unknown>;
  const rawSessions = (
    (plansRes.data?.["sa_planned_sessions"] as Record<string, unknown>[] | undefined) ?? []
  ).sort((a, b) => Number(a["day_index"]) - Number(b["day_index"]));

  const hydratedPlan: WeeklyPlan = plansRes.data
    ? {
        id: String(plansRes.data["client_id"]),
        weekStartISO: String(plansRes.data["week_start_iso"]),
        generatedAt: String(plansRes.data["generated_at"]),
        previousWeekRunMinutes: Number(plansRes.data["previous_week_run_minutes"]),
        plannedRunMinutes: Number(plansRes.data["planned_run_minutes"]),
        progressionPercent: Number(plansRes.data["progression_percent"]),
        knowledgeBaseVersion: String(plansRes.data["knowledge_base_version"]),
        safetyChecks: plansRes.data["safety_checks"] as WeeklyPlan["safetyChecks"],
        warnings: (plansRes.data["warnings"] as string[]) ?? [],
        sessions: rawSessions.map((s) => ({
          id: String(s["client_id"]),
          planId: String(plansRes.data!["client_id"]),
          dayIndex: Number(s["day_index"]) as DayOfWeek,
          dateISO: String(s["date_iso"]),
          activityType: s["activity_type"] as ActivityType,
          title: String(s["title"]),
          targetDurationMinutes: Number(s["target_duration_minutes"]),
          status: s["status"] as PlannedSession["status"],
          recommendationRecordId: s["recommendation_record_id"]
            ? String(s["recommendation_record_id"])
            : undefined,
          isHardSession: Boolean(s["is_hard_session"]),
          gymTemplateId: s["gym_template_id"] ? String(s["gym_template_id"]) : undefined,
          runPrescription:
            (s["run_prescription"] as PlannedSession["runPrescription"]) ?? undefined,
          completedLogId: s["completed_log_client_id"]
            ? String(s["completed_log_client_id"])
            : undefined,
          snoozedUntil: s["snoozed_until"] ? String(s["snoozed_until"]) : undefined,
        })),
      }
    : fallbackState.currentPlan;

  const runLogs: RunLog[] = (runsRes.data ?? []).map((r) => ({
    id: String(r["client_id"]),
    plannedSessionId: r["planned_session_client_id"]
      ? String(r["planned_session_client_id"])
      : undefined,
    runKind: r["run_kind"] as RunLog["runKind"],
    title: String(r["title"]),
    dateISO: String(r["date_iso"]),
    distanceKm: Number(r["distance_km"]),
    durationSec: Number(r["duration_sec"]),
    avgPaceMinPerKm: Number(r["avg_pace_min_per_km"]),
    splits: (r["splits"] as RunLog["splits"]) ?? [],
    routePoints: (r["route_points"] as RunLog["routePoints"]) ?? [],
    entrySource: r["entry_source"] as RunLog["entrySource"],
    intervalSegmentsCompleted: r["interval_segments_completed"]
      ? Number(r["interval_segments_completed"])
      : undefined,
    notes: r["notes"] ? String(r["notes"]) : undefined,
    createdAt: String(r["created_at"]),
  }));

  const gymLogs: GymLog[] = (gymsRes.data ?? []).map((g) => ({
    id: String(g["client_id"]),
    plannedSessionId: g["planned_session_client_id"]
      ? String(g["planned_session_client_id"])
      : undefined,
    templateId: g["template_id"] ? String(g["template_id"]) : undefined,
    title: String(g["title"]),
    dateISO: String(g["date_iso"]),
    durationMinutes: Number(g["duration_minutes"]),
    exercises: (g["exercises"] as GymLog["exercises"]) ?? [],
    notes: String(g["notes"] ?? ""),
    createdAt: String(g["created_at"]),
  }));

  const weightEntries: WeightEntry[] = (weightsRes.data ?? []).map((w) => ({
    id: String(w["client_id"]),
    dateISO: String(w["date_iso"]),
    weightKg: Number(w["weight_kg"]),
    note: w["note"] ? String(w["note"]) : undefined,
  }));

  const checkIns: WeeklyCheckIn[] = (checkInsRes.data ?? []).map((c) => ({
    id: String(c["client_id"]),
    weekStartISO: String(c["week_start_iso"]),
    adherenceRate: Number(c["adherence_rate"]),
    weightDeltaKg: Number(c["weight_delta_kg"]),
    energyRating: c["energy_rating"] as WeeklyCheckIn["energyRating"],
    adaptationApplied: String(c["adaptation_applied"]),
    createdAt: String(c["created_at"]),
  }));

  const reports: RecommendationReport[] = (reportsRes.data ?? []).map((rep) => ({
    id: String(rep["client_id"]),
    recordId: String(rep["record_id"]),
    reason: String(rep["reason"]),
    details: String(rep["details"]),
    status: rep["status"] as RecommendationReport["status"],
    createdAt: String(rep["created_at"]),
  }));

  return {
    ...fallbackState,
    onboardingComplete: Boolean(p["onboarding_complete"]),
    profile: {
      ...fallbackState.profile,
      id: userId,
      name: String(p["name"]),
      age: Number(p["age"]),
      sex: p["sex"] as BiologicalSex,
      weightKg: Number(p["weight_kg"]),
      heightCm: Number(p["height_cm"]),
      activityLevel: p["activity_level"] as ActivityLevel,
      experienceLevel: p["experience_level"] as ExperienceLevel,
      gymAccess: Boolean(p["gym_access"]),
      availableDays: ((p["available_days"] as number[]) ?? [0, 1, 3, 5, 6]) as DayOfWeek[],
      unitSystem: p["unit_system"] as UnitSystem,
      language: p["language"] as Language,
      themeMode: p["theme_mode"] as ThemeMode,
      reduceMotionOverride:
        p["reduce_motion_override"] === null ? null : Boolean(p["reduce_motion_override"]),
      dynamicTypeScale: p["dynamic_type_scale"] as AppState["profile"]["dynamicTypeScale"],
      selfReported5kMinutes: p["self_reported_5k_minutes"]
        ? Number(p["self_reported_5k_minutes"])
        : undefined,
      screening: (p["screening"] as HealthScreening) ?? fallbackState.profile.screening,
      updatedAt: String(p["updated_at"]),
    },
    goal: (p["goal"] as UserGoal) ?? fallbackState.goal,
    consent: (p["consent"] as ConsentRecord) ?? fallbackState.consent,
    notificationSettings:
      (p["notification_settings"] as NotificationSettings) ?? fallbackState.notificationSettings,
    v11AdaptationEnabled: Boolean(p["v11_adaptation_enabled"]),
    currentPlan: hydratedPlan,
    runLogs,
    gymLogs,
    weightEntries,
    checkIns,
    reports,
    recommendationRecords: kbRecords
      ? [
          ...kbRecords,
          ...fallbackState.recommendationRecords.filter((r) => r.reviewStatus !== "approved"),
        ]
      : fallbackState.recommendationRecords,
  };
}

export async function deleteUserCloudData(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await Promise.all([
    supabase.from("sa_recommendation_reports").delete().eq("user_id", userId),
    supabase.from("sa_weekly_checkins").delete().eq("user_id", userId),
    supabase.from("sa_weight_entries").delete().eq("user_id", userId),
    supabase.from("sa_gym_logs").delete().eq("user_id", userId),
    supabase.from("sa_run_logs").delete().eq("user_id", userId),
    supabase.from("sa_planned_sessions").delete().eq("user_id", userId),
    supabase.from("sa_weekly_plans").delete().eq("user_id", userId),
    supabase.from("sa_profiles").delete().eq("user_id", userId),
  ]);
}
