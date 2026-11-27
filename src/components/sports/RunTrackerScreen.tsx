import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Compass,
  Lock,
  MapPin,
  Navigation,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";

import { ArcRollingNumber } from "@/components/arc/ArcPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDistance, formatDurationClock, formatPace } from "@/lib/fitness-engine";
import { ACTIVITY_LABELS, COPY } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AppState, PlannedSession, RoutePoint, RunLog, RunSplit } from "@/types/fitness";

// Pre-seeded realistic park loop coordinates
const LOOP_WAYPOINTS: Array<{ x: number; y: number; lat: number; lng: number }> = [
  { x: 52, y: 158, lat: -6.2186, lng: 106.8018 },
  { x: 74, y: 120, lat: -6.2178, lng: 106.8024 },
  { x: 118, y: 82, lat: -6.2169, lng: 106.8035 },
  { x: 175, y: 54, lat: -6.2161, lng: 106.8048 },
  { x: 242, y: 58, lat: -6.2162, lng: 106.8064 },
  { x: 294, y: 92, lat: -6.2171, lng: 106.8075 },
  { x: 306, y: 138, lat: -6.2182, lng: 106.8078 },
  { x: 266, y: 176, lat: -6.2192, lng: 106.8068 },
  { x: 196, y: 184, lat: -6.2195, lng: 106.8051 },
  { x: 124, y: 178, lat: -6.2192, lng: 106.8034 },
  { x: 64, y: 168, lat: -6.2189, lng: 106.8021 },
];

