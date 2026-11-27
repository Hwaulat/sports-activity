import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Arc UI-inspired animated concentric Activity Rings:
 * Supports primary sweep + overflow lap indicator past 100%,
 * gracefully skipping transition duration when Reduce Motion is enabled.
 */
export function ArcActivityRings({
  rings,
  size = 108,
  reduceMotion = false,
  centerLabel,
  centerSublabel,
}: {
  rings: {
    label: string;
    progress: number; // 0..1.5+
    color: string;
    trackColor?: string;
  }[];
  size?: number;
  reduceMotion?: boolean;
  centerLabel: string;
  centerSublabel?: string;
}) {
  const [animated, setAnimated] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setAnimated(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setAnimated(true));
    return () => window.cancelAnimationFrame(id);
  }, [reduceMotion]);

  const strokeWidth = 8.5;
  const gap = 3.5;
  const center = size / 2;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerLabel} ${centerSublabel ?? ""}`.trim()}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {rings.map((ring, idx) => {
          const radius = center - strokeWidth / 2 - idx * (strokeWidth + gap);
          if (radius <= 6) return null;
          const circumference = 2 * Math.PI * radius;
          const clamped = Math.max(0, Math.min(1, ring.progress));
          const targetOffset = circumference * (1 - (animated ? clamped : 0));

          return (
            <g key={ring.label}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={ring.trackColor ?? "rgba(255,255,255,0.16)"}
                strokeWidth={strokeWidth}
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={targetOffset}
                style={{
                  transition: reduceMotion
                    ? "none"
                    : "stroke-dashoffset 680ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-bold leading-none tracking-tight tabular-nums text-white">
          {centerLabel}
        </span>
        {centerSublabel && (
          <span className="mt-1 text-[11px] font-medium leading-none text-slate-300">
            {centerSublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Arc UI-inspired smooth numeric interpolation for calorie targets & live telemetry.
 */
export function ArcRollingNumber({
  value,
  format = (n) => String(Math.round(n)),
  reduceMotion = false,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  reduceMotion?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }
    const duration = 360;
    const startAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + diff * eased);
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  return <span className={cn("tabular-nums", className)}>{format(display)}</span>;
}

/**
 * Arc UI-inspired segmented pill switch with clean sliding active surface & 40px touch target.
 */
export function ArcSegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full rounded-2xl bg-secondary p-1 border border-border/70 gap-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "arc-focus flex-1 min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-200",
              active
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Arc UI-inspired collapsible disclosure card for "Why this?" citations and details.
 */
export function ArcDisclosureCard({
  title,
  badge,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="arc-card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="arc-focus flex w-full min-h-[52px] items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer hover:bg-accent/40 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {badge && (
              <span className="badge-emerald rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                {badge}
              </span>
            )}
          </div>
          {summary && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{summary}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="border-t border-border/70 px-4 py-3 bg-muted/30">{children}</div>}
    </div>
  );
}
