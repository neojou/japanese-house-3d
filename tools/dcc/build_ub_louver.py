#!/usr/bin/env python3
"""
1F UB east 目隠し可動ルーバー — LIXIL *inspired* (no trademarks).

Local space after glTF Y-up export (plan metres):
  origin = centre of the 1.20 × 1.20 opening, on the east-wall centreline
  +X east (out), +Y up, +Z north

    blender --background --python tools/dcc/build_ub_louver.py -- \\
        --out public/models/hero/ub-louver.glb

Numbers locked to src/data/dimensions.ts (UB_EAST_WINDOW, PROP_1F_UB_LOUVER).
Color シャイングレー from docs/refs/images/window-lixil-shine-grey.jpg.
"""

from __future__ import annotations

import array
import math
import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Vector
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "run inside Blender:\n"
        "  blender --background --python tools/dcc/build_ub_louver.py -- "
        "--out public/models/hero/ub-louver.glb"
    ) from exc

WIN = 1.20
WALL_T = 0.15
OVER = 0.02
N_BLADES = 16
FRAME = 0.040
SOUTH_STILE = 0.055
BLADE_H = 0.062
BLADE_T = 0.040
LOUVER_D = 0.058
SASH_D = 0.070
BEVEL = 0.0016
# Median sRGB of the official シャイングレー still.
SHINE = (192 / 255, 183 / 255, 173 / 255)
SASH = (0.58, 0.55, 0.51)


def _arg(flag: str, default: str) -> str:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def srgb_to_lin(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def lin3(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    return (srgb_to_lin(rgb[0]), srgb_to_lin(rgb[1]), srgb_to_lin(rgb[2]))


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for block in list(coll):
            coll.remove(block)


def to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def principled(name: str) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def bsdf(mat: bpy.types.Material):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def set_in(node, key: str, value) -> None:
    if key in node.inputs:
        node.inputs[key].default_value = value


def make_brush_maps() -> tuple[bpy.types.Image, bpy.types.Image, bpy.types.Image]:
    """Horizontal extrusion grain. Tag colorspace before writing pixels (Blender 5)."""
    n = 1024
    alb = array.array("f", [0.0]) * (n * n * 4)
    nrm = array.array("f", [0.0]) * (n * n * 4)
    rgh = array.array("f", [0.0]) * (n * n * 4)
    height = [0.0] * (n * n)
    for yi in range(n):
        band = 0.5 + 0.5 * math.sin(yi * 0.55 + math.sin(yi * 0.07) * 2.4)
        for xi in range(n):
            # Grain runs along X (blade length after UV).
            g = 0.55 + 0.45 * math.sin(xi * 0.31 + band * 1.6)
            jitter = math.sin(xi * 1.7 + yi * 0.11) * 0.04
            v = max(0.0, min(1.0, g * 0.55 + jitter + band * 0.08))
            o = (yi * n + xi) * 4
            t = (v - 0.5) * 0.06
            alb[o] = max(0.0, min(1.0, SHINE[0] + t))
            alb[o + 1] = max(0.0, min(1.0, SHINE[1] + t * 0.92))
            alb[o + 2] = max(0.0, min(1.0, SHINE[2] + t * 0.82))
            alb[o + 3] = 1.0
            height[yi * n + xi] = v
            r = 0.28 + (1.0 - v) * 0.14
            rgh[o] = r
            rgh[o + 1] = r
            rgh[o + 2] = r
            rgh[o + 3] = 1.0
    span = 3.4
    for yi in range(n):
        for xi in range(n):
            xm = max(0, xi - 1)
            xp = min(n - 1, xi + 1)
            ym = max(0, yi - 1)
            yp = min(n - 1, yi + 1)
            dx = (height[yi * n + xp] - height[yi * n + xm]) * span
            dy = (height[yp * n + xi] - height[ym * n + xi]) * span * 0.18
            nx, ny, nz = -dx, -dy, 1.0
            inv = 1.0 / math.sqrt(nx * nx + ny * ny + nz * nz)
            o = (yi * n + xi) * 4
            nrm[o] = nx * inv * 0.5 + 0.5
            nrm[o + 1] = ny * inv * 0.5 + 0.5
            nrm[o + 2] = nz * inv * 0.5 + 0.5
            nrm[o + 3] = 1.0

    def pack(name: str, buf: array.array, color: str) -> bpy.types.Image:
        img = bpy.data.images.new(name, width=n, height=n)
        img.colorspace_settings.name = color
        img.pixels.foreach_set(buf)
        img.pack()
        return img

    return (
        pack("Louver_Albedo", alb, "sRGB"),
        pack("Louver_Normal", nrm, "Non-Color"),
        pack("Louver_Rough", rgh, "Non-Color"),
    )


def link_tex(mat: bpy.types.Material, img: bpy.types.Image, sock: str) -> None:
    nt = mat.node_tree
    p = bsdf(mat)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.location = (-420, 80 if sock == "Base Color" else -80)
    if sock == "Normal":
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.location = (-180, -80)
        set_in(nmap, "Strength", 0.42)
        nt.links.new(tex.outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], p.inputs["Normal"])
        return
    nt.links.new(tex.outputs["Color"], p.inputs[sock])


def make_aluminum(
    name: str,
    albedo: bpy.types.Image,
    normal: bpy.types.Image,
    rough: bpy.types.Image,
    tint: tuple[float, float, float],
    metal: float,
) -> bpy.types.Material:
    mat = principled(name)
    p = bsdf(mat)
    set_in(p, "Base Color", (*lin3(tint), 1.0))
    set_in(p, "Roughness", 0.32)
    set_in(p, "Metallic", metal)
    set_in(p, "Coat Weight", 0.14)
    set_in(p, "Coat Roughness", 0.38)
    link_tex(mat, albedo, "Base Color")
    link_tex(mat, rough, "Roughness")
    link_tex(mat, normal, "Normal")
    return mat


def make_glass() -> bpy.types.Material:
    mat = principled("Mat_Glass")
    p = bsdf(mat)
    set_in(p, "Base Color", (*lin3((0.92, 0.95, 0.96)), 1.0))
    set_in(p, "Roughness", 0.04)
    set_in(p, "Metallic", 0.0)
    set_in(p, "Transmission Weight", 0.94)
    set_in(p, "IOR", 1.5)
    return mat


def make_gasket() -> bpy.types.Material:
    mat = principled("Mat_Gasket")
    p = bsdf(mat)
    set_in(p, "Base Color", (*lin3((0.14, 0.13, 0.12)), 1.0))
    set_in(p, "Roughness", 0.72)
    set_in(p, "Metallic", 0.0)
    return mat


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def activate(obj: bpy.types.Object) -> None:
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def shade(obj: bpy.types.Object) -> None:
    activate(obj)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(42.0))
    except Exception:
        bpy.ops.object.shade_smooth()


