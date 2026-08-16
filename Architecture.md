# Architecture — Japanese House 3D (runtime + mirror reflection)

> Living notes for agents and owners. Complements `AGENTS.md` (rules), `TASKS.md` (roadmap), `DESIGN.md` (aesthetics).  
> **Focus of this revision:** why planar mirror work failed repeatedly, and the contract for a safe re-entry.

**KMP parallel architecture (through K2):** see **`docs/KMP-spike-notes.md`**, **`docs/KMP-agents.md`**, modules `shared/` + `composeApp/`.  
Does not replace the npm stack below until a product Gate says so.

---

## 1. Runtime stack (current npm SPA)

```
App
 └─ SceneLoader
     └─ Scene
         ├─ HUD (DOM): PositionHud, MobileDpad, HelpOverlay
         └─ R3F Canvas
             └─ SceneContent
                 ├─ background + fog
                 ├─ Lights (+ drei Environment preset="city")
                 ├─ PerspectiveCamera (default)
                 ├─ FirstPersonCamera (spawn, pointer-lock / touch look, yaw)
                 ├─ Player (WASD / virtual D-pad walk)
                 └─ group "plan-mirror"  scale={[-1,1,1]}  position={[BUILDING.width,0,0]}
                      └─ House (+ props: SenmenDisplay, …)
```

| Concern | Location |
|---------|----------|
| Units / plan dims | `src/data/dimensions.ts` |
| Plan ↔ world X | `src/lib/coords.ts` → `planToWorldX` / `worldToPlanX` |
| Walk height | `src/lib/height.ts` |
| Materials | `src/lib/houseMaterials.ts` |
| Shared input | `src/lib/input.ts` |
| Viewer HUD store | `src/store/useViewerStore.ts` |
| Hero Path B assets | `public/props/<id>/*.glb` via `npm run bake:senmen-basin` (`docs/cinematic-path-b.md`) |

### Coordinate systems

1. **Plan space** — data in `dimensions.ts`: +X east, +Z north, +Y up; origin SW.  
2. **Display / world space** — house (and its lights that are plan-authored) sit under **plan-mirror**:

   \[
   worldX = BUILDING.width - planX
   \]

   implemented as group `scale={[-1,1,1]}` + `position={[width,0,0]}`.  
3. **Player / default camera** live **outside** plan-mirror; they use world X via `planToWorldX` at spawn.

**Implication for mirrors:** any mesh that stays a child of plan-mirror has `matrixWorld` with **negative determinant**. Code that uses `extractRotation(matrixWorld)` for plane normals is **wrong** under this transform.

---

## 2. What a vanity mirror must do

| Goal | Meaning |
|------|---------|
| Interior reflection | See 洗面 / openings (e.g. UB) with view-dependent parallax |
| Not outdoor HDR | Must not be driven only by `Environment preset="city"` |
| Not break the app | Secondary pass must never leave the **main** framebuffer unusable |

### Classic (current runtime) approach

`SenmenDisplay` uses `MeshStandardMaterial` with high metalness + `envMapIntensity`.  
Three.js samples the scene environment (city HDR) → **looks reflective but outdoor**. Safe (no second render).

### Desired approach: planar reflection FBO

1. Build a **virtual camera** = reflection of the player camera across the glass plane.  
2. Render the scene into a **WebGLRenderTarget (FBO)**.  
3. Sample that texture on the glass.  
4. Clip / near-plane so geometry **behind** the glass (wall thickness, exterior) does not fill the RT.

Pure math lives in `src/lib/mirrorMath.ts` (unit-tested).

---

## 3. Failure log — why we got it wrong repeatedly

### Incident timeline (condensed)

| Attempt | Symptom | Root cause (post-mortem) |
|---------|---------|---------------------------|
| A. envMap metal | “Reflection” is outdoor city | Correct for material path; wrong product goal |
| B. drei `MeshReflectorMaterial` under plan-mirror | Black glass | `extractRotation` + **scale −1** → bad normal / early-out / empty RT |
| C. Custom torus door + wrong rot | “Metal handle” misread | Unrelated, but shows orientation bugs look like content bugs |
| D. Custom RT + `gl.render` in `useFrame` | **Whole canvas black from frame 0** | Offscreen pass corrupts main GL state |
| E. three.js `Reflector` via portal | Glass still black | Wall in front of virtual cam; clip/near incomplete |
| F. “Safe” `useFBO` + magenta clear + restore | **Whole canvas still black** | Restore path likely re-applied **invalid viewport** (0×0) or fought R3F’s RT binding every frame |

### Lesson 1 — Negative scale is not optional detail

Parent:

```tsx
<group name="plan-mirror" scale={[-1, 1, 1]} position={[BUILDING.width, 0, 0]}>
```

| Safe | Unsafe under plan-mirror |
|------|---------------------------|
| `normal.transformDirection(matrixWorld)` | `extractRotation(matrixWorld)` then `normal.applyMatrix4(rot)` |
| Portal glass to **scene root** at `planToWorldX` | Leave reflector as deep child and trust rotation extraction |

### Lesson 2 — Secondary `gl.render` is a loaded gun

R3F owns the frame: size, viewport, render target, clear flags.  
Any manual:

- `setRenderTarget`
- `setViewport`
- `setClearColor`
- `clear`
- `render(scene, otherCam)`

must run in a **strict sandwich**:

```
snapshot → bind FBO → draw → finally restore snapshot
```

