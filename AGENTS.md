<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md – Japanese House 3D Viewer

## Project Goal
Build an interactive 3D interior walkthrough of a Japanese residential house based on three floor plans (1F, 2F, PH/roof balcony).

Support:
- First-person walkthrough (WASD + mouse)
- Top-down overview mode
- Smooth switching between the two modes
- Later deployment to GitHub Pages

## Current Phase: Phase 1 Only
Focus exclusively on:
- Accurate walls, floors, stairs, and door openings
- Basic first-person controls
- Top-down camera with pan & zoom
- Mode switching UI
- Multi-floor positioning using Y-axis (floor height ≈ 2.7m)

**Do NOT implement yet:**
- Furniture
- Detailed materials / textures
- Complex lighting or post-processing
- Physics / collision (rapier)
- Door opening animations
- Mobile touch controls (can be added later)

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- three
- @react-three/fiber
- @react-three/drei
- zustand (recommended for viewer state)

## Key Conventions
- All units in meters
- All dimensions centralized in `src/data/dimensions.ts`
- Keep components small and single-responsibility
- Prefer simple Box-based geometry for walls in Phase 1
- Use MeshStandardMaterial with simple colors only
- Code must be runnable with `npm install && npm run dev`

## Recommended File Structure
src/
├── app/
├── components/
│   ├── Scene.tsx
│   ├── Player.tsx
│   ├── cameras/
│   ├── house/
│   └── ui/
├── data/
│   └── dimensions.ts
├── store/
└── lib/

## Development Rules for AI Agents
1. Always check current phase before adding features.
2. When modifying geometry, prefer updating `dimensions.ts` first.
3. Do not introduce new major dependencies unless explicitly requested.
4. When generating code, explain what was changed and what the next logical step is.
5. Keep GitHub Pages compatibility in mind (static export friendly).

## Future Phases (for reference only)
- Phase 2: Multi-floor natural navigation via stairs
- Phase 3: Basic materials + lighting
- Phase 4: Furniture placement
- Phase 5: UI polish + mobile support + GitHub Pages deployment

