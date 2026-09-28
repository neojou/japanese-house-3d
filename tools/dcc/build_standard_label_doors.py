#!/usr/bin/env python3
"""
Panasonic Standard Label inspired interior leaves. No brand marks on the mesh.

One GLB, five roots. Each leaf is centered on its origin:
  +X free edge (lever side), −X hinge edge, +Y up, +Z face.
  Swing / fold runtime mirrors X so the lever stays on the free edge.

  Leaf_LD  0.78 × 1.95  vertical frosted light   片開き
  Leaf_PA  0.78 × 1.95  flush veneer             片開き / 引き戸
  Leaf_DC  0.78 × 1.95  small high frosted slot  片引き
  Leaf_TA  0.78 × 1.95  smaller high frosted slot 片開き
  Leaf_PH  0.40 × 1.95  flush, no lever          折れ戸 one panel

Greige oak (グレージュオーク) from the catalog photos. Wood is a dielectric
with a packed grain + normal so the scene HDR rakes. Chrome lever is metal.
Frosted acrylic uses transmission. No lights in the file.

    blender --background --python tools/dcc/build_standard_label_doors.py -- \\
        --out public/models/hero/standard-label-doors.glb
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
        "  blender --background --python tools/dcc/build_standard_label_doors.py -- "
        "--out public/models/hero/standard-label-doors.glb"
    ) from exc

W = 0.78
H = 1.95
T = 0.036
PH_W = 0.40
LEVER_Y = 1.00  # above the floor; floor is at −H/2


def _arg(flag: str, default: str) -> str:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def _has(flag: str) -> bool:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    return flag in argv


def srgb_to_lin(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def lin3(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    return (srgb_to_lin(rgb[0]), srgb_to_lin(rgb[1]), srgb_to_lin(rgb[2]))


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for block in list(coll):
            coll.remove(block)


def to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def hash2(ix: int, iy: int) -> float:
    n = (ix * 374761393 + iy * 668265263) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n & 0xFFFFFF) / float(0xFFFFFF)


def make_oak_maps() -> tuple[bpy.types.Image, bpy.types.Image]:
    """Vertical greige-oak grain. Buffer is linear. Set colorspace before pixels.

    Blender 5 clears the pixel buffer when colorspace_settings is assigned,
    so the tag has to be set first.
    """
    n = 1024
    pale = (0.910, 0.867, 0.812)  # #e8ddcf
    base = (0.847, 0.788, 0.714)  # #d8c9b6
    dark = (0.690, 0.612, 0.525)  # #b09c86
    pore = (0.580, 0.510, 0.435)  # #94826f
    height = array.array("f", [0.0]) * (n * n)
    color = array.array("f", [0.0]) * (n * n * 4)
    # One shade per column so the grain runs straight up the veneer.
    column = array.array("f", [0.0]) * n
    for xi in range(n):
        u = xi / n
        wobble = (hash2(xi, 1) - 0.5) * 0.04 + (hash2(xi // 3, 2) - 0.5) * 0.06
        g = (
            0.62
            + 0.10 * math.sin((u + wobble) * math.tau * 28.0)
            + 0.06 * math.sin((u + wobble * 0.3) * math.tau * 9.0 + 0.7)
            + 0.04 * math.sin(u * math.tau * 61.0 + hash2(xi // 5, 4) * 3.0)
        )
        if hash2(xi, 11) > 0.985:
            g -= 0.10
        column[xi] = g
    for yi in range(n):
        for xi in range(n):
            g = column[xi] + (hash2(xi // 2, yi // 8) - 0.5) * 0.035
            if hash2(xi, yi // 5) > 0.992:
                g -= 0.05
            g = max(0.0, min(1.0, g))
            height[yi * n + xi] = g
            r = dark[0] + (base[0] - dark[0]) * g
            gg = dark[1] + (base[1] - dark[1]) * g
            b = dark[2] + (base[2] - dark[2]) * g
            if g > 0.62:
                t = (g - 0.62) / 0.38
                r = r * (1 - t) + pale[0] * t
                gg = gg * (1 - t) + pale[1] * t
                b = b * (1 - t) + pale[2] * t
            if hash2(xi // 2, yi // 7) > 0.97:
                r, gg, b = pore
            lum = 0.30 * r + 0.59 * gg + 0.11 * b
            r = r * 0.84 + lum * 0.16
            gg = gg * 0.84 + lum * 0.16
            b = b * 0.84 + lum * 0.16
            o = (yi * n + xi) * 4
            color[o] = srgb_to_lin(r)
            color[o + 1] = srgb_to_lin(gg)
            color[o + 2] = srgb_to_lin(b)
            color[o + 3] = 1.0

    alb = bpy.data.images.new("Oak_Albedo", width=n, height=n)
    # New images are already sRGB. Do not assign colorspace after the pixels.
    alb.pixels.foreach_set(color)
    alb.pack()
    print(f"albedo sample {alb.pixels[0]:.3f} {alb.pixels[1]:.3f} {alb.pixels[2]:.3f}")

    normal = array.array("f", [0.0]) * (n * n * 4)
    span = 4.0
    for yi in range(n):
        for xi in range(n):
            xm = max(0, xi - 1)
            xp = min(n - 1, xi + 1)
            ym = max(0, yi - 1)
            yp = min(n - 1, yi + 1)
            dx = (height[yi * n + xp] - height[yi * n + xm]) * span
            dy = (height[yp * n + xi] - height[ym * n + xi]) * span * 0.22
            nx, ny, nz = -dx, -dy, 1.0
            inv = 1.0 / math.sqrt(nx * nx + ny * ny + nz * nz)
            o = (yi * n + xi) * 4
            normal[o] = nx * inv * 0.5 + 0.5
            normal[o + 1] = ny * inv * 0.5 + 0.5
            normal[o + 2] = nz * inv * 0.5 + 0.5
            normal[o + 3] = 1.0
    nrm = bpy.data.images.new("Oak_Normal", width=n, height=n)
    nrm.colorspace_settings.name = "Non-Color"
    nrm.pixels.foreach_set(normal)
    nrm.pack()
    return alb, nrm


def principled(name: str) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def bsdf(mat: bpy.types.Material):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def set_in(node, key: str, value) -> None:
    if key in node.inputs:
        node.inputs[key].default_value = value


def make_oak(albedo: bpy.types.Image, normal: bpy.types.Image) -> bpy.types.Material:
    mat = principled("Mat_Oak")
    p = bsdf(mat)
    set_in(p, "Base Color", (*lin3((0.82, 0.76, 0.68)), 1.0))
    set_in(p, "Roughness", 0.48)
    set_in(p, "Metallic", 0.02)
    set_in(p, "Coat Weight", 0.08)
    set_in(p, "Coat Roughness", 0.42)
    nt = mat.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = albedo
    tex.location = (-420, 220)
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    ntex = nt.nodes.new("ShaderNodeTexImage")
    ntex.image = normal
    ntex.location = (-420, -80)
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.location = (-160, -80)
    set_in(nmap, "Strength", 0.38)
    nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], p.inputs["Normal"])
    return mat


def make_frost() -> bpy.types.Material:
    mat = principled("Mat_Frost")
    p = bsdf(mat)
    # Milky acrylic. Transmission so the house HDR reads through the slot.
    set_in(p, "Base Color", (*lin3((0.93, 0.94, 0.92)), 1.0))
    set_in(p, "Roughness", 0.32)
    set_in(p, "Metallic", 0.0)
    set_in(p, "Transmission Weight", 0.88)
    set_in(p, "IOR", 1.45)
    return mat


def make_metal(name: str, color: tuple[float, float, float], rough: float, metal: float) -> bpy.types.Material:
    mat = principled(name)
    p = bsdf(mat)
    set_in(p, "Base Color", (*lin3(color), 1.0))
    set_in(p, "Roughness", rough)
    set_in(p, "Metallic", metal)
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


def apply_mod(obj: bpy.types.Object, name: str) -> None:
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=name)


def uv_plan(obj: bpy.types.Object, width: float, height: float) -> None:
    """Front faces use plan X / Y so the grain runs up the leaf."""
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    uv = mesh.uv_layers.active.data
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            plan_x = co.x
            plan_y = co.z
            uv[li].uv = ((plan_x + width / 2.0) / width, (plan_y + height / 2.0) / height)


def shade_flat(obj: bpy.types.Object) -> None:
    for poly in obj.data.polygons:
        poly.use_smooth = False


def make_box(
    name: str,
    sx: float,
    sy: float,
    sz: float,
    cx: float,
    cy: float,
    cz: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=2, location=to_blender(cx, cy, cz))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx / 2.0, sz / 2.0, sy / 2.0)
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    shade_flat(obj)
    return obj


def make_cyl(
    name: str,
    radius: float,
    depth: float,
    cx: float,
    cy: float,
    cz: float,
    axis: str,
    mat: bpy.types.Material,
    verts: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius,
        depth=depth,
        vertices=verts,
        location=to_blender(cx, cy, cz),
    )
    obj = bpy.context.active_object
    obj.name = name
    if axis == "x":
        obj.rotation_euler = (0.0, math.pi / 2.0, 0.0)
    elif axis == "z":
        obj.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    assign(obj, mat)
    return obj


def bool_diff(target: bpy.types.Object, cutter: bpy.types.Object) -> None:
    mod = target.modifiers.new("bool", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    for solver in ("FLOAT", "EXACT", "MANIFOLD"):
        try:
            mod.solver = solver
            break
        except (TypeError, AttributeError, ValueError):
            continue
    apply_mod(target, "bool")
    bpy.data.objects.remove(cutter, do_unlink=True)


def light_cutter(name: str, sx: float, sy: float, cx: float, cy: float, radius: float) -> bpy.types.Object:
    cutter = make_box(name, sx, sy, T + 0.04, cx, cy, 0.0, bpy.data.materials.new("_cut"))
    bev = cutter.modifiers.new("round", "BEVEL")
    bev.width = radius
    bev.segments = 3
    bev.limit_method = "ANGLE"
    angle = math.radians(40.0)
    if hasattr(bev, "angle_limit"):
        bev.angle_limit = angle
    elif hasattr(bev, "angle"):
        bev.angle = angle
    apply_mod(cutter, "round")
    return cutter


def bevel_edges(obj: bpy.types.Object) -> None:
    bev = obj.modifiers.new("edge", "BEVEL")
    bev.width = 0.0012
    bev.segments = 2
    bev.limit_method = "ANGLE"
    angle = math.radians(35.0)
    if hasattr(bev, "angle_limit"):
        bev.angle_limit = angle
    elif hasattr(bev, "angle"):
        bev.angle = angle
    try:
        apply_mod(obj, "edge")
    except RuntimeError as exc:
        print(f"bevel skipped on {obj.name}: {exc}")
        obj.modifiers.remove(bev)


def parent_keep(parent: bpy.types.Object, child: bpy.types.Object) -> None:
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def empty_at(name: str) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    obj = bpy.context.active_object
    obj.name = name
    obj.empty_display_size = 0.08
    return obj


def add_lever(parts: list, mat: bpy.types.Material, width: float) -> None:
    """Spindle through the stile, rose and lever on both faces. Lever points inward (−X)."""
    x = width / 2.0 - 0.072
    y = -H / 2.0 + LEVER_Y
    parts.append(make_cyl("Spindle", 0.005, T + 0.012, x, y, 0.0, "z", mat, 12))
    for side, tag in ((1.0, "F"), (-1.0, "B")):
        z = side * (T / 2.0 + 0.003)
        parts.append(make_cyl(f"Rose_{tag}", 0.020, 0.005, x, y, z, "z", mat, 20))
        parts.append(
            make_cyl(
                f"Lever_{tag}",
                0.0065,
                0.102,
                x - 0.052,
                y,
                z + side * 0.006,
                "x",
                mat,
                12,
            )
        )
        parts.append(
            make_cyl(
                f"LeverEnd_{tag}",
                0.008,
                0.010,
                x - 0.100,
                y,
                z + side * 0.006,
                "x",
                mat,
                12,
            )
        )


def add_hinges(parts: list, mat: bpy.types.Material, width: float) -> None:
    """Three barrels on the −X edge (jamb / fold hinge)."""
    x = -width / 2.0
    for i, y_floor in enumerate((0.22, 0.98, 1.72)):
        parts.append(
            make_cyl(
                f"Hinge_{i}",
                0.007,
                0.078,
                x,
                -H / 2.0 + y_floor,
                0.0,
                "y",
                mat,
                12,
            )
        )


def build_leaf(
    root_name: str,
    width: float,
    light: tuple[float, float, float, float] | None,
    lever: bool,
    hinges: bool,
    oak: bpy.types.Material,
    frost: bpy.types.Material,
    chrome: bpy.types.Material,
    steel: bpy.types.Material,
) -> bpy.types.Object:
    """light = (width, height, center_x, center_y) in the leaf frame, or None."""
    root = empty_at(root_name)
    slab = make_box(f"Slab_{root_name}", width, H, T, 0.0, 0.0, 0.0, oak)
    if light is not None:
        lw, lh, cx, cy = light
        cutter = light_cutter(f"Cut_{root_name}", lw, lh, cx, cy, 0.008 if lh < 0.4 else 0.012)
        bool_diff(slab, cutter)
        glass = make_box(
            f"Glass_{root_name}",
            lw - 0.008,
            lh - 0.008,
            0.006,
            cx,
            cy,
            0.0,
            frost,
        )
        uv_plan(glass, width, H)
        parent_keep(root, glass)
    bevel_edges(slab)
    uv_plan(slab, width, H)
    shade_flat(slab)
    parent_keep(root, slab)
    extras: list[bpy.types.Object] = []
    if lever:
        add_lever(extras, chrome, width)
    if hinges:
        add_hinges(extras, steel, width)
    for obj in extras:
        parent_keep(root, obj)
    return root


def plan_bounds(obj: bpy.types.Object) -> tuple[float, float, float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    zs: list[float] = []
    for child in obj.children_recursive:
        if child.type != "MESH":
            continue
        for v in child.data.vertices:
            w = child.matrix_world @ v.co
            xs.append(w.x)
            ys.append(w.z)
            zs.append(-w.y)
    return min(xs), min(ys), min(zs), max(xs), max(ys), max(zs)


def render_sheet(roots: list[bpy.types.Object], path: str) -> None:
    for i, root in enumerate(roots):
        root.location = to_blender(i * 1.05, 0.0, 0.0)
    try:
        _render_sheet(path)
    finally:
        for root in roots:
            root.location = (0.0, 0.0, 0.0)


def _render_sheet(path: str) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 860
    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    world = bpy.data.worlds.new("PreviewWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.78, 0.76, 0.73, 1.0)
        bg.inputs[1].default_value = 0.55
    bpy.ops.object.light_add(type="SUN", location=to_blender(1.5, 3.0, 2.0))
    sun = bpy.context.active_object
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(58.0), 0.0, math.radians(-28.0))
    target = to_blender(2.1, 0.98, 0.0)
    bpy.ops.object.camera_add(location=to_blender(2.1, 0.98, 3.4))
    cam = bpy.context.active_object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 6.4
    direction = target - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.ops.render.render(write_still=True)
    print(f"preview {path}")


def main() -> None:
    out = Path(_arg("--out", "public/models/hero/standard-label-doors.glb")).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    preview = _arg("--preview", "")
    clear_scene()
    albedo, normal = make_oak_maps()
    oak = make_oak(albedo, normal)
    frost = make_frost()
    chrome = make_metal("Mat_Chrome", (0.86, 0.87, 0.88), 0.14, 1.0)
    steel = make_metal("Mat_Steel", (0.74, 0.75, 0.76), 0.32, 0.86)

    # Light slots are in the centered leaf frame (floor at −H/2).
    # LD: wide vertical acrylic, nearly full height.
    # DC: small horizontal slot in the upper third.
    # TA: smaller slot, higher — toilet privacy light.
    leaves = [
        ("Leaf_LD", W, (0.20, 1.74, 0.0, 0.0), True, True),
        ("Leaf_PA", W, None, True, True),
        ("Leaf_DC", W, (0.26, 0.14, 0.0, 0.70), True, True),
        ("Leaf_TA", W, (0.16, 0.09, 0.0, 0.78), True, True),
        ("Leaf_PH", PH_W, None, False, True),
    ]
    roots: list[bpy.types.Object] = []
    for name, width, light, lever, hinges in leaves:
        root = build_leaf(name, width, light, lever, hinges, oak, frost, chrome, steel)
        roots.append(root)
        bb = plan_bounds(root)
        print(
            f"bbox {name} "
            f"{bb[0]:.4f} {bb[1]:.4f} {bb[2]:.4f} "
            f"{bb[3]:.4f} {bb[4]:.4f} {bb[5]:.4f}"
        )

    if preview:
        try:
            render_sheet(roots, preview)
        except Exception as exc:  # noqa: BLE001 — preview is not the deliverable
            print(f"preview failed: {exc}")

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
