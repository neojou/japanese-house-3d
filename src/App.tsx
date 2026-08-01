import { SceneLoader } from "@/components/SceneLoader";

/**
 * App shell — full-viewport 3D walkthrough (Vite SPA).
 */
export default function App() {
  return (
    <main className="flex h-dvh w-full min-h-0 flex-col overflow-hidden bg-slate-900">
      <SceneLoader />
    </main>
  );
}
