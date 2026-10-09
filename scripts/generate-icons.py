#!/usr/bin/env python3
"""Generate simple Android/PWA PNG icons without extra Python packages."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
BG = (14, 17, 22, 255)
RED = (232, 33, 39, 255)


def png(width: int, height: int, rgba: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def draw(size: int, maskable: bool) -> bytes:
    pixels = bytearray(size * size * 4)
    inset = int(size * (0.12 if maskable else 0.08))
    radius = size // 5

    def set_px(x: int, y: int, color: tuple[int, int, int, int]) -> None:
        i = (y * size + x) * 4
        pixels[i : i + 4] = bytes(color)

    def in_rounded_rect(x: int, y: int, left: int, top: int, right: int, bottom: int, r: int) -> bool:
        if left + r <= x <= right - r and top <= y <= bottom:
            return True
        if left <= x <= right and top + r <= y <= bottom - r:
            return True
        corners = (
            (left + r, top + r),
            (right - r, top + r),
            (left + r, bottom - r),
            (right - r, bottom - r),
        )
        return any((x - cx) ** 2 + (y - cy) ** 2 <= r * r for cx, cy in corners)

    for y in range(size):
        for x in range(size):
            if in_rounded_rect(x, y, inset, inset, size - 1 - inset, size - 1 - inset, radius):
                set_px(x, y, BG)
            else:
                set_px(x, y, (0, 0, 0, 0) if not maskable else BG)

    bar_top = int(size * 0.42)
    bar_h = max(6, size // 16)
    bar_left = int(size * 0.28)
    bar_right = int(size * 0.72)
    for y in range(bar_top, bar_top + bar_h):
        for x in range(bar_left, bar_right):
            set_px(x, y, RED)
    pin_x = size // 2
    for y in range(bar_top + bar_h, int(size * 0.68)):
        for x in range(pin_x - bar_h // 2, pin_x + bar_h // 2 + 1):
            set_px(x, y, RED)

    return png(size, size, bytes(pixels))


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / "icon-192.png").write_bytes(draw(192, False))
    (ROOT / "icon-512.png").write_bytes(draw(512, False))
    (ROOT / "icon-maskable-192.png").write_bytes(draw(192, True))
    (ROOT / "icon-maskable-512.png").write_bytes(draw(512, True))
    (ROOT / "apple-touch-icon.png").write_bytes(draw(180, False))
    print(f"Wrote icons in {ROOT}")


if __name__ == "__main__":
    main()
