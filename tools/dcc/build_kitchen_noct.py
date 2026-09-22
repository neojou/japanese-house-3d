#!/usr/bin/env python3
"""
1F LDK Noct 壁付 I 型 — inspired (no LIXIL / ノクト trademarks on the mesh).

Local space after glTF Y-up export (plan metres):
  origin = counter front-south corner on the finished floor (west / user side)
  +X east, toward the decorative wall
  +Y up
  +Z north

  IH 0–0.75 (south, against the 75 cm fin)
  dishwasher 0.75–1.20
  sink 1.20–2.10
  counter height 0.85, depth 0.65

    blender --background --python tools/dcc/build_kitchen_noct.py -- \\
        --out public/models/hero/kitchen-noct.glb
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Vector
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "run inside Blender:\n"
        "  blender --background --python tools/dcc/build_kitchen_noct.py -- "
        "--out public/models/hero/kitchen-noct.glb"
    ) from exc

# Locked to PROP_1F_LDK_KITCHEN in src/data/dimensions.ts
DEPTH = 0.65
HEIGHT = 0.85
TOP_T = 0.028
TOE = 0.09
TOE_IN = 0.045
IH_Z1 = 0.75
DW_Z1 = 1.20
RUN_Z = 2.10
SINK_Z = (DW_Z1 + RUN_Z) / 2  # 1.65
BOWL_L = 0.76
BOWL_W = 0.453
BOWL_D = 0.19
BOWL_CX = 0.29
HOOD_BOTTOM = 1.50
HOOD_TOP = 1.96
BEVEL = 0.0016


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
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for block in list(coll):
            coll.remove(block)


def to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def make_image(name: str, kind: str) -> bpy.types.Image:
    w = h = 256
    img = bpy.data.images.new(name, width=w, height=h)
    pix = [0.0] * (w * h * 4)
    rng = random.Random(17 if kind == "quartz" else 3)
    for yi in range(h):
        for xi in range(w):
            n = rng.random()
            o = (yi * w + xi) * 4
            if kind == "quartz":
                t = (n - 0.5) * 0.035
                speck = 0.06 if n > 0.97 else 0.0
                r, g, b = 0.93 + t, 0.92 + t, 0.90 + t - speck
            else:
                t = (n - 0.5) * 0.02
                r, g, b = 0.90 + t, 0.90 + t, 0.88 + t
            pix[o : o + 4] = (r, g, b, 1.0)
    img.pixels.foreach_set(pix)
    img.pack()
    return img


def pbr(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
    metallic: float,
    image: bpy.types.Image | None = None,
    emission: tuple[float, float, float, float] | None = None,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    p = nt.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = color
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metallic
    if emission is not None:
        emit = p.inputs.get("Emission Color") or p.inputs.get("Emission")
        if emit is not None:
            emit.default_value = emission
        if "Emission Strength" in p.inputs:
            p.inputs["Emission Strength"].default_value = 2.2
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.location = (-320, 200)
        nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    return mat


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def uv_cube(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=1.0)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def make_box(
    name: str,
    sx: float,
    sy: float,
    sz: float,
    cx: float,
    cy: float,
    cz: float,
    mat: bpy.types.Material,
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_cube_add(size=2, location=to_blender(cx, cy, cz))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx / 2.0, sz / 2.0, sy / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0003:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = min(bevel, min(sx, sy, sz) * 0.28)
        mod.segments = 2
        mod.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="bevel")
    assign(obj, mat)
    uv_cube(obj)
    return obj


def make_cyl(
    name: str,
    r: float,
    h: float,
    cx: float,
    cy: float,
    cz: float,
    axis: str,
    mat: bpy.types.Material,
    verts: int = 20,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=h, location=to_blender(cx, cy, cz), vertices=verts
    )
    obj = bpy.context.active_object
    obj.name = name
    if axis == "x":
        obj.rotation_euler = (0.0, math.pi / 2.0, 0.0)
    elif axis == "z":
        obj.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    assign(obj, mat)
    uv_cube(obj)
    return obj


def parent_keep(parent: bpy.types.Object, child: bpy.types.Object) -> None:
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def empty_at(name: str, x: float, y: float, z: float) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=to_blender(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    return obj


def bool_diff(target: bpy.types.Object, cutter: bpy.types.Object) -> None:
    mod = target.modifiers.new("bool", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "FLOAT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="bool")
    bpy.data.objects.remove(cutter, do_unlink=True)


def rounded_cutter(
    name: str,
    sx: float,
    sy: float,
    sz: float,
    cx: float,
    cy: float,
    cz: float,
    radius: float,
) -> bpy.types.Object:
    obj = make_box(name, sx, sy, sz, cx, cy, cz, bpy.data.materials.new("_cut"), 0.0)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = min(radius, sx * 0.45, sz * 0.45)
    mod.segments = 5
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="bevel")
    return obj


def handle(
    name: str,
    cx: float,
    cy: float,
    cz: float,
    length: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    return make_box(name, 0.012, 0.008, length, cx, cy, cz, mat, 0.001)


def build() -> None:
    quartz_img = make_image("quartz", "quartz")
    door_img = make_image("door", "door")
    mat_door = pbr("Mat_Door", (0.90, 0.90, 0.88, 1), 0.52, 0.02, door_img)
    mat_top = pbr("Mat_Quartz", (0.94, 0.93, 0.91, 1), 0.22, 0.04, quartz_img)
    mat_toe = pbr("Mat_Toe", (0.08, 0.08, 0.075, 1), 0.55, 0.15)
    mat_black = pbr("Mat_Pull", (0.05, 0.05, 0.05, 1), 0.38, 0.45)
    mat_ih = pbr("Mat_IH", (0.06, 0.065, 0.07, 1), 0.16, 0.55)
    mat_ring = pbr("Mat_Ring", (0.72, 0.73, 0.75, 1), 0.28, 0.85)
    mat_steel = pbr("Mat_Steel", (0.72, 0.74, 0.76, 1), 0.26, 0.88)
    mat_chrome = pbr("Mat_Chrome", (0.86, 0.88, 0.90, 1), 0.12, 1.0)
    mat_hood = pbr("Mat_Hood", (0.78, 0.79, 0.80, 1), 0.32, 0.55)
    mat_hood_dark = pbr("Mat_HoodDark", (0.07, 0.075, 0.08, 1), 0.4, 0.3)
    mat_light = pbr(
        "Mat_HoodLight",
        (1.0, 0.95, 0.86, 1),
        0.3,
        0.0,
        emission=(1.0, 0.93, 0.82, 1),
    )
    mat_panel = pbr("Mat_Backsplash", (0.86, 0.87, 0.88, 1), 0.4, 0.08)
    mat_plate = pbr("Mat_Plate", (0.95, 0.94, 0.92, 1), 0.28, 0.04)
    mat_dw = pbr("Mat_DwStrip", (0.62, 0.64, 0.66, 1), 0.3, 0.7)

    parts: list[bpy.types.Object] = []

    # Toe + carcass (open front so drawers can slide out)
    parts.append(make_box("Toe", DEPTH - 0.02, TOE, RUN_Z - 0.02, DEPTH * 0.52, TOE / 2, RUN_Z / 2, mat_toe, 0.001))
    parts.append(make_box("Back", 0.016, HEIGHT - TOE - TOP_T, RUN_Z, DEPTH - 0.008, TOE + (HEIGHT - TOE - TOP_T) / 2, RUN_Z / 2, mat_door))
    parts.append(make_box("End_S", DEPTH - 0.02, HEIGHT - TOE - TOP_T, 0.016, (DEPTH - 0.02) / 2 + 0.01, TOE + (HEIGHT - TOE - TOP_T) / 2, 0.008, mat_door))
    parts.append(make_box("End_N", DEPTH - 0.02, HEIGHT - TOE - TOP_T, 0.016, (DEPTH - 0.02) / 2 + 0.01, TOE + (HEIGHT - TOE - TOP_T) / 2, RUN_Z - 0.008, mat_door))
    parts.append(make_box("Div_IH", 0.016, HEIGHT - TOE - TOP_T, 0.016, DEPTH * 0.5, TOE + (HEIGHT - TOE - TOP_T) / 2, IH_Z1, mat_door))
    parts.append(make_box("Div_DW", 0.016, HEIGHT - TOE - TOP_T, 0.016, DEPTH * 0.5, TOE + (HEIGHT - TOE - TOP_T) / 2, DW_Z1, mat_door))
    parts.append(make_box("Bottom", DEPTH - 0.04, 0.016, RUN_Z - 0.04, DEPTH * 0.5, TOE + 0.008, RUN_Z / 2, mat_door))

    top = make_box(
        "Worktop",
        DEPTH + 0.02,
        TOP_T,
        RUN_Z + 0.01,
        (DEPTH + 0.02) / 2 - 0.012,
        HEIGHT - TOP_T / 2,
        RUN_Z / 2,
        mat_top,
        0.002,
    )
    hole = rounded_cutter(
        "sink-hole",
        BOWL_W - 0.02,
        0.08,
        BOWL_L - 0.02,
        BOWL_CX,
        HEIGHT + 0.01,
        SINK_Z,
        0.035,
    )
    bool_diff(top, hole)
    parts.append(top)
    parts.append(make_box("ShadowGap", 0.012, 0.006, RUN_Z, -0.004, HEIGHT - TOP_T - 0.004, RUN_Z / 2, mat_black))

    # Stainless skit bowl (inner ~760 × 453 × 190)
    bowl = make_box(
        "Hero_KitchenSink",
        BOWL_W,
        BOWL_D + 0.012,
        BOWL_L,
        BOWL_CX,
        HEIGHT - (BOWL_D + 0.012) / 2 + 0.004,
        SINK_Z,
        mat_steel,
        0.0,
    )
    inner = rounded_cutter(
        "sink-inner",
        BOWL_W - 0.016,
        BOWL_D + 0.04,
        BOWL_L - 0.016,
        BOWL_CX,
        HEIGHT - BOWL_D / 2 + 0.03,
        SINK_Z,
        0.04,
    )
    bool_diff(bowl, inner)
    parts.append(bowl)
    parts.append(
        make_cyl(
            "Drain",
            0.028,
            0.008,
            BOWL_CX,
            HEIGHT - BOWL_D + 0.006,
            SINK_Z,
            "y",
            mat_chrome,
            24,
        )
    )
    parts.append(
        make_cyl(
            "Drain_hole",
            0.016,
            0.006,
            BOWL_CX,
            HEIGHT - BOWL_D + 0.01,
            SINK_Z,
            "y",
            mat_toe,
            16,
        )
    )

    # Faucet — rear deck, south of the bowl, spout over the water
    fx, fy, fz = 0.575, HEIGHT, 1.42
    parts.append(make_cyl("Hero_KitchenFaucet_base", 0.018, 0.012, fx, fy + 0.006, fz, "y", mat_chrome, 20))
    parts.append(make_cyl("Hero_KitchenFaucet_body", 0.014, 0.16, fx, fy + 0.09, fz, "y", mat_chrome, 20))
    parts.append(make_cyl("Hero_KitchenFaucet_spout", 0.009, 0.22, fx - 0.09, fy + 0.15, fz + 0.04, "x", mat_chrome, 16))
    parts.append(make_cyl("Hero_KitchenFaucet_aerator", 0.011, 0.018, fx - 0.19, fy + 0.14, fz + 0.04, "y", mat_chrome, 14))
    parts.append(make_box("Hero_KitchenFaucet_lever", 0.012, 0.01, 0.055, fx, fy + 0.175, fz + 0.02, mat_chrome, 0.001))

    # IH glass + rings, south bay
    ih_z = IH_Z1 / 2
    parts.append(make_box("Hero_KitchenIH", 0.50, 0.008, 0.68, 0.30, HEIGHT + 0.003, ih_z, mat_ih, 0.001))
    for i, (dz, r) in enumerate(((-0.16, 0.095), (0.14, 0.095), (0.0, 0.055))):
        parts.append(make_cyl(f"IH_ring_{i}", r, 0.004, 0.30, HEIGHT + 0.008, ih_z + dz, "y", mat_ring, 28))
        parts.append(make_cyl(f"IH_core_{i}", r * 0.55, 0.003, 0.30, HEIGHT + 0.009, ih_z + dz, "y", mat_ih, 20))
    parts.append(make_box("IH_controls", 0.04, 0.004, 0.16, 0.08, HEIGHT + 0.008, ih_z, mat_black))

    # Fronts — IH grill drawer + two doors
    parts.append(make_box("IH_grill", 0.018, 0.16, 0.72, 0.009, 0.72, ih_z, mat_door, BEVEL))
    handle("IH_grill_pull", -0.006, 0.70, ih_z, 0.28, mat_black)
    parts.append(make_box("IH_door_S", 0.018, 0.46, 0.35, 0.009, 0.36, 0.19, mat_door, BEVEL))
    parts.append(make_box("IH_door_N", 0.018, 0.46, 0.35, 0.009, 0.36, 0.56, mat_door, BEVEL))
    handle("IH_pull_S", -0.006, 0.52, 0.19, 0.16, mat_black)
    handle("IH_pull_N", -0.006, 0.52, 0.56, 0.16, mat_black)

    # Dishwasher, front-panel, shallow
    dw_z = (IH_Z1 + DW_Z1) / 2
    parts.append(make_box("Hero_KitchenDW", 0.018, 0.70, 0.42, 0.009, 0.46, dw_z, mat_door, BEVEL))
    parts.append(make_box("DW_strip", 0.008, 0.045, 0.40, -0.002, 0.78, dw_z, mat_dw))
    for i, dz in enumerate((-0.08, 0.0, 0.08)):
        parts.append(make_box(f"DW_btn_{i}", 0.006, 0.008, 0.016, -0.008, 0.78, dw_z + dz, mat_black))
    handle("DW_pull", -0.006, 0.62, dw_z, 0.16, mat_black)

    # Sink drawers — empties slide on local -X (west, toward the cook)
    def sink_drawer(index: int, cy: float, sy: float) -> None:
        pivot = empty_at(f"Drawer_Sink_{index}", 0.0, cy, SINK_Z)
        front = make_box(f"Drawer_Sink_{index}_front", 0.018, sy - 0.008, 0.86, 0.009, cy, SINK_Z, mat_door, BEVEL)
        pull = handle(f"Drawer_Sink_{index}_pull", -0.006, cy + sy * 0.15, SINK_Z, 0.36, mat_black)
        box = make_box(
            f"Drawer_Sink_{index}_box",
            0.48,
            sy - 0.03,
            0.82,
            0.30,
            cy,
            SINK_Z,
            mat_door,
        )
        parent_keep(pivot, front)
        parent_keep(pivot, pull)
        parent_keep(pivot, box)
        for p_i, pz in enumerate((-0.18, -0.06, 0.06, 0.18)):
            plate = make_cyl(
                f"Drawer_Sink_{index}_plate_{p_i}",
                0.09,
                0.012,
                0.28,
                cy + sy * 0.28,
                SINK_Z + pz,
                "y",
                mat_plate,
                24,
            )
            parent_keep(pivot, plate)
        parts.append(pivot)

    sink_drawer(0, 0.28, 0.32)
    sink_drawer(1, 0.60, 0.28)

    # Backsplash + hood, flush to the fin (local x = DEPTH), width = 0.75
    parts.append(
        make_box(
            "Backsplash",
            0.01,
            HOOD_BOTTOM - HEIGHT,
            IH_Z1 - 0.01,
            DEPTH - 0.006,
            HEIGHT + (HOOD_BOTTOM - HEIGHT) / 2,
            IH_Z1 / 2,
            mat_panel,
        )
    )
    hood_cx = DEPTH - 0.22
    hood_cy = (HOOD_BOTTOM + HOOD_TOP) / 2
    parts.append(make_box("Hero_KitchenHood", 0.48, HOOD_TOP - HOOD_BOTTOM, IH_Z1, hood_cx, hood_cy, IH_Z1 / 2, mat_hood, 0.004))
    parts.append(
        make_box(
            "Hood_under",
            0.44,
            0.012,
            IH_Z1 - 0.04,
            hood_cx + 0.01,
            HOOD_BOTTOM + 0.01,
            IH_Z1 / 2,
            mat_hood_dark,
        )
    )
    parts.append(
        make_box(
            "Hood_light",
            0.02,
            0.008,
            0.42,
            DEPTH - 0.44,
            HOOD_BOTTOM + 0.02,
            IH_Z1 / 2,
            mat_light,
        )
    )
    for i, dz in enumerate((-0.12, 0.0, 0.12)):
        parts.append(make_box(f"Hood_btn_{i}", 0.006, 0.008, 0.02, DEPTH - 0.46, HOOD_BOTTOM + 0.03, IH_Z1 / 2 + dz, mat_black))

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.active_object
    root.name = "Hero_KitchenNoct"
    for obj in parts:
        parent_keep(root, obj)


def main() -> None:
    out = Path(_arg("--out", "public/models/hero/kitchen-noct.glb")).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    build()
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
