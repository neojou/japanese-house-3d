
import { useViewerStore } from "@/store/useViewerStore";

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Compact top-right HUD: live first-person coordinates (plan-space X/Z, eye Y).
 * Kept small/low-opacity so it does not dominate the view on desktop or phone.
 */
export function PositionHud() {
  const { x, y, z } = useViewerStore((s) => s.position);

  return (
    <div
      className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-white shadow-md backdrop-blur-sm"
      aria-live="polite"
      aria-label="目前座標"
    >
      <div className="flex items-baseline gap-2 text-[11px] tabular-nums leading-none sm:text-xs">
        <span className="text-[9px] font-sans uppercase tracking-wider text-white/45">
          m
        </span>
        <span>
          <span className="text-rose-300/90">X</span>{" "}
          <span className="text-white/90">{fmt(x)}</span>
        </span>
        <span>
          <span className="text-sky-300/90">Z</span>{" "}
          <span className="text-white/90">{fmt(z)}</span>
        </span>
        <span>
          <span className="text-emerald-300/90">Y</span>{" "}
          <span className="text-white/90">{fmt(y)}</span>
        </span>
      </div>
    </div>
  );
}
