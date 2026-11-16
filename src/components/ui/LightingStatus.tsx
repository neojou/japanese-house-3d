import { useMemo } from "react";
import { readLighting } from "@/lib/fixtures/runtime";

/** Status only. Keys and the live store arrive with the lighting store. */
export function LightingStatus() {
  const state = useMemo(() => readLighting(window.location.search), []);
  if (state.data == null) {
    return (
      <p className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] leading-none text-white/75">
        照明：無建商資料
      </p>
    );
  }
  const mode = state.mode === "builder" ? "建商" : "美術";
  const outlets = state.showOutlets ? "顯示" : "隱藏";
  return (
    <p className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] leading-none text-white/75">
      照明：{mode}｜插座：{outlets}
    </p>
  );
}