def apply_mod(obj: bpy.types.Object, name: str) -> None:
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=name)


def uv_cube(obj: bpy.types.Object) -> None:
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=0.35)
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
        mod.width = min(bevel, min(sx, sy, sz) * 0.32)
        mod.segments = 3
        mod.limit_method = "ANGLE"
        apply_mod(obj, "bevel")
    assign(obj, mat)
    uv_cube(obj)
    shade(obj)
    return obj


def parent(child: bpy.types.Object, parent_obj: bpy.types.Object) -> None:
    child.parent = parent_obj
    child.matrix_parent_inverse = parent_obj.matrix_world.inverted()


def make_blade(length: float, mat: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=1.0,
        depth=length,
        end_fill_type="NGON",
        location=(0.0, 0.0, 0.0),
    )
    obj = bpy.context.active_object
    obj.name = "BladeMesh"
    obj.scale = (BLADE_T / 2.0, BLADE_H / 2.0, 1.0)
    obj.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = 0.0012
    mod.segments = 2
    apply_mod(obj, "bevel")
    assign(obj, mat)
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cylinder_project(direction="ALIGN_TO_OBJECT", scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    shade(obj)
    return obj


def build(albedo, normal, rough) -> bpy.types.Object:
    mat_lv = make_aluminum("Mat_Louver", albedo, normal, rough, SHINE, 0.92)
    mat_sash = make_aluminum("Mat_Sash", albedo, normal, rough, SASH, 0.88)
    mat_glass = make_glass()
    mat_gasket = make_gasket()

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.active_object
    root.name = "Hero_UbLouver"
    root.empty_display_size = 0.08

    ext_x0 = WALL_T / 2.0 + 0.004
    ext_cx = ext_x0 + LOUVER_D / 2.0
    gw = WIN + OVER * 2.0
    gh = WIN + OVER * 2.0
    # Exterior frame: south stile thicker (operator housing).
    north_w = FRAME
    south_w = SOUTH_STILE
    inner_n = gw / 2.0 - north_w
    inner_s = gw / 2.0 - south_w
    inner_h = gh - FRAME * 2.0
    rail_len = inner_s + inner_n

    head = make_box(
        "Frame_Head",
        LOUVER_D,
        FRAME,
        gw,
        ext_cx,
        gh / 2.0 - FRAME / 2.0,
        0.0,
        BEVEL,
        mat_lv,
    )
    sill = make_box(
        "Frame_Sill",
        LOUVER_D,
        FRAME,
        gw,
        ext_cx,
        -(gh / 2.0 - FRAME / 2.0),
        0.0,
        BEVEL,
        mat_lv,
    )
    stile_n = make_box(
        "Frame_North",
        LOUVER_D,
        inner_h,
        north_w,
        ext_cx,
        0.0,
        inner_n + north_w / 2.0,
        BEVEL,
        mat_lv,
    )
    stile_s = make_box(
        "Frame_South",
        LOUVER_D + 0.012,
        inner_h,
        south_w,
        ext_cx + 0.004,
        0.0,
        -(inner_s + south_w / 2.0),
        BEVEL,
        mat_lv,
    )
    drip = make_box(
        "Frame_Drip",
        0.018,
        0.012,
        gw - 0.01,
        ext_x0 + LOUVER_D + 0.002,
        -(gh / 2.0) + 0.004,
        0.0,
        0.001,
        mat_lv,
    )
    for o in (head, sill, stile_n, stile_s, drip):
        parent(o, root)

    blade_len = rail_len - 0.010
    y0 = -inner_h / 2.0
    pitch = inner_h / N_BLADES
    blade_x = ext_cx + 0.004
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    blades_g = bpy.context.active_object
    blades_g.name = "Blades"
    blades_g.empty_display_size = 0.04
    parent(blades_g, root)

    proto = make_blade(blade_len, mat_lv)
    for i in range(N_BLADES):
        y = y0 + (i + 0.5) * pitch
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=to_blender(blade_x, y, 0.0))
        empty = bpy.context.active_object
        empty.name = f"Blade_{i:02d}"
        empty.empty_display_size = 0.015
        parent(empty, blades_g)
        if i == 0:
            mesh = proto
        else:
            mesh = proto.copy()
            mesh.data = proto.data
            bpy.context.collection.objects.link(mesh)
        mesh.name = f"BladeMesh_{i:02d}"
        mesh.parent = empty
        mesh.location = (0.0, 0.0, 0.0)
        mesh.rotation_euler = (0.0, 0.0, 0.0)
        mesh.scale = (1.0, 1.0, 1.0)
        pin = make_box(
            f"Pin_{i:02d}",
            0.008,
            0.008,
            0.012,
            blade_x,
            y,
            blade_len / 2.0 - 0.004,
            0.0006,
            mat_gasket,
        )
        parent(pin, empty)

    # Interior sash in the wall thickness (引き違い two lights).
    sash_x = -0.012
    sash_t = 0.042
    make_and_parent = lambda name, sx, sy, sz, cx, cy, cz, mat: parent(
        make_box(name, sx, sy, sz, cx, cy, cz, BEVEL, mat), root
    )
    make_and_parent("Sash_Head", SASH_D, sash_t, WIN, sash_x, WIN / 2.0 - sash_t / 2.0, 0.0, mat_sash)
    make_and_parent("Sash_Sill", SASH_D, sash_t, WIN, sash_x, -(WIN / 2.0 - sash_t / 2.0), 0.0, mat_sash)
    make_and_parent("Sash_North", SASH_D, WIN - sash_t * 2, sash_t, sash_x, 0.0, WIN / 2.0 - sash_t / 2.0, mat_sash)
    make_and_parent("Sash_South", SASH_D, WIN - sash_t * 2, sash_t, sash_x, 0.0, -(WIN / 2.0 - sash_t / 2.0), mat_sash)
    make_and_parent("Sash_Mullion", SASH_D - 0.01, WIN - sash_t * 2 - 0.004, 0.028, sash_x + 0.004, 0.0, 0.0, mat_sash)

    pane_w = (WIN - sash_t * 2 - 0.028) / 2.0 - 0.008
    pane_h = WIN - sash_t * 2 - 0.010
    glass_x = sash_x - 0.006
    gz_n = (WIN / 2.0 - sash_t - 0.004 - pane_w / 2.0)
    gz_s = -gz_n
    g_n = make_box("Glass_N", 0.006, pane_h, pane_w, glass_x, 0.0, gz_n, 0.0004, mat_glass)
    g_s = make_box("Glass_S", 0.006, pane_h, pane_w, glass_x, 0.0, gz_s, 0.0004, mat_glass)
    parent(g_n, root)
    parent(g_s, root)

    bead_n = make_box(
        "Bead_N",
        0.010,
        pane_h + 0.012,
        0.010,
        glass_x + 0.008,
        0.0,
        gz_n + pane_w / 2.0 + 0.004,
        0.0004,
        mat_gasket,
    )
    bead_s = make_box(
        "Bead_S",
        0.010,
        pane_h + 0.012,
        0.010,
        glass_x + 0.008,
        0.0,
        gz_s - pane_w / 2.0 - 0.004,
        0.0004,
        mat_gasket,
    )
    parent(bead_n, root)
    parent(bead_s, root)

    # Interior operator on the south jamb (内観右側 when looking east).
    op_x = -WALL_T / 2.0 + 0.012
    op_z = -(WIN / 2.0 - 0.028)
    track = make_box("Operator_Track", 0.018, 0.42, 0.022, op_x, 0.0, op_z, 0.001, mat_sash)
    slider = make_box("Operator_Slider", 0.024, 0.055, 0.028, op_x - 0.004, -0.14, op_z, 0.0012, mat_lv)
    knob = make_box("Operator_Knob", 0.016, 0.016, 0.016, op_x - 0.014, -0.14, op_z, 0.002, mat_lv)
    parent(track, root)
    parent(slider, root)
    parent(knob, root)
    return root


def main() -> None:
    out = Path(_arg("--out", "public/models/hero/ub-louver.glb")).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    albedo, normal, rough = make_brush_maps()
    root = build(albedo, normal, rough)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
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
        use_selection=False,
    )
    print(f"wrote {out}")
    print(f"blades {N_BLADES} shine {SHINE[0]:.3f} {SHINE[1]:.3f} {SHINE[2]:.3f}")


if __name__ == "__main__":
    main()
