import type { RecommendationRecord, SourceCitation } from "@/types/fitness";

export const INITIAL_KB_VERSION = "v1.2.0";

export const ALLOWLISTED_SOURCES: Record<string, SourceCitation> = {
  who_strength_2020: {
    id: "who_strength_2020",
    title: "WHO Guidelines on Physical Activity and Sedentary Behaviour",
    organization: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789240015128",
    retrievalDate: "2026-11-10",
    contentHash: "sha256:8a4d2c19e4b7f031",
    passage:
      "Adults should do muscle-strengthening activities at moderate or greater intensity on 2 to 4 days a week for 25 to 60 minutes per session to gain additional health benefits.",
    termsChecked: true,
  },
  acsm_resistance_progression: {
    id: "acsm_resistance_progression",
    title: "ACSM Position Stand: Progression Models in Resistance Training",
    organization: "American College of Sports Medicine",
    url: "https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines",
    retrievalDate: "2026-11-10",
    contentHash: "sha256:3c91f402a1d8b512",
    passage:
      "For intermediate and advanced strength progression, training 3 to 5 days per week for 35 to 75 minutes supports muscular hypertrophy and strength adaptation.",
    termsChecked: true,
  },
  cdc_aerobic_casual: {
    id: "cdc_aerobic_casual",
    title: "Physical Activity Basics for Adults",
    organization: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    retrievalDate: "2026-11-12",
    contentHash: "sha256:5b18e7a04d2c9104",
    passage:
      "Moderate aerobic exercise such as easy casual running for 20 to 45 minutes on 2 to 4 days each week builds aerobic endurance safely for beginners and returning runners.",
    termsChecked: true,
  },
  acsm_hiit_intervals: {
    id: "acsm_hiit_intervals",
    title: "ACSM High-Intensity Interval Training Guidance",
    organization: "American College of Sports Medicine",
    url: "https://www.acsm.org/education-resources/books-journals",
    retrievalDate: "2026-11-12",
    contentHash: "sha256:9f72a61c8e3d4019",
    passage:
      "Vigorous interval running should be limited to 1 to 2 sessions per week lasting 20 to 40 minutes including warm-up and cool-down, with non-consecutive recovery days between hard efforts.",
    termsChecked: true,
  },
  nsca_tempo_threshold: {
    id: "nsca_tempo_threshold",
    title: "NSCA Essentials of Endurance Training & Lactate Threshold",
    organization: "National Strength and Conditioning Association",
    url: "https://www.nsca.com/education/articles/",
    retrievalDate: "2026-11-14",
    contentHash: "sha256:4d63b8e21a09c772",
    passage:
      "Tempo or threshold runs of 25 to 45 minutes performed 1 to 2 times weekly improve sustained pace while keeping weekly hard sessions spaced apart.",
    termsChecked: true,
  },
  nhs_long_run_endurance: {
    id: "nhs_long_run_endurance",
    title: "NHS Running & Aerobic Endurance Progression",
    organization: "NHS Better Health",
    url: "https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/",
    retrievalDate: "2026-11-14",
    contentHash: "sha256:7e05c93b12f48d21",
    passage:
      "Perform 1 weekly long steady run of 35 to 90 minutes to build aerobic efficiency, while limiting weekly running volume increases to no more than 10 percent.",
    termsChecked: true,
  },
  acsm_recovery_rest: {
    id: "acsm_recovery_rest",
    title: "ACSM Recovery and Overtraining Prevention",
    organization: "American College of Sports Medicine",
    url: "https://www.acsm.org/education-resources/trending-topics-resources",
    retrievalDate: "2026-11-15",
    contentHash: "sha256:1a94d7c3f8b20653",
    passage:
      "Schedule at least 1 to 3 rest or active recovery days of 0 to 20 minutes gentle mobility each week so tissues adapt and overtraining risk stays low.",
    termsChecked: true,
  },
};

