# Mirror Live Reflection — Execution Path Analysis & Improvement Notes

> **Status:** Investigation document (no code change required to read this).  
> **Observed (owner):**  
> - Default URL: OK (classic envMap glass).  
> - `?mirrorLive=1`: **full canvas black from start**.  
> - `?mirrorLive=1&mirrorDebug=1`: still black; **`window.__MIRROR_DEBUG__` never appears**.  
> **Related:** `Architecture.md`, `src/components/house/InteriorMirror.tsx`, `src/lib/glOffscreen.ts`, `src/components/house/SenmenDisplay.tsx`.

---

## 0. Goal of this document

1. Trace **every code path that differs** when `mirrorLive=1` is on vs off.  
2. Explain **why full-screen black** can happen even before walking to the mirror.  
3. Explain **why `__MIRROR_DEBUG__` may never be set**.  
4. Rank hypotheses and define the next instrumentation / fix order (without guessing a single root cause as proven).

This is the “think before more patches” log after repeated failed mirror attempts.

---

## 1. Two product modes (runtime)

| Mode | URL | Who draws the glass | Secondary `gl.render`? |
|------|-----|---------------------|-------------------------|
| **Classic (default)** | `/japanese-house-3d/` | `SenmenDisplay` → `matMirror` (`MeshStandardMaterial` + Environment) | **No** |
| **Live FBO** | `?mirrorLive=1` | `InteriorMirror` via `createPortal` + FBO texture | **Yes, every frame** |

Debug flag: `?mirrorDebug=1` only affects whether `InteriorMirror`’s `useFrame` **writes** `window.__MIRROR_DEBUG__`. It does **not** add a DOM HUD by itself; the user must type `window.__MIRROR_DEBUG__` in the console (or log it). If the object is `undefined`, the write path never ran.

---

## 2. Boot path (shared until the mirror branch)

```
main.tsx
  └─ <StrictMode><App/></StrictMode>
       └─ SceneLoader
            ├─ preloadFaçadeTextures → texturesReady
            └─ lazy Scene
                 └─ Canvas
                      └─ SceneContent
                           ├─ background + fog
                           ├─ Lights + Environment (city)
                           ├─ PerspectiveCamera + FirstPersonCamera + Player
                           └─ group plan-mirror scale={[-1,1,1]}
                                └─ House → Props → SenmenDisplay
```

**Vite base:** `/japanese-house-3d/`  
Correct local URL example:

`http://localhost:5173/japanese-house-3d/?mirrorLive=1&mirrorDebug=1`

(If someone opens `http://localhost:5173/?mirrorLive=1` without the base path, the SPA may not load at all — different failure mode. Owner report is “full black”, which usually means Canvas mounted but draws black.)

---

## 3. Flag parsing — `isMirrorLiveEnabled` / `isMirrorDebugEnabled`

**File:** `InteriorMirror.tsx`

```ts
// Live
if (q.get("mirrorLive") === "0") return false;
return q.has("mirrorLive") || q.get("mirrorLive") === "1";

// Debug
return q.has("mirrorDebug");
```

| Query | Live? | Debug? |
|-------|-------|--------|
| (none) | false | false |
| `?mirrorLive=1` | true | false |
| `?mirrorLive` | true | false |
| `?mirrorLive=0` | false | false |
| `?mirrorLive=1&mirrorDebug=1` | true | true |

**Called from:**

1. `SenmenDisplay` render (twice: classic branch + live branch).  
2. `InteriorMirror` mount: `useMemo(() => isMirrorLiveEnabled(), [])` and `useMemo(() => isMirrorDebugEnabled(), [])`.

**Execution-path change:** flags are read **once per component mount** inside `InteriorMirror` (`useMemo` empty deps). Changing query without remounting the tree will not flip `live`/`debug` until full remount (hard reload is fine).

---

## 4. Diff A — `SenmenDisplay` glass switch

**File:** `SenmenDisplay.tsx` (mirror section)

### Default (`mirrorLive` off)

```
frame mesh (plan space, under plan-mirror)
matMirror box mesh (plan space)     ← Environment specular/reflection
NO InteriorMirror
NO useFrame offscreen pass
```

### Live (`mirrorLive` on)

