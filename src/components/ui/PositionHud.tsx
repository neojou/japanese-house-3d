
import { useViewerStore } from "@/store/useViewerStore";

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Top-right HUD: live first-person coordinates (plan-space X/Z, eye Y).
 */
export function PositionHud() {
  const { x, y, z } = useViewerStore((s) => s.position);

  return (
    <div
      className="pointer-events-none select-none rounded-xl border border-white/15 bg-black/55 px-3 py-2 font-mono text-white shadow-lg backdrop-blur-md"
      aria-live="polite"
      aria-label="目前座標"
    >
      <p className="mb-1.5 text-[10px] font-sans font-medium uppercase tracking-wider text-white/55">
        座標 (m)
      </p>
      <div className="grid grid-cols-[1.25rem_1fr] gap-x-2 gap-y-0.5 text-sm tabular-nums leading-relaxed">
        <span className="text-rose-300">X</span>
        <span className="text-right text-white/95">{fmt(x)}</span>
        <span className="text-sky-300">Z</span>
        <span className="text-right text-white/95">{fmt(z)}</span>
        <span className="text-emerald-300">Y</span>
        <span className="text-right text-white/95">{fmt(y)}</span>
      </div>
      <p className="mt-1.5 text-[9px] font-sans leading-snug text-white/40">
        X 西→東 · Z 南→北 · Y 視高
      </p>
    </div>
  );
}
