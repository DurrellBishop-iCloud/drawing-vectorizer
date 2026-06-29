# Drawing Vectorizer — notes for LLMs

Static, dependency-free browser app that turns a photo of a hand-drawn line
drawing into a clean **centerline SVG**. No build step, no server, no npm.
Deployed as a static site via **GitHub Pages** (`.nojekyll` present). Everything
runs client-side in vanilla JS.

## Files
- `index.html` — UI shell (controls panel + workspace previews). Loads `styles.css` and `app.js` with `?v=` cache-busting query strings.
- `app.js` — the entire app (~2.7k lines): image load, ink detection, bitmap editing, skeletonization, path tracing, SVG output. No modules, no framework.
- `styles.css` — responsive layout; mobile-fullscreen editor states.
- `vectorize_robots.py` — standalone Python prototype (PIL/NumPy). A **fill-based** tracer (pixel runs → filled rectangles), the precursor to the JS centerline approach. Not used by the web app at runtime; it produced the `robots-*` sample assets.
- `source-robots.png` + `robots-*.{png,svg}` — sample image (used by the "Sample" button) and pre-rendered outputs.

## Pipeline (all in app.js)
User flow is **Load → (Edit) → Vector → SVG**:
1. **Ink detection** (`buildGrayAndInk`) — grayscale; a pixel is ink if dark absolutely (`absoluteThreshold`), darker than its blurred neighborhood (`relativeThreshold`, via integral-image `boxBlur`), and color-neutral (`balancedBlack`). Optional `medianFilter`.
2. **Speck removal** (`removeSmallComponents`) — flood-fill connected components, drop ones below `minimumArea`.
3. **Bitmap editing** (optional) — Erase brush + Lasso ("keep area") with undo stack, pinch-zoom/pan; touch-tuned for iPhone.
4. **Skeletonization** (`skeletonize`) — thins strokes to 1px centerlines. **See gotcha below.**
5. **Path tracing** (`traceCenterlinePaths`) — walks the skeleton graph from junctions/endpoints into polylines; handles closed loops; simplifies with Ramer–Douglas–Peucker (`simplifyPath`).
6. **Cleanup** (`applyPathCleanups`) — optional join-aligned-gaps, snap-nearby-endpoints, Chaikin-style smoothing.
7. **SVG output** (`buildSvg`) — stroke-based centerline paths (`strokeWidth`), optional white background.

Settings persist to `localStorage` (`SETTINGS_KEY`); "Copy Settings" exports JSON. "Tweak compare" keeps a black baseline trace and overlays a red preview while you adjust sliders.

## GOTCHA: diagonal "staircase triangle" artifact
**Symptom:** vectorizing produces *repeating little triangles in a line* along diagonal strokes (horizontals/verticals stay clean).

**Cause:** classic limitation of **Zhang-Suen** thinning — it cannot reduce a diagonal stroke below **2 pixels wide**, leaving a staircase. When the skeleton is then traced by connecting every 8-neighbor, each staircase step is 3 mutually-adjacent pixels = a triangle. So a diagonal becomes a row of triangles. Tell-tale: the artifact is diagonal-only.

**Fix (already applied, 2026-06-29):** `skeletonize()` now uses **Guo-Hall** thinning instead of Zhang-Suen. Same `p2`–`p9` pixel layout, same loop/2-substep structure and 80-pass cap, same `Uint8Array` in/out signature — only the per-pixel deletion test changed (connectivity number + Guo-Hall `count` + parity `keep` condition). Measured on the `robots-mask` sample: diagonal triangles dropped from 2,911 (Zhang-Suen) to 35 (Guo-Hall), ~99.8%. Do NOT revert to Zhang-Suen without re-introducing this bug.

If triangles ever reappear despite Guo-Hall, the cheap net is a postprocess in `applyPathCleanups` that detects tiny closed 3-point loops (perimeter ≲ a few px) and drops them.

## Versioning (REQUIRED on every change)
User rule: always bump the version so they can confirm they have the latest code. Update **all** of these together, date-based `vYYYY.MM.DD.N`:
- `app.js`: `APP_VERSION` and `ASSET_VERSION` (top of file).
- `index.html`: `#versionBadge` text, and the `?v=` query strings on both `styles.css` and `app.js`.
The `?v=` strings are load-bearing — they bust the aggressive no-cache setup so users actually get the new build. `app.js` also overwrites `#versionBadge` from `APP_VERSION` at runtime.

## Running / testing
Pure static — just `open index.html` (file:// is fine; only camera capture may need http://). To test a change: hard-reload (Cmd+Shift+R), **Load → Sample → Vector**, inspect the Vector/Closeup pane.

## Conventions
- Vanilla JS only — do not add a build system, bundler, or dependencies.
- Keep the single-file `app.js` structure; match its existing style (semicolons, 2-space indent, descriptive function names).
- Heavy pixel work runs synchronously behind `setWorkingOverlay()` + `afterWorkingOverlayPaint()` (double-rAF) so the overlay paints first.
</content>
