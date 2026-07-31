"use client";

import { useViewerStore, type ViewerMode } from "@/store/useViewerStore";

const MODES: { id: ViewerMode; label: string; hint: string }[] = [
  {
    id: "top-down",
    label: "俯視 Top-down",
    hint: "拖曳平移 · 滾輪縮放",
  },
  {
    id: "first-person",
    label: "第一人稱 Walk",
    hint: "點擊鎖定 · WASD 移動 · Esc 解鎖",
  },
];

export function ModeSwitcher() {
  const mode = useViewerStore((s) => s.mode);
  const setMode = useViewerStore((s) => s.setMode);

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-white/15 bg-black/55 p-3 text-white shadow-lg backdrop-blur-md">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
        視角模式
      </p>
      <div className="flex gap-2">
        {MODES.map((m) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={[
                "rounded-lg px-3 py-2 text-left text-sm transition",
                selected
                  ? "bg-sky-500 text-white shadow"
                  : "bg-white/10 text-white/90 hover:bg-white/20",
              ].join(" ")}
            >
              <span className="block font-medium">{m.label}</span>
              <span className="mt-0.5 block text-[10px] opacity-70">
                {m.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