```
frame mesh (plan space)             ← still present
NO matMirror box
InteriorMirror({
  position: [planToWorldX(v.x), mirrorY, z-0.012],  // WORLD pose
  rotation: [0, π, 0],
  width/height, resolution 512
})
```

**Path changes:**

| Item | Classic | Live |
|------|---------|------|
| Glass under `plan-mirror` | Yes | **No** |
| Glass at scene root (portal) | No | **Yes** |
| Extra world-space mesh | No | **Yes** (small plane only) |
| Per-frame offscreen work | No | **Yes** |

**Implication:** Full-screen black cannot be “only the 0.48×0.95 m glass covering the view.” The glass is tiny. Full black ⇒ **main framebuffer / camera / clear / viewport / R3F render pipeline** is wrong, not “mirror looks black.”

---

## 5. Diff B — `InteriorMirror` mount tree

When `isMirrorLiveEnabled()` is true, React mounts:

```tsx
createPortal(
  <mesh ref={meshRef} position={world} rotation={[0,π,0]} material={…}>
    <planeGeometry />
  </mesh>,
  scene,   // R3F root THREE.Scene
)
```

**Also on mount (hooks always run before `if (!live) return null`):**

| Hook | Effect |
|------|--------|
| `useThree()` | Binds `gl`, `scene`, `camera` |
| `useFBO(512,512,{depthBuffer:true,samples:0})` | Allocates `WebGLRenderTarget` **HalfFloat** + optional **DepthTexture** (drei default) |
| `useMemo` virtualCam + `MeshBasicMaterial` | Material starts with `map: null` |
| `useFrame(fn, 1)` | Subscribes callback at **priority 1** |

**Note on `if (!live) return null`:**  
`SenmenDisplay` only mounts `<InteriorMirror>` when live is true, so `live` inside the component should also be true. The early `return null` is a belt-and-suspenders for reuse.

### `useFBO` side effects (drei)

From `node_modules/@react-three/drei/core/Fbo.js`:

- Default texture **type = HalfFloatType**.  
- With `depthBuffer: true`, attaches `DepthTexture` (FloatType).  
- Resizes with layout effect when size changes.

**Path change vs classic:** large GPU allocations + every-frame depth-capable RT. Unlikely alone to black the main view, but increases cost of nested `gl.render`.

---

## 6. Diff C — per-frame execution (`useFrame` priority 1)

R3F order (simplified):

```
requestAnimationFrame
  → run all useFrame subscribers (sorted by priority; lower first, then higher)
  → then R3F main gl.render(scene, defaultCamera)   // unless manual render loop
```

`InteriorMirror` uses **priority `1`**, so it runs **after** default priority `0` (`Player`, `FirstPersonCamera`) and **before** the main paint of that frame (typical R3F).

### Frame body (annotated)

```
useFrame:
  1. if (!live) return                    // no debug write
  2. if (!meshRef.current) return         // ★ NO debug write  ← critical for owner report
  3. framesRef++
  4. if (!isMainFramebufferReady(gl))
        → if debug: set __MIRROR_DEBUG__ { mode:"skipped", reason:"framebuffer-not-ready" }
        → return
  5. compute planePoint, normal, reflected virtualCam, near
  6. mesh.visible = false
  7. withOffscreenRender(gl, scene, fbo, () => gl.render(scene, virtualCam), …)
  8. mesh.visible = true  (finally)
  9. material.map = fbo.texture
 10. if debug: set __MIRROR_DEBUG__ { mode:"live", lastDist, lastNear, frames, … }
```

---

## 7. Why `__MIRROR_DEBUG__` can be missing

Owner: black screen + **no** `window.__MIRROR_DEBUG__`.

The debug object is **only** assigned inside `useFrame`, and **only after** `meshRef.current` is non-null (except that the “framebuffer-not-ready” branch also requires mesh first).

### Case D1 — `InteriorMirror` never mounts

| Cause | Result |
|-------|--------|
| Query not seen (`mirrorLive` false) | Classic path; no debug expected |
| Wrong base URL / app not this build | Old bundle without debug code |

If live glass were not mounting, classic glass would still show (unless live true and classic hidden). Owner has live black ⇒ likely **live branch is active** (classic glass removed).