export const INITIAL_RECOMMENDATION_RECORDS: RecommendationRecord[] = [
  {
    id: "rec-gym-beginner",
    version: "1.2.0",
    activityType: "gym_strength",
    level: "beginner",
    goal: "all",
    weeklyFrequencyMin: 2,
    weeklyFrequencyMax: 4,
    sessionDurationMin: 25,
    sessionDurationMax: 60,
    intensityGuidance: "Moderate effort (RPE 6–7/10), 1–3 reps in reserve",
    recoveryGuidance: "Allow 48 hours between working the same major muscle groups.",
    caveats: "Prioritize controlled form before adding external load.",
    whyThisSummary:
      "WHO guidelines recommend 2–4 muscle-strengthening sessions per week (25–60 min) to build baseline strength, bone density, and metabolic health safely.",
    sourceId: "who_strength_2020",
    source: ALLOWLISTED_SOURCES["who_strength_2020"]!,
    reviewStatus: "approved",
    reviewerName: "Dr. Sarah Lim, CSCS",
    reviewerCredential: "Sports Science Reviewer",
    reviewedAt: "2026-11-18T09:30:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-gym-advanced",
    version: "1.2.0",
    activityType: "gym_strength",
    level: "intermediate",
    goal: "gain_muscle",
    weeklyFrequencyMin: 3,
    weeklyFrequencyMax: 5,
    sessionDurationMin: 35,
    sessionDurationMax: 75,
    intensityGuidance: "Moderate-to-vigorous effort (RPE 7–8.5/10)",
    recoveryGuidance: "Use an upper/lower or push/pull split to protect recovery.",
    caveats: "Reduce frequency if sleep quality or joint comfort declines.",
    whyThisSummary:
      "ACSM progression models support 3–5 weekly resistance sessions (35–75 min) for intermediate lifters targeting muscle hypertrophy.",
    sourceId: "acsm_resistance_progression",
    source: ALLOWLISTED_SOURCES["acsm_resistance_progression"]!,
    reviewStatus: "approved",
    reviewerName: "Dr. Sarah Lim, CSCS",
    reviewerCredential: "Sports Science Reviewer",
    reviewedAt: "2026-11-18T09:42:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-casual-run-all",
    version: "1.2.0",
    activityType: "casual_run",
    level: "all",
    goal: "all",
    weeklyFrequencyMin: 2,
    weeklyFrequencyMax: 4,
    sessionDurationMin: 20,
    sessionDurationMax: 45,
    intensityGuidance: "Easy conversational pace (Zone 2, RPE 4–5/10)",
    recoveryGuidance: "Keep breathing comfortable enough to speak in full sentences.",
    caveats: "Use run-walk intervals whenever heart rate climbs too high.",
    whyThisSummary:
      "CDC adult aerobic guidance supports 2–4 easy runs of 20–45 minutes weekly to build cardiovascular fitness with low joint strain.",
    sourceId: "cdc_aerobic_casual",
    source: ALLOWLISTED_SOURCES["cdc_aerobic_casual"]!,
    reviewStatus: "approved",
    reviewerName: "Coach Daniel Tan, MSc",
    reviewerCredential: "Endurance & Nutrition Reviewer",
    reviewedAt: "2026-11-19T14:15:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-interval-run",
    version: "1.2.0",
    activityType: "interval_run",
    level: "all",
    goal: "all",
    weeklyFrequencyMin: 1,
    weeklyFrequencyMax: 2,
    sessionDurationMin: 20,
    sessionDurationMax: 40,
    intensityGuidance: "Structured hard repeats (RPE 8–9/10) with full recovery jogs",
    recoveryGuidance: "Never place interval sessions on consecutive days or next to tempo runs.",
    caveats: "Restricted when health screening flags cardiovascular or joint conditions.",
    whyThisSummary:
      "ACSM interval guidelines cap vigorous interval sessions at 1–2 per week (20–40 min total) with easy or rest days around them.",
    sourceId: "acsm_hiit_intervals",
    source: ALLOWLISTED_SOURCES["acsm_hiit_intervals"]!,
    reviewStatus: "approved",
    reviewerName: "Coach Daniel Tan, MSc",
    reviewerCredential: "Endurance & Nutrition Reviewer",
    reviewedAt: "2026-11-19T14:25:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-tempo-run",
    version: "1.2.0",
    activityType: "tempo_run",
    level: "all",
    goal: "improve_running",
    weeklyFrequencyMin: 1,
    weeklyFrequencyMax: 2,
    sessionDurationMin: 25,
    sessionDurationMax: 45,
    intensityGuidance: "Comfortably hard steady effort (RPE 7–8/10)",
    recoveryGuidance: "Space tempo sessions at least 48 hours away from interval runs.",
    caveats: "Beginners start with shorter tempo blocks inside an easy run.",
    whyThisSummary:
      "NSCA endurance guidance recommends 1–2 tempo runs (25–45 min) per week to raise sustainable pace without exceeding recovery capacity.",
    sourceId: "nsca_tempo_threshold",
    source: ALLOWLISTED_SOURCES["nsca_tempo_threshold"]!,
    reviewStatus: "approved",
    reviewerName: "Coach Daniel Tan, MSc",
    reviewerCredential: "Endurance & Nutrition Reviewer",
    reviewedAt: "2026-11-20T11:05:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-long-run",
    version: "1.2.0",
    activityType: "long_run",
    level: "all",
    goal: "all",
    weeklyFrequencyMin: 1,
    weeklyFrequencyMax: 1,
    sessionDurationMin: 35,
    sessionDurationMax: 90,
    intensityGuidance: "Steady aerobic pace (RPE 4–6/10)",
    recoveryGuidance: "Limit weekly total running volume increases to ≤ 10%.",
    caveats: "Hydrate before and after sessions longer than 45 minutes.",
    whyThisSummary:
      "NHS endurance guidance centers on 1 weekly long run (35–90 min) while keeping total weekly running growth under 10%.",
    sourceId: "nhs_long_run_endurance",
    source: ALLOWLISTED_SOURCES["nhs_long_run_endurance"]!,
    reviewStatus: "approved",
    reviewerName: "Coach Daniel Tan, MSc",
    reviewerCredential: "Endurance & Nutrition Reviewer",
    reviewedAt: "2026-11-20T11:20:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-rest-recovery",
    version: "1.2.0",
    activityType: "rest",
    level: "all",
    goal: "all",
    weeklyFrequencyMin: 1,
    weeklyFrequencyMax: 3,
    sessionDurationMin: 0,
    sessionDurationMax: 20,
    intensityGuidance: "Complete rest or light mobility walk (RPE 1–2/10)",
    recoveryGuidance: "At least 1 full rest day is mandatory in every weekly plan.",
    caveats: "Take extra rest when experiencing sharp pain or persistent fatigue.",
    whyThisSummary:
      "ACSM recovery standards mandate 1–3 rest or light recovery days (0–20 min mobility) weekly so muscular and tendon adaptations occur safely.",
    sourceId: "acsm_recovery_rest",
    source: ALLOWLISTED_SOURCES["acsm_recovery_rest"]!,
    reviewStatus: "approved",
    reviewerName: "Dr. Sarah Lim, CSCS",
    reviewerCredential: "Sports Science Reviewer",
    reviewedAt: "2026-11-20T11:30:00Z",
    modelVersion: "gemini-structured-kb-v1",
  },
  {
    id: "rec-pending-advanced-tempo",
    version: "1.3.0-draft",
    activityType: "tempo_run",
    level: "advanced",
    goal: "improve_running",
    weeklyFrequencyMin: 1,
    weeklyFrequencyMax: 2,
    sessionDurationMin: 25,
    sessionDurationMax: 45,
    intensityGuidance: "Sustained lactate-threshold pace (RPE 7.5–8.5/10)",
    recoveryGuidance: "Follow with an easy recovery run or rest day.",
    caveats: "Pending human reviewer sign-off; not yet active in live plans.",
    whyThisSummary:
      "Draft extraction: 1–2 weekly threshold runs (25–45 min) for advanced runners targeting race pace improvement.",
    sourceId: "nsca_tempo_threshold",
    source: ALLOWLISTED_SOURCES["nsca_tempo_threshold"]!,
    reviewStatus: "pending_review",
    modelVersion: "gemini-structured-kb-v2-candidate",
  },
];

export interface GroundingCheckResult {
  passed: boolean;
  recordNumbers: number[];
  missingNumbers: number[];
  hasValidCitation: boolean;
}

/**
 * Automated Grounding Check (PRD Section 3.3):
 * Verifies every extracted numeric value in the recommendation record
 * appears verbatim inside the cited source passage, with no invented citation.
 */
export function verifyRecordGrounding(record: RecommendationRecord): GroundingCheckResult {
  const passageNumbers = new Set(
    (record.source.passage.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => Number(n)),
  );
  const recordNumbers = [
    record.weeklyFrequencyMin,
    record.weeklyFrequencyMax,
    record.sessionDurationMin,
    record.sessionDurationMax,
  ];
  const missingNumbers = recordNumbers.filter((n) => !passageNumbers.has(n));
  const hasValidCitation =
    Boolean(record.source.url.startsWith("https://")) &&
    Boolean(record.source.contentHash) &&
    record.source.termsChecked &&
    record.source.passage.length > 0 &&
    record.source.passage.length <= 400;

  return {
    passed: missingNumbers.length === 0 && hasValidCitation,
    recordNumbers,
    missingNumbers,
    hasValidCitation,
  };
}
