import { useEffect } from "react";
import { useLightingStore } from "@/store/useLightingStore";

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/** L switches art/builder when data exists. O toggles the outlet layer. */
export function LightingStatus() {
  const data = useLightingStore((s) => s.data);
  const mode = useLightingStore((s) => s.mode);
  const showOutlets = useLightingStore((s) => s.showOutlets);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (typingTarget(e.target)) return;
      if (e.code === "KeyL") useLightingStore.getState().toggleMode();
      else if (e.code === "KeyO") useLightingStore.getState().toggleOutlets();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (data == null) {
    return (
      <p className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] leading-none text-white/75">
        照明：無建商資料
      </p>
    );
  }
  const modeLabel = mode === "builder" ? "建商" : "美術";
  const outletLabel = showOutlets ? "顯示" : "隱藏";
  return (
    <p className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] leading-none text-white/75">
      照明：{modeLabel}｜插座：{outletLabel}
    </p>
  );
}