### Case D2 — Component mounts but `meshRef` stays `null`

```
useFrame → if (!mesh) return;  // silent; never writes __MIRROR_DEBUG__
```

When can ref stay null?

| Hypothesis | Notes |
|------------|--------|
| `createPortal(..., scene)` timing | Portal child should still commit a mesh and set ref |
| Render throws before commit | Would often show React error overlay; possible if error is in rAF only |
| Mesh unmounted immediately | Unlikely every frame |
| StrictMode double mount | Ref should still be set on surviving instance |

**If D2 is true:** full black is **not explained by debug**; black must come from something else that still runs… but if mesh is null, **step 7 `gl.render` never runs**. Then black cannot be from our offscreen pass either.

**Contradiction check:**

- If **no offscreen** and **full black**, either:  
  - black is unrelated to InteriorMirror (regression elsewhere), or  
  - black is from **mount-time** side effects (`useFBO` only — weak), or  
  - classic glass is gone and user interprets empty/dark room as black (weaker).  

- If **offscreen runs** and **full black**, mesh must have been non-null at least once ⇒ **debug should have been written** if `mirrorDebug=1` and step 10 ran.

So owner report “black + no debug” strongly suggests either:

1. **`useFrame` never reaches a debug write** (`!live`, `!mesh`, or JS exception **before** any assignment), or  
2. **Debug flag false** (URL / typo / cached), or  
3. Console looking at wrong context (extension iframe — rare).

### Case D3 — Exception before debug write

If `mesh` is non-null but an error occurs between step 3 and step 10:

| Location | Effect on debug | Effect on GL |
|----------|-----------------|--------------|
| Math / NaN | may throw | skip offscreen if throw before step 7 |
| `withOffscreenRender` / `gl.render` | **no step-10 debug** if throw escapes | `finally` should restore; if restore wrong → **black** |
| After restore, before step 10 | no debug | main view should work |

**Important:** There is **no try/catch** around the whole `useFrame`.  
`withOffscreenRender` has internal `try/finally` for GL restore, but if `gl.render` throws **after** restore completes, or if restore itself throws, subsequent frames may be unstable.

There is also **no debug write in a `catch`**, so a throwing path leaves `__MIRROR_DEBUG__` undefined forever.

### Case D4 — Debug only on “skipped” vs “live”

If stuck on `!isMainFramebufferReady`, debug **would** be set (with reason). Owner sees **nothing** ⇒ not stuck only on that branch with debug on, **or** mesh null (D2), **or** exception (D3), **or** debug flag off (D4).

---

## 8. Diff D — `withOffscreenRender` / nested `gl.render`

**File:** `glOffscreen.ts`

```
snapshot: getRenderTarget, clearColor, viewport, fog, autoClear, xr, shadowAuto
try:
  fog = null
  autoClear = true
  setRenderTarget(fbo)
  setClearColor(smoke/bg)
  clear
  draw()  →  gl.render(scene, virtualCam)   // FULL scene, second time this frame
finally:
  restore fog, flags, clearColor
  setRenderTarget(prevRt)
  setViewport(…policy…)
```

### Path change vs classic

Classic frame:

```
useFrame(Player, Camera)
R3F: gl.render(scene, mainCamera) × 1
```

Live frame:

```
useFrame(Player, Camera)           // priority 0
useFrame(InteriorMirror)           // priority 1
  → gl.render(scene, virtualCam)   // full scene into 512² FBO (+ depth)
R3F: gl.render(scene, mainCamera)  // main view
```

**Cost:** ~2× scene draws every frame once mirror is live. Acceptable per product note, but amplifies any state bug.

### Nested render hazards (ranked)

| # | Hazard | Mechanism | Fits “black from boot”? |
|---|--------|-----------|-------------------------|
| H1 | **Viewport restore wrong** | Snapshot 0×0 or wrong rect; main draw empty | **Yes** (we partially fixed 0×0; other bad rects possible) |
| H2 | **Render target left non-null** | `setRenderTarget(prev)` wrong; main paints into FBO; canvas uncleared | **Yes** |
| H3 | **Scissor / color mask / XR** | Not fully snapshotted | Possible |
| H4 | **autoClear false after restore** | Main frame doesn’t clear; garbage/black | Possible |
| H5 | **`gl.render` throws / context lost** | WebGL dies | Yes; often console errors |
| H6 | **HalfFloat FBO + material** | Mirror texel black only | **No** (not full canvas) |
| H7 | **Recursive feedback** | Mirror mesh visible in its own pass | Soft feedback; mesh is `visible=false` during pass |
| H8 | **Environment / PMREM** during 2nd render | Heavy or state | Unclear |
| H9 | **StrictMode double mount** | Double FBO / double subscribe | Unlikely permanent black |

