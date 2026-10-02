#!/usr/bin/env python3
"""
SK Kaken Bell Art — pattern トラバーチン, color AC-2166.

Tileable PBR maps from the owner swatch
docs/refs/images/outlook-paint-1.jpg. No brand marks.

The swatch is kept (it is the finish). A periodic-smooth decomposition
removes the low-frequency border step, then a ragged copy covers the
remaining straight seam so the wall does not read as panels. Albedo stays
in the swatch's sRGB; the normal only adds the raking relief the photo
already implies. 艶消し roughness. Metalness 0.

    blender --background --python tools/dcc/build_bellart_travertine.py -- \\
        --src docs/refs/images/outlook-paint-1.jpg \\
        --out public/textures/bellart-travertine
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

# Median sRGB of the swatch center crop.
AC2166 = np.array([142, 115, 99], np.float32) / 255.0
# One tile across the photo's width. Height follows the pixel aspect.
TILE_U_M = 0.50


def _args() -> dict:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = argv[1:]
    out = {
        "src": "docs/refs/images/outlook-paint-1.jpg",
        "out": "public/textures/bellart-travertine",
        "preview": "",
    }
    i = 0
    while i < len(argv):
        if argv[i] == "--src":
            out["src"] = argv[i + 1]
            i += 2
        elif argv[i] == "--out":
            out["out"] = argv[i + 1]
            i += 2
        elif argv[i] == "--preview":
            out["preview"] = argv[i + 1]
            i += 2
        else:
            i += 1
    return out


def load_rgb(path: Path) -> np.ndarray:
    """Top-row-first sRGB float HxWx3 in 0..1 (encoded, not linear)."""
    try:
        from PIL import Image

        im = Image.open(path).convert("RGB")
        return np.asarray(im).astype(np.float32) / 255.0
    except ImportError:
        import bpy

        img = bpy.data.images.load(str(path), check_existing=False)
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
        return np.flipud(px[:, :, :3]).copy()


def save_u8(path: Path, rgb: np.ndarray, *, kind: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    u8 = np.clip(np.round(rgb * 255.0), 0, 255).astype(np.uint8)
    try:
        from PIL import Image

        im = Image.fromarray(u8, "RGB")
        if kind == "jpeg":
            im.save(path, quality=93, subsampling=0, optimize=True)
        else:
            im.save(path, optimize=True)
        return
    except ImportError:
        pass
    import bpy

    h, w, _ = rgb.shape
    alpha = np.ones((h, w, 1), np.float32)
    rgba = np.concatenate([np.clip(rgb, 0, 1), alpha], axis=2)
    rgba = np.flipud(rgba)
    img = bpy.data.images.new(path.stem, w, h, alpha=True, float_buffer=False)
    # Tag before writing. Blender 5 clears pixels if colorspace is set after.
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(rgba.reshape(-1))
    img.filepath_raw = str(path)
    img.file_format = "JPEG" if kind == "jpeg" else "PNG"
    if kind == "jpeg":
        bpy.context.scene.render.image_settings.quality = 93
    img.save()


def perdecomp(img: np.ndarray) -> np.ndarray:
    """Moisan periodic-plus-smooth. Keeps fissures; drops the border step."""
    ny, nx, _ = img.shape
    out = np.empty_like(img)
    y = np.arange(ny)
    x = np.arange(nx)
    fy = np.cos(2 * np.pi * y / ny)
    fx = np.cos(2 * np.pi * x / nx)
    denom = 2.0 - fx[None, :] - fy[:, None]
    denom[0, 0] = 2.0
    for c in range(3):
        ch = img[:, :, c]
        v = np.zeros((ny, nx), np.float64)
        v[0, :] = ch[0, :] - ch[-1, :]
        v[-1, :] = -v[0, :]
        v[:, 0] += ch[:, 0] - ch[:, -1]
        v[:, -1] += -ch[:, 0] + ch[:, -1]
        smooth = np.fft.ifft2(np.fft.fft2(v) * 0.5 / denom).real
        out[:, :, c] = ch - smooth
    return out.astype(np.float32)


def periodic_noise(n: int, cells: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    g = rng.random(cells).astype(np.float32)
    t = np.linspace(0, cells, n, endpoint=False)
    i0 = np.floor(t).astype(np.int32) % cells
    f = t - np.floor(t)
    s = f * f * (3 - 2 * f)
    return g[i0] * (1 - s) + g[(i0 + 1) % cells] * s


def _ragged_vertical(img: np.ndarray, amplitude: float, seed: int) -> np.ndarray:
    """Slide a left-hand copy across the center seam on a wandering boundary."""
    out = img.copy()
    h, w, _ = img.shape
    cx = w // 2
    n = periodic_noise(h, 14, seed)
    n2 = periodic_noise(h, 48, seed + 3)
    boundary = cx + (n - 0.5) * amplitude * 2.0 + (n2 - 0.5) * amplitude * 0.45
    boundary = np.clip(boundary, cx - amplitude - 8, cx + amplitude + 8)
    shift = int(amplitude + 34)
    feather = 26
    ramp = np.linspace(0, 1, feather, dtype=np.float32)
    ramp = ramp * ramp * (3 - 2 * ramp)
    for y in range(h):
        b = int(boundary[y])
        left = b - shift
        if left < 2 or b + feather >= w - 2:
            continue
        xs = np.arange(left, b + 1)
        out[y, xs] = img[y, xs - shift]
        xf = b + 1 + np.arange(feather)
        covered = out[y, xf]
        orig = img[y, xf]
        s = ramp[:, None]
        out[y, xf] = covered * (1 - s) + orig * s
    return out


def _ragged_horizontal(img: np.ndarray, amplitude: float, seed: int) -> np.ndarray:
    out = img.copy()
    h, w, _ = img.shape
    cy = h // 2
    n = periodic_noise(w, 14, seed)
    n2 = periodic_noise(w, 48, seed + 5)
    boundary = cy + (n - 0.5) * amplitude * 2.0 + (n2 - 0.5) * amplitude * 0.45
    boundary = np.clip(boundary, cy - amplitude - 8, cy + amplitude + 8)
    shift = int(amplitude + 34)
    feather = 26
    ramp = np.linspace(0, 1, feather, dtype=np.float32)
    ramp = ramp * ramp * (3 - 2 * ramp)
    for x in range(w):
        b = int(boundary[x])
        top = b - shift
        if top < 2 or b + feather >= h - 2:
            continue
        ys = np.arange(top, b + 1)
        out[ys, x] = img[ys - shift, x]
        yf = b + 1 + np.arange(feather)
        covered = out[yf, x]
        orig = img[yf, x]
        s = ramp[:, None]
        out[yf, x] = covered * (1 - s) + orig * s
    return out


def make_tileable(img: np.ndarray) -> np.ndarray:
    img = perdecomp(img)
    h, w, _ = img.shape
    rolled = np.roll(np.roll(img, h // 2, axis=0), w // 2, axis=1)
    # Amplitude stays inside the frame so the outer pixels (the real interior)
    # keep the natural neighbor match that makes the tile periodic.
    amp = min(w, h) * 0.055
    rolled = _ragged_vertical(rolled, amp, seed=4)
    rolled = _ragged_horizontal(rolled, amp, seed=11)
    return np.clip(rolled, 0, 1).astype(np.float32)


def gaussian_wrap(ch: np.ndarray, sigma: float) -> np.ndarray:
    if sigma < 0.2:
        return ch
    h, w = ch.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2.0 * (np.pi**2) * (sigma**2) * (fx * fx + fy * fy))
    return np.fft.ifft2(np.fft.fft2(ch) * g).real.astype(np.float32)


def grade(rgb: np.ndarray) -> np.ndarray:
    """Lock the mean on AC-2166. Do not crush the swatch contrast."""
    out = rgb + (AC2166 - rgb.mean(axis=(0, 1)))
    return np.clip(out, 0, 1).astype(np.float32)


def height_field(rgb: np.ndarray) -> np.ndarray:
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    low = gaussian_wrap(lum, 18.0)
    mid = gaussian_wrap(lum, 1.8)
    fissure = mid - low
    grit = lum - mid
    h = fissure * 1.15 + grit * 0.22
    h -= h.mean()
    return h.astype(np.float32)


def normals_from_height(h: np.ndarray, strength: float) -> np.ndarray:
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    dy_down = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    # Row 0 is the top of the file. Three.js flipY maps that row to +V.
    # n = normalize((-dH/dU, -dH/dV, 1)) with dH/dV = -dy_down.
    nx = -dx * strength
    ny = dy_down * strength
    nz = np.ones_like(h)
    n = np.stack([nx, ny, nz], axis=2)
    n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-8
    return n


def roughness_from_height(h: np.ndarray) -> np.ndarray:
    """艶消し. Pits slightly rougher; raised sand stays matte."""
    hn = h - np.percentile(h, 2)
    hn /= np.percentile(h, 98) - np.percentile(h, 2) + 1e-8
    hn = np.clip(hn, 0, 1)
    r = 0.91 + (1.0 - hn) * 0.06
    r = np.clip(r, 0.86, 0.98)
    return np.stack([r, r, r], axis=2).astype(np.float32)


def shade(albedo: np.ndarray, normal: np.ndarray) -> np.ndarray:
    lin = np.clip(albedo, 0, 1) ** 2.2
    light = np.array([0.32, 0.58, 0.75], np.float32)
    light /= np.linalg.norm(light)
    ndotl = np.clip(normal @ light, 0, 1)
    lit = lin * (0.42 + 0.78 * ndotl[..., None])
    return np.clip(lit, 0, 1) ** (1 / 2.2)


def contact(src: np.ndarray, albedo: np.ndarray, shaded: np.ndarray) -> np.ndarray:
    side = 700

    def fit(im: np.ndarray) -> np.ndarray:
        h, w, _ = im.shape
        if h > w:
            y0 = (h - w) // 2
            im = im[y0 : y0 + w]
        elif w > h:
            x0 = (w - h) // 2
            im = im[:, x0 : x0 + h]
        ys = np.linspace(0, im.shape[0] - 1, side).astype(np.int32)
        xs = np.linspace(0, im.shape[1] - 1, side).astype(np.int32)
        return im[ys][:, xs]

    ref = fit(src)
    alb = fit(np.tile(albedo, (2, 2, 1)))
    sh = fit(np.tile(shaded, (2, 2, 1)))
    return np.concatenate([ref, alb, sh], axis=1)


def main() -> None:
    opt = _args()
    root = Path(__file__).resolve().parents[2]
    src_path = Path(opt["src"])
    if not src_path.is_absolute():
        src_path = root / src_path
    out_dir = Path(opt["out"])
    if not out_dir.is_absolute():
        out_dir = root / out_dir

    print(f"bellart src {src_path}", flush=True)
    src = load_rgb(src_path)
    m = 8
    src = src[m : src.shape[0] - m, m : src.shape[1] - m]
    print(f"  source {src.shape[1]}×{src.shape[0]}", flush=True)
    albedo = grade(make_tileable(src))
    hgt = height_field(albedo)
    normal = normals_from_height(hgt, strength=4.2)
    rough = roughness_from_height(hgt)
    mean = albedo.mean(axis=(0, 1))
    hex_s = "#%02x%02x%02x" % tuple(np.clip(np.round(mean * 255), 0, 255).astype(int))
    print(f"  albedo mean {hex_s}  size {albedo.shape[1]}×{albedo.shape[0]}", flush=True)

    save_u8(out_dir / "albedo.jpg", albedo, kind="jpeg")
    save_u8(out_dir / "normal.png", normal * 0.5 + 0.5, kind="png")
    save_u8(out_dir / "roughness.jpg", rough, kind="jpeg")
    tile_v = TILE_U_M * (albedo.shape[0] / albedo.shape[1])
    meta = {
        "product": "SK Kaken Bell Art",
        "productUrl": "https://www.sk-kaken.co.jp/product/exterior-finish-materials/bellart/",
        "pattern": "トラバーチン",
        "color": "AC-2166",
        "srgbHex": "#8e7363",
        "albedoMeanHex": hex_s,
        "width": int(albedo.shape[1]),
        "height": int(albedo.shape[0]),
        "tileUM": TILE_U_M,
        "tileVM": round(tile_v, 4),
        "metalness": 0,
        "roughnessCenter": 0.93,
        "source": "docs/refs/images/outlook-paint-1.jpg",
        "appearance": "docs/refs/images/outlook-paint-2.jpg",
    }
    (out_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {out_dir}", flush=True)
    if opt["preview"]:
        prev = Path(opt["preview"])
        if not prev.is_absolute():
            prev = root / prev
        save_u8(prev, contact(src, albedo, shade(albedo, normal)), kind="png")
        print(f"preview {prev}", flush=True)


if __name__ == "__main__":
    main()
