#!/usr/bin/env python3
"""
Sit toilet — Amage シャワートイレ inspired, no LIXIL / INAX / アメージュ marks.

Skirted one-piece ceramic, tank-top 手洗い, washlet seat + lid.

Local space after glTF Y-up (plan metres):
  origin = envelope centre on the finished floor
  +X sit (bowl front / east), +Y up, +Z north
  tank back at x = −DEPTH/2, bowl front at +DEPTH/2

  手洗付 catalog ~ 416 × 764 × 1005 mm (faucet). Ceramic tank rim ~0.80.

    blender --background --python tools/dcc/build_amage_toilet.py -- \\
        --out public/models/hero/amage-toilet.glb
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
        "  blender --background --python tools/dcc/build_amage_toilet.py -- "
        "--out public/models/hero/amage-toilet.glb"
    ) from exc

DEPTH = 0.76
WIDTH = 0.416
RIM_H = 0.36
SEAT_H = 0.40
TANK_TOP = 0.80
TANK_D = 0.20
HALF = DEPTH / 2.0
HingeX = -0.10
HingeY = SEAT_H + 0.008


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
    n = 512
    img = bpy.data.images.new(name, width=n, height=n)
    pix = [0.0] * (n * n * 4)
    rng = random.Random(19 if kind == "ceramic" else 7)
    for yi in range(n):
        for xi in range(n):
            t = (rng.random() - 0.5) * (0.03 if kind == "ceramic" else 0.014)
            o = (yi * n + xi) * 4
            if kind == "ceramic":
                pix[o : o + 4] = (0.97 + t, 0.97 + t * 0.9, 0.96 + t * 0.7, 1.0)
            else:
                pix[o : o + 4] = (0.93 + t, 0.93 + t, 0.92 + t, 1.0)
    img.pixels.foreach_set(pix)
    img.pack()
    return img


def pbr(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
    metallic: float,
    image: bpy.types.Image | None = None,
    coat: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = color
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metallic
    if coat > 0 and "Coat Weight" in p.inputs:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = 0.05
    if image is not None:
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], p.inputs["Base Color"])
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


def shade_smooth(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(50))
    except Exception:
        bpy.ops.object.shade_smooth()
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
    smooth: bool = False,
    segments: int = 3,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_cube_add(size=2, location=to_blender(cx, cy, cz))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx / 2.0, sz / 2.0, sy / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0003:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = min(bevel, min(sx, sy, sz) * 0.42)
        mod.segments = segments
        mod.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="bevel")
    assign(obj, mat)
    uv_cube(obj)
    if smooth:
        shade_smooth(obj)
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
    verts: int = 28,
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
    shade_smooth(obj)
    return obj


def make_sphere(
    name: str,
    r: float,
    cx: float,
    cy: float,
    cz: float,
    mat: bpy.types.Material,
    segs: int = 20,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=r,
        location=to_blender(cx, cy, cz),
        segments=segs,
        ring_count=max(10, segs // 2),
    )
    obj = bpy.context.active_object
    obj.name = name
    assign(obj, mat)
    shade_smooth(obj)
    return obj


def parent_keep(parent: bpy.types.Object, child: bpy.types.Object) -> None:
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def empty_at(name: str, x: float, y: float, z: float) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=to_blender(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.empty_display_size = 0.04
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
    dummy = bpy.data.materials.new("_cut")
    obj = make_box(name, sx, sy, sz, cx, cy, cz, dummy, 0.0)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = min(radius, sx * 0.42, sz * 0.42)
    mod.segments = 6
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="bevel")
    return obj


def build() -> None:
    img_c = make_image("ceramic", "ceramic")
    img_p = make_image("plastic", "door")
    mat_cer = pbr("Mat_Ceramic", (0.96, 0.96, 0.95, 1), 0.12, 0.03, img_c, coat=0.7)
    mat_inner = pbr("Mat_Inner", (0.78, 0.80, 0.81, 1), 0.22, 0.02, coat=0.35)
    mat_seat = pbr("Mat_Seat", (0.94, 0.94, 0.93, 1), 0.32, 0.02, img_p, coat=0.15)
    mat_chrome = pbr("Mat_Chrome", (0.86, 0.88, 0.90, 1), 0.10, 1.0)
    mat_hose = pbr("Mat_Hose", (0.82, 0.84, 0.86, 1), 0.28, 0.75)
    mat_dark = pbr("Mat_Dark", (0.18, 0.18, 0.18, 1), 0.4, 0.2)

    parts: list[bpy.types.Object] = []

    # Skirted hull — 足元スリム: wider at the rim, narrower at the floor
    skirt = make_box(
        "Hero_AmageBowl",
        0.58,
        RIM_H,
        0.39,
        0.05,
        RIM_H / 2,
        0.0,
        mat_cer,
        0.055,
        True,
        5,
    )
    # Front round nose of the elongated bowl
    nose = make_cyl(
        "bowl-nose",
        0.175,
        RIM_H - 0.02,
        0.22,
        RIM_H / 2,
        0.0,
        "y",
        mat_cer,
        32,
    )
    # Merge nose into skirt via union
    mod = skirt.modifiers.new("union", "BOOLEAN")
    mod.operation = "UNION"
    mod.object = nose
    mod.solver = "FLOAT"
    bpy.context.view_layer.objects.active = skirt
    bpy.ops.object.modifier_apply(modifier="union")
    bpy.data.objects.remove(nose, do_unlink=True)

    cavity = rounded_cutter("bowl-cav", 0.38, 0.22, 0.27, 0.12, RIM_H + 0.02, 0.0, 0.09)
    bool_diff(skirt, cavity)
    shade_smooth(skirt)
    parts.append(skirt)

    liner = make_box(
        "Hero_AmageLiner",
        0.36,
        0.14,
        0.25,
        0.12,
        RIM_H - 0.10,
        0.0,
        mat_inner,
        0.0,
    )
    liner_cut = rounded_cutter("liner-cut", 0.32, 0.16, 0.21, 0.12, RIM_H - 0.06, 0.0, 0.07)
    bool_diff(liner, liner_cut)
    shade_smooth(liner)
    parts.append(liner)

    # Rim torus-ish: thin ceramic lip
    parts.append(
        make_cyl("RimFront", 0.155, 0.022, 0.20, RIM_H + 0.006, 0.0, "y", mat_cer, 28)
    )
    parts.append(
        make_box(
            "RimDeck",
            0.22,
            0.022,
            0.30,
            -0.02,
            RIM_H + 0.006,
            0.0,
            mat_cer,
            0.01,
            True,
        )
    )

    # Tank — trapezoid-ish via bevel, 手洗い basin on top
    tank = make_box(
        "Hero_AmageTank",
        TANK_D + 0.02,
        TANK_TOP - 0.34,
        WIDTH - 0.03,
        -HALF + TANK_D / 2 + 0.01,
        0.34 + (TANK_TOP - 0.34) / 2,
        0.0,
        mat_cer,
        0.028,
        True,
        4,
    )
    wash = rounded_cutter(
        "wash-cut",
        0.13,
        0.12,
        0.28,
        -HALF + TANK_D / 2 + 0.005,
        TANK_TOP + 0.02,
        0.0,
        0.045,
    )
    bool_diff(tank, wash)
    shade_smooth(tank)
    parts.append(tank)

    # 手洗い inner glaze
    parts.append(
        make_box(
            "Hero_AmageWash",
            0.11,
            0.012,
            0.24,
            -HALF + TANK_D / 2 + 0.005,
            TANK_TOP - 0.07,
            0.0,
            mat_inner,
            0.02,
            True,
        )
    )
    # Raised rim of the 手洗い
    parts.append(
        make_box(
            "WashRim",
            TANK_D + 0.04,
            0.018,
            WIDTH - 0.02,
            -HALF + TANK_D / 2 + 0.01,
            TANK_TOP + 0.006,
            0.0,
            mat_cer,
            0.012,
            True,
        )
    )

    # Small chrome 手洗い faucet at the back of the basin
    fx, fy, fz = -HALF + 0.04, TANK_TOP + 0.02, 0.0
    parts.append(make_cyl("Hero_AmageFaucet_base", 0.012, 0.016, fx, fy, fz, "y", mat_chrome, 16))
    parts.append(make_cyl("Hero_AmageFaucet_body", 0.009, 0.055, fx, fy + 0.03, fz, "y", mat_chrome, 16))
    parts.append(make_sphere("Hero_AmageFaucet_joint", 0.011, fx, fy + 0.055, fz, mat_chrome, 16))
    parts.append(
        make_cyl(
            "Hero_AmageFaucet_spout",
            0.007,
            0.055,
            fx + 0.025,
            fy + 0.048,
            fz,
            "x",
            mat_chrome,
            14,
        )
    )
    parts.append(
        make_cyl(
            "Hero_AmageFaucet_tip",
            0.008,
            0.012,
            fx + 0.048,
            fy + 0.040,
            fz,
            "y",
            mat_chrome,
            12,
        )
    )

    # Washlet 機能部 between tank and seat
    parts.append(
        make_box(
            "Hero_AmageUnit",
            0.12,
            0.085,
            0.34,
            -0.16,
            SEAT_H + 0.01,
            0.0,
            mat_seat,
            0.012,
            True,
        )
    )
    # Side nozzle door (right of sitter = −Z / south)
    parts.append(
        make_box(
            "NozzleDoor",
            0.06,
            0.03,
            0.05,
            0.02,
            RIM_H - 0.04,
            -0.14,
            mat_seat,
            0.006,
            True,
        )
    )

    # Supply hose tank-back → wall (−X)
    parts.append(
        make_cyl(
            "SupplyHose",
            0.008,
            0.06,
            -HALF - 0.01,
            0.22,
            0.06,
            "x",
            mat_hose,
            12,
        )
    )
    parts.append(make_cyl("SupplyNut", 0.012, 0.014, -HALF + 0.02, 0.22, 0.06, "x", mat_chrome, 10))

    # Floor shadow skirt (narrower)
    parts.append(
        make_box(
            "Foot",
            0.50,
            0.04,
            0.30,
            0.02,
            0.02,
            0.0,
            mat_cer,
            0.016,
            True,
        )
    )

    # Hinges (chrome barrels)
    for side, sz in ((-1, -0.12), (1, 0.12)):
        parts.append(
            make_cyl(
                f"Hinge_{side}",
                0.008,
                0.03,
                HingeX,
                HingeY,
                sz,
                "z",
                mat_chrome,
                12,
            )
        )

    # Seat ring — hinge empty, hole in the slab
    seat_p = empty_at("Seat", HingeX, HingeY, 0.0)
    seat_slab = make_box(
        "Seat_slab",
        0.46,
        0.028,
        0.34,
        HingeX + 0.24,
        HingeY - 0.006,
        0.0,
        mat_seat,
        0.018,
        True,
        4,
    )
    seat_hole = rounded_cutter(
        "seat-hole",
        0.28,
        0.06,
        0.20,
        HingeX + 0.26,
        HingeY - 0.006,
        0.0,
        0.08,
    )
    bool_diff(seat_slab, seat_hole)
    shade_smooth(seat_slab)
    parent_keep(seat_p, seat_slab)
    parts.append(seat_p)

    # Lid — same hinge, slightly above the seat
    lid_p = empty_at("Lid", HingeX, HingeY, 0.0)
    lid = make_box(
        "Lid_panel",
        0.48,
        0.026,
        0.36,
        HingeX + 0.25,
        HingeY + 0.018,
        0.0,
        mat_seat,
        0.02,
        True,
        5,
    )
    lid_rear = make_box(
        "Lid_hinge_cover",
        0.08,
        0.04,
        0.32,
        HingeX + 0.02,
        HingeY + 0.016,
        0.0,
        mat_seat,
        0.012,
        True,
    )
    parent_keep(lid_p, lid)
    parent_keep(lid_p, lid_rear)
    parts.append(lid_p)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.active_object
    root.name = "Hero_AmageToilet"
    for obj in parts:
        parent_keep(root, obj)


def main() -> None:
    out = Path(_arg("--out", "public/models/hero/amage-toilet.glb")).resolve()
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
