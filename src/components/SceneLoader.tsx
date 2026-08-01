"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { preloadFaçadeTextures } from "@/lib/houseMaterials";

/**
 * Client-only loader:
 * 1) Show progress while building procedural textures (real steps + names)
 * 2) Mount Canvas only after textures ready
 * 3) Hide overlay when first frame reports ready
 */
const Scene = dynamic(
  () => import("@/components/Scene").then((m) => m.Scene),
  { ssr: false },
);

export function SceneLoader() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("載入 3D 模組…");
  const [texturesReady, setTexturesReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStep("載入 3D 模組…");
      setProgress(0.02);
      // Allow dynamic import of Scene to start while we prepare copy
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled) return;

      await preloadFaçadeTextures((p) => {
        if (cancelled) return;
        // Reserve 0–90% for textures; last 10% for first frame
        setProgress(0.02 + p.progress * 0.88);
        setStep(p.step);
      });

      if (cancelled) return;
      setProgress(0.92);
      setStep("編譯場景…");
      setTexturesReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSceneReady = useCallback(() => {
    setProgress(1);
    setStep("完成");
    // Brief paint of 100% then fade out overlay
    requestAnimationFrame(() => {
      setFading(true);
      window.setTimeout(() => setSceneReady(true), 120);
    });
  }, []);

  const showOverlay = !sceneReady;

  return (
    <div className="relative h-full w-full min-h-0 flex-1">
      {showOverlay && (
        <LoadingScreen progress={progress} step={step} fading={fading} />
      )}
      {texturesReady && (
        <div
          className={`h-full w-full transition-opacity duration-100 ${
            sceneReady || fading ? "opacity-100" : "opacity-0"
          }`}
        >
          <Scene onReady={onSceneReady} />
        </div>
      )}
    </div>
  );
}
