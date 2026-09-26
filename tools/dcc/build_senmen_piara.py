#!/usr/bin/env python3
"""
1F senmen vanity — Piara-inspired, no LIXIL / ピアラ trademarks on the mesh.

Body  AR3H-755SY / VP1H  — 75 cm 引出, left drawers + right door, ひろびろ bowl.
Mirror MAR3-753TXJU      — 3-panel full-storage slim LED (くもり止め at runtime).

Local space after glTF Y-up (plan metres):
  origin = SW corner on the finished floor (west / front-south)
  +X east, +Y up, +Z north (back / wall)

  W 0.75  D 0.50  bowl rim 0.80  overall 1.90
  Left two drawers, right door; ceramic backsplash; 3 mirror leaves.

    blender --background --python tools/dcc/build_senmen_piara.py -- \\
        --out public/models/hero/senmen-piara.glb
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
        "  blender --background --python tools/dcc/build_senmen_piara.py -- "
        "--out public/models/hero/senmen-piara.glb"
    ) from exc

W = 0.75
D = 0.50
BOWL_H = 0.80
TOTAL_H = 1.90
TOE = 0.08
TOP_T = 0.032
BACK_H = 0.15
MIRROR_D = 0.158
MIRROR_H = 0.95
MIRROR_Y0 = TOTAL_H - MIRROR_H
BEVEL = 0.0013
DRAWER_W = 0.255
# くるくる-inspired wall mixer (no logos). Tip feeds the runtime stream.
FX, FY, FZ = 0.40, BOWL_H + 0.105, D - 0.052


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
    rng = random.Random(11 if kind == "ceramic" else 5)
    for yi in range(n):
        for xi in range(n):
            t = (rng.random() - 0.5) * (0.035 if kind == "ceramic" else 0.016)
            vein = 0.0
            if kind == "ceramic":
                vein = 0.012 * math.sin((xi + yi * 0.35) * 0.085) * math.sin(yi * 0.04)
            o = (yi * n + xi) * 4
            if kind == "ceramic":
                pix[o : o + 4] = (
                    0.96 + t + vein,
                    0.96 + t * 0.85 + vein * 0.7,
                    0.95 + t * 0.6,
                    1.0,
                )
            else:
                pix[o : o + 4] = (0.94 + t, 0.94 + t, 0.93 + t * 0.9, 1.0)
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
        p.inputs["Coat Roughness"].default_value = 0.06
    if emission is not None:
        emit = p.inputs.get("Emission Color") or p.inputs.get("Emission")
        if emit is not None:
            emit.default_value = emission
        if "Emission Strength" in p.inputs:
            p.inputs["Emission Strength"].default_value = 2.4
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
        bpy.ops.object.shade_auto_smooth(angle=math.radians(55))
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
        mod.segments = 3 if smooth else 2
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
    verts: int = 24,
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


def make_cyl_dir(
    name: str,
    r: float,
    h: float,
    cx: float,
    cy: float,
    cz: float,
    direction: tuple[float, float, float],
    mat: bpy.types.Material,
    verts: int = 24,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=h, location=to_blender(cx, cy, cz), vertices=verts
    )
    obj = bpy.context.active_object
    obj.name = name
    target = to_blender(*direction)
    if target.length > 1e-8:
        target.normalize()
        quat = Vector((0.0, 0.0, 1.0)).rotation_difference(target)
        obj.rotation_euler = quat.to_euler()
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
    segs: int = 16,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=r, location=to_blender(cx, cy, cz), segments=segs, ring_count=max(8, segs // 2)
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
    obj.empty_display_size = 0.03
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
    mod.width = min(radius, sx * 0.42, sz * 0.42)
    mod.segments = 6
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="bevel")
    return obj


def handle(name: str, cx: float, cy: float, cz: float, length: float, mat: bpy.types.Material) -> bpy.types.Object:
    """White horizontal bar pull (same laminate as the door)."""
    return make_box(name, length, 0.009, 0.013, cx, cy, cz, mat, 0.0015, smooth=True)


def build() -> None:
    img_w = make_image("white", "door")
    img_m = make_image("ceramic", "ceramic")
    mat_w = pbr("Mat_White", (0.94, 0.94, 0.93, 1), 0.46, 0.02, img_w)
    mat_bowl = pbr("Mat_Bowl", (0.96, 0.96, 0.95, 1), 0.14, 0.03, img_m, coat=0.55)
    mat_chrome = pbr("Mat_Chrome", (0.86, 0.88, 0.90, 1), 0.10, 1.0)
    mat_steel = pbr("Mat_Steel", (0.72, 0.74, 0.76, 1), 0.26, 0.88)
    mat_dark = pbr("Mat_Dark", (0.12, 0.12, 0.12, 1), 0.42, 0.22)
    mat_led = pbr("Mat_LED", (1.0, 0.97, 0.9, 1), 0.28, 0.0, emission=(1.0, 0.96, 0.88, 1))
    mat_tray = pbr("Mat_Tray", (0.90, 0.88, 0.84, 1), 0.52, 0.03)
    mat_cup = pbr("Mat_Cup", (0.88, 0.89, 0.90, 1), 0.22, 0.12, coat=0.2)
    mat_amber = pbr("Mat_Amber", (0.62, 0.42, 0.22, 1), 0.28, 0.04, coat=0.25)
    mat_green = pbr("Mat_Green", (0.22, 0.38, 0.32, 1), 0.30, 0.05, coat=0.2)
    mat_cloth = pbr("Mat_Cloth", (0.86, 0.84, 0.80, 1), 0.82, 0.0)

    parts: list[bpy.types.Object] = []
    cab_h = BOWL_H - TOP_T - TOE

    # Inset plinth + carcass (open front so drawers/door can move)
    parts.append(make_box("Toe", W - 0.05, TOE, D - 0.05, W / 2, TOE / 2, D / 2 + 0.012, mat_w, 0.001))
    parts.append(make_box("Back", W, cab_h, 0.016, W / 2, TOE + cab_h / 2, D - 0.008, mat_w))
    parts.append(make_box("End_W", 0.016, cab_h, D - 0.018, 0.008, TOE + cab_h / 2, D / 2, mat_w))
    parts.append(make_box("End_E", 0.016, cab_h, D - 0.018, W - 0.008, TOE + cab_h / 2, D / 2, mat_w))
    parts.append(make_box("Div", 0.014, cab_h, D - 0.04, DRAWER_W + 0.018, TOE + cab_h / 2, D / 2 + 0.01, mat_w))
    parts.append(make_box("Bottom", W - 0.04, 0.014, D - 0.05, W / 2, TOE + 0.007, D / 2 + 0.01, mat_w))
    parts.append(make_box("CabShelf", 0.42, 0.012, D - 0.08, W - 0.24, 0.42, D / 2 + 0.02, mat_w))

    # Ceramic deck + ひろびろ bowl (right-center) + left drain-board well
    deck = make_box("Deck", W, TOP_T, D, W / 2, BOWL_H - TOP_T / 2, D / 2, mat_bowl, 0.0025, smooth=True)
    hole = rounded_cutter("bowl-hole", 0.50, 0.08, 0.34, 0.455, BOWL_H + 0.01, 0.245, 0.045)
    bool_diff(deck, hole)
    well = rounded_cutter("rack-well", 0.18, 0.03, 0.30, 0.125, BOWL_H + 0.004, 0.22, 0.02)
    bool_diff(deck, well)
    parts.append(deck)

    bowl = make_box("Hero_PiaraBowl", 0.52, 0.145, 0.36, 0.455, BOWL_H - 0.085, 0.245, mat_bowl, 0.0)
    inner = rounded_cutter("bowl-inner", 0.48, 0.155, 0.325, 0.455, BOWL_H - 0.07, 0.245, 0.05)
    bool_diff(bowl, inner)
    shade_smooth(bowl)
    parts.append(bowl)

    parts.append(make_cyl("Drain", 0.024, 0.006, 0.56, BOWL_H - 0.148, 0.33, "y", mat_chrome, 24))
    parts.append(make_cyl("DrainGrid", 0.020, 0.004, 0.56, BOWL_H - 0.144, 0.33, "y", mat_steel, 16))
    for i in range(8):
        parts.append(
            make_box(
                f"Rack_{i}",
                0.155,
                0.005,
                0.011,
                0.125,
                BOWL_H - 0.016,
                0.09 + i * 0.034,
                mat_steel,
                0.0008,
                True,
            )
        )

    parts.append(
        make_box(
            "Backsplash",
            W,
            BACK_H,
            0.042,
            W / 2,
            BOWL_H + BACK_H / 2,
            D - 0.021,
            mat_bowl,
            0.002,
            True,
        )
    )

    # Wall-mounted mixer: flange + stem + joint + angled spout + separate knob
    parts.append(make_cyl("Hero_PiaraFaucet_flange", 0.022, 0.008, FX, FY, FZ + 0.002, "z", mat_chrome, 24))
    parts.append(make_cyl("Hero_PiaraFaucet_base", 0.013, 0.038, FX, FY, FZ - 0.016, "z", mat_chrome, 20))
    parts.append(make_cyl("Hero_PiaraFaucet_body", 0.012, 0.05, FX, FY + 0.018, FZ - 0.034, "y", mat_chrome, 20))
    jx, jy, jz = FX, FY + 0.038, FZ - 0.038
    parts.append(make_sphere("Hero_PiaraFaucet_joint", 0.014, jx, jy, jz, mat_chrome, 20))
    spout_dir = (0.02, -0.38, -0.92)
    slen = 0.125
    mag = math.sqrt(spout_dir[0] ** 2 + spout_dir[1] ** 2 + spout_dir[2] ** 2)
    nd = (spout_dir[0] / mag, spout_dir[1] / mag, spout_dir[2] / mag)
    scx = jx + nd[0] * (slen / 2)
    scy = jy + nd[1] * (slen / 2)
    scz = jz + nd[2] * (slen / 2)
    parts.append(
        make_cyl_dir("Hero_PiaraFaucet_spout", 0.009, slen, scx, scy, scz, spout_dir, mat_chrome, 18)
    )
    tip_x = jx + nd[0] * slen
    tip_y = jy + nd[1] * slen
    tip_z = jz + nd[2] * slen
    parts.append(make_cyl_dir("Hero_PiaraFaucet_tip", 0.011, 0.016, tip_x, tip_y, tip_z, spout_dir, mat_chrome, 16))

    mx, my, mz = 0.545, BOWL_H + 0.082, D - 0.052
    parts.append(make_cyl("Hero_PiaraMixer", 0.016, 0.022, mx, my, mz, "z", mat_chrome, 20))
    parts.append(make_cyl("Hero_PiaraMixer_knob", 0.014, 0.018, mx, my, mz - 0.016, "z", mat_chrome, 16))
    parts.append(make_box("Hero_PiaraMixer_lever", 0.008, 0.028, 0.01, mx, my + 0.02, mz - 0.018, mat_chrome, 0.001, True))
    parts.append(make_cyl("Hero_PiaraBtn", 0.007, 0.008, 0.63, BOWL_H + 0.07, D - 0.048, "z", mat_chrome, 12))

    print(f"stream_tip {tip_x:.4f} {tip_y:.4f} {tip_z:.4f}")

    def left_drawer(i: int, cy: float, sy: float) -> None:
        pivot = empty_at(f"Drawer_L{i}", DRAWER_W / 2, cy, 0.01)
        front = make_box(
            f"Drawer_L{i}_front",
            DRAWER_W - 0.01,
            sy - 0.006,
            0.018,
            DRAWER_W / 2,
            cy,
            0.009,
            mat_w,
            BEVEL,
        )
        pull = handle(f"Drawer_L{i}_pull", DRAWER_W / 2, cy + sy * 0.22, -0.005, 0.13, mat_w)
        box = make_box(
            f"Drawer_L{i}_box",
            DRAWER_W - 0.04,
            sy - 0.04,
            0.38,
            DRAWER_W / 2,
            cy,
            0.22,
            mat_w,
        )
        parent_keep(pivot, front)
        parent_keep(pivot, pull)
        parent_keep(pivot, box)
        if i == 1:
            towel = make_box(
                f"Drawer_L{i}_towel",
                0.16,
                0.03,
                0.18,
                DRAWER_W / 2,
                cy + sy * 0.12,
                0.18,
                mat_cloth,
                0.004,
            )
            parent_keep(pivot, towel)
        parts.append(pivot)

    left_drawer(0, 0.255, 0.33)
    left_drawer(1, 0.575, 0.30)

    # Right cabinet door — hinge east, leaf −X, cup on the inner face
    hinge = empty_at("CabDoor_R", W - 0.012, 0.43, 0.01)
    door = make_box("CabDoor_R_front", 0.455, 0.66, 0.018, W - 0.242, 0.43, 0.009, mat_w, BEVEL)
    pull = handle("CabDoor_R_pull", W - 0.40, 0.62, -0.005, 0.13, mat_w)
    cup = make_cyl("CabDoor_R_cup", 0.026, 0.072, W - 0.20, 0.54, 0.055, "y", mat_cup, 20)
    brush0 = make_cyl("CabDoor_R_brush0", 0.004, 0.11, W - 0.208, 0.60, 0.055, "y", mat_dark, 8)
    brush1 = make_cyl("CabDoor_R_brush1", 0.004, 0.10, W - 0.192, 0.595, 0.062, "y", mat_green, 8)
    parent_keep(hinge, door)
    parent_keep(hinge, pull)
    parent_keep(hinge, cup)
    parent_keep(hinge, brush0)
    parent_keep(hinge, brush1)
    parts.append(hinge)

    # Mirror cabinet carcass
    my0, my1 = MIRROR_Y0, TOTAL_H
    myc = (my0 + my1) / 2
    mz_back = D - 0.008
    mz_front = D - MIRROR_D
    parts.append(make_box("Mirror_back", W, MIRROR_H, 0.012, W / 2, myc, mz_back, mat_w))
    parts.append(make_box("Mirror_side_W", 0.012, MIRROR_H, MIRROR_D, 0.006, myc, D - MIRROR_D / 2, mat_w))
    parts.append(make_box("Mirror_side_E", 0.012, MIRROR_H, MIRROR_D, W - 0.006, myc, D - MIRROR_D / 2, mat_w))
    parts.append(make_box("Mirror_top", W, 0.028, MIRROR_D, W / 2, my1 - 0.014, D - MIRROR_D / 2, mat_w, 0.001))
    parts.append(make_box("Mirror_bot", W, 0.018, MIRROR_D, W / 2, my0 + 0.009, D - MIRROR_D / 2, mat_w))
    parts.append(
        make_box(
            "Mirror_LED",
            W - 0.06,
            0.007,
            0.014,
            W / 2,
            my0 + 0.004,
            mz_front + 0.018,
            mat_led,
        )
    )
    parts.append(
        make_box(
            "Mirror_LED_diff",
            W - 0.08,
            0.004,
            0.010,
            W / 2,
            my0 + 0.001,
            mz_front + 0.012,
            mat_led,
        )
    )

    shelf_ys = (1.10, 1.30, 1.50, 1.70)
    bottle_specs = (
        (0, -0.18, mat_amber, 0.018, 0.07),
        (0, 0.16, mat_green, 0.016, 0.06),
        (1, -0.10, mat_w, 0.015, 0.055),
        (2, 0.20, mat_amber, 0.014, 0.05),
        (3, -0.22, mat_green, 0.017, 0.065),
    )
    for i, yy in enumerate(shelf_ys):
        parts.append(
            make_box(
                f"Mirror_shelf_{i}",
                W - 0.05,
                0.01,
                MIRROR_D - 0.04,
                W / 2,
                yy,
                D - MIRROR_D / 2,
                mat_w,
            )
        )
        for t, dx in enumerate((-0.22, -0.08, 0.08, 0.22)):
            parts.append(
                make_box(
                    f"Mirror_tray_{i}_{t}",
                    0.095,
                    0.010,
                    0.065,
                    W / 2 + dx,
                    yy + 0.008,
                    D - 0.075,
                    mat_tray,
                    0.001,
                )
            )

    for bi, (si, dx, mat_b, br, bh) in enumerate(bottle_specs):
        yy = shelf_ys[si]
        parts.append(
            make_cyl(
                f"Mirror_bottle_{bi}",
                br,
                bh,
                W / 2 + dx,
                yy + 0.012 + bh / 2,
                D - 0.075,
                "y",
                mat_b,
                16,
            )
        )

    panel_w = W / 3

    def mirror_door(tag: str, hinge_x: float, leaf_dir: float) -> None:
        """leaf_dir +1 = leaf extends +X from hinge. Glass is parented at runtime."""
        pivot = empty_at(f"MirrorDoor_{tag}", hinge_x, myc, mz_front)
        cx = hinge_x + leaf_dir * (panel_w / 2)
        slab = make_box(
            f"MirrorDoor_{tag}_slab",
            panel_w - 0.004,
            MIRROR_H - 0.052,
            0.010,
            cx,
            myc,
            mz_front + 0.004,
            mat_w,
            BEVEL,
        )
        frame = make_box(
            f"MirrorDoor_{tag}_frame",
            panel_w - 0.004,
            MIRROR_H - 0.052,
            0.006,
            cx,
            myc,
            mz_front - 0.003,
            mat_w,
            0.0008,
        )
        parent_keep(pivot, slab)
        parent_keep(pivot, frame)
        parts.append(pivot)

    mirror_door("L", 0.0, 1.0)
    mirror_door("C", panel_w, 1.0)
    mirror_door("R", W, -1.0)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.active_object
    root.name = "Hero_SenmenPiara"
    for obj in parts:
        parent_keep(root, obj)


def main() -> None:
    out = Path(_arg("--out", "public/models/hero/senmen-piara.glb")).resolve()
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
