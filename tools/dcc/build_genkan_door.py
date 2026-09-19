#!/usr/bin/env python3
"""
Hero genkan door — Giesta 2 fire-door *inspired* (no trademarks).

Local space (plan Y-up after glTF Y-up export):
  hinge at origin (WEST);
  leaf extends +X (east, handle);
  +Y up;
  exterior face −Z (south / parking).

    blender --background --python tools/dcc/build_genkan_door.py -- \\
        --out public/models/hero/genkan-door.glb
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
        "  blender --background --python tools/dcc/build_genkan_door.py -- "
        "--out public/models/hero/genkan-door.glb"
    ) from exc

LEAF_W = 1.52 - 0.05 * 2
LEAF_H = 1.95 - 0.02
LEAF_T = 0.052
FRAME_W = 0.05
FRAME_T = 0.07
BEVEL = 0.0022
SLAT_N = 9
GLASS_I = (2, 4)  # 0-based slat indices that are exterior lights (toward hinge)


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
    for block in list(bpy.data.images):
        bpy.data.images.remove(block)


def to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def make_wood_image(name: str, dark: bool) -> bpy.types.Image:
    w = h = 1024
    img = bpy.data.images.new(name, width=w, height=h)
    pix = [0.0] * (w * h * 4)
    rng = random.Random(7 if dark else 11)
    for yi in range(h):
        grain = 0.5 + 0.5 * math.sin(yi * 0.085 + math.sin(yi * 0.011) * 4.0)
        for xi in range(w):
            n = rng.random() * 0.08
            band = 0.55 + 0.45 * math.sin(xi * 0.22 + grain * 1.4)
            v = max(0.0, min(1.0, band * 0.55 + n + grain * 0.08))
            if dark:
                r, g, b = 0.16 + v * 0.12, 0.09 + v * 0.07, 0.055 + v * 0.04
            else:
                r, g, b = 0.22 + v * 0.10, 0.14 + v * 0.06, 0.09 + v * 0.04
            o = (yi * w + xi) * 4
            pix[o : o + 4] = [r, g, b, 1.0]
    img.pixels = pix
    img.pack()
    return img


def principled(name: str, **kw) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    col = kw.get("color", (0.2, 0.15, 0.1, 1.0))
    p.inputs["Base Color"].default_value = col
    p.inputs["Roughness"].default_value = kw.get("roughness", 0.7)
    p.inputs["Metallic"].default_value = kw.get("metallic", 0.0)
    if "transmission" in kw and "Transmission Weight" in p.inputs:
        p.inputs["Transmission Weight"].default_value = kw["transmission"]
    if "ior" in kw and "IOR" in p.inputs:
        p.inputs["IOR"].default_value = kw["ior"]
    if kw.get("alpha", 1.0) < 0.999:
        mat.blend_method = "BLEND"
        if "Alpha" in p.inputs:
            p.inputs["Alpha"].default_value = kw["alpha"]
    if kw.get("image"):
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = kw["image"]
        tex.location = (-400, 200)
        mapn = nt.nodes.new("ShaderNodeMapping")
        mapn.inputs["Scale"].default_value = (4.0, 12.0, 1.0)
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
    if bevel > 0.0003:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = min(bevel, min(sx, sy, sz) * 0.4)
        mod.segments = 3
        mod.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="bevel")
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=1.0)
    bpy.ops.object.mode_set(mode="OBJECT")
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
) -> bpy.types.Object:
    loc = to_blender(cx, cy, cz)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=h, location=loc, vertices=24
    )
    obj = bpy.context.active_object
    obj.name = name
    if axis == "x":
        obj.rotation_euler = (0.0, 1.5708, 0.0)
    elif axis == "z":
        obj.rotation_euler = (1.5708, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=1.0)
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def parent_empty(name: str, children: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    empty = bpy.context.active_object
    empty.name = name
    for o in children:
        o.parent = empty
    return empty


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    out = Path(
        _arg("--out", str(root / "public" / "models" / "hero" / "genkan-door.glb"))
    )
    out.parent.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"
    clear_scene()

    img_ext = make_wood_image("giesta_wood_ext", True)
    img_int = make_wood_image("giesta_wood_int", True)
    mat_ext = principled("GiestaWoodExt", roughness=0.78, metallic=0.02, image=img_ext)
    mat_int = principled("GiestaWoodInt", roughness=0.82, metallic=0.0, image=img_int)
    mat_frame = principled(
        "GiestaFrame",
        color=(0.07, 0.06, 0.055, 1.0),
        roughness=0.42,
        metallic=0.55,
    )
    mat_handle = principled(
        "GiestaHandle",
        color=(0.12, 0.12, 0.12, 1.0),
        roughness=0.35,
        metallic=0.7,
    )
    mat_glass = principled(
        "GiestaGlass",
        color=(0.86, 0.88, 0.90, 1.0),
        roughness=0.18,
        metallic=0.0,
        transmission=0.82,
        ior=1.5,
        alpha=0.55,
    )
    mat_glass.blend_method = "BLEND"

    door_parts: list[bpy.types.Object] = []
    frame_parts: list[bpy.types.Object] = []

    # Leaf core
    door_parts.append(
        make_box(
            "Hero_GenkanDoor_core",
            LEAF_W,
            LEAF_H,
            LEAF_T * 0.82,
            LEAF_W / 2,
            LEAF_H / 2,
            0.0,
            BEVEL,
            mat_ext,
        )
    )
    # Interior flush skin
    door_parts.append(
        make_box(
            "Hero_GenkanDoor_intSkin",
            LEAF_W - 0.012,
            LEAF_H - 0.012,
            0.006,
            LEAF_W / 2,
            LEAF_H / 2,
            LEAF_T / 2 - 0.004,
            0.001,
            mat_int,
        )
    )

    slat_w = LEAF_W / SLAT_N
    for i in range(SLAT_N):
        cx = slat_w * (i + 0.5)
        if i in GLASS_I:
            door_parts.append(
                make_box(
                    f"Hero_GenkanGlass_ext_{i}",
                    slat_w * 0.42,
                    LEAF_H * 0.78,
                    0.01,
                    cx,
                    LEAF_H * 0.52,
                    -LEAF_T / 2 + 0.004,
                    0.0012,
                    mat_glass,
                )
            )
        else:
            door_parts.append(
                make_box(
                    f"Hero_GenkanSlat_{i}",
                    slat_w * 0.88,
                    LEAF_H - 0.04,
                    0.01,
                    cx,
                    LEAF_H / 2,
                    -LEAF_T / 2 + 0.003,
                    0.0015,
                    mat_ext,
                )
            )

    # Interior 採光 — east (handle) side, looking out = left
    door_parts.append(
        make_box(
            "Hero_GenkanGlass_int",
            0.22,
            LEAF_H * 0.72,
            0.01,
            LEAF_W - 0.20,
            LEAF_H * 0.52,
            LEAF_T / 2 - 0.003,
            0.0012,
            mat_glass,
        )
    )

    # Exterior bar handle — EAST free edge, −Z
    hx, hy = LEAF_W - 0.065, 0.92
    hz = -LEAF_T / 2 - 0.018
    door_parts.append(
        make_cyl("Hero_GenkanHandle_out", 0.011, 0.92, hx, hy, hz, "y", mat_handle)
    )
    door_parts.append(
        make_cyl(
            "Hero_GenkanHandle_out_a",
            0.007,
            0.028,
            hx,
            hy + 0.36,
            hz + 0.01,
            "z",
            mat_handle,
        )
    )
    door_parts.append(
        make_cyl(
            "Hero_GenkanHandle_out_b",
            0.007,
            0.028,
            hx,
            hy - 0.36,
            hz + 0.01,
            "z",
            mat_handle,
        )
    )
    # Interior lever — east
    door_parts.append(
        make_box(
            "Hero_GenkanHandle_in",
            0.12,
            0.018,
            0.028,
            LEAF_W - 0.09,
            0.95,
            LEAF_T / 2 + 0.016,
            0.002,
            mat_handle,
        )
    )
    door_parts.append(
        make_cyl(
            "Hero_GenkanHandle_in_post",
            0.008,
            0.022,
            LEAF_W - 0.055,
            0.95,
            LEAF_T / 2 + 0.006,
            "z",
            mat_handle,
        )
    )

    # Hinge knuckles — west
    for i, hyk in enumerate((0.22, 0.95, 1.68)):
        door_parts.append(
            make_cyl(
                f"Hero_GenkanHinge_{i}",
                0.012,
                0.09,
                0.006,
                hyk,
                0.0,
                "y",
                mat_frame,
            )
        )

    # Frame: west (hinge), east, head, sill
    frame_parts.append(
        make_box(
            "frame-west",
            FRAME_W,
            LEAF_H + FRAME_W,
            FRAME_T,
            -FRAME_W / 2,
            LEAF_H / 2,
            0.0,
            0.002,
            mat_frame,
        )
    )
    frame_parts.append(
        make_box(
            "frame-east",
            FRAME_W,
            LEAF_H + FRAME_W,
            FRAME_T,
            LEAF_W + FRAME_W / 2,
            LEAF_H / 2,
            0.0,
            0.002,
            mat_frame,
        )
    )
    frame_parts.append(
        make_box(
            "frame-head",
            LEAF_W + FRAME_W * 2,
            FRAME_W,
            FRAME_T,
            LEAF_W / 2,
            LEAF_H + FRAME_W / 2,
            0.0,
            0.002,
            mat_frame,
        )
    )
    frame_parts.append(
        make_box(
            "frame-sill",
            LEAF_W + FRAME_W * 2,
            0.02,
            FRAME_T * 1.05,
            LEAF_W / 2,
            0.008,
            0.0,
            0.0015,
            mat_frame,
        )
    )

    door = parent_empty("Hero_GenkanDoor", door_parts)
    door["hinge"] = True
    door["hingeSide"] = "west"
    door["handleSide"] = "east"
    frame = parent_empty("Hero_GenkanFrame", frame_parts)
    frame["static"] = True
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root_obj = bpy.context.active_object
    root_obj.name = "Hero_GenkanPortal"
    door.parent = root_obj
    frame.parent = root_obj

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
