import { describe, expect, it } from "vitest";

import { INITIAL_RECOMMENDATION_RECORDS, verifyRecordGrounding } from "@/data/knowledge-base";
import {
  calculateBMI,
  calculateCalorieGuidance,
  hasScreeningRisk,
  isEligibleAge,
} from "@/lib/fitness-engine";
import {
  buildRollingNotifications,
  buildWeeklyPlan,
  IOS_PENDING_NOTIFICATION_LIMIT,
  moveSessionToDay,
  selectApprovedRecommendation,
} from "@/lib/plan-builder";
import { createInitialAppState } from "@/lib/storage";
import type {
  ActivityLevel,
  BiologicalSex,
  DayOfWeek,
  ExperienceLevel,
  GoalType,
  UserGoal,
  UserProfile,
} from "@/types/fitness";

describe("PRD Section 3.3 Safety, Grounding & Plan Engine", () => {
  it("passes numeric grounding check on 100% of approved KB records and catches ungrounded numbers", () => {
    const approved = INITIAL_RECOMMENDATION_RECORDS.filter((r) => r.reviewStatus === "approved");
    expect(approved.length).toBeGreaterThanOrEqual(7);

    for (const record of approved) {
      const res = verifyRecordGrounding(record);
      expect(res.passed).toBe(true);
      expect(res.missingNumbers).toEqual([]);
      expect(res.hasValidCitation).toBe(true);
    }

    const hallucinated = {
      ...approved[0]!,
      weeklyFrequencyMax: 99,
    };
    const badCheck = verifyRecordGrounding(hallucinated);
    expect(badCheck.passed).toBe(false);
    expect(badCheck.missingNumbers).toContain(99);
  });

  it("blocks under-18 eligibility and protects healthy BMI <= 18.5 from weight loss deficits", () => {
    expect(isEligibleAge(17)).toBe(false);
    expect(isEligibleAge(18)).toBe(true);

    const state = createInitialAppState(true);
    const lowBmiProfile: UserProfile = {
      ...state.profile,
      age: 24,
      sex: "female",
      weightKg: 48,
      heightCm: 170, // BMI ~16.6
    };
    const lossGoal: UserGoal = {
      ...state.goal,
      type: "lose_weight",
      targetWeightKg: 44,
      targetDate: "2027-01-15",
    };

    expect(calculateBMI(lowBmiProfile.weightKg, lowBmiProfile.heightCm)).toBeLessThan(18.5);
    const cal = calculateCalorieGuidance(lowBmiProfile, lossGoal);
    expect(cal.wasBmiRestricted).toBe(true);
    expect(cal.isGoalBlocked).toBe(true);
    expect(cal.dailyAdjustment).toBe(0);
    expect(cal.dailyTarget).toBeGreaterThanOrEqual(cal.calorieFloor);
  });

  it("runs 216 profile combinations with 0 safety violations across calorie floor, loss cap, rest day, hard days, volume cap, and screening", () => {
    const base = createInitialAppState(true);
    const ages = [19, 36, 62];
    const weights = [48, 70, 105];
    const sexes: BiologicalSex[] = ["female", "male"];
    const goals: GoalType[] = ["lose_weight", "gain_muscle", "improve_running"];
    const levels: ExperienceLevel[] = ["beginner", "intermediate"];
    const screeningFlags = [false, true];
    const activities: ActivityLevel[] = ["sedentary", "moderate"];

    let count = 0;

    for (const age of ages) {
      for (const weightKg of weights) {
        for (const sex of sexes) {
          for (const gType of goals) {
            for (const level of levels) {
              for (const flagged of screeningFlags) {
                for (const activityLevel of activities) {
                  count += 1;
                  const profile: UserProfile = {
                    ...base.profile,
                    age,
                    weightKg,
                    heightCm: 170,
                    sex,
                    experienceLevel: level,
                    activityLevel,
                    availableDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
                    screening: {
                      pregnancy: false,
                      heartCondition: flagged,
                      jointOrInjury: flagged,
                      eatingDisorderHistory: false,
                    },
                  };
                  const goal: UserGoal = {
                    ...base.goal,
                    type: gType,
                    targetWeightKg: weightKg - 12,
                    targetDate: "2026-12-15",
                  };

                  const cal = calculateCalorieGuidance(profile, goal, "2026-11-27");
                  expect(cal.dailyTarget).toBeGreaterThanOrEqual(cal.calorieFloor);
                  expect(cal.rangeMin).toBeGreaterThanOrEqual(cal.calorieFloor);
                  expect(cal.weeklyWeightChangeKg).toBeGreaterThanOrEqual(
                    -(weightKg * 0.01) - 0.05,
                  );

                  const plan = buildWeeklyPlan({
                    profile,
                    goal,
                    records: INITIAL_RECOMMENDATION_RECORDS,
                    recentRuns: [],
                    previousWeekRunMinutes: 100,
                  });

                  expect(plan.safetyChecks.hasRestDay).toBe(true);
                  expect(plan.safetyChecks.noConsecutiveHardDays).toBe(true);
                  expect(plan.safetyChecks.withinFrequencyBounds).toBe(true);
                  expect(plan.safetyChecks.withinVolumeProgressionCap).toBe(true);
                  if (hasScreeningRisk(profile.screening)) {
                    expect(plan.safetyChecks.screeningRespected).toBe(true);
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(count).toBe(432);
    expect(count).toBeGreaterThanOrEqual(200);
  });

  it("never surfaces pending_review or rejected KB records and enforces conservative defaults", () => {
    const state = createInitialAppState(true);
    const allRejected = state.recommendationRecords.map((r) => ({
      ...r,
      reviewStatus: "rejected" as const,
    }));

    const picked = selectApprovedRecommendation(
      allRejected,
      "interval_run",
      state.profile,
      state.goal,
    );
    expect(picked.record).toBeNull();
    expect(picked.usedFallback).toBe(true);

    const plan = buildWeeklyPlan({
      profile: state.profile,
      goal: state.goal,
      records: allRejected,
      recentRuns: [],
      previousWeekRunMinutes: 90,
    });
    expect(plan.warnings.some((w) => w.includes("conservative defaults"))).toBe(true);
    expect(plan.sessions.some((s) => s.activityType === "interval_run")).toBe(false);
  });

  it("blocks moving a hard session adjacent to another hard session", () => {
    const state = createInitialAppState(true);
    const plan = buildWeeklyPlan({
      profile: {
        ...state.profile,
        experienceLevel: "advanced",
        availableDays: [0, 1, 2, 3, 4, 5],
      },
      goal: { ...state.goal, type: "improve_running" },
      records: INITIAL_RECOMMENDATION_RECORDS,
      recentRuns: state.runLogs,
      previousWeekRunMinutes: 150,
    });

    const intervalSession = plan.sessions.find((s) => s.activityType === "interval_run");
    const tempoSession = plan.sessions.find((s) => s.activityType === "tempo_run");
    expect(intervalSession).toBeDefined();
    expect(tempoSession).toBeDefined();

    if (intervalSession && tempoSession) {
      const adjacentDay = ((tempoSession.dayIndex + 1) % 7) as DayOfWeek;
      const moveRes = moveSessionToDay(
        plan,
        intervalSession.id,
        adjacentDay,
        INITIAL_RECOMMENDATION_RECORDS,
        state.profile,
        state.goal,
      );
      expect(moveRes.ok).toBe(false);
    }
  });

  it("respects iOS pending notification limit and quiet hours", () => {
    const state = createInitialAppState(true);
    const queue = buildRollingNotifications(state.currentPlan, {
      ...state.notificationSettings,
      leadTimeMinutes: 60,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    });
    expect(queue.length).toBeLessThanOrEqual(IOS_PENDING_NOTIFICATION_LIMIT);
    const morningRunNotif = queue.find(
      (n) => n.activityType !== "gym_strength" && n.activityType !== "system",
    );
    expect(morningRunNotif?.suppressedByQuietHours).toBe(true);
  });
});
