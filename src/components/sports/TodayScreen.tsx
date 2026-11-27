import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  Cloud,
  CloudOff,
  Dumbbell,
  ExternalLink,
  Flag,
  Flame,
  Footprints,
  Info,
  Play,
  SkipForward,
  Timer,
} from "lucide-react";

import {
  ArcActivityRings,
  ArcDisclosureCard,
  ArcRollingNumber,
} from "@/components/arc/ArcPrimitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDistance, hasScreeningRisk } from "@/lib/fitness-engine";
import { ACTIVITY_LABELS, COPY } from "@/lib/i18n";
import { buildRollingNotifications, selectApprovedRecommendation } from "@/lib/plan-builder";
import type { CloudSyncStatus } from "@/lib/supabase-sync";
import type {
  ActivityType,
  AppState,
  CalorieGuidance,
  PlannedSession,
  RecommendationRecord,
} from "@/types/fitness";

export function TodayScreen({
  state,
  calories,
  cloudStatus,
  reduceMotion,
  onStartSession,
  onSnoozeSession,
  onSkipSession,
  onOpenPlan,
  onSubmitReport,
  onEditProfile,
  onOpenCloudSync,
}: {
  state: AppState;
  calories: CalorieGuidance;
  cloudStatus: CloudSyncStatus;
  reduceMotion: boolean;
  onStartSession: (session: PlannedSession) => void;
  onSnoozeSession: (sessionId: string) => void;
  onSkipSession: (sessionId: string) => void;
  onOpenPlan: () => void;
  onSubmitReport: (recordId: string, reason: string) => void;
  onEditProfile: () => void;
  onOpenCloudSync: () => void;
}) {
  const [whyRecord, setWhyRecord] = useState<{
    activityType: ActivityType;
    record: RecommendationRecord | null;
  } | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [showCalorieDetail, setShowCalorieDetail] = useState(false);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);

  const lang = state.profile.language;
  const copy = COPY[lang];
  const activityLabels = ACTIVITY_LABELS[lang];
  const screeningFlagged = hasScreeningRisk(state.profile.screening);

  const sessions = state.currentPlan.sessions;
  const nonRestSessions = sessions.filter((s) => s.activityType !== "rest");
  const completedCount = nonRestSessions.filter((s) => s.status === "done").length;
  const adherenceProgress =
    nonRestSessions.length > 0 ? completedCount / nonRestSessions.length : 0;

  const completedRunMin = sessions
    .filter((s) => s.status === "done" && s.activityType.includes("run"))
    .reduce((acc, s) => acc + s.targetDurationMinutes, 0);
  const runVolumeProgress =
    state.currentPlan.plannedRunMinutes > 0
      ? completedRunMin / state.currentPlan.plannedRunMinutes
      : 0;

  const nextPlannedSession =
    sessions.find((s) => s.status === "planned" && s.activityType !== "rest") ?? sessions[0];

  const rollingNotifications = buildRollingNotifications(
    state.currentPlan,
    state.notificationSettings,
  );

  const activityTypes: ActivityType[] = [
    "gym_strength",
    "casual_run",
    "interval_run",
    "tempo_run",
    "long_run",
    "rest",
  ];

  return (
    <div className="space-y-4 pb-2 arc-enter">
      {/* Greeting Header */}
      <header className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{copy.notMedicalAdvice}</p>
          <h1 className="text-xl font-bold tracking-tight">
            {lang === "id" ? `Halo, ${state.profile.name}` : `Ready, ${state.profile.name}`}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full min-h-[40px] px-3 text-[11px] font-semibold"
            aria-label="Supabase cloud sync status"
            onClick={onOpenCloudSync}
          >
            {cloudStatus.state === "synced" ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Synced</span>
              </>
            ) : cloudStatus.state === "syncing" ? (
              <>
                <Cloud className="h-3.5 w-3.5 animate-pulse text-blue-600" />
                <span>Syncing</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Cloud Sync</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="relative rounded-full h-11 w-11 shrink-0"
            aria-label="Open session reminders"
            onClick={() => setShowNotificationSheet(true)}
          >
            <Bell className="h-4.5 w-4.5" />
            {rollingNotifications.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white tabular-nums">
                {rollingNotifications.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Screening Caution Banner (US-01) */}
      {screeningFlagged && (
        <div
          role="alert"
          className="badge-amber flex items-start gap-2.5 rounded-2xl p-3.5 text-xs"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold">Consult a healthcare professional</p>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              {copy.consultClinician} Aggressive calorie deficits & high-intensity intervals are
              locked.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[36px] px-3 text-xs shrink-0 bg-card"
            onClick={onEditProfile}
          >
            Review
          </Button>
        </div>
      )}

      {/* Hero Calorie + Arc Activity Rings Panel (US-02 & Arc UI) */}
      <section className="arc-hero-panel" aria-labelledby="calorie-hero-title">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Flame className="h-3.5 w-3.5 text-emerald-300" />
              <span id="calorie-hero-title">{copy.dailyCaloriesTitle}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-bold tracking-tight tabular-nums text-white">
                <ArcRollingNumber value={calories.rangeMin} reduceMotion={reduceMotion} />
                {" – "}
                <ArcRollingNumber value={calories.rangeMax} reduceMotion={reduceMotion} />
              </span>
              <span className="text-xs font-medium text-slate-300">kcal/day</span>
            </div>
            <p className="mt-1 text-xs text-slate-300 tabular-nums">
              Maintenance {calories.maintenanceCalories} kcal · BMI {calories.bmi}
              {calories.wasFloorApplied ? " · Floor active" : ""}
              {calories.wasLossRateCapped ? " · 1%/wk cap" : ""}
            </p>
            <button
              type="button"
              onClick={() => setShowCalorieDetail((v) => !v)}
              className="arc-focus mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/22 transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" />
              {showCalorieDetail ? "Hide formula" : "How it's calculated"}
            </button>
          </div>

          <ArcActivityRings
            reduceMotion={reduceMotion}
            centerLabel={`${completedCount}/${nonRestSessions.length}`}
            centerSublabel="Done"
            rings={[
              { label: "Sessions", progress: adherenceProgress, color: "#34d399" },
              { label: "Run mins", progress: runVolumeProgress, color: "#60a5fa" },
            ]}
          />
        </div>

        {showCalorieDetail && (
          <div className="relative z-10 mt-3 rounded-2xl bg-white/10 p-3.5 text-xs leading-relaxed text-slate-100 space-y-1.5">
            <p>{calories.formulaSummary}</p>
            <p className="text-slate-300">{copy.estimateNote}</p>
            {calories.warnings.map((w) => (
              <p key={w} className="text-amber-300 font-medium">
                • {w}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Next Planned Session Card (US-04, US-07) */}
      {nextPlannedSession && (
        <section className="space-y-2" aria-labelledby="next-session-heading">
          <div className="flex items-center justify-between px-0.5">
            <h2 id="next-session-heading" className="text-sm font-bold">
              {copy.upNext}
            </h2>
            <button
              type="button"
              onClick={onOpenPlan}
              className="arc-focus inline-flex min-h-[36px] items-center gap-0.5 rounded-lg px-2 text-xs font-semibold text-primary cursor-pointer hover:underline"
            >
              {copy.fullWeek} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="arc-card arc-card-interactive p-4 space-y-3">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {nextPlannedSession.activityType === "gym_strength" ? (
                    <Dumbbell className="h-5 w-5" />
                  ) : (
                    <Footprints className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      {activityLabels[nextPlannedSession.activityType]} ·{" "}
                      {nextPlannedSession.dateISO}
                    </span>
                    {nextPlannedSession.snoozedUntil && (
                      <span className="badge-amber rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        Snoozed +30m
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold leading-snug truncate">
                    {nextPlannedSession.title}
                  </h3>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">
                <Clock className="h-3.5 w-3.5" /> {nextPlannedSession.targetDurationMinutes}m
              </span>
            </div>

            {nextPlannedSession.runPrescription && (
              <p className="text-xs text-muted-foreground">
                {nextPlannedSession.runPrescription.effortLabel} · ~
                {formatDistance(
                  nextPlannedSession.runPrescription.estimatedDistanceKm,
                  state.profile.unitSystem,
                )}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                className="flex-1 rounded-xl h-10 text-xs font-semibold"
                onClick={() => onStartSession(nextPlannedSession)}
              >
                <Play className="h-3.5 w-3.5" /> {copy.startSession}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl h-10 px-3 text-xs"
                onClick={() => onSnoozeSession(nextPlannedSession.id)}
              >
                <Timer className="h-3.5 w-3.5" /> {copy.snoozeSession}
              </Button>
              <Button
                variant="ghost"
                className="rounded-xl h-10 px-3 text-xs text-muted-foreground"
                onClick={() => onSkipSession(nextPlannedSession.id)}
              >
                <SkipForward className="h-3.5 w-3.5" /> {copy.skipSession}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* US-03 Expert-Sourced Weekly Frequency Recommendations */}
      <section className="space-y-2.5" aria-labelledby="expert-freq-heading">
        <div className="px-0.5">
          <h2 id="expert-freq-heading" className="text-sm font-bold">
            {copy.expertTargetsTitle}
          </h2>
          <p className="text-xs text-muted-foreground">
            Reviewed KB {state.knowledgeBaseVersion} · Tap &ldquo;{copy.whyThis}&rdquo; for
            citations
          </p>
        </div>

        <div className="space-y-2">
          {activityTypes.map((type) => {
            const { record, usedFallback } = selectApprovedRecommendation(
              state.recommendationRecords,
              type,
              state.profile,
              state.goal,
            );
            const plannedCount = sessions.filter((s) => s.activityType === type).length;
            const rangeText = record
              ? `${record.weeklyFrequencyMin}–${record.weeklyFrequencyMax}× / wk`
              : "Conservative default";

            return (
              <div
                key={type}
                className="arc-card flex items-center justify-between gap-2 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {activityLabels[type]}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground tabular-nums">
                      Planned: {plannedCount}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Recommended: {rangeText}
                    {usedFallback ? " (no matching reviewed record)" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[38px] rounded-xl px-3 text-xs text-primary shrink-0"
                  onClick={() => setWhyRecord({ activityType: type, record })}
                >
                  <BookOpen className="h-3.5 w-3.5" /> {copy.whyThis}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why This? Citation Modal (US-03) */}
      <Dialog open={whyRecord !== null} onOpenChange={(open) => !open && setWhyRecord(null)}>
        <DialogContent className="max-w-[390px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {whyRecord ? activityLabels[whyRecord.activityType] : ""} — {copy.whyThis}
            </DialogTitle>
            <DialogDescription>
              Reviewed recommendation record & cited expert source
            </DialogDescription>
          </DialogHeader>
          {whyRecord?.record ? (
            <div className="space-y-3 text-xs">
              <p className="rounded-2xl bg-muted/70 p-3.5 leading-relaxed text-foreground">
                {whyRecord.record.whyThisSummary}
              </p>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-2xl border p-3">
                  <span className="text-[11px] text-muted-foreground">Frequency</span>
                  <p className="font-bold mt-0.5 tabular-nums">
                    {whyRecord.record.weeklyFrequencyMin}–{whyRecord.record.weeklyFrequencyMax}× /
                    week
                  </p>
                </div>
                <div className="rounded-2xl border p-3">
                  <span className="text-[11px] text-muted-foreground">Duration</span>
                  <p className="font-bold mt-0.5 tabular-nums">
                    {whyRecord.record.sessionDurationMin}–{whyRecord.record.sessionDurationMax} min
                  </p>
                </div>
              </div>
              <ArcDisclosureCard
                title={whyRecord.record.source.organization}
                badge="Reviewed"
                summary={whyRecord.record.source.title}
                defaultOpen
              >
                <p className="text-xs italic text-muted-foreground leading-relaxed">
                  &ldquo;{whyRecord.record.source.passage}&rdquo;
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground">
                    Signed off by {whyRecord.record.reviewerName} ·{" "}
                    {whyRecord.record.reviewedAt?.slice(0, 10)}
                  </span>
                  <a
                    href={whyRecord.record.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </ArcDisclosureCard>
              <Button
                variant="outline"
                className="w-full min-h-[42px] rounded-xl text-xs text-destructive"
                onClick={() => {
                  setReportTargetId(whyRecord.record!.id);
                  setWhyRecord(null);
                }}
              >
                <Flag className="h-3.5 w-3.5" /> {copy.reportWrong}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <p className="badge-amber rounded-2xl p-3.5 leading-relaxed">
                No approved knowledge-base record matched this activity and profile filter. The app
                automatically applies a conservative default to protect recovery.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Wrong Recommendation Modal (US-03) */}
      <Dialog
        open={reportTargetId !== null}
        onOpenChange={(open) => !open && setReportTargetId(null)}
      >
        <DialogContent className="max-w-[390px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Report Recommendation</DialogTitle>
            <DialogDescription>
              Flagged records are routed immediately to the Content Reviewer Console.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe what seems wrong, unclear, or unsafe..."
            rows={3}
          />
          <Button
            className="min-h-[44px] rounded-xl"
            disabled={!reportReason.trim()}
            onClick={() => {
              if (reportTargetId && reportReason.trim()) {
                onSubmitReport(reportTargetId, reportReason.trim());
                setReportReason("");
                setReportTargetId(null);
              }
            }}
          >
            Submit Report to Reviewer Queue
          </Button>
        </DialogContent>
      </Dialog>

      {/* Local Rolling Notifications Interactive Center (US-07) */}
      <Dialog open={showNotificationSheet} onOpenChange={setShowNotificationSheet}>
        <DialogContent className="max-w-[390px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Session Reminders (Offline Local Queue)</DialogTitle>
            <DialogDescription>
              {rollingNotifications.length} / 64 iOS rolling pending notifications scheduled
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {rollingNotifications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">
                Notifications are turned off or no planned sessions remain this week. The app works
                normally without reminders.
              </p>
            ) : (
              rollingNotifications.map((item) => {
                const linkedSession = sessions.find((s) => s.id === item.sessionId);
                return (
                  <div key={item.id} className="rounded-2xl border p-3.5 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {item.scheduledAtISO.replace("T", " · ").slice(0, 18)}
                        </p>
                      </div>
                      {item.suppressedByQuietHours && (
                        <span className="badge-amber rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                          Quiet hours
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                    {linkedSession && (
                      <div className="flex gap-2">
                        <Button
                          className="min-h-[38px] flex-1 text-xs rounded-xl"
                          onClick={() => {
                            setShowNotificationSheet(false);
                            onStartSession(linkedSession);
                          }}
                        >
                          {copy.startSession}
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-[38px] px-3 text-xs rounded-xl"
                          onClick={() => onSnoozeSession(linkedSession.id)}
                        >
                          {copy.snoozeSession}
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-[38px] px-3 text-xs rounded-xl"
                          onClick={() => onSkipSession(linkedSession.id)}
                        >
                          {copy.skipSession}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
