#!/usr/bin/env python3
"""
Hero genkan door — Blender overlay (optional).

Local space matches src/lib/genkanDoorHero.ts / GenkanEntry.tsx:
  hinge at origin; leaf extends −X; +Y up; exterior face −Z.

    blender --background --python tools/dcc/build_genkan_door.py -- \\
        --out public/models/hero/genkan-door.glb

Does not write public/models/house.glb or archive/.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Vector
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "run inside Blender:\n"
        "  blender --background --python tools/dcc/build_genkan_door.py -- "
        "--out public/models/hero/genkan-door.glb"
    ) from exc

# Locked to GENKAN_DOOR_HERO
LEAF_W = 1.52 - 0.012 * 2
LEAF_H = 1.95 - 0.012 * 0.5
LEAF_T = 0.048
BOARDS = 5
GAP = 0.004
BEVEL = 0.0035
FRAME_REVEAL = 0.012


def _arg(flag: str, default: str) -> str:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)


def to_blender(x: float, y: float, z: float) -> Vector:
    # plan Y-up (x,y,z) → Blender Z-up (x, -z, y)
    return Vector((x, -z, y))


def make_box(
    name: str,
    sx: float,
    sy: float,
    sz: float,
    cx: float,
    cy: float,
    cz: float,
    bevel: float,
) -> bpy.types.Object:
    loc = to_blender(cx, cy, cz)
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx / 2.0, sz / 2.0, sy / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0004:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = min(bevel, min(sx, sy, sz) * 0.35)
        mod.segments = 3
        mod.limit_method = "ANGLE"
        mod.angle_limit = 0.4
        bpy.ops.object.modifier_apply(modifier="bevel")
    return obj


def parent_to_empty(name: str, objs: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    empty = bpy.context.active_object
    empty.name = name
    for o in objs:
        o.parent = empty
    return empty


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    out = Path(_arg("--out", str(root / "public" / "models" / "hero" / "genkan-door.glb")))
    out.parent.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    clear_scene()

    inner = LEAF_W - GAP * (BOARDS - 1)
    board_w = inner / BOARDS
    boards: list[bpy.types.Object] = []
    for i in range(BOARDS):
        x0 = -LEAF_W + i * (board_w + GAP)
        cx = x0 + board_w / 2.0
        boards.append(
            make_box(
                f"board-{i}",
                board_w,
                LEAF_H,
                LEAF_T,
                cx,
                LEAF_H / 2.0,
                0.0,
                BEVEL,
            )
        )
    door = parent_to_empty("Hero_GenkanDoor", boards)

    frame_parts = [
        make_box(
            "frame-west",
            FRAME_REVEAL,
            LEAF_H + FRAME_REVEAL,
            LEAF_T * 0.95,
            -LEAF_W - FRAME_REVEAL / 2.0,
            LEAF_H / 2.0,
            0.0,
            BEVEL * 0.6,
        ),
        make_box(
            "frame-east",
            FRAME_REVEAL,
            LEAF_H + FRAME_REVEAL,
            LEAF_T * 0.95,
            FRAME_REVEAL / 2.0,
            LEAF_H / 2.0,
            0.0,
            BEVEL * 0.6,
        ),
        make_box(
            "frame-head",
            LEAF_W + FRAME_REVEAL * 2,
            FRAME_REVEAL,
            LEAF_T * 0.95,
            -LEAF_W / 2.0,
            LEAF_H + FRAME_REVEAL / 2.0,
            0.0,
            BEVEL * 0.6,
        ),
        make_box(
            "frame-sill",
            LEAF_W + FRAME_REVEAL,
            0.016,
            LEAF_T * 1.05,
            -LEAF_W / 2.0,
            0.008,
            0.0,
            BEVEL * 0.4,
        ),
    ]
    frame = parent_to_empty("Hero_GenkanFrame", frame_parts)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root_obj = bpy.context.active_object
    root_obj.name = "Hero_GenkanPortal"
    door.parent = root_obj
    frame.parent = root_obj
    frame["static"] = True
    door["hinge"] = True

    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_texcoords=True,
        export_normals=True,
    )
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
