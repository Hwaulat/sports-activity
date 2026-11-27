import { selectGymTemplate } from "@/data/workouts";
import {
  buildRunPrescription,
  deriveBaselineEasyPaceMinPerKm,
  hasScreeningRisk,
} from "@/lib/fitness-engine";
import type {
  ActivityType,
  DayOfWeek,
  NotificationSettings,
  PlannedSession,
  RecommendationRecord,
  RunLog,
  ScheduledNotificationItem,
  UserGoal,
  UserProfile,
  WeeklyPlan,
} from "@/types/fitness";

export const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_LABELS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

export const MAX_WEEKLY_RUN_VOLUME_INCREASE = 0.1; // 10% weekly progression cap
export const IOS_PENDING_NOTIFICATION_LIMIT = 64;

export function isHardActivity(activityType: ActivityType): boolean {
  return activityType === "interval_run" || activityType === "tempo_run";
}

export function isRunActivity(activityType: ActivityType): boolean {
  return (
    activityType === "casual_run" ||
    activityType === "interval_run" ||
    activityType === "tempo_run" ||
    activityType === "long_run"
  );
}

/**
 * Returns only reviewed & approved records from the knowledge base.
 * Unreviewed or rejected AI records are NEVER surfaced to end users.
 */
export function selectApprovedRecommendation(
  records: RecommendationRecord[],
  activityType: ActivityType,
  profile: UserProfile,
  goal: UserGoal,
): { record: RecommendationRecord | null; usedFallback: boolean } {
  const approved = records.filter(
    (r) => r.reviewStatus === "approved" && r.activityType === activityType,
  );
  if (approved.length === 0) {
    return { record: null, usedFallback: true };
  }

  const scored = approved
    .map((r) => {
      let score = 0;
      if (r.level === profile.experienceLevel) score += 4;
      else if (r.level === "all") score += 2;
      if (r.goal === goal.type) score += 3;
      else if (r.goal === "all") score += 1;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);

  return { record: scored[0]?.r ?? null, usedFallback: false };
}

export function getMondayOfWeekISO(baseDateISO = "2026-11-23"): string {
  const d = new Date(`${baseDateISO}T09:00:00Z`);
  if (Number.isNaN(d.getTime())) return "2026-11-23";
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMon);
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(startISO: string, days: number): string {
  const d = new Date(`${startISO}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getConservativeFallbackFreq(activityType: ActivityType): {
  min: number;
  max: number;
  duration: number;
} {
  switch (activityType) {
    case "gym_strength":
      return { min: 1, max: 2, duration: 30 };
    case "casual_run":
      return { min: 1, max: 2, duration: 25 };
    case "interval_run":
    case "tempo_run":
      return { min: 0, max: 0, duration: 0 }; // conservative default excludes high-intensity when KB missing
    case "long_run":
      return { min: 0, max: 1, duration: 35 };
    case "rest":
      return { min: 2, max: 7, duration: 0 };
  }
}

function isAdjacentDay(a: DayOfWeek, b: DayOfWeek): boolean {
  const diff = Math.abs(a - b);
  return diff === 1 || diff === 6; // checks Sun(6) -> Mon(0) wrap too
}

export function validatePlanSafety(
  sessions: PlannedSession[],
  previousWeekRunMinutes: number,
  screeningFlagged: boolean,
  records: RecommendationRecord[],
  profile: UserProfile,
  goal: UserGoal,
): WeeklyPlan["safetyChecks"] {
  const restDays = sessions.filter((s) => s.activityType === "rest").length;
  const hardDays = sessions.filter((s) => isHardActivity(s.activityType)).map((s) => s.dayIndex);

  let noConsecutiveHardDays = true;
  for (let i = 0; i < hardDays.length; i++) {
    for (let j = i + 1; j < hardDays.length; j++) {
      const dayA = hardDays[i];
      const dayB = hardDays[j];
      if (dayA !== undefined && dayB !== undefined && isAdjacentDay(dayA, dayB)) {
        noConsecutiveHardDays = false;
      }
    }
  }

  let withinFrequencyBounds = true;
  const counts: Record<ActivityType, number> = {
    gym_strength: 0,
    casual_run: 0,
    interval_run: 0,
    tempo_run: 0,
    long_run: 0,
    rest: 0,
  };
  for (const s of sessions) {
    counts[s.activityType] += 1;
  }
  for (const type of [
    "gym_strength",
    "casual_run",
    "interval_run",
    "tempo_run",
    "long_run",
  ] as const) {
    const { record } = selectApprovedRecommendation(records, type, profile, goal);
    const maxAllowed = record ? record.weeklyFrequencyMax : getConservativeFallbackFreq(type).max;
    if (counts[type] > maxAllowed) {
      withinFrequencyBounds = false;
    }
  }

  const plannedRunMinutes = sessions
    .filter((s) => isRunActivity(s.activityType))
    .reduce((acc, s) => acc + s.targetDurationMinutes, 0);
  const maxRunCap =
    previousWeekRunMinutes > 0
      ? Math.round(previousWeekRunMinutes * (1 + MAX_WEEKLY_RUN_VOLUME_INCREASE))
      : Infinity;
  const withinVolumeProgressionCap = plannedRunMinutes <= maxRunCap;

  const screeningRespected = !screeningFlagged || hardDays.length === 0;

  return {
    hasRestDay: restDays >= 1,
    noConsecutiveHardDays,
    withinFrequencyBounds,
    withinVolumeProgressionCap,
    screeningRespected,
  };
}

/**
 * Deterministic Weekly Plan Builder (US-03, US-04, US-05, US-06):
 * - Always leaves >= 1 rest day
 * - Never schedules interval or tempo on consecutive days (including Sun->Mon wrap)
 * - Enforces reviewed KB frequency ranges (or conservative default if missing)
 * - Caps weekly running volume progression <= 10%
 * - Respects health screening restrictions (removes hard sessions if flagged)
 */
export function buildWeeklyPlan(params: {
  profile: UserProfile;
  goal: UserGoal;
  records: RecommendationRecord[];
  recentRuns: RunLog[];
  weekStartISO?: string;
  previousWeekRunMinutes?: number;
}): WeeklyPlan {
  const { profile, goal, records, recentRuns } = params;
  const weekStartISO = params.weekStartISO ?? getMondayOfWeekISO();
  const previousWeekRunMinutes = Math.max(0, params.previousWeekRunMinutes ?? 90);
  const screeningFlagged = hasScreeningRisk(profile.screening);
  const planId = `plan-${weekStartISO}-${goal.type}`;
  const warnings: string[] = [];

  // Normalize available days, enforcing at least 1 mandatory rest day
  const uniqueDays = Array.from(new Set(profile.availableDays))
    .filter((d): d is DayOfWeek => d >= 0 && d <= 6)
    .sort((a, b) => a - b);

  // Even if user selects all 7 days, reserve Sunday (or last selected day) as mandatory rest
  const trainingSlots: DayOfWeek[] =
    uniqueDays.length >= 7
      ? uniqueDays.slice(0, 6)
      : uniqueDays.length === 0
        ? [0, 2, 4]
        : uniqueDays;

  if (uniqueDays.length >= 7) {
    warnings.push("Mandatory recovery rule: reserved 1 full rest day per week.");
  }

  const getBounds = (type: ActivityType) => {
    const { record, usedFallback } = selectApprovedRecommendation(records, type, profile, goal);
    if (usedFallback || !record) {
      const fb = getConservativeFallbackFreq(type);
      return {
        recordId: undefined,
        min: fb.min,
        max: fb.max,
        duration: fb.duration,
        usedFallback: true,
      };
    }
    return {
      recordId: record.id,
      min: record.weeklyFrequencyMin,
      max: record.weeklyFrequencyMax,
      duration: Math.round((record.sessionDurationMin + record.sessionDurationMax) / 2),
      usedFallback: false,
    };
  };

  const gymBounds = getBounds("gym_strength");
  const casualBounds = getBounds("casual_run");
  const intervalBounds = getBounds("interval_run");
  const tempoBounds = getBounds("tempo_run");
  const longBounds = getBounds("long_run");
  const restBounds = getBounds("rest");

  if (
    gymBounds.usedFallback ||
    casualBounds.usedFallback ||
    intervalBounds.usedFallback ||
    tempoBounds.usedFallback ||
    longBounds.usedFallback
  ) {
    warnings.push(
      "Some activity types had no approved knowledge-base record; conservative defaults applied.",
    );
  }

  // Decide target activity counts based on goal, level, and available slots
  const desiredSequence: ActivityType[] = [];
  const totalSlots = trainingSlots.length;

  const targetCounts: Record<Exclude<ActivityType, "rest">, number> = {
    gym_strength: 0,
    casual_run: 0,
    interval_run: 0,
    tempo_run: 0,
    long_run: 0,
  };

  if (goal.type === "gain_muscle") {
    targetCounts.gym_strength = Math.min(
      gymBounds.max,
      totalSlots >= 4 ? 3 : Math.max(1, totalSlots - 1),
    );
    targetCounts.casual_run = Math.min(
      casualBounds.max,
      Math.max(0, totalSlots - targetCounts.gym_strength),
    );
  } else if (goal.type === "improve_running") {
    targetCounts.long_run = totalSlots >= 3 ? Math.min(longBounds.max, 1) : 0;
    if (!screeningFlagged && profile.experienceLevel !== "beginner" && totalSlots >= 4) {
      targetCounts.interval_run = Math.min(intervalBounds.max, 1);
      targetCounts.tempo_run = totalSlots >= 5 ? Math.min(tempoBounds.max, 1) : 0;
    } else if (!screeningFlagged && totalSlots >= 3) {
      targetCounts.interval_run = Math.min(intervalBounds.max, 1);
    }
    targetCounts.gym_strength = totalSlots >= 3 ? Math.min(gymBounds.max, 1) : 0;
    const used =
      targetCounts.long_run +
      targetCounts.interval_run +
      targetCounts.tempo_run +
      targetCounts.gym_strength;
    targetCounts.casual_run = Math.min(casualBounds.max, Math.max(1, totalSlots - used));
  } else if (goal.type === "lose_weight") {
    targetCounts.gym_strength = Math.min(gymBounds.max, totalSlots >= 4 ? 2 : 1);
    if (!screeningFlagged && totalSlots >= 4 && intervalBounds.max > 0) {
      targetCounts.interval_run = 1;
    }
    targetCounts.long_run = totalSlots >= 5 ? Math.min(longBounds.max, 1) : 0;
    const used = targetCounts.gym_strength + targetCounts.interval_run + targetCounts.long_run;
    targetCounts.casual_run = Math.min(casualBounds.max, Math.max(1, totalSlots - used));
  } else {
    // maintain
    targetCounts.gym_strength = Math.min(gymBounds.max, totalSlots >= 3 ? 2 : 1);
    targetCounts.casual_run = Math.min(
      casualBounds.max,
      Math.max(1, totalSlots - targetCounts.gym_strength),
    );
    if (!screeningFlagged && totalSlots >= 5 && intervalBounds.max > 0) {
      targetCounts.interval_run = 1;
    }
  }

  // Clamp total desired sessions to totalSlots (preserving gym + casual priority)
  const priorityOrder: Exclude<ActivityType, "rest">[] = [
    "casual_run",
    "gym_strength",
    "long_run",
    "interval_run",
    "tempo_run",
  ];
  let sumDesired = Object.values(targetCounts).reduce((a, b) => a + b, 0);
  for (let i = priorityOrder.length - 1; i >= 0 && sumDesired > totalSlots; i--) {
    const key = priorityOrder[i];
    if (!key) continue;
    while (targetCounts[key] > 0 && sumDesired > totalSlots) {
      targetCounts[key] -= 1;
      sumDesired -= 1;
    }
  }

  // Assign activities onto trainingSlots guaranteeing NO consecutive hard days
  const slotAssignment = new Map<DayOfWeek, ActivityType>();

  // 1) Place long run on last training slot (typically weekend)
  if (targetCounts.long_run > 0 && trainingSlots.length > 0) {
    const weekendSlot = trainingSlots[trainingSlots.length - 1]!;
    slotAssignment.set(weekendSlot, "long_run");
  }

  // 2) Place hard runs (interval_run, tempo_run) on non-adjacent open slots
  const hardToPlace: ActivityType[] = [
    ...Array<ActivityType>(targetCounts.interval_run).fill("interval_run"),
    ...Array<ActivityType>(targetCounts.tempo_run).fill("tempo_run"),
  ];
  for (const hardType of hardToPlace) {
    const candidate = trainingSlots.find((day) => {
      if (slotAssignment.has(day)) return false;
      for (const [assignedDay, assignedType] of slotAssignment.entries()) {
        if (isHardActivity(assignedType) && isAdjacentDay(day, assignedDay)) {
          return false;
        }
      }
      return true;
    });
    if (candidate !== undefined) {
      slotAssignment.set(candidate, hardType);
    } else {
      // Convert to casual_run rather than ever placing consecutive hard days
      targetCounts.casual_run = Math.min(casualBounds.max, targetCounts.casual_run + 1);
    }
  }

  // 3) Interleave gym_strength and casual_run into remaining open trainingSlots
  for (let i = 0; i < targetCounts.gym_strength; i++) desiredSequence.push("gym_strength");
  for (let i = 0; i < targetCounts.casual_run; i++) desiredSequence.push("casual_run");

  // Reorder alternating gym / casual for balanced load
  const interleaved: ActivityType[] = [];
  const gyms = desiredSequence.filter((t) => t === "gym_strength");
  const casuals = desiredSequence.filter((t) => t === "casual_run");
  while (gyms.length > 0 || casuals.length > 0) {
    const g = gyms.shift();
    if (g) interleaved.push(g);
    const c = casuals.shift();
    if (c) interleaved.push(c);
  }

  for (const day of trainingSlots) {
    if (!slotAssignment.has(day)) {
      const next = interleaved.shift() ?? "rest";
      slotAssignment.set(day, next);
    }
  }

  // Enforce <= 10% running volume progression cap deterministically
  const rawRunDurationMap = new Map<DayOfWeek, number>();
  const rawBoundsMap: Record<ActivityType, number> = {
    gym_strength: gymBounds.duration,
    casual_run: profile.experienceLevel === "beginner" ? 25 : casualBounds.duration,
    interval_run: profile.experienceLevel === "beginner" ? 24 : intervalBounds.duration,
    tempo_run: tempoBounds.duration,
    long_run: profile.experienceLevel === "beginner" ? 40 : longBounds.duration,
    rest: 0,
  };

  let rawTotalRunMin = 0;
  for (const [day, act] of slotAssignment.entries()) {
    if (isRunActivity(act)) {
      const dur = rawBoundsMap[act];
      rawRunDurationMap.set(day, dur);
      rawTotalRunMin += dur;
    }
  }

  const maxAllowedRunMinutes =
    previousWeekRunMinutes > 0
      ? Math.round(previousWeekRunMinutes * (1 + MAX_WEEKLY_RUN_VOLUME_INCREASE))
      : rawTotalRunMin;

  if (previousWeekRunMinutes > 0 && rawTotalRunMin > maxAllowedRunMinutes && rawTotalRunMin > 0) {
    const scaleFactor = maxAllowedRunMinutes / rawTotalRunMin;
    let adjustedTotal = 0;
    const entries = Array.from(rawRunDurationMap.entries());
    entries.forEach(([day, mins], idx) => {
      if (idx === entries.length - 1) {
        const remaining = Math.max(15, maxAllowedRunMinutes - adjustedTotal);
        rawRunDurationMap.set(day, Math.min(mins, remaining));
      } else {
        const scaled = Math.max(15, Math.floor(mins * scaleFactor));
        rawRunDurationMap.set(day, scaled);
        adjustedTotal += scaled;
      }
    });
    warnings.push(
      `Running volume scaled to stay within the 10% weekly progression cap (${maxAllowedRunMinutes} min max vs ${previousWeekRunMinutes} min last week).`,
    );
  }

  const { easyPace } = deriveBaselineEasyPaceMinPerKm(profile, recentRuns);
  const gymTemplate = selectGymTemplate(goal.type, profile.experienceLevel, profile.gymAccess);

  const sessions: PlannedSession[] = [];
  for (let d = 0 as DayOfWeek; d <= 6; d = (d + 1) as DayOfWeek) {
    const activityType = slotAssignment.get(d) ?? "rest";
    const dateISO = addDaysISO(weekStartISO, d);

    if (activityType === "rest") {
      sessions.push({
        id: `${planId}-day-${d}`,
        planId,
        dayIndex: d,
        dateISO,
        activityType: "rest",
        title: "Rest & Mobility Recovery",
        targetDurationMinutes: 0,
        status: "planned",
        recommendationRecordId: restBounds.recordId,
        isHardSession: false,
      });
    } else if (activityType === "gym_strength") {
      sessions.push({
        id: `${planId}-day-${d}`,
        planId,
        dayIndex: d,
        dateISO,
        activityType: "gym_strength",
        title: gymTemplate.name,
        targetDurationMinutes: gymTemplate.estimatedMinutes,
        status: "planned",
        recommendationRecordId: gymBounds.recordId,
        isHardSession: false,
        gymTemplateId: gymTemplate.id,
      });
    } else {
      const targetDur = rawRunDurationMap.get(d) ?? rawBoundsMap[activityType];
      const prescription = buildRunPrescription(activityType, targetDur, easyPace);
      const titles: Record<typeof activityType, string> = {
        casual_run: "Casual Aerobic Run",
        interval_run: "Interval Speed Session",
        tempo_run: "Tempo Threshold Run",
        long_run: "Weekly Long Run",
      };
      const recMap = {
        casual_run: casualBounds.recordId,
        interval_run: intervalBounds.recordId,
        tempo_run: tempoBounds.recordId,
        long_run: longBounds.recordId,
      };
      sessions.push({
        id: `${planId}-day-${d}`,
        planId,
        dayIndex: d,
        dateISO,
        activityType,
        title: titles[activityType],
        targetDurationMinutes: targetDur,
        status: "planned",
        recommendationRecordId: recMap[activityType],
        isHardSession: isHardActivity(activityType),
        runPrescription: prescription,
      });
    }
  }

  const plannedRunMinutes = sessions
    .filter((s) => isRunActivity(s.activityType))
    .reduce((acc, s) => acc + s.targetDurationMinutes, 0);

  const progressionPercent =
    previousWeekRunMinutes > 0
      ? Number(
          (((plannedRunMinutes - previousWeekRunMinutes) / previousWeekRunMinutes) * 100).toFixed(
            1,
          ),
        )
      : 0;

  const safetyChecks = validatePlanSafety(
    sessions,
    previousWeekRunMinutes,
    screeningFlagged,
    records,
    profile,
    goal,
  );

  return {
    id: planId,
    weekStartISO,
    generatedAt: new Date().toISOString(),
    previousWeekRunMinutes,
    plannedRunMinutes,
    progressionPercent,
    knowledgeBaseVersion: records[0]?.version ?? "v1.2.0",
    safetyChecks,
    sessions,
    warnings,
  };
}

/**
 * Move or swap a planned session to another day in the week and re-check all safety rules (US-04).
 */
export function moveSessionToDay(
  plan: WeeklyPlan,
  sessionId: string,
  targetDayIndex: DayOfWeek,
  records: RecommendationRecord[],
  profile: UserProfile,
  goal: UserGoal,
): { ok: true; plan: WeeklyPlan } | { ok: false; reason: string } {
  const sourceSession = plan.sessions.find((s) => s.id === sessionId);
  const targetSession = plan.sessions.find((s) => s.dayIndex === targetDayIndex);
  if (!sourceSession || !targetSession) {
    return { ok: false, reason: "Session or target day not found." };
  }
  if (sourceSession.dayIndex === targetDayIndex) {
    return { ok: true, plan };
  }

  // Swap their dayIndex and dateISO
  const swappedSessions = plan.sessions
    .map((s) => {
      if (s.id === sourceSession.id) {
        return { ...s, dayIndex: targetDayIndex, dateISO: targetSession.dateISO };
      }
      if (s.id === targetSession.id) {
        return { ...s, dayIndex: sourceSession.dayIndex, dateISO: sourceSession.dateISO };
      }
      return s;
    })
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const safetyChecks = validatePlanSafety(
    swappedSessions,
    plan.previousWeekRunMinutes,
    hasScreeningRisk(profile.screening),
    records,
    profile,
    goal,
  );

  if (!safetyChecks.noConsecutiveHardDays) {
    return {
      ok: false,
      reason:
        "Safety rule blocked move: Interval and Tempo runs cannot be placed on consecutive days.",
    };
  }
  if (!safetyChecks.hasRestDay) {
    return {
      ok: false,
      reason: "Safety rule blocked move: Every week must retain at least 1 rest day.",
    };
  }

  return {
    ok: true,
    plan: {
      ...plan,
      sessions: swappedSessions,
      safetyChecks,
    },
  };
}

function isTimeInQuietHours(hhmm: string, quietStart: string, quietEnd: string): boolean {
  if (quietStart === quietEnd) return false;
  if (quietStart > quietEnd) {
    // Overnight e.g. 22:00 to 07:00
    return hhmm >= quietStart || hhmm < quietEnd;
  }
  return hhmm >= quietStart && hhmm < quietEnd;
}

/**
 * US-07: Rolling local notification scheduler respecting:
 * - Activity type toggle
 * - Lead time before default 07:30 session slot (or 18:00 gym slot)
 * - Quiet hours suppression
 * - iOS 64 pending local notification limit
 */
export function buildRollingNotifications(
  plan: WeeklyPlan,
  settings: NotificationSettings,
): ScheduledNotificationItem[] {
  if (!settings.enabled) return [];

  const queue: ScheduledNotificationItem[] = [];

  for (const session of plan.sessions) {
    if (session.activityType === "rest" || session.status !== "planned") continue;
    if (!settings.perActivity[session.activityType]) continue;

    // Default morning run at 07:30, gym at 18:00
    const baseHour = session.activityType === "gym_strength" ? 18 : 7;
    const baseMin = session.activityType === "gym_strength" ? 0 : 30;
    const totalMinutes = baseHour * 60 + baseMin - settings.leadTimeMinutes;
    const notifyHour = Math.max(0, Math.floor(totalMinutes / 60));
    const notifyMin = Math.max(0, totalMinutes % 60);
    const hhmm = `${String(notifyHour).padStart(2, "0")}:${String(notifyMin).padStart(2, "0")}`;

    const suppressedByQuietHours = isTimeInQuietHours(
      hhmm,
      settings.quietHoursStart,
      settings.quietHoursEnd,
    );

    queue.push({
      id: `notif-${session.id}`,
      sessionId: session.id,
      title: `Upcoming: ${session.title}`,
      body: `Starts in ${settings.leadTimeMinutes} min · Target ${session.targetDurationMinutes} min`,
      scheduledAtISO: `${session.dateISO}T${hhmm}:00`,
      activityType: session.activityType,
      suppressedByQuietHours,
    });
  }

  if (settings.nudges.weeklySummary) {
    queue.push({
      id: `notif-summary-${plan.id}`,
      title: "Weekly Training Summary",
      body: "Review completed sessions vs expert weekly targets.",
      scheduledAtISO: `${addDaysISO(plan.weekStartISO, 6)}T19:00:00`,
      activityType: "system",
      suppressedByQuietHours: isTimeInQuietHours(
        "19:00",
        settings.quietHoursStart,
        settings.quietHoursEnd,
      ),
    });
  }

  return queue.slice(0, IOS_PENDING_NOTIFICATION_LIMIT);
}