### H1 detail (history)

Earlier restore **always** applied snapshot viewport. Early frames can report **0×0**. That was documented in `Architecture.md` as the prime full-black hypothesis.

Current restore:

```ts
if (isViewportSnapshotValid(snap.viewport)) apply snap
else if (prevRt === null) apply domElement width/height (≥1)
// else leave as setRenderTarget(prevRt) left it
```

**Remaining holes:**

1. Snapshot viewport **valid but wrong** (e.g. 1×1, or FBO-sized 512×512 if snapshot was taken **while still bound to FBO**).  
2. **Order bug:** if `getViewport` is called when target is already FBO… Currently snapshot is **before** `setRenderTarget(fbo)` — good.  
3. **`setRenderTarget(null)` in Three** already resets drawing-buffer viewport; then we **overwrite** with snapshot. If snapshot was valid **main** viewport, OK. If R3F uses a different internal target later, conflict.  
4. **Drawing buffer vs CSS size:** `domElement.width` vs `clientWidth` × dpr; wrong size → letterbox/black bars or scaled wrong, sometimes “looks black.”

### H2 detail

If `prevRt` is incorrectly non-null, or restore fails silently, R3F may still call `render` while bound to 512 FBO; the **visible canvas** stays clear-color black/uncleared.

### Nested `gl.render(scene, virtualCam)` content issues (mirror only)

These make the **mirror texture** black/wrong, **not** the whole app:

| Issue | Effect on FBO image |
|-------|---------------------|
| Virtual cam inside wall, near too small | Wall fills FBO |
| Wrong normal / lookAt | Empty sky/fog |
| Fog left on | Washed image (we disable fog) |
| Clear color only if draw fails | Flat `#c5d0dc` |

Owner symptom is **whole app black** ⇒ prioritize H1–H5 over “reflection math wrong.”

---

## 9. Diff E — virtual camera math path (only when mesh exists)

Uses `mirrorMath.ts`:

1. Plane point = mesh world translation.  
2. Normal = local +Z → `transformDirection(matrixWorld)` (correct under any scale).  
3. `facingNormal` so camera is on +n side.  
4. `reflectCameraPosition`.  
5. `nearPlaneForMirror` ≈ 0.97 × distance(virtualCam, plane).  
6. `lookAt(plane + n)` — look along normal through glass into room.

Portal pose: `planToWorldX(v.x)`, `rotY = π` so local +Z → world −Z (into room from north wall).

**Path change:** none of this runs if `!mesh`. Does not explain missing debug if mesh never exists; does not by itself black the main RT if offscreen restore is perfect.

---

## 10. End-to-end flowcharts

### 10.1 Default (safe)

```
URL no mirrorLive
  → SenmenDisplay: classic matMirror only
  → No InteriorMirror
  → No useFBO, no nested gl.render
  → Main canvas OK
  → __MIRROR_DEBUG__ undefined (expected)
```

### 10.2 Live + Debug (intended)

```
URL ?mirrorLive=1&mirrorDebug=1
  → SenmenDisplay: hide classic glass; mount InteriorMirror
  → useFBO alloc
  → createPortal mesh → meshRef set
  → each frame priority 1:
        mesh present
        framebuffer ready?
          no  → __MIRROR_DEBUG__ = skipped
          yes → offscreen gl.render → restore → __MIRROR_DEBUG__ = live
  → R3F main render should still show house
```

### 10.3 Live + Debug (observed)

```
URL ?mirrorLive=1&mirrorDebug=1
  → Full canvas BLACK
  → window.__MIRROR_DEBUG__ === undefined

Implies one of:
  A) useFrame never assigned debug
       A1 !mesh every frame
       A2 !live (unlikely if classic glass gone)
       A3 throw before assign
       A4 debug flag false (URL)
  B) Page not running this code build
  C) Console evaluation timing / wrong window
```

