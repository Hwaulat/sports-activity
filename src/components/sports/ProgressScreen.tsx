import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Dumbbell, Footprints, Plus, Scale, TrendingDown } from "lucide-react";

import { ArcSegmentedTabs } from "@/components/arc/ArcPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  formatDistance,
  formatDurationClock,
  formatPace,
  formatWeight,
  kgToLbs,
  lbsToKg,
} from "@/lib/fitness-engine";
import { ACTIVITY_LABELS, COPY } from "@/lib/i18n";
import { selectApprovedRecommendation } from "@/lib/plan-builder";
import { cn } from "@/lib/utils";
import type { ActivityType, AppState, GymLog, RunLog } from "@/types/fitness";

function WeightTooltip({
  active,
  payload,
  label,
  unitLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  unitLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const val = payload[0]?.value;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-bold tabular-nums">
        {val} {unitLabel}
      </p>
    </div>
  );
}

export function ProgressScreen({
  state,
  onAddWeightEntry,
}: {
  state: AppState;
  onAddWeightEntry: (weightKg: number) => void;
}) {
  const [historyFilter, setHistoryFilter] = useState<"all" | "runs" | "gym">("all");
  const [weightInput, setWeightInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isImperial = state.profile.unitSystem === "imperial";
  const lang = state.profile.language;
  const copy = COPY[lang];
  const activityLabels = ACTIVITY_LABELS[lang];

  const sessions = state.currentPlan.sessions;
  const nonRest = sessions.filter((s) => s.activityType !== "rest");
  const doneCount = nonRest.filter((s) => s.status === "done").length;
  const adherencePct = nonRest.length > 0 ? Math.round((doneCount / nonRest.length) * 100) : 0;

  const chartData = state.weightEntries.map((entry) => ({
    date: entry.dateISO.slice(5),
    weight: isImperial ? Number(kgToLbs(entry.weightKg).toFixed(1)) : entry.weightKg,
  }));

  const targetDisplayWeight = state.goal.targetWeightKg
    ? isImperial
      ? Number(kgToLbs(state.goal.targetWeightKg).toFixed(1))
      : state.goal.targetWeightKg
    : undefined;

  function submitWeight() {
    const num = Number(weightInput);
    if (!Number.isFinite(num) || num <= 20) return;
    const kg = isImperial ? lbsToKg(num) : num;
    onAddWeightEntry(Number(kg.toFixed(1)));
    setWeightInput("");
  }

  type HistoryEntry =
    | {
        id: string;
        kind: "run";
        title: string;
        dateISO: string;
        subtitle: string;
        raw: RunLog;
      }
    | {
        id: string;
        kind: "gym";
        title: string;
        dateISO: string;
        subtitle: string;
        raw: GymLog;
      };

  const combinedHistory: HistoryEntry[] = [
    ...state.runLogs.map((r) => ({
      id: r.id,
      kind: "run" as const,
      title: r.title,
      dateISO: r.dateISO,
      subtitle: `${formatDistance(r.distanceKm, state.profile.unitSystem)} · ${formatDurationClock(r.durationSec)} · ${formatPace(r.avgPaceMinPerKm, state.profile.unitSystem)}`,
      raw: r,
    })),
    ...state.gymLogs.map((g) => ({
      id: g.id,
      kind: "gym" as const,
      title: g.title,
      dateISO: g.dateISO,
      subtitle: `${g.durationMinutes} min · ${g.exercises.length} exercises`,
      raw: g,
    })),
  ]
    .filter((item) => {
      if (historyFilter === "runs") return item.kind === "run";
      if (historyFilter === "gym") return item.kind === "gym";
      return true;
    })
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const trackedActivities: ActivityType[] = [
    "gym_strength",
    "casual_run",
    "interval_run",
    "tempo_run",
    "long_run",
  ];

  return (
    <div className="space-y-4 pb-4 arc-enter">
      <header className="pt-1">
        <p className="text-xs text-muted-foreground">{copy.progressSubtitle}</p>
        <h1 className="text-xl font-bold tracking-tight">{copy.progressTitle}</h1>
      </header>

      {/* Weekly Adherence & Frequency Comparison (US-10) */}
      <section className="arc-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">{copy.weeklyAdherence}</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {doneCount} of {nonRest.length} planned sessions completed
            </p>
          </div>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {adherencePct}%
          </span>
        </div>
        <Progress value={adherencePct} className="h-2.5" />

        <div className="space-y-2 pt-1">
          {trackedActivities.map((type) => {
            const { record } = selectApprovedRecommendation(
              state.recommendationRecords,
              type,
              state.profile,
              state.goal,
            );
            const doneType = sessions.filter(
              (s) => s.activityType === type && s.status === "done",
            ).length;
            const plannedType = sessions.filter((s) => s.activityType === type).length;
            const recMax = record?.weeklyFrequencyMax ?? 2;
            const recLabel = record
              ? `${record.weeklyFrequencyMin}–${record.weeklyFrequencyMax}×`
              : "0–2×";

            return (
              <div
                key={type}
                className="flex items-center justify-between text-xs tabular-nums gap-2"
              >
                <span className="text-muted-foreground">{activityLabels[type]}</span>
                <span className="font-semibold text-right">
                  {doneType}/{plannedType} done{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    (Target {recLabel} · Max {recMax})
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weight Trend Chart (US-10) */}
      <section className="arc-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold">{copy.weightTrend}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                Current: {formatWeight(state.profile.weightKg, state.profile.unitSystem)}
                {state.goal.targetWeightKg
                  ? ` · Goal: ${formatWeight(state.goal.targetWeightKg, state.profile.unitSystem)}`
                  : ""}
              </p>
            </div>
          </div>
          <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="h-36 min-h-[144px] w-full">
          <ResponsiveContainer width="100%" height={144} minWidth={240}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                domain={["dataMin - 2", "dataMax + 2"]}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip content={<WeightTooltip unitLabel={isImperial ? "lb" : "kg"} />} />
              {targetDisplayWeight && (
                <ReferenceLine
                  y={targetDisplayWeight}
                  stroke="var(--color-foreground)"
                  strokeDasharray="4 4"
                />
              )}
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={2.2}
                fill="url(#weightFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder={`Log weight (${isImperial ? "lb" : "kg"})`}
            className="h-10 tabular-nums"
          />
          <Button className="h-10 rounded-xl px-4 text-xs font-semibold" onClick={submitWeight}>
            <Plus className="h-4 w-4" /> Log
          </Button>
        </div>
      </section>

      {/* Expandable Workout & Run History (US-10) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">{copy.sessionHistory}</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {combinedHistory.length} entries
          </span>
        </div>

        <ArcSegmentedTabs
          ariaLabel="Filter history"
          value={historyFilter}
          onChange={setHistoryFilter}
          options={[
            { value: "all", label: "All" },
            { value: "runs", label: "Runs" },
            { value: "gym", label: "Gym" },
          ]}
        />

        <div className="space-y-2">
          {combinedHistory.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <div key={item.id} className="arc-card overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  className="arc-focus flex w-full min-h-[58px] items-center justify-between gap-2 p-3.5 text-left cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {item.kind === "run" ? (
                        <Footprints className="h-4 w-4" />
                      ) : (
                        <Dumbbell className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                      {item.dateISO}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/30 px-4 py-3 text-xs space-y-2">
                    {item.kind === "run" ? (
                      <>
                        <p className="text-muted-foreground">
                          Source: <strong className="uppercase">{item.raw.entrySource}</strong>
                          {item.raw.notes ? ` · ${item.raw.notes}` : ""}
                        </p>
                        {item.raw.splits.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {item.raw.splits.map((sp) => (
                              <div
                                key={sp.splitNumber}
                                className="flex justify-between rounded-lg bg-card px-2.5 py-1.5 border text-[11px] tabular-nums"
                              >
                                <span className="text-muted-foreground">
                                  Split {sp.splitNumber}
                                </span>
                                <span className="font-semibold">
                                  {formatPace(sp.paceMinPerKm, state.profile.unitSystem)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          {item.raw.exercises.map((ex) => (
                            <div
                              key={ex.exerciseId}
                              className="flex justify-between text-[11px] tabular-nums"
                            >
                              <span>{ex.exerciseName}</span>
                              <span className="font-semibold">
                                {ex.setsCompleted}×{ex.repsPerSet}
                                {ex.weightKg !== undefined
                                  ? ` @ ${formatWeight(ex.weightKg, state.profile.unitSystem)}`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                        {item.raw.notes && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            Notes: {item.raw.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
