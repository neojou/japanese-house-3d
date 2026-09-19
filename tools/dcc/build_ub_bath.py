#!/usr/bin/env python3
"""
1F UB Type-M hero — LIXIL リデア Mタイプ / BDUS-1616LBM-A+H *inspired* (no trademarks).

Local space after glTF Y-up export (plan metres):
  origin = interior SW on the deck
  +X east, +Y up, +Z north

    blender --background --python tools/dcc/build_ub_bath.py -- \\
        --out public/models/hero/ub-bath.glb

Numbers locked to src/data/dimensions.ts (UB_BATH, PROP_1F_UB_TUB, UB_EAST_WINDOW).
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
        "  blender --background --python tools/dcc/build_ub_bath.py -- "
        "--out public/models/hero/ub-bath.glb"
    ) from exc

# ── locked to dimensions.ts ──────────────────────────────────
SX = 1.595  # UB_BATH.x1 - x0
SZ = 1.680  # UB_BATH.z1 - z0
H = 2.225  # ceilingH
CLAD = 0.014
TUB_W = 0.70
TUB_L = 1.20
TUB_H = 0.55
BASIN = 0.42
INSET = 0.04
CORNER_R = 0.11
TUB_CX = 1.237  # PROP x - origin x
TUB_CZ = 0.650  # PROP z - origin z  (0.05 + 0.60)
WIN_Z0 = 0.050
WIN_W = 1.20
WIN_Y0 = 0.731  # sill 1.34 - 0.609
WIN_H = 1.20
DOOR_X0 = 0.425
DOOR_W = 0.80
DOOR_H = 2.00
BEVEL = 0.0024


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
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for block in list(coll):
            coll.remove(block)


def to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def make_image(name: str, kind: str) -> bpy.types.Image:
    w = h = 512
    img = bpy.data.images.new(name, width=w, height=h)
    pix = [0.0] * (w * h * 4)
    rng = random.Random(hash(kind) & 0xFFFFFFFF)
    for yi in range(h):
        for xi in range(w):
            u = xi / w
            v = yi / h
            n = rng.random()
            o = (yi * w + xi) * 4
            if kind == "cream":
                cells = 2.0
                fx = (u * cells) % 1.0
                fy = (v * cells) % 1.0
                grout = fx < 0.035 or fy < 0.035
                if grout:
                    r, g, b = 0.76, 0.74, 0.70
                else:
                    t = (n - 0.5) * 0.03
                    r, g, b = 0.91 + t, 0.88 + t * 0.8, 0.82 + t * 0.5
            elif kind == "charcoal":
                t = (n - 0.5) * 0.07 + 0.04 * math.sin(u * 28 + v * 14)
                r = 0.24 + t
                g = 0.24 + t * 0.95
                b = 0.25 + t * 0.85
            elif kind == "floor":
                cells = 10.0
                fx = (u * cells) % 1.0
                fy = (v * cells) % 1.0
                groove = fx < 0.12 or fy < 0.12
                t = (n - 0.5) * 0.04
                if groove:
                    r, g, b = 0.74 + t, 0.69 + t, 0.60 + t
                else:
                    r, g, b = 0.88 + t, 0.82 + t, 0.72 + t
            elif kind == "ceiling":
                t = (n - 0.5) * 0.02
                r, g, b = 0.94 + t, 0.93 + t, 0.91 + t
            else:  # porcelain
                t = (n - 0.5) * 0.015
                r, g, b = 0.96 + t, 0.94 + t, 0.91 + t
            pix[o : o + 4] = [max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)), 1.0]
    img.pixels = pix
    img.pack()
    return img


def principled(name: str, **kw) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    col = kw.get("color", (0.8, 0.8, 0.8, 1.0))
    p.inputs["Base Color"].default_value = col
    p.inputs["Roughness"].default_value = kw.get("roughness", 0.5)
    p.inputs["Metallic"].default_value = kw.get("metallic", 0.0)
    if "transmission" in kw and "Transmission Weight" in p.inputs:
        p.inputs["Transmission Weight"].default_value = kw["transmission"]
    if kw.get("image"):
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = kw["image"]
        tex.location = (-400, 200)
        mapn = nt.nodes.new("ShaderNodeMapping")
        mapn.inputs["Scale"].default_value = kw.get("uv_scale", (2.0, 2.0, 1.0))
        mapn.location = (-620, 200)
        coord = nt.nodes.new("ShaderNodeTexCoord")
        coord.location = (-840, 200)
        nt.links.new(coord.outputs["UV"], mapn.inputs["Vector"])
        nt.links.new(mapn.outputs["Vector"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    return mat


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def uv_cube(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
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
    bevel: float,
    mat: bpy.types.Material,
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
        bpy.ops.object.modifier_apply(modifier="bevel")
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
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
    verts: int = 24,
) -> bpy.types.Object:
    loc = to_blender(cx, cy, cz)
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, vertices=verts)
    obj = bpy.context.active_object
    obj.name = name
    if axis == "x":
        obj.rotation_euler = (0.0, 1.5708, 0.0)
    elif axis == "z":
        obj.rotation_euler = (1.5708, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
    uv_cube(obj)
    return obj


def parent_empty(name: str, children: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    empty = bpy.context.active_object
    empty.name = name
    for o in children:
        o.parent = empty
    return empty


def build_tub(mat_porc: bpy.types.Material) -> bpy.types.Object:
    """Minamo apron: large rounded-rect cavity (thin deck, no subdiv shrink)."""
    outer = make_box(
        "Hero_UbTub",
        TUB_W,
        TUB_H,
        TUB_L,
        TUB_CX,
        TUB_H / 2.0,
        TUB_CZ,
        0.01,
        mat_porc,
    )
    cutter_w = TUB_W - 2.0 * INSET
    cutter_l = TUB_L - 2.0 * INSET
    cutter_h = BASIN + 0.12
    loc = to_blender(TUB_CX, TUB_H - BASIN / 2.0 + 0.06, TUB_CZ)
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    cutter = bpy.context.active_object
    cutter.name = "tub-cutter"
    cutter.scale = (cutter_w / 2.0, cutter_l / 2.0, cutter_h / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = cutter.modifiers.new("bevel", "BEVEL")
    mod.width = min(CORNER_R, cutter_w * 0.45, cutter_l * 0.45)
    mod.segments = 8
    mod.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="bevel")

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
    rim = outer.modifiers.new("rim", "BEVEL")
    rim.width = 0.006
    rim.segments = 3
    rim.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="rim")
    bpy.ops.object.shade_smooth()
    try:
        outer.data.use_auto_smooth = True
        outer.data.auto_smooth_angle = math.radians(50)
    except AttributeError:
        pass
    uv_cube(outer)
    return outer


def hose_curve(mat: bpy.types.Material) -> bpy.types.Object:
    """Flexible hose from mixer to handheld."""
    mix_x, mix_y, mix_z = TUB_CX - TUB_W / 2.0 - 0.16, 0.95, 0.04
    bar_x, bar_z = mix_x + 0.11, mix_z + 0.03
    pts = [
        (mix_x + 0.02, mix_y - 0.02, mix_z + 0.04),
        (mix_x - 0.04, mix_y + 0.25, mix_z + 0.12),
        (bar_x - 0.02, 1.45, bar_z + 0.10),
        (bar_x, 1.72, bar_z + 0.05),
    ]
    curve = bpy.data.curves.new("hose", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.006
    curve.bevel_resolution = 3
    curve.resolution_u = 12
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(pts) - 1)
    for i, (x, y, z) in enumerate(pts):
        bp = spline.bezier_points[i]
        bp.co = to_blender(x, y, z)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new("Hero_UbShower_hose", curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    out = Path(_arg("--out", str(root / "public" / "models" / "hero" / "ub-bath.glb")))
    out.parent.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"
    clear_scene()

    img_cream = make_image("ub_cream_tile", "cream")
    img_char = make_image("ub_charcoal", "charcoal")
    img_floor = make_image("ub_floor", "floor")
    img_ceil = make_image("ub_ceiling", "ceiling")
    img_porc = make_image("ub_porcelain", "porcelain")

    mat_porc = principled("UbPorcelain", roughness=0.26, metallic=0.04, image=img_porc, uv_scale=(1.2, 1.2, 1))
    mat_cream = principled("UbCreamTile", roughness=0.58, metallic=0.02, image=img_cream, uv_scale=(1.15, 1.55, 1))
    mat_char = principled("UbCharcoal", roughness=0.62, metallic=0.05, image=img_char, uv_scale=(1.3, 2.0, 1))
    mat_floor = principled("UbFloor", roughness=0.84, metallic=0.02, image=img_floor, uv_scale=(6.0, 6.5, 1))
    mat_chrome = principled("UbChrome", color=(0.72, 0.74, 0.77, 1.0), roughness=0.12, metallic=0.96)
    mat_ceil = principled("UbCeiling", roughness=0.78, metallic=0.0, image=img_ceil, uv_scale=(1.5, 1.5, 1))
    mat_grab = principled("UbGrab", color=(0.52, 0.52, 0.54, 1.0), roughness=0.38, metallic=0.4)
    mat_win = principled("UbWindow", color=(0.96, 0.95, 0.93, 1.0), roughness=0.42, metallic=0.04)
    mat_dark = principled("UbDark", color=(0.12, 0.12, 0.13, 1.0), roughness=0.55, metallic=0.2)

    parts: list[bpy.types.Object] = []

    parts.append(make_box("Hero_UbFloor", SX - CLAD * 2, 0.016, SZ - CLAD * 2, SX / 2, 0.008, SZ / 2, 0.001, mat_floor))
    parts.append(make_box("Hero_UbCeiling", SX - CLAD * 2, 0.018, SZ - CLAD * 2, SX / 2, H - 0.009, SZ / 2, 0.001, mat_ceil))

    # South charcoal (shower) / west cream
    parts.append(make_box("Hero_UbWall_S", SX, H, CLAD, SX / 2, H / 2, CLAD / 2, 0.001, mat_char))
    parts.append(make_box("Hero_UbWall_W", CLAD, H, SZ, CLAD / 2, H / 2, SZ / 2, 0.001, mat_cream))

    # East cream around window
    east_x = SX - CLAD / 2
    win_z1 = WIN_Z0 + WIN_W
    win_y1 = WIN_Y0 + WIN_H
    parts.append(make_box("Hero_UbWall_E_s", CLAD, H, max(WIN_Z0, 0.02), east_x, H / 2, WIN_Z0 / 2, 0.001, mat_cream))
    parts.append(
        make_box(
            "Hero_UbWall_E_n",
            CLAD,
            H,
            max(SZ - win_z1, 0.02),
            east_x,
            H / 2,
            (win_z1 + SZ) / 2,
            0.001,
            mat_cream,
        )
    )
    parts.append(
        make_box(
            "Hero_UbWall_E_sill",
            CLAD,
            max(WIN_Y0, 0.02),
            WIN_W,
            east_x,
            WIN_Y0 / 2,
            (WIN_Z0 + win_z1) / 2,
            0.001,
            mat_cream,
        )
    )
    parts.append(
        make_box(
            "Hero_UbWall_E_head",
            CLAD,
            max(H - win_y1, 0.02),
            WIN_W,
            east_x,
            (win_y1 + H) / 2,
            (WIN_Z0 + win_z1) / 2,
            0.001,
            mat_cream,
        )
    )

    # North cream around 洗面 shower door
    north_z = SZ - CLAD / 2
    door_x1 = DOOR_X0 + DOOR_W
    parts.append(make_box("Hero_UbWall_N_w", max(DOOR_X0, 0.02), H, CLAD, DOOR_X0 / 2, H / 2, north_z, 0.001, mat_cream))
    parts.append(
        make_box(
            "Hero_UbWall_N_e",
            max(SX - door_x1, 0.02),
            H,
            CLAD,
            (door_x1 + SX) / 2,
            H / 2,
            north_z,
            0.001,
            mat_cream,
        )
    )
    parts.append(
        make_box(
            "Hero_UbWall_N_head",
            DOOR_W,
            max(H - DOOR_H, 0.02),
            CLAD,
            (DOOR_X0 + door_x1) / 2,
            (DOOR_H + H) / 2,
            north_z,
            0.001,
            mat_cream,
        )
    )

    # White TW-FIX reveal
    reveal = 0.055
    win_cx = SX - CLAD - reveal / 2
    win_cz = WIN_Z0 + WIN_W / 2
    win_cy = WIN_Y0 + WIN_H / 2
    parts.append(make_box("Hero_UbWindowReveal_sill", reveal + 0.05, 0.045, WIN_W + 0.05, win_cx, WIN_Y0 - 0.008, win_cz, 0.002, mat_win))
    parts.append(make_box("Hero_UbWindowReveal_head", reveal, 0.04, WIN_W + 0.04, win_cx, win_y1 + 0.02, win_cz, 0.002, mat_win))
    parts.append(make_box("Hero_UbWindowReveal_s", reveal, WIN_H, 0.04, win_cx, win_cy, WIN_Z0 - 0.02, 0.002, mat_win))
    parts.append(make_box("Hero_UbWindowReveal_n", reveal, WIN_H, 0.04, win_cx, win_cy, win_z1 + 0.02, 0.002, mat_win))
    # Inner mullion (two-pane look)
    parts.append(make_box("Hero_UbWindowReveal_mullion", 0.02, WIN_H * 0.96, 0.018, win_cx, win_cy, win_cz, 0.001, mat_win))

    parts.append(build_tub(mat_porc))

    # Inner I-bar grab (catalog 浴槽内握りバー)
    grab_x = TUB_CX - TUB_W / 2 + INSET + 0.016
    grab_y = TUB_H - 0.07
    parts.append(make_cyl("Hero_UbGrab", 0.014, 0.60, grab_x, grab_y, TUB_CZ, "z", mat_grab, 20))
    parts.append(make_cyl("Hero_UbGrab_a", 0.009, 0.03, grab_x, grab_y, TUB_CZ - 0.28, "x", mat_grab, 12))
    parts.append(make_cyl("Hero_UbGrab_b", 0.009, 0.03, grab_x, grab_y, TUB_CZ + 0.28, "x", mat_grab, 12))

    # Chrome control on the northwest deck (photo lower-right)
    btn_x = TUB_CX - TUB_W / 2 + 0.036
    btn_y = TUB_H + 0.003
    btn_z = TUB_CZ + TUB_L / 2 - 0.036
    parts.append(make_cyl("Hero_UbDrainButton_ring", 0.024, 0.003, btn_x, TUB_H + 0.001, btn_z, "y", mat_dark, 24))
    parts.append(make_cyl("Hero_UbDrainButton", 0.018, 0.006, btn_x, btn_y, btn_z, "y", mat_chrome, 24))

    # Basin-floor plug (south inner) — drops when the deck button is open
    plug_x = TUB_CX
    plug_y = TUB_H - BASIN + 0.006
    plug_z = TUB_CZ - (TUB_L / 2 - INSET - 0.09)
    parts.append(make_cyl("Hero_UbDrainBore", 0.028, 0.008, plug_x, plug_y - 0.004, plug_z, "y", mat_dark, 20))
    parts.append(make_cyl("Hero_UbDrainPlug", 0.024, 0.008, plug_x, plug_y, plug_z, "y", mat_chrome, 22))

    # Mixer on south charcoal wall (wash side)
    mix_x = TUB_CX - TUB_W / 2 - 0.16
    mix_y = 0.95
    mix_z = 0.03
    parts.append(make_box("Hero_UbFaucet", 0.20, 0.052, 0.048, mix_x, mix_y, mix_z, 0.004, mat_chrome))
    parts.append(make_cyl("Hero_UbFaucet_knobL", 0.018, 0.028, mix_x - 0.058, mix_y, mix_z + 0.018, "z", mat_chrome, 16))
    parts.append(make_cyl("Hero_UbFaucet_knobR", 0.018, 0.028, mix_x + 0.058, mix_y, mix_z + 0.018, "z", mat_chrome, 16))
    parts.append(make_cyl("Hero_UbFaucet_spout", 0.011, 0.09, mix_x, mix_y - 0.01, mix_z + 0.06, "z", mat_chrome, 14))

    # Slide bar + handheld
    bar_x = mix_x + 0.12
    bar_z = mix_z + 0.02
    bar_h = 1.85
    parts.append(make_cyl("Hero_UbShower_bar", 0.011, bar_h, bar_x, bar_h / 2, bar_z, "y", mat_chrome, 16))
    parts.append(make_cyl("Hero_UbShower_slide", 0.016, 0.04, bar_x, 1.62, bar_z, "y", mat_chrome, 14))
    parts.append(make_cyl("Hero_UbShower_head", 0.044, 0.055, bar_x, 1.66, bar_z + 0.045, "z", mat_chrome, 20))
    parts.append(make_cyl("Hero_UbShower_face", 0.048, 0.01, bar_x, 1.66, bar_z + 0.072, "z", mat_chrome, 20))
    parts.append(hose_curve(mat_chrome))

    # Filler over south inner rim
    spout_x = TUB_CX - 0.04
    spout_y = TUB_H + 0.10
    spout_z = TUB_CZ - TUB_L / 2 + 0.05
    parts.append(make_cyl("Hero_UbSpout", 0.012, 0.14, spout_x, spout_y, spout_z, "z", mat_chrome, 14))
    parts.append(make_cyl("Hero_UbSpout_tip", 0.014, 0.02, spout_x, spout_y - 0.04, spout_z + 0.04, "y", mat_chrome, 14))

    # Wash-floor grate
    gx = (TUB_CX - TUB_W / 2) * 0.52
    gz = TUB_CZ + 0.10
    parts.append(make_box("Hero_UbFloorDrain", 0.15, 0.006, 0.15, gx, 0.015, gz, 0.001, mat_dark))
    for i in range(5):
        parts.append(
            make_box(
                f"Hero_UbFloorDrain_bar{i}",
                0.12,
                0.004,
                0.008,
                gx,
                0.018,
                gz - 0.05 + i * 0.025,
                0.0006,
                mat_chrome,
            )
        )

    # Soap shelves on charcoal
    parts.append(make_box("Hero_UbShelf_a", 0.16, 0.028, 0.08, mix_x + 0.32, 1.38, mix_z + 0.02, 0.003, mat_win))
    parts.append(make_box("Hero_UbShelf_b", 0.16, 0.028, 0.08, mix_x + 0.32, 1.14, mix_z + 0.02, 0.003, mat_win))

    # Recessed downlights
    parts.append(make_cyl("Hero_UbLight_0", 0.055, 0.012, SX * 0.36, H - 0.016, SZ * 0.30, "y", mat_ceil, 20))
    parts.append(make_cyl("Hero_UbLight_1", 0.055, 0.012, SX * 0.36, H - 0.016, SZ * 0.58, "y", mat_ceil, 20))
    parts.append(make_cyl("Hero_UbLight_0_lens", 0.04, 0.006, SX * 0.36, H - 0.022, SZ * 0.30, "y", mat_win, 16))
    parts.append(make_cyl("Hero_UbLight_1_lens", 0.04, 0.006, SX * 0.36, H - 0.022, SZ * 0.58, "y", mat_win, 16))

    parent_empty("Hero_UbBath", parts)

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