If **A1** and classic glass is hidden, user sees frame only + rest of house — house should still be lit unless **something else** blacks the canvas. So **A1 alone is insufficient** for full black unless House also fails to draw.

Therefore full black + no debug most consistently matches:

- **A3 + H1/H2** (throw or bad GL state during first successful mesh frames), with debug write never reached, **or**  
- **Main render broken by first successful offscreen** (H1/H2) **and** debug write failed for another reason (throw after restore before step 10 — possible if `material.map` assignment throws — rare), **or**  
- **Exception in useFrame** aborts the entire R3F frame loop (if uncaught errors stop the loop) → black + no further debug updates.

**Uncaught error stopping the loop** is a strong combined explanation: one throw in `useFrame` → no later frames → frozen black/clear canvas + no `__MIRROR_DEBUG__` if throw before assign.

---

## 11. Diff summary table (classic → live)

| Area | Classic | Live | Risk to main view |
|------|---------|------|-------------------|
| Glass material | MeshStandard + envMap | MeshBasic + FBO map | Low if FBO only on small mesh |
| Glass graph | Child of plan-mirror | Portal to scene root | Low |
| Per-frame nested full scene render | No | Yes | **High** |
| `setRenderTarget` / `setViewport` / clear | R3F only | Manual sandwich | **High** |
| useFBO HalfFloat+Depth | No | Yes | Medium cost |
| Classic glass visible | Yes | No | Cosmetic only |
| Debug global | Never | Only if useFrame reaches assign | — |

---

## 12. Hypotheses ranked (for next engineering step)

| Rank | ID | Hypothesis | Supports full black | Supports no debug |
|------|-----|------------|---------------------|-------------------|
| 1 | **H-LOOP** | Uncaught exception in `useFrame` aborts R3F loop after first live frames | Yes | Yes (if before assign) |
| 2 | **H-RT** | Render target / viewport not correctly restored; main paints nowhere useful | Yes | No alone (debug should still set unless H-LOOP) |
| 3 | **H-MESH** | `meshRef` always null → no offscreen, no debug | Weak for full black | Yes |
| 4 | **H-FLAG** | `mirrorDebug` not active / wrong URL | No | Yes |
| 5 | **H-BUILD** | Cached old bundle without debug | Possible | Possible |

---

## 13. Recommended next steps (instrumentation before more “fixes”)

Do **not** add more reflection quality until these are answered.

### 13.1 Debug that cannot miss (must ship before next visual claim)

1. **Write `__MIRROR_DEBUG__` at the top of `useFrame`**, even if `!mesh`:  
   `{ phase: "enter", hasMesh, live, frames }`.  
2. **`try/catch` entire `useFrame` body**; on error set  
   `{ mode: "error", message: String(err) }` and rethrow or not.  
3. **DOM overlay** (not only console): e.g. fixed div when `mirrorDebug=1` so black canvas still shows text.  
4. Log once: `console.info("[mirror]", …)` so DevTools “Default levels” shows it without typing `window.…`.

### 13.2 Bisect the offscreen path (binary isolation)

| Step | Change | If black goes away | Conclusion |
|------|--------|--------------------|------------|
| B0 | `mirrorLive=1` but `useFrame` only sets debug, **no** `withOffscreenRender` | Main OK | Nested render/restore is the bug |
| B1 | Offscreen **clear only** (no `gl.render`) | Main OK | `gl.render` or RT type is the bug |
| B2 | `gl.render` empty scene / only color | … | Isolates scene complexity |
| B3 | Full scene render | … | Current path |

Default product stays classic until B0–B2 green.

### 13.3 GL state assertions (auto-able later)

After `withOffscreenRender` returns:

- `gl.getRenderTarget() === null` (or expected)  
- `getViewport()` width/height ≥ 2  
- Optional: read main canvas pixel center ≠ pure black after one R3F frame (Playwright)

### 13.4 Math / contract tests (already present)

`npm run test:mirror` — keep green; add cases when restore policy changes.

---

## 14. What **not** to do next