function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function RunTrackerScreen({
  state,
  activePlannedSession,
  reduceMotion,
  onPermissionChange,
  onSaveRun,
}: {
  state: AppState;
  activePlannedSession?: PlannedSession | undefined;
  reduceMotion: boolean;
  onPermissionChange: (permission: "granted" | "denied") => void;
  onSaveRun: (run: RunLog) => void;
}) {
  const [trackingState, setTrackingState] = useState<"idle" | "running" | "paused" | "reviewing">(
    "idle",
  );
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [useSimulator, setUseSimulator] = useState(true);
  const [manualMode, setManualMode] = useState(state.consent.locationPermission === "denied");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
    { lat: LOOP_WAYPOINTS[0]!.lat, lng: LOOP_WAYPOINTS[0]!.lng, timestampMs: 0 },
  ]);
  const [splits, setSplits] = useState<RunSplit[]>([]);
  const [selectedRunKind, setSelectedRunKind] = useState<RunLog["runKind"]>(
    activePlannedSession?.runPrescription?.runKind ?? "casual_run",
  );
  const [cuesEnabled, setCuesEnabled] = useState(true);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Manual Entry form state
  const [manualDistInput, setManualDistInput] = useState("5.0");
  const [manualDurationMin, setManualDurationMin] = useState("30");
  const [manualNotes, setManualNotes] = useState("");

  const geoWatchRef = useRef<number | null>(null);
  const lastSplitDistRef = useRef(0);
  const lastSplitTimeRef = useRef(0);

  const lang = state.profile.language;
  const copy = COPY[lang];
  const activityLabels = ACTIVITY_LABELS[lang];
  const unitSystem = state.profile.unitSystem;

  // Interval segment calculation when session is interval_run
  const intervalSegments = activePlannedSession?.runPrescription?.segments;
  const currentIntervalInfo = useMemo(() => {
    if (!intervalSegments || intervalSegments.length === 0) return null;
    let cursor = 0;
    for (let i = 0; i < intervalSegments.length; i++) {
      const seg = intervalSegments[i]!;
      if (elapsedSec < cursor + seg.durationSec) {
        return {
          index: i + 1,
          total: intervalSegments.length,
          segment: seg,
          remainingSec: cursor + seg.durationSec - elapsedSec,
        };
      }
      cursor += seg.durationSec;
    }
    const last = intervalSegments[intervalSegments.length - 1]!;
    return {
      index: intervalSegments.length,
      total: intervalSegments.length,
      segment: last,
      remainingSec: 0,
    };
  }, [elapsedSec, intervalSegments]);

  useEffect(() => {
    if (trackingState !== "running") return;

    const timer = window.setInterval(() => {
      if (isAutoPaused) return;
      setElapsedSec((prev) => prev + 1);
      if (useSimulator) {
        setDistanceKm((prevDist) => {
          const nextDist = prevDist + 0.0031;
          const nextIdx = Math.floor((nextDist * 4) % LOOP_WAYPOINTS.length);
          const wp = LOOP_WAYPOINTS[nextIdx]!;
          setRoutePoints((pts) => {
            const last = pts[pts.length - 1];
            if (last && last.lat === wp.lat && last.lng === wp.lng) return pts;
            return [...pts, { lat: wp.lat, lng: wp.lng, timestampMs: Date.now() }];
          });
          return nextDist;
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [trackingState, isAutoPaused, useSimulator]);

  // Split calculation on every 1 km
  useEffect(() => {
    const splitStepKm = 1.0;
    if (distanceKm - lastSplitDistRef.current >= splitStepKm) {
      const splitDur = Math.max(180, elapsedSec - lastSplitTimeRef.current);
      const splitNum = splits.length + 1;
      lastSplitDistRef.current = distanceKm;
      lastSplitTimeRef.current = elapsedSec;
      setSplits((prev) => [
        ...prev,
        {
          splitNumber: splitNum,
          durationSec: splitDur,
          paceMinPerKm: Number((splitDur / 60).toFixed(2)),
        },
      ]);
    }
  }, [distanceKm, elapsedSec, splits.length]);

  useEffect(() => {
    return () => {
      if (
        geoWatchRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, []);

  function clearWatchIfNeeded() {
    if (geoWatchRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    }
  }

  function requestRealGpsAndStart() {
    setSavedBanner(null);
    if (!useSimulator && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onPermissionChange("granted");
          setRoutePoints([
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestampMs: pos.timestamp,
            },
          ]);
          geoWatchRef.current = navigator.geolocation.watchPosition(
            (update) => {
              const nextPt: RoutePoint = {
                lat: update.coords.latitude,
                lng: update.coords.longitude,
                timestampMs: update.timestamp,
              };
              setRoutePoints((prev) => {
                const last = prev[prev.length - 1];
                if (last) {
                  const deltaKm = haversineKm(last, nextPt);
                  if (autoPauseEnabled && deltaKm < 0.001) {
                    setIsAutoPaused(true);
                    return prev;
                  }
                  setIsAutoPaused(false);
                  setDistanceKm((d) => d + deltaKm);
                }
                return [...prev, nextPt];
              });
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 2000 },
          );
          setTrackingState("running");
        },
        () => {
          onPermissionChange("denied");
          setManualMode(true);
        },
      );
      return;
    }

    onPermissionChange("granted");
    setTrackingState("running");
  }

  function enterReviewBeforeSave() {
    clearWatchIfNeeded();
    setTrackingState("reviewing");
  }

  function resetTracker() {
    clearWatchIfNeeded();
    setTrackingState("idle");
    setElapsedSec(0);
    setDistanceKm(0);
    setSplits([]);
    setRoutePoints([{ lat: LOOP_WAYPOINTS[0]!.lat, lng: LOOP_WAYPOINTS[0]!.lng, timestampMs: 0 }]);
    lastSplitDistRef.current = 0;
    lastSplitTimeRef.current = 0;
  }

  function confirmAndSaveRun() {
    const finalDist = Math.max(0.25, Number(distanceKm.toFixed(2)));
    const finalDur = Math.max(60, elapsedSec);
    const avgPace = Number((finalDur / 60 / finalDist).toFixed(2));
    const newLog: RunLog = {
      id: `run-${Date.now()}`,
      plannedSessionId: activePlannedSession?.id,
      runKind: selectedRunKind,
      title: activePlannedSession?.title ?? activityLabels[selectedRunKind],
      dateISO: "2026-11-27",
      distanceKm: finalDist,
      durationSec: finalDur,
      avgPaceMinPerKm: avgPace,
      splits,
      routePoints,
      entrySource: useSimulator ? "simulated_gps" : "gps",
      intervalSegmentsCompleted: currentIntervalInfo?.index,
      createdAt: new Date().toISOString(),
    };
    onSaveRun(newLog);
    resetTracker();
    setSavedBanner(
      `Saved ${formatDistance(finalDist, unitSystem)} run to your history & weekly plan.`,
    );
  }

  function submitManualRun() {
    const rawDist = Number(manualDistInput) || 0;
    const distKm = unitSystem === "imperial" ? rawDist / 0.621371 : rawDist;
    const durMin = Math.max(5, Number(manualDurationMin) || 30);
    if (distKm <= 0) return;

    const avgPace = Number((durMin / distKm).toFixed(2));
    const log: RunLog = {
      id: `run-manual-${Date.now()}`,
      plannedSessionId: activePlannedSession?.id,
      runKind: selectedRunKind,
      title: `${activityLabels[selectedRunKind]} (Manual)`,
      dateISO: "2026-11-27",
      distanceKm: Number(distKm.toFixed(2)),
      durationSec: Math.round(durMin * 60),
      avgPaceMinPerKm: avgPace,
      splits: [],
      routePoints: [],
      entrySource: "manual",
      notes: manualNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onSaveRun(log);
    setSavedBanner(`Logged manual ${formatDistance(distKm, unitSystem)} run.`);
    setManualNotes("");
  }

  const avgPaceMinPerKm =
    distanceKm > 0.05
      ? elapsedSec / 60 / distanceKm
      : state.profile.selfReported5kMinutes
        ? (state.profile.selfReported5kMinutes / 5) * 1.12
        : 6.0;
  const activePointCount = Math.max(1, Math.min(LOOP_WAYPOINTS.length, routePoints.length));
  const polylinePoints = LOOP_WAYPOINTS.slice(0, activePointCount)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
  const currentHead = LOOP_WAYPOINTS[activePointCount - 1] ?? LOOP_WAYPOINTS[0]!;

  return (
    <div className="space-y-3.5 pb-4 arc-enter">
      <header className="flex items-center justify-between gap-2 pt-1">
        <div>
          <p className="text-xs text-muted-foreground">
            {activePlannedSession
              ? `Matched: ${activePlannedSession.title}`
              : "Free Run or Planned Session"}
          </p>
          <h1 className="text-xl font-bold tracking-tight">{copy.gpsTitle}</h1>
        </div>
        <button
          type="button"
          onClick={() => setManualMode((v) => !v)}
          className="arc-focus min-h-[38px] rounded-xl border bg-card px-3 text-xs font-semibold cursor-pointer hover:bg-accent"
        >
          {manualMode ? copy.gpsMap : copy.manualEntry}
        </button>
      </header>

      {savedBanner && (
        <div
          role="status"
          className="badge-emerald flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-semibold"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Run Type Selector */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {(["casual_run", "interval_run", "tempo_run", "long_run"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={trackingState !== "idle"}
            aria-pressed={selectedRunKind === kind}
            onClick={() => setSelectedRunKind(kind)}
            className={cn(
              "arc-focus min-h-[36px] rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors",
              selectedRunKind === kind
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {activityLabels[kind]}
          </button>
        ))}
      </div>

      {manualMode ? (
        <section className="arc-card p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Manual Run Entry</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Location permission denied or running on a treadmill? Log your run manually below.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="man-dist" className="text-xs font-semibold">
                Distance ({unitSystem === "imperial" ? "mi" : "km"})
              </Label>
              <Input
                id="man-dist"
                type="number"
                step="0.1"
                value={manualDistInput}
                onChange={(e) => setManualDistInput(e.target.value)}
                className="mt-1.5 h-10 tabular-nums"
              />
            </div>
            <div>
              <Label htmlFor="man-dur" className="text-xs font-semibold">
                Duration (min)
              </Label>
              <Input
                id="man-dur"
                type="number"
                value={manualDurationMin}
                onChange={(e) => setManualDurationMin(e.target.value)}
                className="mt-1.5 h-10 tabular-nums"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="man-notes" className="text-xs font-semibold">
              Notes (optional)
            </Label>
            <Input
              id="man-notes"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Treadmill or outdoor loop..."
              className="mt-1.5 h-10"
            />
          </div>
          <Button
            className="w-full min-h-[44px] rounded-2xl font-semibold"
            onClick={submitManualRun}
          >
            <Plus className="h-4 w-4" /> Save Manual Run
          </Button>
        </section>
      ) : (
        <>
          {/* Live Route Map Canvas (MapKit-inspired + Dark Mode compatible) */}
          <section
            className="relative overflow-hidden rounded-3xl border shadow-inner"
            style={{ background: "var(--arc-map-bg)" }}
            aria-label="Live GPS route map"
          >
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-card/92 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur border border-border/60">
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {trackingState === "running"
                  ? isAutoPaused
                    ? "Auto-paused"
                    : "Background GPS active"
                  : "When In Use Location"}
              </span>
            </div>

            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-card/92 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm border border-border/60">
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>{useSimulator ? "Route Sim" : "Device GPS"}</span>
            </div>

            <svg viewBox="0 0 360 215" className="h-52 w-full block">
              <rect width="360" height="215" fill="var(--arc-map-bg)" />
              <ellipse cx="184" cy="120" rx="135" ry="74" fill="var(--arc-map-park)" />
              <path
                d="M 0 92 Q 160 66 360 112"
                stroke="var(--arc-map-road)"
                strokeWidth="7"
                fill="none"
              />
              <path
                d="M 110 0 Q 134 115 92 215"
                stroke="var(--arc-map-road)"
                strokeWidth="6"
                fill="none"
              />
              <path
                d="M 248 0 Q 258 100 280 215"
                stroke="var(--arc-map-road)"
                strokeWidth="5"
                fill="none"
              />

              <polygon
                points={LOOP_WAYPOINTS.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth="2"
              />

              {routePoints.length > 1 && (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              <circle
                cx={LOOP_WAYPOINTS[0]!.x}
                cy={LOOP_WAYPOINTS[0]!.y}
                r="5.5"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="2"
              />

              <g transform={`translate(${currentHead.x}, ${currentHead.y})`}>
                {!reduceMotion && trackingState === "running" && (
                  <circle r="11" fill="#10b981" className="arc-gps-pulse" />
                )}
                <circle r="6.5" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
              </g>
            </svg>
          </section>

          {/* Target Pace Zone Guidance when linked to a planned run */}
          {activePlannedSession?.runPrescription && (
            <div className="badge-blue flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs">
              <span className="font-semibold">Target Zone</span>
              <span className="font-bold tabular-nums">
                {formatPace(activePlannedSession.runPrescription.paceMinPerKmLow, unitSystem)} –{" "}
                {formatPace(activePlannedSession.runPrescription.paceMinPerKmHigh, unitSystem)}
              </span>
            </div>
          )}

          {/* Interval Guidance Banner (US-06) */}
          {currentIntervalInfo && selectedRunKind === "interval_run" && (
            <div className="rounded-2xl border bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between text-xs">
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-80">
                  Segment {currentIntervalInfo.index}/{currentIntervalInfo.total} ·{" "}
                  {currentIntervalInfo.segment.targetEffort}
                </p>
                <p className="font-bold text-sm">{currentIntervalInfo.segment.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tabular-nums">
                  {formatDurationClock(currentIntervalInfo.remainingSec)}
                </span>
                <Volume2 className={cn("h-4 w-4", cuesEnabled ? "opacity-100" : "opacity-40")} />
              </div>
            </div>
          )}

          {/* Live Metrics & Error-Preventing Review Card */}
          <section className="arc-card p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Distance</p>
                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  <ArcRollingNumber
                    value={distanceKm}
                    reduceMotion={reduceMotion}
                    format={(n) =>
                      unitSystem === "imperial" ? `${(n * 0.621371).toFixed(2)}` : `${n.toFixed(2)}`
                    }
                  />
                  <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                    {unitSystem === "imperial" ? "mi" : "km"}
                  </span>
                </p>
              </div>
              <div className="border-x px-2">
                <p className="text-[11px] font-medium text-muted-foreground">Duration</p>
                <p className="mt-1 text-xl font-bold font-mono tracking-tight tabular-nums">
                  {formatDurationClock(elapsedSec)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Avg Pace</p>
                <p className="mt-1 text-sm font-bold leading-7 tabular-nums">
                  {formatPace(avgPaceMinPerKm, unitSystem)}
                </p>
              </div>
            </div>

            {/* Controls: Start, Pause, Resume, Review-to-Finish */}
            <div className="mt-4 flex items-center gap-2">
              {trackingState === "idle" && (
                <Button
                  className="flex-1 rounded-2xl min-h-[46px] text-sm font-semibold"
                  onClick={requestRealGpsAndStart}
                >
                  <Navigation className="h-4 w-4" /> Start GPS Run
                </Button>
              )}
              {trackingState === "running" && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-2xl min-h-[46px] font-semibold"
                    onClick={() => setTrackingState("paused")}
                  >
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-2xl min-h-[46px] px-5 font-semibold"
                    onClick={enterReviewBeforeSave}
                  >
                    <Square className="h-4 w-4" /> Finish
                  </Button>
                </>
              )}
              {trackingState === "paused" && (
                <>
                  <Button
                    className="flex-1 rounded-2xl min-h-[46px] font-semibold"
                    onClick={() => setTrackingState("running")}
                  >
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-2xl min-h-[46px] px-5 font-semibold"
                    onClick={enterReviewBeforeSave}
                  >
                    <Square className="h-4 w-4" /> Finish
                  </Button>
                </>
              )}
            </div>

            {trackingState === "reviewing" && (
              <div className="mt-4 rounded-2xl border bg-muted/50 p-3.5 space-y-3">
                <p className="text-xs font-bold">Confirm & Save Workout</p>
                <p className="text-xs text-muted-foreground">
                  Save this {formatDistance(Math.max(0.25, distanceKm), unitSystem)} session or
                  resume tracking if you tapped Finish by mistake.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 min-h-[42px] rounded-xl text-xs font-semibold"
                    onClick={confirmAndSaveRun}
                  >
                    <Check className="h-4 w-4" /> Save Run
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[42px] rounded-xl px-3 text-xs"
                    onClick={() => setTrackingState("paused")}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-[42px] rounded-xl px-3 text-xs text-destructive"
                    onClick={resetTracker}
                    aria-label="Discard run"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Toggles: Auto-Pause, Simulator vs Device GPS */}
            <div className="mt-4 space-y-2.5 border-t pt-3.5 text-xs">
              <div className="flex items-center justify-between min-h-[36px]">
                <span className="text-muted-foreground">Auto-pause when stopped</span>
                <Switch
                  checked={autoPauseEnabled}
                  onCheckedChange={setAutoPauseEnabled}
                  aria-label="Auto-pause when stopped"
                />
              </div>
              <div className="flex items-center justify-between min-h-[36px]">
                <span className="text-muted-foreground">Indoor route simulator (demo GPS)</span>
                <Switch
                  checked={useSimulator}
                  onCheckedChange={setUseSimulator}
                  aria-label="Indoor route simulator"
                />
              </div>
              {selectedRunKind === "interval_run" && (
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-muted-foreground">Interval sound/visual cues (v1.1)</span>
                  <Switch
                    checked={cuesEnabled}
                    onCheckedChange={setCuesEnabled}
                    aria-label="Interval cues"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Live Splits */}
          {splits.length > 0 && (
            <section className="arc-card p-4 space-y-2 text-xs">
              <h2 className="font-bold">Recorded Splits</h2>
              {splits.map((sp) => (
                <div
                  key={sp.splitNumber}
                  className="flex justify-between text-muted-foreground tabular-nums"
                >
                  <span>Split {sp.splitNumber} km</span>
                  <strong className="text-foreground">
                    {formatPace(sp.paceMinPerKm, unitSystem)}
                  </strong>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
