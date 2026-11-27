import { useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Dumbbell,
  Footprints,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ArcDisclosureCard } from "@/components/arc/ArcPrimitives";
import { Button } from "@/components/ui/button";
import { GYM_TEMPLATES } from "@/data/workouts";
import { formatDistance, formatPace } from "@/lib/fitness-engine";
import { ACTIVITY_LABELS, COPY, STATUS_LABELS } from "@/lib/i18n";
import { DAY_LABELS_EN, DAY_LABELS_ID } from "@/lib/plan-builder";
import { cn } from "@/lib/utils";
import type { AppState, DayOfWeek, PlannedSession } from "@/types/fitness";

export function PlanScreen({
  state,
  onMoveSession,
  onStartSession,
  onMarkStatus,
  onRegeneratePlan,
  onRunWeeklyCheckIn,
}: {
  state: AppState;
  onMoveSession: (sessionId: string, targetDay: DayOfWeek) => { ok: boolean; reason?: string };
  onStartSession: (session: PlannedSession) => void;
  onMarkStatus: (sessionId: string, status: PlannedSession["status"]) => void;
  onRegeneratePlan: () => void;
  onRunWeeklyCheckIn: () => string;
}) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    state.currentPlan.sessions.find((s) => s.status === "planned")?.dayIndex ?? 0,
  );
  const [moveError, setMoveError] = useState<string | null>(null);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);

  const lang = state.profile.language;
  const copy = COPY[lang];
  const dayLabels = lang === "id" ? DAY_LABELS_ID : DAY_LABELS_EN;
  const activityLabels = ACTIVITY_LABELS[lang];
  const statusLabels = STATUS_LABELS[lang];
  const plan = state.currentPlan;

  const selectedSession =
    plan.sessions.find((s) => s.dayIndex === selectedDay) ?? plan.sessions[0]!;
  const linkedGymTemplate = selectedSession.gymTemplateId
    ? GYM_TEMPLATES.find((t) => t.id === selectedSession.gymTemplateId)
    : undefined;

  function handleMove(targetDay: DayOfWeek) {
    const res = onMoveSession(selectedSession.id, targetDay);
    if (!res.ok) {
      setMoveError(res.reason ?? "Move blocked by safety rules.");
    } else {
      setMoveError(null);
      setSelectedDay(targetDay);
    }
  }

  return (
    <div className="space-y-4 pb-4 arc-enter">
      <header className="flex items-center justify-between gap-2 pt-1">
        <div>
          <p className="text-xs text-muted-foreground tabular-nums">Week of {plan.weekStartISO}</p>
          <h1 className="text-xl font-bold tracking-tight">{copy.planTitle}</h1>
        </div>
        <Button
          variant="outline"
          className="rounded-xl min-h-[38px] px-3 text-xs font-semibold"
          onClick={onRegeneratePlan}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {copy.rebuildPlan}
        </Button>
      </header>

      {/* Safety Invariant Pill Bar (US-04) */}
      <div className="flex flex-wrap gap-2">
        <span className="badge-emerald inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Rest Day {plan.safetyChecks.hasRestDay ? "✓" : "✗"}
        </span>
        <span className="badge-emerald inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold">
          No Consecutive Hard Days {plan.safetyChecks.noConsecutiveHardDays ? "✓" : "✗"}
        </span>
        <span className="badge-blue inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tabular-nums">
          Run Volume: {plan.plannedRunMinutes}m ({plan.progressionPercent >= 0 ? "+" : ""}
          {plan.progressionPercent}%)
        </span>
      </div>

      {/* 7-Day Interactive Calendar Strip (US-04) */}
      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Weekly schedule days">
        {plan.sessions.map((s) => {
          const active = s.dayIndex === selectedDay;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setSelectedDay(s.dayIndex);
                setMoveError(null);
              }}
              className={cn(
                "arc-focus flex min-h-[68px] flex-col items-center justify-center rounded-2xl border py-2 px-1 cursor-pointer transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-foreground hover:bg-accent/60",
              )}
            >
              <span className="text-[11px] font-medium opacity-85">{dayLabels[s.dayIndex]}</span>
              <span className="my-1">
                {s.activityType === "rest" ? (
                  <span className="block h-2 w-2 rounded-full bg-muted-foreground/50" />
                ) : s.status === "done" ? (
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4",
                      active ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400",
                    )}
                  />
                ) : s.activityType === "gym_strength" ? (
                  <Dumbbell className="h-4 w-4" />
                ) : (
                  <Footprints className="h-4 w-4" />
                )}
              </span>
              <span className="text-[11px] font-semibold tabular-nums">
                {s.activityType === "rest" ? "Rest" : `${s.targetDurationMinutes}m`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Session Detail Card (US-05 & US-06) */}
      <section className="arc-card p-4 space-y-3.5" aria-live="polite">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary tabular-nums">
                {dayLabels[selectedSession.dayIndex]} · {selectedSession.dateISO}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  selectedSession.status === "done"
                    ? "badge-emerald"
                    : selectedSession.status === "skipped" || selectedSession.status === "missed"
                      ? "badge-amber"
                      : "bg-secondary text-secondary-foreground",
                )}
              >
                {statusLabels[selectedSession.status]}
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold">{selectedSession.title}</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {activityLabels[selectedSession.activityType]}
              {selectedSession.targetDurationMinutes > 0
                ? ` · ${selectedSession.targetDurationMinutes} min target`
                : ""}
            </p>
          </div>
          {selectedSession.isHardSession && (
            <span className="badge-rose rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
              Hard Effort
            </span>
          )}
        </div>

        {/* Running Session Breakdown (US-06) */}
        {selectedSession.runPrescription && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-muted/70 p-3">
                <span className="text-[11px] text-muted-foreground">Target Distance</span>
                <p className="font-bold mt-0.5 tabular-nums">
                  {formatDistance(
                    selectedSession.runPrescription.estimatedDistanceKm,
                    state.profile.unitSystem,
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/70 p-3">
                <span className="text-[11px] text-muted-foreground">Pace Range</span>
                <p className="font-bold mt-0.5 tabular-nums">
                  {formatPace(
                    selectedSession.runPrescription.paceMinPerKmLow,
                    state.profile.unitSystem,
                  )}{" "}
                  –{" "}
                  {formatPace(
                    selectedSession.runPrescription.paceMinPerKmHigh,
                    state.profile.unitSystem,
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">
                {selectedSession.runPrescription.effortLabel}:
              </strong>{" "}
              {selectedSession.runPrescription.explanation}
            </p>
            {selectedSession.runPrescription.segments && (
              <ArcDisclosureCard
                title="Interval Structure"
                badge={`${selectedSession.runPrescription.repeats} repeats`}
                summary="Warm-up, work/rest intervals, and cool-down"
                defaultOpen
              >
                <div className="space-y-1.5 text-xs">
                  {selectedSession.runPrescription.segments.slice(0, 6).map((seg, idx) => (
                    <div key={`${seg.label}-${idx}`} className="flex justify-between gap-2">
                      <span>{seg.label}</span>
                      <span className="font-semibold text-muted-foreground tabular-nums">
                        {Math.round((seg.durationSec / 60) * 10) / 10}m · {seg.targetEffort}
                      </span>
                    </div>
                  ))}
                  {selectedSession.runPrescription.segments.length > 6 && (
                    <p className="text-[11px] text-muted-foreground">
                      + {selectedSession.runPrescription.segments.length - 6} remaining segments
                    </p>
                  )}
                </div>
              </ArcDisclosureCard>
            )}
          </div>
        )}

        {/* Curated Gym Session Template (US-05) */}
        {linkedGymTemplate && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Curated template ({linkedGymTemplate.splitLabel}) · Tap any exercise for form tips
            </p>
            {linkedGymTemplate.exercises.map((ex) => (
              <ArcDisclosureCard
                key={ex.id}
                title={ex.name}
                badge={`${ex.sets} × ${ex.reps}`}
                summary={`${ex.muscleGroup} · Rest ${ex.restSeconds}s`}
              >
                <p className="text-xs text-foreground mb-1.5 leading-relaxed">{ex.description}</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                  {ex.formTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </ArcDisclosureCard>
            ))}
          </div>
        )}

        {/* Session Actions */}
        {selectedSession.activityType !== "rest" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              className="flex-1 rounded-xl min-h-[42px] text-xs font-semibold"
              onClick={() => onStartSession(selectedSession)}
            >
              {selectedSession.activityType === "gym_strength" ? copy.logGym : "Track Run with GPS"}
            </Button>
            {selectedSession.status !== "done" && (
              <Button
                variant="outline"
                className="rounded-xl min-h-[42px] px-3.5 text-xs font-semibold"
                onClick={() => onMarkStatus(selectedSession.id, "done")}
              >
                Mark Done
              </Button>
            )}
          </div>
        )}

        {/* Move to Another Day with Live Safety Re-Check (US-04) */}
        <div className="border-t pt-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Move session to another day (re-checks safety rules)</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {dayLabels.map((lbl, idx) => {
              const targetDay = idx as DayOfWeek;
              const isCurrent = targetDay === selectedSession.dayIndex;
              return (
                <button
                  key={lbl}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handleMove(targetDay)}
                  className={cn(
                    "arc-focus min-h-[40px] rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                    isCurrent
                      ? "bg-muted text-muted-foreground opacity-50 cursor-default"
                      : "bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
          {moveError && (
            <p role="alert" className="badge-rose rounded-xl px-3 py-2 text-xs font-medium">
              {moveError}
            </p>
          )}
        </div>
      </section>

      {/* US-11 (v1.1) Weekly Check-In & Plan Adaptation */}
      {state.v11AdaptationEnabled && (
        <section className="arc-card p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div>
                <h3 className="text-xs font-bold">v1.1 Weekly Check-In & Adaptation</h3>
                <p className="text-xs text-muted-foreground">
                  Adjusts volume & calories from adherence + weight trend within safety limits
                </p>
              </div>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <Button
            variant="outline"
            className="w-full min-h-[40px] rounded-xl text-xs font-semibold"
            onClick={() => setCheckInMessage(onRunWeeklyCheckIn())}
          >
            Run Weekly Check-In Now
          </Button>
          {checkInMessage && (
            <p className="badge-emerald rounded-xl p-3 text-xs leading-relaxed">{checkInMessage}</p>
          )}
        </section>
      )}
    </div>
  );
}
