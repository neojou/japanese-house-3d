"use client";

type Props = {
  /** 0-1 */
  progress: number;
  /** Current step label (Chinese) */
  step: string;
  /** Fade out when true */
  fading?: boolean;
};

/**
 * Full-screen loader — DESIGN warm/minimal, so users know work is in progress.
 */
export function LoadingScreen({ progress, step, fading }: Props) {
  const pct = Math.round(Math.min(100, Math.max(0, progress * 100)));
  const rootClass = fading
    ? "pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center opacity-0 transition-opacity duration-150"
    : "absolute inset-0 z-50 flex flex-col items-center justify-center opacity-100 transition-opacity duration-150";

  return (
    <div
      className={rootClass}
      style={{ backgroundColor: "#1c1b19" }}
      aria-busy={!fading}
      aria-live="polite"
    >
      <div className="w-full max-w-sm px-8">
        <p
          className="mb-1 text-center text-sm font-medium tracking-wide"
          style={{ color: "#f3eee4" }}
        >
          日本住宅 3D
        </p>
        <p
          className="mb-6 text-center"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}
        >
          準備高品質材質與場景
        </p>

        <div
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-200 ease-out"
            style={{ width: `${pct}%`, backgroundColor: "#e8dcc8" }}
          />
        </div>

        <div
          className="mt-3 flex items-center justify-between gap-3"
          style={{ fontSize: 11 }}
        >
          <span
            className="min-w-0 truncate"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {step}
          </span>
          <span
            className="shrink-0 tabular-nums"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
