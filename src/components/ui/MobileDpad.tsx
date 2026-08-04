
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  isCoarsePointer,
  resetInput,
  setVirtualMove,
  setVirtualTurn,
} from "@/lib/input";

type Dir = "up" | "down" | "left" | "right";

const BTN =
  "flex h-12 w-12 items-center justify-center rounded-xl border border-white/25 " +
  "bg-black/40 text-lg text-white/90 shadow-md backdrop-blur-md " +
  "active:bg-white/25 active:scale-95 select-none touch-none " +
  "transition-[background-color,transform] duration-75";

/**
 * Bottom-left translucent 4-way HUD for phones / tablets (coarse pointer only).
 * ↑↓ → continuous walk; ←→ → continuous yaw (see FirstPersonCamera).
 */
export function MobileDpad() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => setShow(isCoarsePointer());
    update();
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener?.("change", update);
    return () => {
      mq.removeEventListener?.("change", update);
      resetInput();
    };
  }, []);

  const bind = useCallback((dir: Dir) => {
    const press = () => {
      if (dir === "up") setVirtualMove("forward", true);
      else if (dir === "down") setVirtualMove("back", true);
      else if (dir === "left") setVirtualTurn("left", true);
      else setVirtualTurn("right", true);
    };
    const release = () => {
      if (dir === "up") setVirtualMove("forward", false);
      else if (dir === "down") setVirtualMove("back", false);
      else if (dir === "left") setVirtualTurn("left", false);
      else setVirtualTurn("right", false);
    };

    return {
      onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        press();
      },
      onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        release();
      },
      onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        release();
      },
      onLostPointerCapture: () => {
        release();
      },
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-20 select-none"
      aria-label="虛擬方向鍵"
      role="group"
    >
      <div className="grid grid-cols-3 gap-1.5">
        <div />
        <button type="button" className={BTN} aria-label="前進" {...bind("up")}>
          ↑
        </button>
        <div />
        <button type="button" className={BTN} aria-label="左轉" {...bind("left")}>
          ←
        </button>
        <button type="button" className={BTN} aria-label="後退" {...bind("down")}>
          ↓
        </button>
        <button type="button" className={BTN} aria-label="右轉" {...bind("right")}>
          →
        </button>
      </div>
    </div>
  );
}