and restore must be **idempotent and never write a zero-size viewport**.

### Lesson 3 — The “full canvas black” smoking gun (strong hypothesis)

Observed: failure from **first frame**, not only when standing at the mirror.

On early frames, `gl.getViewport()` can be **(0,0,0,0)** or not yet equal to the drawing buffer.  
Previous restore code **always** did:

```ts
gl.setViewport(snap.viewport.x, snap.viewport.y, snap.viewport.z, snap.viewport.w);
```

If that snapshot was zero-sized, the **main** view stays with an empty viewport → **permanent full-screen black**, independent of mirror content.

**Contract fix:**  
- Prefer `setRenderTarget(null)` and let Three restore the drawing buffer viewport; **or**  
- Restore viewport only if `width > 0 && height > 0`, else use `drawingBufferWidth/Height`.

### Lesson 4 — Virtual camera sits “inside / behind” the wall

For a north-wall glass facing the room (−Z):

- Player is south of the glass.  
- Reflected camera is **north** of the glass (through the wall).  

Without `near ≈ distance(virtualCam, plane)`, the first surface is often the **wall mesh** → RT is dark/black even when GL state is fine.

### Lesson 5 — Shipping “smoke” that still calls offscreen every frame

Phase B cleared magenta into an FBO every frame “to prove safety.”  
That still exercises the broken restore path → user sees **worse** than outdoor envMap (app unusable).

**Rule:** never enable a per-frame offscreen path in default product until:

1. Unit tests on restore + viewport validity pass.  
2. Opt-in flag can disable instantly (`?mirrorLive=0`).  
3. Manual smoke still has a **no-FBO fallback** material.

### Lesson 6 — Product vs debug

| Mode | Behavior |
|------|----------|
| Default product | Must walk the house even if mirror is imperfect |
| `?mirrorLive=1` | Enable FBO planar reflection (experimental) |
| `?mirrorDebug=1` | Expose `window.__MIRROR_DEBUG__` stats |

---

## 4. Target design (safe planar mirror)

### 4.1 Placement

```
plan-mirror (scale -1)
  └─ House
       └─ SenmenDisplay
            ├─ frame mesh (plan space)     ← stays
            └─ (no live glass as child)

scene root (via createPortal)
  └─ InteriorMirror glass @ (planToWorldX(x), y, z)
       normal: face room (−Z), rotY = π on default plane
```

### 4.2 Modules

| Module | Role |
|--------|------|
| `src/lib/mirrorMath.ts` | Reflect point/camera, facing normal, near distance |
| `src/lib/glOffscreen.ts` | `withOffscreenRender` — snapshot/restore **without zero viewport** |
| `src/components/house/InteriorMirror.tsx` | Optional live glass (portal + useFBO + virtual cam) |
| `SenmenDisplay` | Frame always; glass = classic **or** live by flag |

### 4.3 Frame graph (when live)

```
useFrame(priority=1)  // after Player / FirstPersonCamera
  if !mirrorLive or canvas not sized → return
  compute plane (world), normal (transformDirection)
  virtualCam = reflect(playerCam)
  virtualCam.near = nearPlaneForMirror(...)
  mesh.visible = false
  withOffscreenRender(fbo):
      fog off; gl.render(scene, virtualCam)
  mesh.visible = true
  material.map = fbo.texture
```

### 4.4 Explicit non-goals (this pass)

- Perfect SSR / multiprobe GI  
- Reflecting the player avatar (none exists)  
- Mobile-only quality tiers (single resolution constant OK)  
- Replacing all metals’ envMap  

---

## 5. Verification strategy

### Automated (no human in the loop)

| Suite | Command | Asserts |
|-------|---------|---------|
| Math | `npm run test:mirror` → `verify-mirror-math.mjs` | Reflect point/camera, facing, near |
| Source contract | `verify-mirror-source.mjs` | Offscreen restore rules; no naked unsafe path in default glass |
| Viewport contract | unit cases in math/source scripts | Zero viewport never applied on restore |
| Typecheck / build | `tsc` / `npm run build` | Compile clean |

### Manual (owner only when auto is green)

1. Default URL: house loads, **not** full black; mirror may show env (classic).  
2. `?mirrorLive=1`: glass shows **interior-ish** content; rest of house still visible.  
3. Move left/right: reflection parallax changes.  
4. `?mirrorDebug=1`: `window.__MIRROR_DEBUG__` updates `frames`, `lastNear`, `mode`.

---

## 6. Implementation checklist (agents)

- [x] Document architecture + failure analysis (this file)  
- [x] Harden `glOffscreen` viewport restore  
- [x] Expand unit / contract tests  
- [x] `InteriorMirror` live path behind **`mirrorLive` opt-in** (default off = classic glass)  
- [ ] Owner manual check with `?mirrorLive=1`  
- [ ] If live OK: consider default-on + docs; else keep opt-in  

---

## 7. Related files

| Path | Notes |
|------|--------|
| `src/components/Scene.tsx` | plan-mirror, Environment, fog |
| `src/components/house/SenmenDisplay.tsx` | Vanity + mirror frame/glass |
| `src/lib/coords.ts` | planToWorldX |
| `src/lib/mirrorMath.ts` | Pure reflection math |
| `src/lib/glOffscreen.ts` | Safe FBO sandwich |
| `scripts/verify-mirror-*.mjs` | Automated checks |

---

*Last updated: 2026-08-04 — mirror failure analysis + safe re-entry contract.*
