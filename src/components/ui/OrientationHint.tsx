
import { useEffect, useState } from "react";
import { isCoarsePointer, isPortrait } from "@/lib/input";

/**
 * Soft portrait hint on phones: still playable; suggests landscape for comfort.
 */
export function OrientationHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      setVisible(isCoarsePointer() && isPortrait());
    };
    update();
    const mqPortrait = window.matchMedia("(orientation: portrait)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    mqPortrait.addEventListener?.("change", update);
    mqCoarse.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      mqPortrait.removeEventListener?.("change", update);
      mqCoarse.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[11px] text-white/85 shadow-lg backdrop-blur-md"
      role="status"
    >
      建議橫持手機，操作更舒適
    </div>
  );
}
