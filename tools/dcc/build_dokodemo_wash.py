#!/usr/bin/env python3
"""
2F wall handwash — どこでも手洗 inspired, no LIXIL / INAX marks on the mesh.

SMA-300NT (600) counter + vessel + tall single-lever (LF-SR20 inspired).

Local space after glTF Y-up (plan metres):
  origin = front edge centre, on the finished floor (room side)
  +X along the counter (faucet end), +Y up, +Z toward the wall
  counter 0.60 × 0.35 × 0.030, top at 0.78

    blender --background --python tools/dcc/build_dokodemo_wash.py -- \\
        --out public/models/hero/dokodemo-wash.glb
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
        "  blender --background --python tools/dcc/build_dokodemo_wash.py -- "
        "--out public/models/hero/dokodemo-wash.glb"
    ) from exc

W = 0.60
D = 0.35
T = 0.030
TOP = 0.78
BOWL_X = -0.04
BOWL_Z = 0.16
FAUCET_X = 0.15
FAUCET_Z = 0.18


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
    rng = random.Random(23 if kind == "wood" else 9)
    for yi in range(n):
        for xi in range(n):
            o = (yi * n + xi) * 4
            if kind == "wood":
                g = 0.5 + 0.5 * math.sin(yi * 0.11 + math.sin(xi * 0.02) * 3.0)
                nse = (rng.random() - 0.5) * 0.04
                r = 0.42 + g * 0.12 + nse
                gg = 0.28 + g * 0.08 + nse
                b = 0.14 + g * 0.04
            else:
                nse = (rng.random() - 0.5) * 0.02
                r = gg = b = 0.96 + nse
            pix[o : o + 4] = (r, gg, b, 1.0)
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
        p.inputs["Coat Roughness"].default_value = 0.06
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


def shade_smooth(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(50))
    except Exception:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def uv_cube(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=0.6)
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
        mod.width = min(bevel, min(sx, sy, sz) * 0.4)
        mod.segments = 3
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
    shade_smooth(obj)
    return obj


def bool_diff(target: bpy.types.Object, cutter: bpy.types.Object) -> None:
    mod = target.modifiers.new("bool", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "FLOAT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="bool")
    bpy.data.objects.remove(cutter, do_unlink=True)


def build() -> None:
    img_w = make_image("wood", "wood")
    img_c = make_image("ceramic", "ceramic")
    mat_wood = pbr("Mat_Wood", (0.45, 0.32, 0.18, 1), 0.52, 0.02, img_w)
    mat_bowl = pbr("Mat_Bowl", (0.96, 0.95, 0.93, 1), 0.14, 0.02, img_c, coat=0.55)
    mat_inner = pbr("Mat_Inner", (0.90, 0.91, 0.90, 1), 0.18, 0.02, coat=0.3)
    mat_chrome = pbr("Mat_Chrome", (0.78, 0.80, 0.82, 1), 0.12, 1.0)
    mat_mirror = pbr("Mat_Mirror", (0.86, 0.88, 0.90, 1), 0.05, 0.92)
    mat_frame = pbr("Mat_Frame", (0.22, 0.20, 0.18, 1), 0.45, 0.08)

    parts: list[bpy.types.Object] = []

    parts.append(
        make_box(
            "Hero_DokodemoCounter",
            W - 0.004,
            T,
            D - 0.004,
            0.0,
            TOP - T / 2,
            D / 2,
            mat_wood,
            0.004,
            True,
        )
    )

    # Vessel sitting on the deck (photo: full bowl above the wood)
    by = TOP + 0.055
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.155,
        segments=48,
        ring_count=24,
        location=to_blender(BOWL_X, by, BOWL_Z),
    )
    bowl = bpy.context.active_object
    bowl.name = "Hero_DokodemoBowl"
    bowl.scale = (1.05, 1.05, 0.58)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.128,
        segments=40,
        ring_count=20,
        location=to_blender(BOWL_X, by + 0.02, BOWL_Z),
    )
    inner = bpy.context.active_object
    inner.scale = (1.02, 1.02, 0.55)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bool_diff(bowl, inner)
    assign(bowl, mat_bowl)
    shade_smooth(bowl)
    parts.append(bowl)
    parts.append(
        make_cyl("BowlFoot", 0.055, 0.012, BOWL_X, TOP + 0.006, BOWL_Z, "y", mat_bowl, 24)
    )
    parts.append(
        make_cyl("Drain", 0.012, 0.008, BOWL_X, TOP + 0.02, BOWL_Z, "y", mat_chrome, 16)
    )

    # Tall single-lever, spout toward the bowl (−X)
    base_y = TOP
    parts.append(make_cyl("Hero_DokodemoFaucet_base", 0.028, 0.012, FAUCET_X, base_y + 0.006, FAUCET_Z, "y", mat_chrome, 24))
    parts.append(make_cyl("Hero_DokodemoFaucet_body", 0.016, 0.22, FAUCET_X, base_y + 0.12, FAUCET_Z, "y", mat_chrome, 24))
    parts.append(make_cyl("Hero_DokodemoFaucet_collar", 0.020, 0.016, FAUCET_X, base_y + 0.225, FAUCET_Z, "y", mat_chrome, 20))
    spout_y = base_y + 0.205
    parts.append(
        make_cyl(
            "Hero_DokodemoFaucet_spout",
            0.009,
            0.145,
            FAUCET_X - 0.07,
            spout_y,
            FAUCET_Z,
            "x",
            mat_chrome,
            16,
        )
    )
    tip_x = FAUCET_X - 0.145
    tip_y = spout_y - 0.01
    parts.append(make_cyl("Hero_DokodemoFaucet_tip", 0.010, 0.016, tip_x, tip_y, FAUCET_Z, "y", mat_chrome, 12))
    parts.append(make_box("Hero_DokodemoFaucet_lever", 0.055, 0.008, 0.012, FAUCET_X + 0.01, base_y + 0.242, FAUCET_Z, mat_chrome, 0.001, True))
    print(f"stream_tip {tip_x:.4f} {tip_y:.4f} {FAUCET_Z:.4f}")

    # Bottle trap under the bowl, arm into the wall
    parts.append(make_cyl("Tail", 0.014, 0.08, BOWL_X, TOP - T - 0.04, BOWL_Z, "y", mat_chrome, 16))
    parts.append(make_cyl("Hero_DokodemoTrap", 0.028, 0.14, BOWL_X, TOP - 0.18, BOWL_Z, "y", mat_chrome, 20))
    parts.append(make_cyl("TrapNut", 0.02, 0.012, BOWL_X, TOP - 0.10, BOWL_Z, "y", mat_chrome, 16))
    parts.append(make_cyl("TrapArm", 0.012, D - BOWL_Z - 0.02, BOWL_X, TOP - 0.16, (BOWL_Z + D) / 2, "z", mat_chrome, 14))

    # Wall stop + rise to the faucet (photo right side)
    parts.append(make_cyl("StopBody", 0.016, 0.028, 0.20, 0.48, D - 0.02, "z", mat_chrome, 16))
    parts.append(make_cyl("StopKnob", 0.012, 0.012, 0.20, 0.48, D - 0.045, "z", mat_chrome, 12))
    parts.append(make_cyl("SupplyRise", 0.006, 0.28, FAUCET_X, 0.62, D - 0.03, "y", mat_chrome, 10))
    parts.append(make_cyl("SupplyBend", 0.006, 0.06, (FAUCET_X + 0.20) / 2, 0.48, D - 0.03, "x", mat_chrome, 10))

    for bx in (-0.18, 0.18):
        parts.append(make_box(f"Bracket_{bx}", 0.04, 0.012, 0.08, bx, TOP - T - 0.008, D - 0.06, mat_chrome, 0.001, True))
        parts.append(make_box(f"BracketWall_{bx}", 0.04, 0.04, 0.008, bx, TOP - T - 0.02, D - 0.012, mat_chrome, 0.0, True))

    # Slim wall mirror above the counter (catalog sheet). Glass is Mat_Mirror.
    my0, my1 = 1.10, 1.58
    parts.append(make_box("MirrorFrame", 0.28, my1 - my0, 0.018, -0.02, (my0 + my1) / 2, D - 0.01, mat_frame, 0.002, True))
    parts.append(
        make_box(
            "Hero_DokodemoMirror",
            0.24,
            (my1 - my0) - 0.028,
            0.006,
            -0.02,
            (my0 + my1) / 2,
            D - 0.02,
            mat_mirror,
        )
    )

    # Inner glaze disc so the cavity reads wet under the HDR
    parts.append(
        make_cyl("BowlPool", 0.07, 0.004, BOWL_X, TOP + 0.045, BOWL_Z, "y", mat_inner, 24)
    )

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.active_object
    root.name = "Hero_DokodemoWash"
    for obj in parts:
        obj.parent = root
        obj.matrix_parent_inverse = root.matrix_world.inverted()


def main() -> None:
    out = Path(_arg("--out", "public/models/hero/dokodemo-wash.glb")).resolve()
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
