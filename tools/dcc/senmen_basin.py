#!/usr/bin/env python3
"""
1F senmen vessel — Blender Path B (optional).

Creates a rounded rectangular vessel, booleans a filleted inner cavity,
applies a light subdiv, exports Y-up glTF.

Invoked by scripts/bake-senmen-basin.mjs when `blender` is on PATH.
Numbers must stay aligned with src/lib/vesselBasin.ts SENMEN_VESSEL_SPEC.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Vector
except ImportError as exc:  # pragma: no cover
    raise SystemExit("run inside Blender: blender --background --python senmen_basin.py") from exc

# Locked to SENMEN_VESSEL_SPEC
W = 0.56
D = 0.38
H = 0.12
INNER_DEPTH = 0.09
RIM = 0.015
OUTER_R = 0.016
INNER_R = 0.06


def _arg(flag: str, default: str) -> str:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def clear_mesh_objects() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)


def make_box(name: str, sx: float, sy: float, sz: float, loc: Vector, bevel: float, segs: int):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx / 2.0, sy / 2.0, sz / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = segs
    mod.limit_method = "ANGLE"
    mod.angle_limit = 0.5
    bpy.ops.object.modifier_apply(modifier="bevel")
    return obj


def main() -> None:
    out = Path(_arg("--out", str(Path(__file__).resolve().parents[2] / "public/props/senmen-basin/basin.glb")))
    out.parent.mkdir(parents=True, exist_ok=True)

    clear_mesh_objects()

    # Blender: X=width, Y=depth (our Z), Z=height (our Y). glTF exporter flips to Y-up.
    outer = make_box("basin-outer", W, D, H, Vector((0.0, 0.0, H / 2.0)), OUTER_R, 4)

    cutter_h = INNER_DEPTH + 0.05
    cutter_z = H - INNER_DEPTH / 2.0 + 0.02
    cutter = make_box(
        "basin-cutter",
        W - 2.0 * RIM,
        D - 2.0 * RIM,
        cutter_h,
        Vector((0.0, 0.0, cutter_z)),
        INNER_R * 0.55,
        6,
    )

    bpy.context.view_layer.objects.active = outer
    outer.select_set(True)
    bool_mod = outer.modifiers.new("cavity", "BOOLEAN")
    bool_mod.operation = "DIFFERENCE"
    bool_mod.object = cutter
    try:
        bool_mod.solver = "EXACT"
    except TypeError:
        pass
    bpy.ops.object.modifier_apply(modifier="cavity")

    cutter.select_set(True)
    outer.select_set(False)
    bpy.ops.object.delete()

    bpy.context.view_layer.objects.active = outer
    outer.select_set(True)
    sub = outer.modifiers.new("subdiv", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    bpy.ops.object.modifier_apply(modifier="subdiv")

    bpy.ops.object.shade_smooth()
    outer.name = "basin-outer"
    # Split is optional; runtime assigns porcelain by name prefix "basin"
    if outer.data.materials:
        outer.data.materials.clear()

    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_materials="NONE",
    )
    print(f"senmen_basin.py wrote {out}")


if __name__ == "__main__":
    main()
