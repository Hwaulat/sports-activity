import type {
  ActivityLevel,
  BiologicalSex,
  CalorieGuidance,
  HealthScreening,
  RunLog,
  RunPrescription,
  UnitSystem,
  UserGoal,
  UserProfile,
  WeeklyCheckIn,
  WeightEntry,
} from "@/types/fitness";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const HEALTHY_BMI_MIN = 18.5;
export const MAX_WEEKLY_LOSS_PERCENT = 0.01; // 1% body weight/week (PRD proposed)
export const KCAL_PER_KG_WEIGHT = 7700;
export const CALORIE_FLOOR_BY_SEX: Record<BiologicalSex, number> = {
  female: 1200,
  male: 1500,
};

export function kgToLbs(kg: number): number {
  return kg * 2.2046226218;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.2046226218;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function formatWeight(weightKg: number, unit: UnitSystem): string {
  if (unit === "imperial") {
    return `${kgToLbs(weightKg).toFixed(1)} lb`;
  }
  return `${weightKg.toFixed(1)} kg`;
}

export function formatHeight(heightCm: number, unit: UnitSystem): string {
  if (unit === "imperial") {
    const totalInches = Math.round(cmToInches(heightCm));
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}'${inches}"`;
  }
  return `${Math.round(heightCm)} cm`;
}

export function formatDistance(km: number, unit: UnitSystem): string {
  if (unit === "imperial") {
    return `${kmToMiles(km).toFixed(2)} mi`;
  }
  return `${km.toFixed(2)} km`;
}

export function formatPace(minPerKm: number, unit: UnitSystem): string {
  const paceValue = unit === "imperial" ? minPerKm / 0.621371 : minPerKm;
  if (!Number.isFinite(paceValue) || paceValue <= 0) return "--:--";
  const mins = Math.floor(paceValue);
  const secs = Math.round((paceValue - mins) * 60);
  const adjustedMins = secs === 60 ? mins + 1 : mins;
  const adjustedSecs = secs === 60 ? 0 : secs;
  const suffix = unit === "imperial" ? "/mi" : "/km";
  return `${adjustedMins}:${String(adjustedSecs).padStart(2, "0")} ${suffix}`;
}

