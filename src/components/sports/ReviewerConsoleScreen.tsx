import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, FlaskConical, ShieldAlert, X } from "lucide-react";

import { verifyRecordGrounding } from "@/data/knowledge-base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calculateCalorieGuidance, hasScreeningRisk } from "@/lib/fitness-engine";
import { ACTIVITY_LABELS } from "@/lib/i18n";
import { buildWeeklyPlan } from "@/lib/plan-builder";
import { cn } from "@/lib/utils";
import type {
  ActivityLevel,
  AppState,
  BiologicalSex,
  DayOfWeek,
  ExperienceLevel,
  GoalType,
  RecommendationRecord,
  ReviewStatus,
  UserGoal,
  UserProfile,
} from "@/types/fitness";

export function ReviewerConsoleScreen({
  state,
  onBack,
  onUpdateRecord,
  onResolveReport,
}: {
  state: AppState;
  onBack: () => void;
  onUpdateRecord: (record: RecommendationRecord) => void;
  onResolveReport: (reportId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editFreqMin, setEditFreqMin] = useState("1");
  const [editFreqMax, setEditFreqMax] = useState("2");
  const [evalReport, setEvalReport] = useState<{
    testedProfiles: number;
    violations: number;
    groundingPassed: number;
    groundingTotal: number;
  } | null>(null);

  const activityLabels = ACTIVITY_LABELS[state.profile.language];

  function startEdit(rec: RecommendationRecord) {
    setEditingId(rec.id);
    setEditSummary(rec.whyThisSummary);
    setEditFreqMin(String(rec.weeklyFrequencyMin));
    setEditFreqMax(String(rec.weeklyFrequencyMax));
  }

  function updateStatus(rec: RecommendationRecord, reviewStatus: ReviewStatus) {
    onUpdateRecord({
      ...rec,
      reviewStatus,
      reviewerName: "Dr. Sarah Lim, CSCS",
      reviewedAt: new Date().toISOString(),
    });
  }

  function saveEdit(rec: RecommendationRecord) {
    onUpdateRecord({
      ...rec,
      whyThisSummary: editSummary,
      weeklyFrequencyMin: Math.max(0, Number(editFreqMin) || rec.weeklyFrequencyMin),
      weeklyFrequencyMax: Math.max(1, Number(editFreqMax) || rec.weeklyFrequencyMax),
      reviewStatus: "approved",
      reviewerName: "Dr. Sarah Lim, CSCS",
      reviewedAt: new Date().toISOString(),
    });
    setEditingId(null);
  }

  function runEvaluationMatrix() {
    const ages = [20, 42, 65];
    const weights = [46, 72, 108];
    const sexes: BiologicalSex[] = ["female", "male"];
    const goals: GoalType[] = ["lose_weight", "gain_muscle", "improve_running"];
    const levels: ExperienceLevel[] = ["beginner", "intermediate"];
    const screeningVariants = [false, true];
    const actLevels: ActivityLevel[] = ["sedentary", "moderate"];

    let tested = 0;
    let violations = 0;

    for (const age of ages) {
      for (const weightKg of weights) {
        for (const sex of sexes) {
          for (const gType of goals) {
            for (const lvl of levels) {
              for (const flagged of screeningVariants) {
                for (const act of actLevels) {
                  tested += 1;
                  const p: UserProfile = {
                    ...state.profile,
                    age,
                    weightKg,
                    heightCm: 170,
                    sex,
                    experienceLevel: lvl,
                    activityLevel: act,
                    availableDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
                    screening: {
                      pregnancy: false,
                      heartCondition: flagged,
                      jointOrInjury: false,
                      eatingDisorderHistory: false,
                    },
                  };
                  const g: UserGoal = {
                    ...state.goal,
                    type: gType,
                    targetWeightKg: weightKg - 15,
                    targetDate: "2026-12-15",
                  };

                  const cal = calculateCalorieGuidance(p, g, "2026-11-27");
                  const plan = buildWeeklyPlan({
                    profile: p,
                    goal: g,
                    records: state.recommendationRecords,
                    recentRuns: [],
                    previousWeekRunMinutes: 100,
                  });

                  const maxWeeklyLossKg = weightKg * 0.01;
                  if (
                    cal.dailyTarget < cal.calorieFloor ||
                    cal.rangeMin < cal.calorieFloor ||
                    cal.weeklyWeightChangeKg < -maxWeeklyLossKg - 0.05 ||
                    !plan.safetyChecks.hasRestDay ||
                    !plan.safetyChecks.noConsecutiveHardDays ||
                    !plan.safetyChecks.withinVolumeProgressionCap ||
                    (hasScreeningRisk(p.screening) && !plan.safetyChecks.screeningRespected)
                  ) {
                    violations += 1;
                  }
                }
              }
            }
          }
        }
      }
    }

    const published = state.recommendationRecords.filter((r) => r.reviewStatus === "approved");
    const groundingPassed = published.filter((r) => verifyRecordGrounding(r).passed).length;

    setEvalReport({
      testedProfiles: tested,
      violations,
      groundingPassed,
      groundingTotal: published.length,
    });
  }

  return (
    <div className="space-y-4 pb-6 arc-enter">
      <header className="flex items-center gap-2 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={onBack}
          aria-label="Back to Profile"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Internal Persona · Human-in-the-Loop
          </p>
          <h1 className="text-lg font-bold">Content Reviewer Console</h1>
        </div>
      </header>

      {/* Automated Evaluation Runner (PRD 3.3) */}
      <section className="arc-card p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold">Safety & Grounding Evaluator</h2>
            <p className="text-xs text-muted-foreground">
              Tests 200+ profile combinations & verifies numeric source grounding
            </p>
          </div>
          <Button
            className="rounded-xl min-h-[40px] px-3.5 text-xs font-semibold shrink-0"
            onClick={runEvaluationMatrix}
          >
            <FlaskConical className="h-3.5 w-3.5" /> Run Suite
          </Button>
        </div>

        {evalReport && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="badge-emerald rounded-2xl p-3">
              <span className="text-[11px]">
                Safety Matrix ({evalReport.testedProfiles} profiles)
              </span>
              <p className="text-sm font-bold mt-0.5 tabular-nums">
                {evalReport.violations} Violations
              </p>
            </div>
            <div className="badge-blue rounded-2xl p-3">
              <span className="text-[11px]">Published Grounding</span>
              <p className="text-sm font-bold mt-0.5 tabular-nums">
                {evalReport.groundingPassed}/{evalReport.groundingTotal} Verified
              </p>
            </div>
          </div>
        )}
      </section>

      {/* User Reports Queue (US-03) */}
      {state.reports.length > 0 && (
        <section className="arc-card p-4 space-y-2.5 text-xs">
          <h2 className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
            <ShieldAlert className="h-4 w-4" /> User Safety Reports ({state.reports.length})
          </h2>
          {state.reports.map((rep) => (
            <div key={rep.id} className="rounded-2xl border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <strong>Record: {rep.recordId}</strong>
                <span className="uppercase text-[11px] font-semibold">{rep.status}</span>
              </div>
              <p className="text-muted-foreground">{rep.reason}</p>
              {rep.status === "open" && (
                <Button
                  variant="outline"
                  className="min-h-[36px] text-xs rounded-xl"
                  onClick={() => onResolveReport(rep.id)}
                >
                  Mark Reviewed
                </Button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Side-by-Side Source Passage vs AI Extraction Queue (PRD 2.1 & 3.2) */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold px-0.5">
          Knowledge Base Queue ({state.recommendationRecords.length})
        </h2>
        {state.recommendationRecords.map((rec) => {
          const grounding = verifyRecordGrounding(rec);
          const isEditing = editingId === rec.id;

          return (
            <div key={rec.id} className="arc-card p-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-sm">
                    {activityLabels[rec.activityType]} ({rec.level} · {rec.goal})
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Model: {rec.modelVersion} · Hash: {rec.source.contentHash}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize shrink-0",
                    rec.reviewStatus === "approved"
                      ? "badge-emerald"
                      : rec.reviewStatus === "rejected"
                        ? "badge-rose"
                        : "badge-amber",
                  )}
                >
                  {rec.reviewStatus.replace("_", " ")}
                </span>
              </div>

              {/* Side-by-side Source vs AI Summary */}
              <div className="grid grid-cols-1 gap-2.5 rounded-2xl bg-muted/50 p-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Cited Source Passage ({rec.source.organization})
                  </span>
                  <p className="mt-1 italic text-xs leading-relaxed">
                    &ldquo;{rec.source.passage}&rdquo;
                  </p>
                </div>
                <div className="border-t pt-2.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    AI Structured Record ({rec.weeklyFrequencyMin}–{rec.weeklyFrequencyMax}×/wk ·{" "}
                    {rec.sessionDurationMin}–{rec.sessionDurationMax}m)
                  </span>
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={editFreqMin}
                          onChange={(e) => setEditFreqMin(e.target.value)}
                          className="h-9 tabular-nums"
                        />
                        <Input
                          type="number"
                          value={editFreqMax}
                          onChange={(e) => setEditFreqMax(e.target.value)}
                          className="h-9 tabular-nums"
                        />
                      </div>
                      <Textarea
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button className="min-h-[38px] text-xs" onClick={() => saveEdit(rec)}>
                          Save & Approve
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-[38px] text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed">{rec.whyThisSummary}</p>
                  )}
                </div>
              </div>

              {/* Grounding Pill + Reviewer Actions */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold",
                    grounding.passed
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {grounding.passed
                    ? "Numeric grounding 100% pass"
                    : `Missing from passage: ${grounding.missingNumbers.join(", ")}`}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    className="min-h-[36px] px-3 text-xs rounded-xl"
                    onClick={() => startEdit(rec)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[36px] px-3 text-xs rounded-xl text-emerald-700 dark:text-emerald-300"
                    onClick={() => updateStatus(rec, "approved")}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[36px] px-3 text-xs rounded-xl text-rose-700 dark:text-rose-300"
                    onClick={() => updateStatus(rec, "rejected")}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
