#!/usr/bin/env python3
"""Patch korender-desktop 0.7.0 for an Apple OpenGL 4.1 core context.

lwjgl3-awt 0.2.4 (PlatformMacOSXGLCanvas) picks the NSOpenGL profile like this:
  Profile.CORE            -> 3.2 core (GLSL 1.50; rejects #version 330 and 410)
  Profile.COMPATIBILITY   -> legacy 2.1 (no glBindBufferBase; Korender aborts)
  profile == null, major >= 4 -> 4.1 core

Korender 0.7 writes major=3, minor=3, profile=COMPATIBILITY. On macOS that
falls back to 2.1 and crashes in glBindBufferBase. This script copies the
published jar and changes only the desktop copy:

  - request OpenGL 4.1 with a null profile (the 4.1-core branch)
  - desktop shader header #version 330 -> #version 410
  - identity.frag: gl_FragColor is gone in GLSL 410 core

The Gradle cache is read and never written. The Wasm jar is not an input.
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

CLASS_ENTRY = "com/zakgof/korender/JvmPlatformKt.class"
SHADER_ENTRY = "com/zakgof/korender/impl/glgpu/GlGpuShader.class"
HEADER_ENTRY = (
    "composeResources/com.zakgof.korender.resources/files/shader/lib/header.glsl"
)
IDENTITY_ENTRY = (
    "composeResources/com.zakgof.korender.resources/files/shader/effect/identity.frag"
)

# aload_5; iconst_3; putfield major;
# aload_5; iconst_3; putfield minor;
# aload_5; getstatic COMPATIBILITY; putfield profile;
# aload_5; iconst_1; putfield samples;
# aload_5; bipush 24; putfield depthSize
# Constant-pool indexes are from korender-desktop 0.7.0 (getstatic #476).
OLD_GL = bytes.fromhex(
    "19 05 06 b5 01 d3"
    "19 05 06 b5 01 d6"
    "19 05 b2 01 dc b5 01 df"
    "19 05 04 b5 01 e2"
    "19 05 10 18 b5 01 e5"
)
# major iconst_4, minor iconst_1, profile aconst_null; nop; nop
NEW_GL = bytes.fromhex(
    "19 05 07 b5 01 d3"
    "19 05 04 b5 01 d6"
    "19 05 01 00 00 b5 01 df"
    "19 05 04 b5 01 e2"
    "19 05 10 18 b5 01 e5"
)


# Apple's 4.1 linker writes "WARNING: Output of vertex shader 'vtex' not read
# by fragment shader" into the program info log even when GL_LINK_STATUS is
# true. Korender throws on any non-empty log. These three sites are the
# warning throws that run only after compile and link status have succeeded.
# iconst_1 -> iconst_0 makes the following ifeq always skip the throw.
OLD_WARN = bytes.fromhex("04 a7 00 04 03 99 00 12 bb 00 c2")
NEW_WARN = bytes.fromhex("03 a7 00 04 03 99 00 12 bb 00 c2")


def patch_shader(data: bytes) -> bytes:
    count = data.count(OLD_WARN)
    if count != 3:
        raise SystemExit(f"{SHADER_ENTRY}: expected 3 info-log warning throws, found {count}")
    return data.replace(OLD_WARN, NEW_WARN)


def patch_class(data: bytes) -> bytes:
    count = data.count(OLD_GL)
    if count != 1:
        raise SystemExit(f"{CLASS_ENTRY}: expected 1 GLData setup, found {count}")
    if len(OLD_GL) != len(NEW_GL):
        raise SystemExit("GLData patch changed bytecode length")
    return data.replace(OLD_GL, NEW_GL, 1)


def patch_header(data: bytes) -> bytes:
    # Upstream shaders are CRLF. #version must be the first column so Apple
    # accepts it after the preprocessor drops the #ifdef line.
    old = b"    #version 330\r\n"
    new = b"#version 410\r\n"
    count = data.count(old)
    if count != 1:
        raise SystemExit(f"{HEADER_ENTRY}: expected 1 indented #version 330, found {count}")
    return data.replace(old, new, 1)


def patch_identity(data: bytes) -> bytes:
    old = b"void main() {\r\n    gl_FragColor = texture(colorInputTexture, vtex);\r\n"
    new = (
        b"out vec4 fragColor;\r\n\r\n"
        b"void main() {\r\n"
        b"    fragColor = texture(colorInputTexture, vtex);\r\n"
    )
    count = data.count(old)
    if count != 1:
        raise SystemExit(f"{IDENTITY_ENTRY}: expected 1 gl_FragColor write, found {count}")
    return data.replace(old, new, 1)


PATCHERS = {
    CLASS_ENTRY: patch_class,
    SHADER_ENTRY: patch_shader,
    HEADER_ENTRY: patch_header,
    IDENTITY_ENTRY: patch_identity,
}


def patch_jar(source: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(
        dest, "w"
    ) as out:
        for info in src.infolist():
            payload = src.read(info.filename)
            if info.filename in PATCHERS:
                payload = PATCHERS[info.filename](payload)
                seen.add(info.filename)
            # ZipInfo from the source keeps timestamps. Compression follows
            # the new archive default so a rewritten entry stays valid.
            out.writestr(info, payload)
    missing = set(PATCHERS) - seen
    if missing:
        raise SystemExit(f"jar is missing {sorted(missing)}")
    verify(dest)


def verify(dest: Path) -> None:
    with zipfile.ZipFile(dest, "r") as jar:
        klass = jar.read(CLASS_ENTRY)
        shader = jar.read(SHADER_ENTRY)
        header = jar.read(HEADER_ENTRY)
        identity = jar.read(IDENTITY_ENTRY)
    if OLD_GL in klass or NEW_GL not in klass:
        raise SystemExit("patched class does not request OpenGL 4.1 with a null profile")
    if OLD_WARN in shader or shader.count(NEW_WARN) != 3:
        raise SystemExit("patched shader class still throws on info-log warnings")
    if b"#version 330" in header or b"#version 410\r\n" not in header:
        raise SystemExit("patched header is not #version 410")
    if b"gl_FragColor" in identity or b"out vec4 fragColor;" not in identity:
        raise SystemExit("patched identity.frag still writes gl_FragColor")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(f"usage: {sys.argv[0]} SOURCE.jar DEST.jar")
    source = Path(sys.argv[1])
    dest = Path(sys.argv[2])
    if not source.is_file():
        raise SystemExit(f"missing source jar: {source}")
    patch_jar(source, dest)
    print(f"patched {source.name} -> {dest}")


if __name__ == "__main__":
    main()