export function formatDurationClock(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = Math.max(heightCm, 100) / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function hasScreeningRisk(screening: HealthScreening): boolean {
  return (
    screening.pregnancy ||
    screening.heartCondition ||
    screening.jointOrInjury ||
    screening.eatingDisorderHistory
  );
}

export function isEligibleAge(age: number): boolean {
  return Number.isFinite(age) && age >= 18;
}

/**
 * Deterministic Mifflin-St Jeor equation + PRD safety rules:
 * - Minimum daily calorie floor enforced (1200 F / 1500 M conservative defaults)
 * - Weekly loss rate capped <= 1% of body weight/week
 * - No weight-loss target offered below healthy BMI (18.5)
 * - Health screening restricts aggressive goals
 */
export function calculateCalorieGuidance(
  profile: UserProfile,
  goal: UserGoal,
  referenceDateISO = "2026-11-27",
): CalorieGuidance {
  const sexOffset = profile.sex === "male" ? 5 : -161;
  const rawBmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const bmr = Math.round(rawBmr);
  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const maintenanceCalories = Math.round(bmr * activityMultiplier);
  const calorieFloor = CALORIE_FLOOR_BY_SEX[profile.sex];
  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const screeningFlagged = hasScreeningRisk(profile.screening);

  const warnings: string[] = [];
  let wasBmiRestricted = false;
  let wasLossRateCapped = false;
  let wasFloorApplied = false;
  let wasScreeningRestricted = false;
  let isGoalBlocked = false;

  let desiredDailyAdjustment = 0;

  if (goal.type === "lose_weight") {
    if (bmi <= HEALTHY_BMI_MIN) {
      wasBmiRestricted = true;
      isGoalBlocked = true;
      warnings.push(
        `Current BMI (${bmi}) is at or below ${HEALTHY_BMI_MIN}. Weight-loss deficit is disabled for safety; showing maintenance guidance.`,
      );
    } else if (profile.screening.pregnancy || profile.screening.eatingDisorderHistory) {
      wasScreeningRestricted = true;
      isGoalBlocked = true;
      warnings.push(
        "Health screening flagged pregnancy or eating-disorder history. Calorie deficits are disabled; consult a healthcare professional.",
      );
    } else {
      // Compute requested deficit from targetWeightKg and targetDate, or default 0.5%/wk
      const defaultWeeklyLossKg = profile.weightKg * 0.005;
      let requestedWeeklyLossKg = defaultWeeklyLossKg;

      if (goal.targetWeightKg !== undefined && goal.targetWeightKg < profile.weightKg) {
        const targetBmi = calculateBMI(goal.targetWeightKg, profile.heightCm);
        if (targetBmi < HEALTHY_BMI_MIN) {
          wasBmiRestricted = true;
          warnings.push(
            `Target weight would place BMI (${targetBmi}) below ${HEALTHY_BMI_MIN}. Goal adjusted to stay within healthy BMI.`,
          );
        }
        const safeMinWeightKg = HEALTHY_BMI_MIN * Math.pow(profile.heightCm / 100, 2);
        const safeTargetWeightKg = Math.max(goal.targetWeightKg, safeMinWeightKg);
        const totalToLoseKg = Math.max(0, profile.weightKg - safeTargetWeightKg);

        if (goal.targetDate) {
          const startMs = Date.parse(referenceDateISO);
          const endMs = Date.parse(goal.targetDate);
          const weeks = Math.max(1, (endMs - startMs) / (7 * 24 * 60 * 60 * 1000));
          requestedWeeklyLossKg = totalToLoseKg / weeks;
        } else {
          requestedWeeklyLossKg = Math.min(defaultWeeklyLossKg, totalToLoseKg);
        }
      }

      const maxAllowedWeeklyLossKg = profile.weightKg * MAX_WEEKLY_LOSS_PERCENT;
      const screeningCappedWeeklyLossKg = screeningFlagged
        ? Math.min(maxAllowedWeeklyLossKg, profile.weightKg * 0.0035)
        : maxAllowedWeeklyLossKg;

      if (screeningFlagged && requestedWeeklyLossKg > screeningCappedWeeklyLossKg) {
        wasScreeningRestricted = true;
        warnings.push(
          "Health screening is positive: aggressive deficit restricted. Please consult a qualified clinician before attempting weight loss.",
        );
      }

      if (requestedWeeklyLossKg > maxAllowedWeeklyLossKg + 0.0001) {
        wasLossRateCapped = true;
        warnings.push(
          `Requested loss rate exceeded 1% body weight/week (${maxAllowedWeeklyLossKg.toFixed(2)} kg/wk max). Deficit capped for safety.`,
        );
      }

      const safeWeeklyLossKg = Math.min(requestedWeeklyLossKg, screeningCappedWeeklyLossKg);
      desiredDailyAdjustment = -Math.round((safeWeeklyLossKg * KCAL_PER_KG_WEIGHT) / 7);
    }
  } else if (goal.type === "gain_muscle") {
    if (screeningFlagged) {
      wasScreeningRestricted = true;
      desiredDailyAdjustment = 150;
      warnings.push(
        "Health screening is positive: using a conservative +150 kcal surplus until cleared by a clinician.",
      );
    } else {
      desiredDailyAdjustment = profile.experienceLevel === "beginner" ? 250 : 300;
    }
  } else if (goal.type === "improve_running") {
    desiredDailyAdjustment = screeningFlagged ? 0 : 100;
  }

  let dailyTarget = maintenanceCalories + desiredDailyAdjustment;
  if (dailyTarget < calorieFloor) {
    dailyTarget = calorieFloor;
    wasFloorApplied = true;
    warnings.push(
      `Minimum daily calorie floor (${calorieFloor} kcal) applied to protect baseline nutrition.`,
    );
  }

  // Recompute actual dailyAdjustment after floor enforcement
  const actualDailyAdjustment = dailyTarget - maintenanceCalories;
  const weeklyWeightChangeKg = Number(
    ((actualDailyAdjustment * 7) / KCAL_PER_KG_WEIGHT).toFixed(2),
  );

  // Double-check loss rate cap invariant after rounding
  const maxWeeklyLoss = Number((profile.weightKg * MAX_WEEKLY_LOSS_PERCENT).toFixed(2));
  if (weeklyWeightChangeKg < -maxWeeklyLoss) {
    const safeDeficit = Math.floor((maxWeeklyLoss * KCAL_PER_KG_WEIGHT) / 7);
    dailyTarget = Math.max(calorieFloor, maintenanceCalories - safeDeficit);
  }

  const finalDailyAdjustment = dailyTarget - maintenanceCalories;
  const finalWeeklyChange = Number(((finalDailyAdjustment * 7) / KCAL_PER_KG_WEIGHT).toFixed(2));

  const rangeMin = Math.max(calorieFloor, dailyTarget - 75);
  const rangeMax = Math.max(rangeMin + 100, dailyTarget + 75);

  const adjSign = finalDailyAdjustment >= 0 ? "+" : "";
  const formulaSummary = `Mifflin-St Jeor BMR (${bmr} kcal) × ${activityMultiplier} (${profile.activityLevel.replace("_", " ")}) = ${maintenanceCalories} kcal maintenance ${adjSign}${finalDailyAdjustment} kcal goal adjustment.`;

  return {
    bmr,
    activityMultiplier,
    maintenanceCalories,
    dailyTarget,
    rangeMin,
    rangeMax,
    dailyAdjustment: finalDailyAdjustment,
    weeklyWeightChangeKg: finalWeeklyChange,
    bmi,
    calorieFloor,
    wasFloorApplied,
    wasLossRateCapped,
    wasBmiRestricted,
    wasScreeningRestricted,
    isGoalBlocked,
    warnings,
    formulaSummary,
  };
}

/**
 * Derive personalized pace ranges deterministically from most recent tracked run
 * or user's self-reported 5K baseline time (defaulting conservatively to 6:30/km).
 */
export function deriveBaselineEasyPaceMinPerKm(
  profile: UserProfile,
  recentRuns: RunLog[],
): { easyPace: number; sourceLabel: string } {
  const trackedRun = recentRuns.find((r) => r.distanceKm >= 2 && r.avgPaceMinPerKm > 2.5);
  if (trackedRun) {
    // Normalize easy pace based on run kind
    const factor =
      trackedRun.runKind === "interval_run"
        ? 1.18
        : trackedRun.runKind === "tempo_run"
          ? 1.12
          : 1.0;
    return {
      easyPace: Number((trackedRun.avgPaceMinPerKm * factor).toFixed(2)),
      sourceLabel: `Recent tracked run (${trackedRun.dateISO})`,
    };
  }
  if (profile.selfReported5kMinutes && profile.selfReported5kMinutes >= 14) {
    const fiveKPace = profile.selfReported5kMinutes / 5;
    return {
      easyPace: Number((fiveKPace * 1.18).toFixed(2)),
      sourceLabel: `Self-reported 5K (${profile.selfReported5kMinutes} min)`,
    };
  }
  const fallbackByLevel: Record<UserProfile["experienceLevel"], number> = {
    beginner: 7.0,
    intermediate: 6.1,
    advanced: 5.3,
  };
  return {
    easyPace: fallbackByLevel[profile.experienceLevel],
    sourceLabel: `Conservative ${profile.experienceLevel} default`,
  };
}

export function buildRunPrescription(
  runKind: RunPrescription["runKind"],
  durationMinutes: number,
  easyPace: number,
): RunPrescription {
  if (runKind === "casual_run") {
    const low = Number((easyPace - 0.15).toFixed(2));
    const high = Number((easyPace + 0.35).toFixed(2));
    const estDist = Number((durationMinutes / ((low + high) / 2)).toFixed(2));
    return {
      runKind,
      targetDurationMinutes: durationMinutes,
      estimatedDistanceKm: estDist,
      paceMinPerKmLow: low,
      paceMinPerKmHigh: high,
      effortLabel: "Easy conversational · Zone 2 (RPE 4–5/10)",
      explanation:
        "Builds aerobic base and capillary density without stressing joints or delaying strength recovery.",
    };
  }
  if (runKind === "interval_run") {
    const low = Number((easyPace * 0.78).toFixed(2));
    const high = Number((easyPace * 0.84).toFixed(2));
    const repeats = durationMinutes >= 32 ? 6 : 4;
    const estDist = Number((durationMinutes / (easyPace * 0.92)).toFixed(2));
    const segments: RunPrescription["segments"] = [
      { phase: "warmup", label: "Easy Warm-Up Jog", durationSec: 480, targetEffort: "RPE 3–4" },
    ];
    for (let i = 1; i <= repeats; i++) {
      segments.push({
        phase: "work",
        label: `Fast Repeat ${i}/${repeats}`,
        durationSec: 90,
        targetEffort: "RPE 8–9",
      });
      segments.push({
        phase: "rest",
        label: `Recovery Walk/Jog ${i}/${repeats}`,
        durationSec: 90,
        targetEffort: "RPE 2–3",
      });
    }
    segments.push({
      phase: "cooldown",
      label: "Easy Cool-Down",
      durationSec: 360,
      targetEffort: "RPE 3",
    });

    return {
      runKind,
      targetDurationMinutes: durationMinutes,
      estimatedDistanceKm: estDist,
      paceMinPerKmLow: low,
      paceMinPerKmHigh: high,
      effortLabel: `Hard repeats · ${repeats} × 90s work / 90s rest`,
      explanation:
        "Improves VO2 max and running economy. Keep warm-up relaxed and take full recovery between efforts.",
      segments,
      repeats,
    };
  }
  if (runKind === "tempo_run") {
    const low = Number((easyPace * 0.86).toFixed(2));
    const high = Number((easyPace * 0.91).toFixed(2));
    const estDist = Number((durationMinutes / ((low + high) / 2)).toFixed(2));
    return {
      runKind,
      targetDurationMinutes: durationMinutes,
      estimatedDistanceKm: estDist,
      paceMinPerKmLow: low,
      paceMinPerKmHigh: high,
      effortLabel: "Comfortably hard threshold (RPE 7–8/10)",
      explanation:
        "Sustained steady effort raises lactate threshold so faster paces feel manageable longer.",
    };
  }

  // long_run
  const low = Number((easyPace + 0.05).toFixed(2));
  const high = Number((easyPace + 0.45).toFixed(2));
  const estDist = Number((durationMinutes / ((low + high) / 2)).toFixed(2));
  return {
    runKind: "long_run",
    targetDurationMinutes: durationMinutes,
    estimatedDistanceKm: estDist,
    paceMinPerKmLow: low,
    paceMinPerKmHigh: high,
    effortLabel: "Steady aerobic endurance (RPE 4–6/10)",
    explanation:
      "Strengthens musculoskeletal durability and aerobic stamina. Start slower than casual pace.",
  };
}

/**
 * US-11 (v1.1): Deterministic weekly check-in adaptation.
 * Adjusts calorie target gently or eases weekly running volume after missed weeks
 * while enforcing the same safety caps.
 */
export function evaluateWeeklyAdaptation(params: {
  adherenceRate: number;
  weightEntries: WeightEntry[];
  profile: UserProfile;
  goal: UserGoal;
  previousWeekRunMinutes: number;
}): {
  recommendedRunVolumeMinutes: number;
  calorieAdjustmentDelta: number;
  summary: string;
  checkIn: WeeklyCheckIn;
} {
  const sortedWeights = [...params.weightEntries].sort((a, b) =>
    a.dateISO.localeCompare(b.dateISO),
  );
  const firstWeight =
    sortedWeights.at(-3)?.weightKg ?? sortedWeights.at(0)?.weightKg ?? params.profile.weightKg;
  const latestWeight = sortedWeights.at(-1)?.weightKg ?? params.profile.weightKg;
  const weightDeltaKg = Number((latestWeight - firstWeight).toFixed(2));

  let recommendedRunVolumeMinutes = params.previousWeekRunMinutes;
  let calorieAdjustmentDelta = 0;
  let summary = "";

  if (params.adherenceRate < 0.5) {
    recommendedRunVolumeMinutes = Math.max(40, Math.round(params.previousWeekRunMinutes * 0.85));
    summary =
      "Adherence was under 50%: easing next week's running volume by 15% to rebuild consistency without overload.";
  } else if (params.adherenceRate >= 0.8) {
    recommendedRunVolumeMinutes = Math.round(params.previousWeekRunMinutes * 1.08);
    summary =
      "Strong consistency (≥80%): safely progressing weekly running minutes by +8% (within the 10% cap).";
  } else {
    summary = "Holding current training volume steady for one more week to consolidate habits.";
  }

  if (params.goal.type === "lose_weight" && !hasScreeningRisk(params.profile.screening)) {
    if (weightDeltaKg > 0.2 && params.adherenceRate >= 0.7) {
      calorieAdjustmentDelta = -100;
      summary += " Nudged daily target -100 kcal (within safety floor & 1%/wk cap).";
    } else if (weightDeltaKg < -(params.profile.weightKg * MAX_WEEKLY_LOSS_PERCENT)) {
      calorieAdjustmentDelta = 150;
      summary += " Weight dropped faster than 1%/wk; raised daily target +150 kcal for safety.";
    }
  }

  return {
    recommendedRunVolumeMinutes,
    calorieAdjustmentDelta,
    summary,
    checkIn: {
      id: `checkin-${Date.now()}`,
      weekStartISO: new Date().toISOString().slice(0, 10),
      adherenceRate: params.adherenceRate,
      weightDeltaKg,
      energyRating: params.adherenceRate >= 0.7 ? "good" : "low",
      adaptationApplied: summary,
      createdAt: new Date().toISOString(),
    },
  };
}
