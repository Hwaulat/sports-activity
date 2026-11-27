import { useEffect, useState } from "react";
import { Check, Clock, Dumbbell, History, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectGymTemplate } from "@/data/workouts";
import { formatWeight, kgToLbs, lbsToKg } from "@/lib/fitness-engine";
import type { AppState, GymLog, LoggedExerciseSet, PlannedSession } from "@/types/fitness";

export function GymLoggerModal({
  open,
  state,
  plannedSession,
  onClose,
  onSaveLog,
}: {
  open: boolean;
  state: AppState;
  plannedSession?: PlannedSession | undefined;
  onClose: () => void;
  onSaveLog: (log: GymLog) => void;
}) {
  const template = selectGymTemplate(
    state.goal.type,
    state.profile.experienceLevel,
    state.profile.gymAccess,
  );
  const previousLog = state.gymLogs[0];
  const isImperial = state.profile.unitSystem === "imperial";

  const [entries, setEntries] = useState<LoggedExerciseSet[]>(() =>
    template.exercises.map((ex) => {
      const prevEx = previousLog?.exercises.find((p) => p.exerciseId === ex.id);
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        setsCompleted: prevEx?.setsCompleted ?? ex.sets,
        repsPerSet: prevEx?.repsPerSet ?? ex.reps,
        weightKg: prevEx?.weightKg,
      };
    }),
  );
  const [durationMin, setDurationMin] = useState(String(template.estimatedMinutes));
  const [notes, setNotes] = useState("");
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);

  useEffect(() => {
    if (restSecondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setRestSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [restSecondsLeft]);

  function updateEntry(idx: number, patch: Partial<LoggedExerciseSet>) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  function handleSave() {
    const newLog: GymLog = {
      id: `gym-${Date.now()}`,
      plannedSessionId: plannedSession?.id,
      templateId: template.id,
      title: plannedSession?.title ?? template.name,
      dateISO: "2026-11-27",
      durationMinutes: Math.max(10, Number(durationMin) || template.estimatedMinutes),
      exercises: entries,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    onSaveLog(newLog);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px] max-h-[85dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            {plannedSession?.title ?? template.name}
          </DialogTitle>
          <DialogDescription>
            Prefilled from curated template · Reference numbers from previous session shown
          </DialogDescription>
        </DialogHeader>

        {/* Rest Countdown Helper */}
        <div className="flex items-center justify-between rounded-2xl bg-muted/70 px-3.5 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
            <Timer className="h-3.5 w-3.5 text-primary" />
            Rest Timer: {restSecondsLeft > 0 ? `${restSecondsLeft}s left` : "Ready"}
          </span>
          <div className="flex gap-1.5">
            {[60, 90].map((sec) => (
              <Button
                key={sec}
                size="sm"
                variant="outline"
                className="min-h-[34px] px-2.5 text-xs tabular-nums"
                onClick={() => setRestSecondsLeft(sec)}
              >
                {sec}s
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const prevMatch = previousLog?.exercises.find((p) => p.exerciseId === entry.exerciseId);
            const displayWeight =
              entry.weightKg !== undefined
                ? isImperial
                  ? Math.round(kgToLbs(entry.weightKg))
                  : entry.weightKg
                : "";

            return (
              <div key={entry.exerciseId} className="rounded-2xl border p-3.5 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <strong className="text-foreground text-xs">{entry.exerciseName}</strong>
                  {prevMatch && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground tabular-nums">
                      <History className="h-3 w-3" />
                      Prev: {prevMatch.setsCompleted}×{prevMatch.repsPerSet}
                      {prevMatch.weightKg !== undefined
                        ? ` @ ${formatWeight(prevMatch.weightKg, state.profile.unitSystem)}`
                        : ""}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Sets</Label>
                    <Input
                      type="number"
                      min={1}
                      value={entry.setsCompleted}
                      onChange={(e) =>
                        updateEntry(idx, {
                          setsCompleted: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-9 mt-1 tabular-nums"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Reps</Label>
                    <Input
                      value={entry.repsPerSet}
                      onChange={(e) => updateEntry(idx, { repsPerSet: e.target.value })}
                      className="h-9 mt-1 tabular-nums"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Weight ({isImperial ? "lb" : "kg"})
                    </Label>
                    <Input
                      type="number"
                      placeholder="Opt"
                      value={displayWeight}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          updateEntry(idx, { weightKg: undefined });
                          return;
                        }
                        const val = Number(raw);
                        updateEntry(idx, {
                          weightKg: isImperial ? Number(lbsToKg(val).toFixed(1)) : val,
                        });
                      }}
                      className="h-9 mt-1 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label htmlFor="gym-dur" className="inline-flex items-center gap-1 text-xs">
                <Clock className="h-3.5 w-3.5" /> Duration (min)
              </Label>
              <Input
                id="gym-dur"
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="mt-1 h-9 tabular-nums"
              />
            </div>
          </div>

          <div className="text-xs">
            <Label htmlFor="gym-notes" className="text-xs">
              Session notes
            </Label>
            <Textarea
              id="gym-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Energy, form cues, or weights to adjust next time..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <Button className="w-full min-h-[44px] rounded-2xl font-semibold" onClick={handleSave}>
          <Check className="h-4 w-4" /> Complete & Save Gym Session
        </Button>
      </DialogContent>
    </Dialog>
  );
}
