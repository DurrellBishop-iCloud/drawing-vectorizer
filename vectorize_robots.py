from collections import defaultdict
from pathlib import Path
import html
import math

import numpy as np
from PIL import Image, ImageFilter


SOURCE = Path("source-robots.png")
MASK_OUT = Path("robots-mask.png")
SVG_OUT = Path("robots-vector.svg")
WHITE_SVG_OUT = Path("robots-vector-white.svg")


def rdp(points, epsilon):
    if len(points) <= 2:
        return points

    start = np.array(points[0], dtype=float)
    end = np.array(points[-1], dtype=float)
    segment = end - start
    length = np.linalg.norm(segment)

    if length == 0:
        distances = [np.linalg.norm(np.array(p, dtype=float) - start) for p in points[1:-1]]
    else:
        distances = []
        for p in points[1:-1]:
            delta = np.array(p, dtype=float) - start
            area = segment[0] * delta[1] - segment[1] * delta[0]
            distances.append(abs(area / length))

    if not distances:
        return points

    index = int(np.argmax(distances)) + 1
    max_distance = distances[index - 1]

    if max_distance > epsilon:
        left = rdp(points[: index + 1], epsilon)
        right = rdp(points[index:], epsilon)
        return left[:-1] + right

    return [points[0], points[-1]]


def remove_small_components(mask, minimum_area=12):
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    cleaned = np.zeros_like(mask, dtype=bool)

    for y in range(height):
        xs = np.flatnonzero(mask[y] & ~seen[y])
        for x0 in xs:
            if seen[y, x0] or not mask[y, x0]:
                continue
            stack = [(x0, y)]
            pixels = []
            seen[y, x0] = True

            while stack:
                x, yy = stack.pop()
                pixels.append((x, yy))
                for nx, ny in ((x + 1, yy), (x - 1, yy), (x, yy + 1), (x, yy - 1)):
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and mask[ny, nx]
                        and not seen[ny, nx]
                    ):
                        seen[ny, nx] = True
                        stack.append((nx, ny))

            if len(pixels) >= minimum_area:
                for x, yy in pixels:
                    cleaned[yy, x] = True

    return cleaned


def make_mask(image):
    rgb = np.asarray(image.convert("RGB"), dtype=np.int32)
    gray = (rgb[:, :, 0] * 299 + rgb[:, :, 1] * 587 + rgb[:, :, 2] * 114) // 1000
    blurred = np.asarray(
        Image.fromarray(gray.astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(18)),
        dtype=np.int16,
    )

    dark_absolute = gray < 116
    dark_relative = (blurred - gray) > 36
    balanced_black = np.max(rgb, axis=2) - np.min(rgb, axis=2) < 46
    mask = dark_absolute & dark_relative & balanced_black

    mask_img = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    mask_img = mask_img.filter(ImageFilter.MedianFilter(3))
    mask = np.asarray(mask_img) > 0
    return remove_small_components(mask, minimum_area=10)


def mask_to_run_path(mask):
    commands = []
    height, _ = mask.shape

    for y in range(height):
        xs = np.flatnonzero(mask[y])
        if xs.size == 0:
            continue

        run_start = int(xs[0])
        previous = int(xs[0])

        for x in xs[1:]:
            x = int(x)
            if x != previous + 1:
                commands.append(f"M {run_start} {y} H {previous + 1} V {y + 1} H {run_start} Z")
                run_start = x
            previous = x

        commands.append(f"M {run_start} {y} H {previous + 1} V {y + 1} H {run_start} Z")

    return " ".join(commands), len(commands)


def build_svg(path_data, width, height, with_white_background=False):
    source_name = html.escape(SOURCE.name)
    background = f'  <rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>\n' if with_white_background else ""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Vector trace of abstract robot line drawings">
  <title>Abstract Robot Drawing Vector Trace</title>
  <desc>Black vector paths traced from {source_name}. The off-white paper background has been removed.</desc>
{background}  <g fill="#111111" fill-rule="evenodd">
    <path d="{path_data}"/>
  </g>
</svg>
'''


def write_svg(path_data, width, height):
    SVG_OUT.write_text(build_svg(path_data, width, height, with_white_background=False))
    WHITE_SVG_OUT.write_text(build_svg(path_data, width, height, with_white_background=True))


def main():
    image = Image.open(SOURCE)
    mask = make_mask(image)
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8), mode="L").save(MASK_OUT)
    path_data, run_count = mask_to_run_path(mask)
    write_svg(path_data, image.width, image.height)
    print(f"wrote {SVG_OUT} with {run_count} ink runs")
    print(f"wrote {WHITE_SVG_OUT}")
    print(f"wrote {MASK_OUT}")


if __name__ == "__main__":
    main()