1. Do not “fix” reflection look while main view is black.  
2. Do not enable live FBO by default.  
3. Do not add more nested renders (cube camera + planar) until sandwich is proven.  
4. Do not rely on console-only debug for black-screen bugs.

---

## 15. File index for this investigation

| File | Role in live path |
|------|-------------------|
| `src/components/house/SenmenDisplay.tsx` | Switches classic vs `<InteriorMirror>` |
| `src/components/house/InteriorMirror.tsx` | Portal, useFBO, useFrame, debug global |
| `src/lib/glOffscreen.ts` | Snapshot / restore / `withOffscreenRender` |
| `src/lib/mirrorMath.ts` | Pure reflect / near (unit tested) |
| `src/components/Scene.tsx` | plan-mirror, Environment, main camera |
| `src/components/SceneLoader.tsx` | Delays Canvas until textures ready |
| `Architecture.md` | Broader architecture + failure history |
| `scripts/verify-mirror-*.mjs` | Automated math + source contracts |

---

## 16. One-paragraph summary for the next agent

When `mirrorLive=1`, `SenmenDisplay` removes classic envMap glass and mounts `InteriorMirror`, which allocates a HalfFloat FBO and every frame (priority 1) runs a full nested `gl.render` into that FBO via `withOffscreenRender`. Full-canvas black from boot is almost certainly a **main framebuffer / R3F loop** failure (viewport/RT restore or uncaught `useFrame` error), not “mirror pixels wrong.” Missing `__MIRROR_DEBUG__` means the debug assignment never ran: most likely **`meshRef` still null**, **exception before assign**, or **debug flag not seen**—debug currently sits too late in the callback and is silent on early returns. Next work must **instrument first** (enter/error debug + DOM banner + bisect B0/B1/B2), not add more reflection features.

---

---

## 17. Fix applied (npm, 2026-08-04)

**Chosen path:** do **not** re-enable per-frame FBO (`H-LOOP` / `H-RT` still unsolved).

| Change | Why |
|--------|-----|
| `createInteriorCubeEnv()` | 2D-canvas cube faces: warm plaster + wood floor |
| Senmen `matMirror.envMap` | Glass no longer samples city `Environment` |
| `InteriorMirror` unmounted | `?mirrorLive=1` cannot black the canvas |
| Live FBO | Still deferred until §13 B0–B2 is proven |

**What you should see:** main view stays lit; mirror shows **warm indoor tones** that shift with view angle — not street/sky, **not** a physically correct 洗面/UB reflection.

---

## 18. Cube probe (npm, follow-up)

Painted cube env cannot show UB hex / tub. **SenmenMirrorGlass** now:

1. Starts with painted indoor cube (safe first frames).  
2. After ~75 frames, **three** `THREE.CubeCamera.update` shots from **inside the senmen** (`z` mid-room), so the cubemap includes the shower opening and UB.  
3. Does **not** use planar FBO or `setViewport` restore.  
4. **Does not change** plan dimensions or room positions.

Limitation: cubemap is approximate (not a planar mirror), but bathroom dark walls / tub / pattern should read when facing the glass.

---

## 19. Design hole: plan vs world (owner pose 10.09, 5.65)

**Symptom:** From 洗面 east, looking at the glass, env showed **house exterior + green ground** (`COLORS.ground` `#7a8a6a`).

**Root cause (logic, not “need a better engine”):**

| Space | Who uses it |
|-------|-------------|
| Plan X | `dimensions.ts`, HUD, `SenmenDisplay` meshes under `plan-mirror` |
| World X | Player / free cameras: `planToWorldX = width − planX` |

`CubeCamera` was **not** in the plan-mirror graph. `cubeCam.position.set(planX, y, z)` made Three treat **plan X as world X**.

Example: probe plan X ≈ 9.55 → correct world X ≈ **1.37**. Detached cam at X=9.55 sits in the **west / outdoor** half of the displayed house → cubemap includes landscape.

**Fix:** Parent `<primitive object={cubeCam} position={probePlan} />` under the same group as the glass (plan space). Tests in `scripts/verify-senmen-mirror.mjs`.

Still not a true planar mirror; it should no longer be a camera sitting on the lawn.

*Document version: 2026-08-04 — plan/world probe bug + tests.*
