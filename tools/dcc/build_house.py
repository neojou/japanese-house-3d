#!/usr/bin/env python3
"""
House shell — Blender DCC (optional).

Reads tools/dcc/house_geom.json (emitted from src/lib/houseBake.ts / dimensions.ts)
and builds a Y-up glTF house: walls, slabs, ceilings, stairs, genkan, doors.

Invoked by scripts/bake-house.mjs when `blender` is on PATH:

    blender --background --python tools/dcc/build_house.py -- \\
        --geom tools/dcc/house_geom.json --out public/models/house.glb

Coordinates in the JSON are plan meters: +X east, +Y up, +Z north, origin SW.
Blender is Z-up: we place (x, -z, y) so the glTF Y-up exporter restores (x, y, z).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Euler, Vector
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "run inside Blender:\n"
        "  blender --background --python tools/dcc/build_house.py -- "
        "--geom tools/dcc/house_geom.json --out public/models/house.glb"
    ) from exc


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
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)


def empty(name: str, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    obj = bpy.context.active_object
    obj.name = name
    if parent is not None:
        obj.parent = parent
    return obj


def ensure_material(
    cache: dict[str, bpy.types.Material],
    color: list[float],
    roughness: float,
    metalness: float,
    opacity: float,
    name: str,
) -> bpy.types.Material:
    key = f"{name}:{color}:{roughness}:{metalness}:{opacity}"
    if key in cache:
        return cache[key]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    principled = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    principled.inputs["Base Color"].default_value = (
        color[0],
        color[1],
        color[2],
        opacity,
    )
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metalness
    if opacity < 0.999:
        mat.blend_method = "BLEND"
        if "Alpha" in principled.inputs:
            principled.inputs["Alpha"].default_value = opacity
    cache[key] = mat
    return mat


def make_box(
    name: str,
    size: list[float],
    center: list[float],
    rot_y: float,
    origin_offset: list[float] | None,
    bevel: float,
    mat: bpy.types.Material,
    parent: bpy.types.Object,
    extras: dict | None,
) -> bpy.types.Object:
    # JSON Y-up → Blender Z-up: (x, y, z) → (x, -z, y)
    sx, sy, sz = size
    cx, cy, cz = center
    ox = oy = oz = 0.0
    if origin_offset:
        ox, oy, oz = origin_offset
    loc = Vector((cx, -cz, cy))
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    # Default cube is 2m; scale to half-extents. Blender Y = our -Z thickness.
    obj.scale = (sx / 2.0, sz / 2.0, sy / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if ox or oy or oz:
        # Shift verts so hinge origin sits at object origin.
        mesh = obj.data
        for v in mesh.vertices:
            v.co.x += ox
            v.co.y += -oz
            v.co.z += oy
    if rot_y:
        obj.rotation_euler = Euler((0.0, 0.0, rot_y), "XYZ")
        hinge = bool(extras and extras.get("hinge"))
        if not hinge:
            bpy.ops.object.transform_apply(
                location=False, rotation=True, scale=False
            )
    if bevel and bevel > 0.0005:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = min(bevel, min(sx, sy, sz) * 0.2)
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = 0.5
        bpy.ops.object.modifier_apply(modifier="bevel")
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    obj.parent = parent
    if extras:
        for k, v in extras.items():
            try:
                obj[k] = v
            except (TypeError, ValueError):
                obj[k] = str(v)
    return obj


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    geom_path = Path(_arg("--geom", str(root / "tools" / "dcc" / "house_geom.json")))
    out = Path(_arg("--out", str(root / "public" / "models" / "house.glb")))
    out.parent.mkdir(parents=True, exist_ok=True)

    if not geom_path.exists():
        raise SystemExit(f"missing geom JSON: {geom_path} (run npm run bake:house first)")

    data = json.loads(geom_path.read_text())
    specs = data.get("specs") or []
    if not specs:
        raise SystemExit("house_geom.json has no specs")

    # Scene units: meters
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    clear_scene()
    house = empty("House")
    groups: dict[str, bpy.types.Object] = {"House": house}

    def group(name: str, parent_name: str) -> bpy.types.Object:
        if name in groups:
            return groups[name]
        parent = groups.get(parent_name, house)
        obj = empty(name, parent)
        groups[name] = obj
        return obj

    # Known hierarchy from blender.md
    for child, parent in [
        ("Floor_1F", "House"),
        ("Floor_2F", "House"),
        ("Floor_PH", "House"),
        ("Walls_1F", "Floor_1F"),
        ("Slab_1F", "Floor_1F"),
        ("Ceiling_1F", "Floor_1F"),
        ("Genkan", "Floor_1F"),
        ("Stair_1F_to_2F", "Floor_1F"),
        ("Walls_2F", "Floor_2F"),
        ("Slab_2F", "Floor_2F"),
        ("Ceiling_2F", "Floor_2F"),
        ("Stair_2F_to_PH", "Floor_2F"),
        ("Walls_PH", "Floor_PH"),
        ("Slab_PH", "Floor_PH"),
        ("Ceiling_PH", "Floor_PH"),
        ("Balcony_PH", "Floor_PH"),
        ("Stair_PH", "Floor_PH"),
    ]:
        group(child, parent)

    cache: dict[str, bpy.types.Material] = {}
    for spec in specs:
        parent_name = spec.get("parent") or "House"
        parent = groups.get(parent_name) or group(parent_name, "House")
        color = spec.get("color") or [0.9, 0.88, 0.82]
        mat = ensure_material(
            cache,
            color,
            float(spec.get("roughness") or 0.9),
            float(spec.get("metalness") or 0.0),
            float(spec.get("opacity") or 1.0),
            spec.get("name") or "mat",
        )
        make_box(
            name=spec["name"],
            size=spec["size"],
            center=spec["center"],
            rot_y=float(spec.get("rotY") or 0.0),
            origin_offset=spec.get("originOffset"),
            bevel=float(spec.get("bevel") or 0.0),
            mat=mat,
            parent=parent,
            extras=spec.get("extras"),
        )

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
    print(f"wrote {out} ({len(specs)} boxes)")


if __name__ == "__main__":
    main()
