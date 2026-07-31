"use client";

import dynamic from "next/dynamic";

/**
 * Client-only loader for the R3F viewer.
 * `ssr: false` is only allowed inside Client Components (Next.js 15+).
 */
const Scene = dynamic(
  () => import("@/components/Scene").then((m) => m.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-1 items-center justify-center bg-slate-900 text-sm text-white/70">
        載入 3D 場景…
      </div>
    ),
  },
);

export function SceneLoader() {
  return <Scene />;
}
