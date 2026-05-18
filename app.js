const APP_VERSION = "v2026.05.18.6";
const ASSET_VERSION = "2026-05-18-6";
const SAMPLE_IMAGE = `source-robots.png?v=${ASSET_VERSION}`;
const SETTINGS_KEY = "drawing-vectorizer-settings";
const DEFAULT_SETTINGS = {
  absoluteThreshold: 81,
  relativeThreshold: 33,
  blurRadius: 26,
  minimumArea: 80,
  strokeWidth: 8,
  simplifyAmount: 2.25,
  minimumPathLength: 0,
  joinAlignedGaps: false,
  joinDistance: 8,
  joinAngle: 13,
  snapEndpoints: true,
  snapDistance: 40,
  smoothPaths: true,
  smoothPasses: 2,
  closeupZoom: 1,
  medianFilter: true,
  whiteBackground: false,
  compareMode: true,
  filteredZoom: 9.188215627459027,
  eraseRadius: 24,
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  cameraInput: document.querySelector("#cameraInput"),
  sampleButton: document.querySelector("#sampleButton"),
  traceButton: document.querySelector("#traceButton"),
  copySettingsButton: document.querySelector("#copySettingsButton"),
  downloadLink: document.querySelector("#downloadLink"),
  status: document.querySelector("#status"),
  versionBadge: document.querySelector("#versionBadge"),
  workingOverlay: document.querySelector("#workingOverlay"),
  workingOverlayText: document.querySelector("#workingOverlayText"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  filteredViewport: document.querySelector("#filteredViewport"),
  filteredStage: document.querySelector("#filteredStage"),
  filteredCanvas: document.querySelector("#filteredCanvas"),
  selectionCanvas: document.querySelector("#selectionCanvas"),
  filteredZoomValue: document.querySelector("#filteredZoomValue"),
  resetFilteredZoom: document.querySelector("#resetFilteredZoom"),
  maskCanvas: document.querySelector("#maskCanvas"),
  svgFrame: document.querySelector("#svgFrame"),
  closeupViewport: document.querySelector("#closeupViewport"),
  closeupContent: document.querySelector("#closeupContent"),
  closeupZoom: document.querySelector("#closeupZoom"),
  closeupZoomValue: document.querySelector("#closeupZoomValue"),
  resetCloseup: document.querySelector("#resetCloseup"),
  absoluteThreshold: document.querySelector("#absoluteThreshold"),
  relativeThreshold: document.querySelector("#relativeThreshold"),
  blurRadius: document.querySelector("#blurRadius"),
  minimumArea: document.querySelector("#minimumArea"),
  strokeWidth: document.querySelector("#strokeWidth"),
  simplifyAmount: document.querySelector("#simplifyAmount"),
  minimumPathLength: document.querySelector("#minimumPathLength"),
  joinAlignedGaps: document.querySelector("#joinAlignedGaps"),
  joinDistance: document.querySelector("#joinDistance"),
  joinAngle: document.querySelector("#joinAngle"),
  snapEndpoints: document.querySelector("#snapEndpoints"),
  snapDistance: document.querySelector("#snapDistance"),
  smoothPaths: document.querySelector("#smoothPaths"),
  smoothPasses: document.querySelector("#smoothPasses"),
  panTool: document.querySelector("#panTool"),
  eraseTool: document.querySelector("#eraseTool"),
  keepAreaTool: document.querySelector("#keepAreaTool"),
  eraseRadius: document.querySelector("#eraseRadius"),
  eraseRadiusValue: document.querySelector("#eraseRadiusValue"),
  clearEditsButton: document.querySelector("#clearEditsButton"),
  editStatus: document.querySelector("#editStatus"),
  absoluteValue: document.querySelector("#absoluteValue"),
  relativeValue: document.querySelector("#relativeValue"),
  blurValue: document.querySelector("#blurValue"),
  minimumValue: document.querySelector("#minimumValue"),
  strokeWidthValue: document.querySelector("#strokeWidthValue"),
  simplifyValue: document.querySelector("#simplifyValue"),
  minimumPathValue: document.querySelector("#minimumPathValue"),
  joinDistanceValue: document.querySelector("#joinDistanceValue"),
  joinAngleValue: document.querySelector("#joinAngleValue"),
  snapDistanceValue: document.querySelector("#snapDistanceValue"),
  smoothPassesValue: document.querySelector("#smoothPassesValue"),
  medianFilter: document.querySelector("#medianFilter"),
  whiteBackground: document.querySelector("#whiteBackground"),
  compareMode: document.querySelector("#compareMode"),
  compareStatus: document.querySelector("#compareStatus"),
};

const state = {
  image: null,
  imageName: "drawing-vector.svg",
  imageUrl: "",
  svgUrl: "",
  svgWidth: 0,
  svgHeight: 0,
  baseline: null,
  compare: null,
  previewRequestId: 0,
  isBusy: false,
  editTool: "pan",
  editMask: null,
  editWidth: 0,
  editHeight: 0,
  editCount: 0,
  filteredBaseMask: null,
  filteredBaseWidth: 0,
  filteredBaseHeight: 0,
  isErasing: false,
  lastErasePoint: null,
  polygonPoints: [],
  polygonPreviewPoint: null,
  filteredZoom: 1,
  closeupZoom: Number(elements.closeupZoom.value),
  focusX: null,
  focusY: null,
};

const sourceContext = elements.sourceCanvas.getContext("2d", { willReadFrequently: true });
const filteredContext = elements.filteredCanvas.getContext("2d", { willReadFrequently: true });
const selectionContext = elements.selectionCanvas.getContext("2d", { willReadFrequently: true });
const maskContext = elements.maskCanvas.getContext("2d", { willReadFrequently: true });

elements.versionBadge.textContent = APP_VERSION;

const savedControls = [
  ["absoluteThreshold", elements.absoluteThreshold],
  ["relativeThreshold", elements.relativeThreshold],
  ["blurRadius", elements.blurRadius],
  ["minimumArea", elements.minimumArea],
  ["strokeWidth", elements.strokeWidth],
  ["simplifyAmount", elements.simplifyAmount],
  ["minimumPathLength", elements.minimumPathLength],
  ["joinAlignedGaps", elements.joinAlignedGaps],
  ["joinDistance", elements.joinDistance],
  ["joinAngle", elements.joinAngle],
  ["snapEndpoints", elements.snapEndpoints],
  ["snapDistance", elements.snapDistance],
  ["smoothPaths", elements.smoothPaths],
  ["smoothPasses", elements.smoothPasses],
  ["closeupZoom", elements.closeupZoom],
  ["medianFilter", elements.medianFilter],
  ["whiteBackground", elements.whiteBackground],
  ["compareMode", elements.compareMode],
  ["eraseRadius", elements.eraseRadius],
];

function setStatus(message) {
  elements.status.textContent = `${message} · ${APP_VERSION}`;
}

function updateCompareStatus() {
  if (!elements.compareMode.checked) {
    elements.compareStatus.textContent = "Compare off";
    return;
  }

  if (!state.baseline) {
    elements.compareStatus.textContent = "No baseline";
    return;
  }

  if (state.compare) {
    elements.compareStatus.textContent = `${state.compare.paths.length.toLocaleString()} red preview paths`;
    return;
  }

  elements.compareStatus.textContent = `${state.baseline.paths.length.toLocaleString()} black baseline paths`;
}

function updateOutputs() {
  elements.absoluteValue.value = elements.absoluteThreshold.value;
  elements.relativeValue.value = elements.relativeThreshold.value;
  elements.blurValue.value = elements.blurRadius.value;
  elements.minimumValue.value = elements.minimumArea.value;
  elements.strokeWidthValue.value = elements.strokeWidth.value;
  elements.simplifyValue.value = elements.simplifyAmount.value;
  elements.minimumPathValue.value = elements.minimumPathLength.value;
  elements.joinDistanceValue.value = elements.joinDistance.value;
  elements.joinAngleValue.value = `${elements.joinAngle.value}°`;
  elements.snapDistanceValue.value = elements.snapDistance.value;
  elements.smoothPassesValue.value = elements.smoothPasses.value;
  elements.eraseRadiusValue.value = elements.eraseRadius.value;
  elements.filteredZoomValue.value = `${state.filteredZoom.toFixed(1).replace(".0", "")}x`;
  elements.closeupZoomValue.value = `${Number(elements.closeupZoom.value).toFixed(1).replace(".0", "")}x`;
}

function applySettings(settings) {
  for (const [key, control] of savedControls) {
    if (!(key in settings)) {
      continue;
    }

    if (control.type === "checkbox") {
      control.checked = Boolean(settings[key]);
    } else {
      control.value = String(settings[key]);
    }
  }

  if (Number.isFinite(Number(settings.filteredZoom))) {
    state.filteredZoom = clamp(Number(settings.filteredZoom), 1, 40);
  }
}

function collectSettings() {
  const settings = {};

  for (const [key, control] of savedControls) {
    settings[key] = control.type === "checkbox" ? control.checked : Number(control.value);
  }

  settings.filteredZoom = state.filteredZoom;
  return settings;
}

function loadSettings() {
  applySettings(DEFAULT_SETTINGS);

  try {
    applySettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch (error) {
    localStorage.removeItem(SETTINGS_KEY);
    applySettings(DEFAULT_SETTINGS);
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(collectSettings()));
}

async function copySettings() {
  const text = JSON.stringify(collectSettings(), null, 2);

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Settings copied");
  } catch (error) {
    setStatus("Settings printed to console");
    console.log(text);
  }
}

function setBusy(isBusy) {
  state.isBusy = isBusy;
  elements.traceButton.disabled = isBusy;
  elements.sampleButton.disabled = isBusy;
  elements.fileInput.disabled = isBusy;
  elements.cameraInput.disabled = isBusy;
  elements.copySettingsButton.disabled = isBusy;
  elements.compareMode.disabled = isBusy;
}

function setWorkingOverlay(isWorking, message = "Generating paths") {
  elements.workingOverlay.hidden = !isWorking;
  elements.workingOverlay.setAttribute("aria-hidden", isWorking ? "false" : "true");
  elements.workingOverlayText.textContent = message;
  document.body.classList.toggle("is-working", isWorking);
}

function afterWorkingOverlayPaint(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function revokeGeneratedSvg() {
  if (state.svgUrl) {
    URL.revokeObjectURL(state.svgUrl);
    state.svgUrl = "";
  }
}

function setDownload(svgText, width, height, displaySvgText = svgText) {
  revokeGeneratedSvg();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  state.svgUrl = URL.createObjectURL(blob);
  elements.downloadLink.href = state.svgUrl;
  elements.downloadLink.download = state.imageName.replace(/\.[^.]+$/, "") + "-vector.svg";
  elements.downloadLink.classList.remove("disabled");
  elements.downloadLink.removeAttribute("aria-disabled");
  setSvgPreview(displaySvgText, width, height, true);
}

function setSvgPreview(svgText, width, height, resetPosition = false) {
  state.svgWidth = width;
  state.svgHeight = height;
  elements.svgFrame.srcdoc = `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #fff; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; cursor: crosshair; }
    </style>
  </head>
  <body>
    ${svgText}
    <script>
      (() => {
        const svg = document.querySelector("svg");

        if (!svg) {
          return;
        }

        svg.addEventListener("click", (event) => {
          const viewBox = svg.viewBox.baseVal;
          const bounds = svg.getBoundingClientRect();
          const scale = Math.min(bounds.width / viewBox.width, bounds.height / viewBox.height);
          const drawnWidth = viewBox.width * scale;
          const drawnHeight = viewBox.height * scale;
          const offsetX = (bounds.width - drawnWidth) / 2;
          const offsetY = (bounds.height - drawnHeight) / 2;
          const localX = event.clientX - bounds.left - offsetX;
          const localY = event.clientY - bounds.top - offsetY;

          if (localX < 0 || localY < 0 || localX > drawnWidth || localY > drawnHeight) {
            return;
          }

          window.parent.postMessage({
            type: "svg-focus",
            x: viewBox.x + localX / scale,
            y: viewBox.y + localY / scale,
          }, "*");
        });
      })();
    </script>
  </body>
</html>`;
  elements.closeupContent.innerHTML = svgText.replace(/<\?xml[^>]*>\s*/i, "");
  updateCloseupZoom(resetPosition);
}

function resetDownload(clearFocus = false) {
  revokeGeneratedSvg();
  elements.downloadLink.href = "#";
  elements.downloadLink.classList.add("disabled");
  elements.downloadLink.setAttribute("aria-disabled", "true");
  elements.svgFrame.removeAttribute("src");
  elements.svgFrame.removeAttribute("srcdoc");
  elements.closeupContent.innerHTML = "";
  state.svgWidth = 0;
  state.svgHeight = 0;
  state.baseline = null;
  state.compare = null;
  state.previewRequestId += 1;
  updateCompareStatus();

  if (clearFocus) {
    state.focusX = null;
    state.focusY = null;
  }
}

function updateCloseupZoom(resetPosition = false) {
  const previousZoom = state.closeupZoom || Number(elements.closeupZoom.value);
  const focusBeforeZoom = resetPosition ? null : getCloseupCenterPoint(previousZoom);

  updateOutputs();

  const svg = elements.closeupContent.querySelector("svg");

  if (!svg || !state.svgWidth || !state.svgHeight) {
    state.closeupZoom = Number(elements.closeupZoom.value);
    return;
  }

  const zoom = Number(elements.closeupZoom.value);
  const padding = 40;
  state.closeupZoom = zoom;
  elements.closeupContent.style.width = `${state.svgWidth * zoom + padding * 2}px`;
  elements.closeupContent.style.height = `${state.svgHeight * zoom + padding * 2}px`;
  svg.style.width = `${state.svgWidth}px`;
  svg.style.height = `${state.svgHeight}px`;
  svg.style.transform = `scale(${zoom})`;

  if (resetPosition) {
    requestAnimationFrame(resetCloseupView);
  } else if (focusBeforeZoom) {
    state.focusX = clamp(focusBeforeZoom[0], 0, state.svgWidth);
    state.focusY = clamp(focusBeforeZoom[1], 0, state.svgHeight);
    requestAnimationFrame(resetCloseupView);
  }
}

function resetCloseupView() {
  const viewport = elements.closeupViewport;
  const svg = elements.closeupContent.querySelector("svg");
  const zoom = Number(elements.closeupZoom.value);
  const padding = 40;

  if (hasFocusPoint()) {
    viewport.scrollLeft = Math.max(0, state.focusX * zoom + padding - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, state.focusY * zoom + padding - viewport.clientHeight / 2);
    return;
  }

  if (svg && typeof svg.getBBox === "function") {
    try {
      const box = svg.getBBox();
      viewport.scrollLeft = Math.max(0, (box.x + box.width / 2) * zoom + padding - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, (box.y + box.height / 2) * zoom + padding - viewport.clientHeight / 2);
      return;
    } catch (error) {
      // Fall through to a simple center when the SVG bbox is unavailable.
    }
  }

  viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
  viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
}

function hasFocusPoint() {
  return Number.isFinite(state.focusX) && Number.isFinite(state.focusY);
}

function getCloseupCenterPoint(zoom = Number(elements.closeupZoom.value)) {
  if (!state.svgWidth || !state.svgHeight) {
    return null;
  }

  const viewport = elements.closeupViewport;
  const padding = 40;
  return [
    (viewport.scrollLeft + viewport.clientWidth / 2 - padding) / zoom,
    (viewport.scrollTop + viewport.clientHeight / 2 - padding) / zoom,
  ];
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function focusCloseupAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  state.focusX = x;
  state.focusY = y;
  resetCloseupView();
}

function findCloseupFocus(skeleton, width, height) {
  const targetX = width / 2;
  const targetY = height / 2;
  let bestDistance = Infinity;
  let bestX = targetX;
  let bestY = targetY;

  for (let index = 0; index < skeleton.length; index += 1) {
    if (!skeleton[index]) {
      continue;
    }

    const x = index % width;
    const y = (index - x) / width;
    const dx = x - targetX;
    const dy = y - targetY;
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestX = x + 0.5;
      bestY = y + 0.5;
    }
  }

  return [bestX, bestY];
}

function installCloseupDragging() {
  let drag = null;

  elements.closeupViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    drag = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: elements.closeupViewport.scrollLeft,
      scrollTop: elements.closeupViewport.scrollTop,
    };
    elements.closeupViewport.classList.add("dragging");
    elements.closeupViewport.setPointerCapture(event.pointerId);
  });

  elements.closeupViewport.addEventListener("pointermove", (event) => {
    if (!drag) {
      return;
    }

    elements.closeupViewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    elements.closeupViewport.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  });

  function endDrag(event) {
    if (!drag) {
      return;
    }

    drag = null;
    elements.closeupViewport.classList.remove("dragging");

    if (elements.closeupViewport.hasPointerCapture(event.pointerId)) {
      elements.closeupViewport.releasePointerCapture(event.pointerId);
    }
  }

  elements.closeupViewport.addEventListener("pointerup", endDrag);
  elements.closeupViewport.addEventListener("pointercancel", endDrag);
}

function getFilteredFitScale() {
  const viewport = elements.filteredViewport;
  const canvas = elements.filteredCanvas;

  if (!canvas.width || !canvas.height || !viewport.clientWidth || !viewport.clientHeight) {
    return 1;
  }

  return Math.min(viewport.clientWidth / canvas.width, viewport.clientHeight / canvas.height);
}

function updateFilteredBitmapZoom(resetPosition = false, anchor = null) {
  const viewport = elements.filteredViewport;
  const canvas = elements.filteredCanvas;
  const stage = elements.filteredStage;

  if (!canvas.width || !canvas.height) {
    updateOutputs();
    return;
  }

  const previousScale = Number(stage.dataset.displayScale) || getFilteredFitScale() * state.filteredZoom;
  const anchorPoint = anchor || {
    x: viewport.clientWidth / 2,
    y: viewport.clientHeight / 2,
  };
  const anchorImagePoint = [
    (viewport.scrollLeft + anchorPoint.x) / previousScale,
    (viewport.scrollTop + anchorPoint.y) / previousScale,
  ];
  const nextScale = getFilteredFitScale() * state.filteredZoom;
  stage.style.width = `${Math.max(1, canvas.width * nextScale)}px`;
  stage.style.height = `${Math.max(1, canvas.height * nextScale)}px`;
  stage.dataset.displayScale = String(nextScale);
  updateOutputs();

  requestAnimationFrame(() => {
    if (resetPosition) {
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
      return;
    }

    viewport.scrollLeft = Math.max(0, anchorImagePoint[0] * nextScale - anchorPoint.x);
    viewport.scrollTop = Math.max(0, anchorImagePoint[1] * nextScale - anchorPoint.y);
  });
}

function setBitmapTool(tool) {
  state.editTool = tool;
  elements.panTool.classList.toggle("active", tool === "pan");
  elements.eraseTool.classList.toggle("active", tool === "erase");
  elements.keepAreaTool.classList.toggle("active", tool === "keep");
  elements.filteredViewport.classList.toggle("erase-mode", tool === "erase");
  elements.filteredViewport.classList.toggle("keep-mode", tool === "keep");
  drawSelectionOverlay();
  updateEditStatus();
}

function updateEditStatus() {
  if (state.editTool === "keep" && state.polygonPoints.length) {
    elements.editStatus.textContent = `Keep area: ${state.polygonPoints.length} points`;
    return;
  }

  elements.editStatus.textContent = state.editCount
    ? `${state.editCount.toLocaleString()} bitmap pixels erased`
    : "Bitmap unedited";
}

function initBitmapEdits(width, height) {
  state.editWidth = width;
  state.editHeight = height;
  state.editMask = new Uint8Array(width * height);
  state.editCount = 0;
  state.filteredBaseMask = null;
  state.filteredBaseWidth = width;
  state.filteredBaseHeight = height;
  state.isErasing = false;
  state.lastErasePoint = null;
  state.polygonPoints = [];
  state.polygonPreviewPoint = null;
  updateEditStatus();
  drawSelectionOverlay();
}

function ensureBitmapEditMask(width, height) {
  if (state.editMask && state.editWidth === width && state.editHeight === height) {
    return;
  }

  initBitmapEdits(width, height);
}

function invalidateVectorResult() {
  if (state.svgUrl || state.baseline || state.compare) {
    resetDownload(false);
  }

  if (elements.maskCanvas.width && elements.maskCanvas.height) {
    maskContext.clearRect(0, 0, elements.maskCanvas.width, elements.maskCanvas.height);
  }
}

function applyBitmapEdits(mask, width, height) {
  ensureBitmapEditMask(width, height);

  if (!state.editCount) {
    return mask;
  }

  const edited = mask.slice();

  for (let index = 0; index < edited.length; index += 1) {
    if (state.editMask[index]) {
      edited[index] = 0;
    }
  }

  return edited;
}

function redrawFilteredBitmapFromBase(resetPosition = false) {
  if (!state.filteredBaseMask) {
    previewFilteredBitmap(resetPosition);
    return;
  }

  const editedMask = applyBitmapEdits(
    state.filteredBaseMask,
    state.filteredBaseWidth,
    state.filteredBaseHeight
  );
  drawFilteredBitmap(editedMask, state.filteredBaseWidth, state.filteredBaseHeight, resetPosition);
}

function getBitmapPoint(event) {
  const bounds = elements.filteredStage.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * elements.filteredCanvas.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * elements.filteredCanvas.height;

  return [
    clamp(x, 0, Math.max(0, elements.filteredCanvas.width - 1)),
    clamp(y, 0, Math.max(0, elements.filteredCanvas.height - 1)),
  ];
}

function eraseBitmapCircle(point) {
  if (!elements.filteredCanvas.width || !elements.filteredCanvas.height) {
    return false;
  }

  const width = elements.filteredCanvas.width;
  const height = elements.filteredCanvas.height;
  ensureBitmapEditMask(width, height);

  const radius = Number(elements.eraseRadius.value);
  const radiusSquared = radius * radius;
  const minX = Math.max(0, Math.floor(point[0] - radius));
  const maxX = Math.min(width - 1, Math.ceil(point[0] + radius));
  const minY = Math.max(0, Math.floor(point[1] - radius));
  const maxY = Math.min(height - 1, Math.ceil(point[1] + radius));
  let changed = false;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - point[0];
      const dy = y + 0.5 - point[1];

      if (dx * dx + dy * dy > radiusSquared) {
        continue;
      }

      const index = y * width + x;

      if (!state.editMask[index]) {
        state.editMask[index] = 1;
        state.editCount += 1;
        changed = true;
      }
    }
  }

  return changed;
}

function eraseBitmapLine(from, to) {
  const radius = Number(elements.eraseRadius.value);
  const distance = pointDistance(from, to);
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 3)));
  let changed = false;

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const point = [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
    ];
    changed = eraseBitmapCircle(point) || changed;
  }

  return changed;
}

function commitBitmapEdit(message = "Bitmap edited") {
  redrawFilteredBitmapFromBase(false);
  invalidateVectorResult();
  updateEditStatus();
  setStatus(message);
}

function pointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || 1e-9) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function eraseOutsidePolygon(polygon) {
  const width = elements.filteredCanvas.width;
  const height = elements.filteredCanvas.height;

  if (!width || !height || polygon.length < 3) {
    return;
  }

  ensureBitmapEditMask(width, height);
  setBusy(true);
  setWorkingOverlay(true, "Erasing bitmap area");

  afterWorkingOverlayPaint(() => {
    try {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pointInPolygon([x + 0.5, y + 0.5], polygon)) {
            continue;
          }

          const index = y * width + x;

          if (!state.editMask[index]) {
            state.editMask[index] = 1;
            state.editCount += 1;
          }
        }
      }

      state.polygonPoints = [];
      state.polygonPreviewPoint = null;
      drawSelectionOverlay();
      commitBitmapEdit("Bitmap area kept");
    } catch (error) {
      setStatus(error.message || "Area erase failed");
    } finally {
      setBusy(false);
      setWorkingOverlay(false);
    }
  });
}

function drawSelectionOverlay() {
  const width = elements.selectionCanvas.width;
  const height = elements.selectionCanvas.height;

  if (!width || !height) {
    return;
  }

  selectionContext.clearRect(0, 0, width, height);

  if (state.editTool !== "keep" || !state.polygonPoints.length) {
    return;
  }

  selectionContext.save();
  selectionContext.lineWidth = Math.max(2, width / 900);
  selectionContext.strokeStyle = "rgba(215, 25, 32, 0.9)";
  selectionContext.fillStyle = "rgba(215, 25, 32, 0.16)";
  selectionContext.beginPath();
  selectionContext.moveTo(state.polygonPoints[0][0], state.polygonPoints[0][1]);

  for (let i = 1; i < state.polygonPoints.length; i += 1) {
    selectionContext.lineTo(state.polygonPoints[i][0], state.polygonPoints[i][1]);
  }

  if (state.polygonPreviewPoint) {
    selectionContext.lineTo(state.polygonPreviewPoint[0], state.polygonPreviewPoint[1]);
  }

  selectionContext.stroke();

  for (const point of state.polygonPoints) {
    selectionContext.beginPath();
    selectionContext.arc(point[0], point[1], Math.max(4, width / 320), 0, Math.PI * 2);
    selectionContext.fill();
  }

  selectionContext.restore();
}

function clearBitmapEdits() {
  if (!elements.filteredCanvas.width || !elements.filteredCanvas.height) {
    return;
  }

  initBitmapEdits(elements.filteredCanvas.width, elements.filteredCanvas.height);
  redrawFilteredBitmapFromBase(false);
  invalidateVectorResult();
  setStatus("Bitmap edits cleared");
}

function installBitmapEditTools() {
  elements.panTool.addEventListener("click", () => setBitmapTool("pan"));
  elements.eraseTool.addEventListener("click", () => setBitmapTool("erase"));
  elements.keepAreaTool.addEventListener("click", () => setBitmapTool("keep"));
  elements.clearEditsButton.addEventListener("click", clearBitmapEdits);
  elements.eraseRadius.addEventListener("input", () => {
    updateOutputs();
    saveSettings();
  });

  elements.filteredStage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.editTool !== "erase" || !state.image) {
      return;
    }

    event.preventDefault();
    state.isErasing = true;
    state.lastErasePoint = getBitmapPoint(event);
    elements.filteredStage.setPointerCapture(event.pointerId);

    if (eraseBitmapCircle(state.lastErasePoint)) {
      commitBitmapEdit();
    }
  });

  elements.filteredStage.addEventListener("pointermove", (event) => {
    if (state.editTool === "keep" && state.polygonPoints.length) {
      state.polygonPreviewPoint = getBitmapPoint(event);
      drawSelectionOverlay();
    }

    if (!state.isErasing || state.editTool !== "erase") {
      return;
    }

    event.preventDefault();
    const point = getBitmapPoint(event);

    if (eraseBitmapLine(state.lastErasePoint, point)) {
      commitBitmapEdit();
    }

    state.lastErasePoint = point;
  });

  function finishErase(event) {
    if (!state.isErasing) {
      return;
    }

    state.isErasing = false;
    state.lastErasePoint = null;

    if (elements.filteredStage.hasPointerCapture(event.pointerId)) {
      elements.filteredStage.releasePointerCapture(event.pointerId);
    }
  }

  elements.filteredStage.addEventListener("pointerup", finishErase);
  elements.filteredStage.addEventListener("pointercancel", finishErase);

  elements.filteredStage.addEventListener("click", (event) => {
    if (state.editTool !== "keep" || !state.image || event.detail !== 1) {
      return;
    }

    event.preventDefault();
    state.polygonPoints.push(getBitmapPoint(event));
    state.polygonPreviewPoint = null;
    drawSelectionOverlay();
    updateEditStatus();
  });

  elements.filteredStage.addEventListener("dblclick", (event) => {
    if (state.editTool !== "keep" || !state.image) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (state.polygonPoints.length >= 3) {
      eraseOutsidePolygon([...state.polygonPoints]);
    }
  });
}

function installFilteredBitmapInspector() {
  let drag = null;

  elements.filteredViewport.addEventListener("wheel", (event) => {
    if (!state.image) {
      return;
    }

    event.preventDefault();
    const bounds = elements.filteredViewport.getBoundingClientRect();
    const anchor = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const factor = Math.exp(-event.deltaY * 0.0015);
    state.filteredZoom = clamp(state.filteredZoom * factor, 1, 40);
    updateFilteredBitmapZoom(false, anchor);
    saveSettings();
  }, { passive: false });

  elements.filteredViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.editTool !== "pan") {
      return;
    }

    drag = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: elements.filteredViewport.scrollLeft,
      scrollTop: elements.filteredViewport.scrollTop,
    };
    elements.filteredViewport.classList.add("dragging");
    elements.filteredViewport.setPointerCapture(event.pointerId);
  });

  elements.filteredViewport.addEventListener("pointermove", (event) => {
    if (!drag) {
      return;
    }

    elements.filteredViewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    elements.filteredViewport.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  });

  function endDrag(event) {
    if (!drag) {
      return;
    }

    drag = null;
    elements.filteredViewport.classList.remove("dragging");

    if (elements.filteredViewport.hasPointerCapture(event.pointerId)) {
      elements.filteredViewport.releasePointerCapture(event.pointerId);
    }
  }

  elements.filteredViewport.addEventListener("pointerup", endDrag);
  elements.filteredViewport.addEventListener("pointercancel", endDrag);
  elements.resetFilteredZoom.addEventListener("click", () => {
    state.filteredZoom = 1;
    updateFilteredBitmapZoom(true);
    saveSettings();
  });
  window.addEventListener("resize", () => updateFilteredBitmapZoom(false));
}

function drawImage(image) {
  elements.sourceCanvas.width = image.naturalWidth;
  elements.sourceCanvas.height = image.naturalHeight;
  elements.filteredCanvas.width = image.naturalWidth;
  elements.filteredCanvas.height = image.naturalHeight;
  elements.selectionCanvas.width = image.naturalWidth;
  elements.selectionCanvas.height = image.naturalHeight;
  elements.maskCanvas.width = image.naturalWidth;
  elements.maskCanvas.height = image.naturalHeight;
  initBitmapEdits(image.naturalWidth, image.naturalHeight);
  sourceContext.clearRect(0, 0, image.naturalWidth, image.naturalHeight);
  sourceContext.drawImage(image, 0, 0);
  filteredContext.clearRect(0, 0, image.naturalWidth, image.naturalHeight);
  selectionContext.clearRect(0, 0, image.naturalWidth, image.naturalHeight);
  maskContext.clearRect(0, 0, image.naturalWidth, image.naturalHeight);
}

function loadImageFromUrl(url, name) {
  resetDownload(true);
  setStatus("Loading");

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      state.imageName = name || "drawing";
      drawImage(image);
      previewFilteredBitmap(true);
      setStatus(`${image.naturalWidth} x ${image.naturalHeight}`);
      resolve(image);
    };
    image.onerror = () => reject(new Error("The photo could not be opened. If it is HEIC, try Safari or export it as PNG/JPEG."));
    image.src = url;
  });
}

function readFile(file) {
  if (!file) {
    return;
  }

  if (state.imageUrl) {
    URL.revokeObjectURL(state.imageUrl);
  }

  state.imageUrl = URL.createObjectURL(file);
  loadImageFromUrl(state.imageUrl, file.name).catch((error) => setStatus(error.message));
}

function getSettings() {
  return {
    absoluteThreshold: Number(elements.absoluteThreshold.value),
    relativeThreshold: Number(elements.relativeThreshold.value),
    blurRadius: Number(elements.blurRadius.value),
    minimumArea: Number(elements.minimumArea.value),
    strokeWidth: Number(elements.strokeWidth.value),
    simplifyAmount: Number(elements.simplifyAmount.value),
    minimumPathLength: Number(elements.minimumPathLength.value),
    joinAlignedGaps: elements.joinAlignedGaps.checked,
    joinDistance: Number(elements.joinDistance.value),
    joinAngle: Number(elements.joinAngle.value),
    snapEndpoints: elements.snapEndpoints.checked,
    snapDistance: Number(elements.snapDistance.value),
    smoothPaths: elements.smoothPaths.checked,
    smoothPasses: Number(elements.smoothPasses.value),
    useMedian: elements.medianFilter.checked,
    whiteBackground: elements.whiteBackground.checked,
  };
}

function buildGrayAndInk(imageData, settings) {
  const { data, width, height } = imageData;
  const length = width * height;
  const gray = new Uint8Array(length);
  const maxChannel = new Uint8Array(length);
  const minChannel = new Uint8Array(length);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    gray[pixel] = Math.round((red * 299 + green * 587 + blue * 114) / 1000);
    maxChannel[pixel] = Math.max(red, green, blue);
    minChannel[pixel] = Math.min(red, green, blue);
  }

  const blurred = boxBlur(gray, width, height, settings.blurRadius);
  const mask = new Uint8Array(length);

  for (let pixel = 0; pixel < length; pixel += 1) {
    const darkAbsolute = gray[pixel] < settings.absoluteThreshold;
    const darkRelative = blurred[pixel] - gray[pixel] > settings.relativeThreshold;
    const balancedBlack = maxChannel[pixel] - minChannel[pixel] < 46;
    mask[pixel] = darkAbsolute && darkRelative && balancedBlack ? 1 : 0;
  }

  return settings.useMedian ? medianFilter(mask, width, height) : mask;
}

function boxBlur(gray, width, height, radius) {
  const integralWidth = width + 1;
  const integral = new Uint32Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    const sourceRow = y * width;
    const integralRow = (y + 1) * integralWidth;
    const previousIntegralRow = y * integralWidth;

    for (let x = 0; x < width; x += 1) {
      rowSum += gray[sourceRow + x];
      integral[integralRow + x + 1] = integral[previousIntegralRow + x + 1] + rowSum;
    }
  }

  const output = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const top = y0 * integralWidth;
    const bottom = (y1 + 1) * integralWidth;

    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const sum =
        integral[bottom + x1 + 1] -
        integral[top + x1 + 1] -
        integral[bottom + x0] +
        integral[top + x0];
      output[y * width + x] = Math.round(sum / ((x1 - x0 + 1) * (y1 - y0 + 1)));
    }
  }

  return output;
}

function medianFilter(mask, width, height) {
  const output = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let count = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }

        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            count += mask[ny * width + nx];
          }
        }
      }

      output[y * width + x] = count >= 5 ? 1 : 0;
    }
  }

  return output;
}

function removeSmallComponents(mask, width, height, minimumArea) {
  if (minimumArea <= 1) {
    return mask;
  }

  const cleaned = new Uint8Array(mask.length);
  const seen = new Uint8Array(mask.length);
  const stack = [];
  const component = [];

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || seen[index]) {
      continue;
    }

    stack.length = 0;
    component.length = 0;
    stack.push(index);
    seen[index] = 1;

    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      const x = current % width;
      const y = Math.floor(current / width);

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];

      for (const next of neighbors) {
        if (next >= 0 && mask[next] && !seen[next]) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }

    if (component.length >= minimumArea) {
      for (const pixel of component) {
        cleaned[pixel] = 1;
      }
    }
  }

  return cleaned;
}

function drawBinaryMask(context, mask, width, height) {
  const imageData = context.createImageData(width, height);

  for (let pixel = 0, index = 0; pixel < mask.length; pixel += 1, index += 4) {
    const value = mask[pixel] ? 17 : 255;
    imageData.data[index] = value;
    imageData.data[index + 1] = value;
    imageData.data[index + 2] = value;
    imageData.data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
}

function drawFilteredBitmap(mask, width, height, resetPosition = false) {
  drawBinaryMask(filteredContext, mask, width, height);
  updateFilteredBitmapZoom(resetPosition);
}

function drawCenterlines(mask, width, height) {
  drawBinaryMask(maskContext, mask, width, height);
}

function previewFilteredBitmap(resetPosition = false) {
  if (!state.image) {
    return;
  }

  try {
    const settings = getSettings();
    const filtered = buildFilteredBaseMask(settings);
    state.filteredBaseMask = filtered.mask;
    state.filteredBaseWidth = filtered.width;
    state.filteredBaseHeight = filtered.height;
    drawFilteredBitmap(
      applyBitmapEdits(filtered.mask, filtered.width, filtered.height),
      filtered.width,
      filtered.height,
      resetPosition
    );
    drawSelectionOverlay();
  } catch (error) {
    setStatus(error.message || "Bitmap preview failed");
  }
}

function skeletonize(mask, width, height) {
  const skeleton = mask.slice();
  let changed = true;
  let passes = 0;

  while (changed) {
    changed = false;
    passes += 1;

    for (let step = 0; step < 2; step += 1) {
      const deletions = [];

      for (let y = 1; y < height - 1; y += 1) {
        const row = y * width;

        for (let x = 1; x < width - 1; x += 1) {
          const i = row + x;

          if (!skeleton[i]) {
            continue;
          }

          const p2 = skeleton[i - width];
          const p3 = skeleton[i - width + 1];
          const p4 = skeleton[i + 1];
          const p5 = skeleton[i + width + 1];
          const p6 = skeleton[i + width];
          const p7 = skeleton[i + width - 1];
          const p8 = skeleton[i - 1];
          const p9 = skeleton[i - width - 1];
          const neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

          if (neighbors < 2 || neighbors > 6) {
            continue;
          }

          const transitions =
            (!p2 && p3) +
            (!p3 && p4) +
            (!p4 && p5) +
            (!p5 && p6) +
            (!p6 && p7) +
            (!p7 && p8) +
            (!p8 && p9) +
            (!p9 && p2);

          if (transitions !== 1) {
            continue;
          }

          const keepConnected =
            step === 0
              ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
              : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;

          if (keepConnected) {
            deletions.push(i);
          }
        }
      }

      if (deletions.length) {
        changed = true;
        for (const index of deletions) {
          skeleton[index] = 0;
        }
      }
    }

    if (passes > 80) {
      break;
    }
  }

  return skeleton;
}

function neighborCount(mask, width, height) {
  const degree = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    const row = y * width;

    for (let x = 0; x < width; x += 1) {
      const i = row + x;

      if (!mask[i]) {
        continue;
      }

      let count = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;

        if (ny < 0 || ny >= height) {
          continue;
        }

        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const nx = x + dx;

          if (nx >= 0 && nx < width) {
            count += mask[ny * width + nx];
          }
        }
      }

      degree[i] = count;
    }
  }

  return degree;
}

function collectNeighbors(mask, width, height, index, out) {
  out.length = 0;
  const x = index % width;
  const y = (index - x) / width;

  for (let dy = -1; dy <= 1; dy += 1) {
    const ny = y + dy;

    if (ny < 0 || ny >= height) {
      continue;
    }

    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;

      if (nx < 0 || nx >= width) {
        continue;
      }

      const next = ny * width + nx;

      if (mask[next]) {
        out.push(next);
      }
    }
  }

  return out;
}

function edgeKey(a, b, width) {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const diff = high - low;
  let code = 0;

  if (diff === width - 1) {
    code = 1;
  } else if (diff === width) {
    code = 2;
  } else if (diff === width + 1) {
    code = 3;
  }

  return low * 4 + code;
}

function pixelPoint(index, width) {
  const x = index % width;
  return [x + 0.5, (index - x) / width + 0.5];
}

function polylineLength(points) {
  let length = 0;

  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    length += Math.hypot(dx, dy);
  }

  return length;
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);

  if (!length) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }

  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / length;
}

function simplifyPath(points, epsilon) {
  if (epsilon <= 0 || points.length <= 2) {
    return points;
  }

  let furthestIndex = 0;
  let furthestDistance = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], start, end);

    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = i;
    }
  }

  if (furthestDistance > epsilon) {
    const left = simplifyPath(points.slice(0, furthestIndex + 1), epsilon);
    const right = simplifyPath(points.slice(furthestIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [start, end];
}

function traceCenterlinePaths(skeleton, width, height, settings) {
  const degree = neighborCount(skeleton, width, height);
  const visitedEdges = new Set();
  const neighbors = [];
  const nextNeighbors = [];
  const paths = [];

  function addPath(points, closed = false) {
    if (points.length < 2 || polylineLength(points) < settings.minimumPathLength) {
      return;
    }

    let simplified = simplifyPath(points, settings.simplifyAmount);

    if (closed && simplified.length < 4) {
      simplified = points;
    }

    if (closed && simplified.length > 2) {
      simplified = simplified.slice(0, -1);
    }

    if (simplified.length >= 2) {
      paths.push({ points: simplified, closed });
    }
  }

  function walkPath(start, first) {
    let previous = start;
    let current = first;
    const points = [pixelPoint(start, width)];

    while (true) {
      visitedEdges.add(edgeKey(previous, current, width));
      points.push(pixelPoint(current, width));

      if (degree[current] !== 2) {
        break;
      }

      collectNeighbors(skeleton, width, height, current, nextNeighbors);
      const next = nextNeighbors[0] === previous ? nextNeighbors[1] : nextNeighbors[0];

      if (next == null || visitedEdges.has(edgeKey(current, next, width))) {
        break;
      }

      previous = current;
      current = next;
    }

    addPath(points);
  }

  for (let index = 0; index < skeleton.length; index += 1) {
    if (!skeleton[index] || degree[index] === 2) {
      continue;
    }

    collectNeighbors(skeleton, width, height, index, neighbors);

    for (const next of neighbors) {
      if (!visitedEdges.has(edgeKey(index, next, width))) {
        walkPath(index, next);
      }
    }
  }

  for (let index = 0; index < skeleton.length; index += 1) {
    if (!skeleton[index] || degree[index] !== 2) {
      continue;
    }

    collectNeighbors(skeleton, width, height, index, neighbors);

    for (const first of neighbors) {
      if (visitedEdges.has(edgeKey(index, first, width))) {
        continue;
      }

      const points = [pixelPoint(index, width)];
      let previous = index;
      let current = first;
      let closed = false;

      while (true) {
        visitedEdges.add(edgeKey(previous, current, width));
        points.push(pixelPoint(current, width));

        if (current === index) {
          closed = true;
          break;
        }

        collectNeighbors(skeleton, width, height, current, nextNeighbors);
        const next = nextNeighbors[0] === previous ? nextNeighbors[1] : nextNeighbors[0];

        if (next == null || degree[current] !== 2 || visitedEdges.has(edgeKey(current, next, width))) {
          break;
        }

        previous = current;
        current = next;
      }

      addPath(points, closed);
    }
  }

  return paths;
}

function applyPathCleanups(paths, settings) {
  const stats = {
    joined: 0,
    snapped: 0,
    smoothed: 0,
  };

  let cleaned = paths.map((path) => ({
    closed: path.closed,
    points: path.points.map((point) => [...point]),
  }));

  if (settings.joinAlignedGaps) {
    const result = joinAlignedGaps(cleaned, settings.joinDistance, settings.joinAngle);
    cleaned = result.paths;
    stats.joined = result.joined;
  }

  if (settings.snapEndpoints) {
    stats.snapped = snapNearbyEndpoints(cleaned, settings.snapDistance);
  }

  if (settings.smoothPaths) {
    stats.smoothed = smoothOpenPaths(cleaned, settings.smoothPasses);
  }

  return { paths: cleaned, stats };
}

function buildEndpointRecords(paths) {
  const endpoints = [];

  for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
    const path = paths[pathIndex];

    if (path.closed || path.points.length < 2) {
      continue;
    }

    for (const atStart of [true, false]) {
      const pointIndex = atStart ? 0 : path.points.length - 1;
      const neighborIndex = atStart ? 1 : path.points.length - 2;
      const point = path.points[pointIndex];
      const neighbor = path.points[neighborIndex];
      const direction = normalizeVector([point[0] - neighbor[0], point[1] - neighbor[1]]);

      if (!direction) {
        continue;
      }

      endpoints.push({
        atStart,
        direction,
        index: endpoints.length,
        pathIndex,
        point,
      });
    }
  }

  return endpoints;
}

function joinAlignedGaps(paths, maximumDistance, maximumAngle) {
  let working = paths;
  let joined = 0;
  const maximumRounds = 12;

  for (let round = 0; round < maximumRounds; round += 1) {
    const endpoints = buildEndpointRecords(working);
    const candidates = findAlignedGapCandidates(endpoints, maximumDistance, maximumAngle);

    if (!candidates.length) {
      break;
    }

    const usedPaths = new Set();
    const selected = [];

    candidates.sort((a, b) => a.score - b.score);

    for (const candidate of candidates) {
      if (usedPaths.has(candidate.a.pathIndex) || usedPaths.has(candidate.b.pathIndex)) {
        continue;
      }

      usedPaths.add(candidate.a.pathIndex);
      usedPaths.add(candidate.b.pathIndex);
      selected.push(candidate);
    }

    if (!selected.length) {
      break;
    }

    const skipped = new Set();
    const nextPaths = [];

    for (const candidate of selected) {
      const aPath = working[candidate.a.pathIndex];
      const bPath = working[candidate.b.pathIndex];
      const aPoints = orientPathForJoin(aPath.points, candidate.a.atStart, true);
      const bPoints = orientPathForJoin(bPath.points, candidate.b.atStart, false);
      skipped.add(candidate.a.pathIndex);
      skipped.add(candidate.b.pathIndex);
      nextPaths.push({
        closed: false,
        points: concatenateJoinedPoints(aPoints, bPoints),
      });
    }

    for (let index = 0; index < working.length; index += 1) {
      if (!skipped.has(index)) {
        nextPaths.push(working[index]);
      }
    }

    joined += selected.length;
    working = nextPaths;
  }

  return { joined, paths: working };
}

function findAlignedGapCandidates(endpoints, maximumDistance, maximumAngle) {
  const grid = new Map();
  const cellSize = Math.max(1, maximumDistance);
  const maximumDistanceSquared = maximumDistance * maximumDistance;
  const minimumDot = Math.cos((maximumAngle * Math.PI) / 180);
  const candidates = [];

  for (const endpoint of endpoints) {
    const cellX = Math.floor(endpoint.point[0] / cellSize);
    const cellY = Math.floor(endpoint.point[1] / cellSize);
    const key = `${cellX},${cellY}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }

    grid.get(key).push(endpoint);
  }

  for (const endpoint of endpoints) {
    const cellX = Math.floor(endpoint.point[0] / cellSize);
    const cellY = Math.floor(endpoint.point[1] / cellSize);

    for (let y = cellY - 1; y <= cellY + 1; y += 1) {
      for (let x = cellX - 1; x <= cellX + 1; x += 1) {
        const bucket = grid.get(`${x},${y}`);

        if (!bucket) {
          continue;
        }

        for (const other of bucket) {
          if (other.index <= endpoint.index || other.pathIndex === endpoint.pathIndex) {
            continue;
          }

          const gap = [other.point[0] - endpoint.point[0], other.point[1] - endpoint.point[1]];
          const distanceSquared = gap[0] * gap[0] + gap[1] * gap[1];

          if (!distanceSquared || distanceSquared > maximumDistanceSquared) {
            continue;
          }

          const distance = Math.sqrt(distanceSquared);
          const gapDirection = [gap[0] / distance, gap[1] / distance];
          const oppositeGap = [-gapDirection[0], -gapDirection[1]];
          const endpointDot = dot(endpoint.direction, gapDirection);
          const otherDot = dot(other.direction, oppositeGap);
          const tangentDot = dot(endpoint.direction, [-other.direction[0], -other.direction[1]]);

          if (endpointDot < minimumDot || otherDot < minimumDot || tangentDot < minimumDot) {
            continue;
          }

          candidates.push({
            a: endpoint,
            b: other,
            score: distance + (3 - endpointDot - otherDot - tangentDot) * maximumDistance,
          });
        }
      }
    }
  }

  return candidates;
}

function orientPathForJoin(points, endpointAtStart, endpointShouldBeEnd) {
  if (endpointAtStart === endpointShouldBeEnd) {
    return [...points].reverse();
  }

  return points.map((point) => [...point]);
}

function concatenateJoinedPoints(aPoints, bPoints) {
  const joined = aPoints.map((point) => [...point]);
  const lastA = joined[joined.length - 1];
  const firstB = bPoints[0];

  if (pointDistance(lastA, firstB) < 0.5) {
    for (let i = 1; i < bPoints.length; i += 1) {
      joined.push([...bPoints[i]]);
    }
  } else {
    for (const point of bPoints) {
      joined.push([...point]);
    }
  }

  return joined;
}

function snapNearbyEndpoints(paths, maximumDistance) {
  const endpoints = buildEndpointRecords(paths);
  const candidates = findEndpointDistanceCandidates(endpoints, maximumDistance);
  const usedPaths = new Set();
  let snapped = 0;

  candidates.sort((a, b) => a.distance - b.distance);

  for (const candidate of candidates) {
    if (usedPaths.has(candidate.a.pathIndex) || usedPaths.has(candidate.b.pathIndex)) {
      continue;
    }

    usedPaths.add(candidate.a.pathIndex);
    usedPaths.add(candidate.b.pathIndex);

    const midpoint = [
      (candidate.a.point[0] + candidate.b.point[0]) / 2,
      (candidate.a.point[1] + candidate.b.point[1]) / 2,
    ];

    setEndpoint(paths[candidate.a.pathIndex], candidate.a.atStart, midpoint);
    setEndpoint(paths[candidate.b.pathIndex], candidate.b.atStart, midpoint);
    snapped += 1;
  }

  return snapped;
}

function findEndpointDistanceCandidates(endpoints, maximumDistance) {
  const grid = new Map();
  const cellSize = Math.max(1, maximumDistance);
  const maximumDistanceSquared = maximumDistance * maximumDistance;
  const candidates = [];

  for (const endpoint of endpoints) {
    const cellX = Math.floor(endpoint.point[0] / cellSize);
    const cellY = Math.floor(endpoint.point[1] / cellSize);
    const key = `${cellX},${cellY}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }

    grid.get(key).push(endpoint);
  }

  for (const endpoint of endpoints) {
    const cellX = Math.floor(endpoint.point[0] / cellSize);
    const cellY = Math.floor(endpoint.point[1] / cellSize);

    for (let y = cellY - 1; y <= cellY + 1; y += 1) {
      for (let x = cellX - 1; x <= cellX + 1; x += 1) {
        const bucket = grid.get(`${x},${y}`);

        if (!bucket) {
          continue;
        }

        for (const other of bucket) {
          if (other.index <= endpoint.index || other.pathIndex === endpoint.pathIndex) {
            continue;
          }

          const distanceSquared =
            (other.point[0] - endpoint.point[0]) ** 2 +
            (other.point[1] - endpoint.point[1]) ** 2;

          if (distanceSquared <= maximumDistanceSquared) {
            candidates.push({
              a: endpoint,
              b: other,
              distance: Math.sqrt(distanceSquared),
            });
          }
        }
      }
    }
  }

  return candidates;
}

function setEndpoint(path, atStart, point) {
  const index = atStart ? 0 : path.points.length - 1;
  path.points[index] = [...point];
}

function smoothOpenPaths(paths, passes) {
  let smoothed = 0;

  for (const path of paths) {
    if (path.points.length < 4) {
      continue;
    }

    for (let pass = 0; pass < passes; pass += 1) {
      const nextPoints = path.points.map((point) => [...point]);
      const start = path.closed ? 0 : 1;
      const end = path.closed ? path.points.length : path.points.length - 1;

      for (let index = start; index < end; index += 1) {
        const previous = path.points[(index - 1 + path.points.length) % path.points.length];
        const current = path.points[index];
        const next = path.points[(index + 1) % path.points.length];
        nextPoints[index] = [
          previous[0] * 0.25 + current[0] * 0.5 + next[0] * 0.25,
          previous[1] * 0.25 + current[1] * 0.5 + next[1] * 0.25,
        ];
      }

      path.points = nextPoints;
    }

    smoothed += 1;
  }

  return smoothed;
}

function normalizeVector(vector) {
  const length = Math.hypot(vector[0], vector[1]);

  if (!length) {
    return null;
  }

  return [vector[0] / length, vector[1] / length];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function pointDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function centerlinePathsToSvg(paths, indent = "    ") {
  return paths
    .map(({ points, closed }) => {
      const commands = [`M ${formatNumber(points[0][0])} ${formatNumber(points[0][1])}`];

      for (let i = 1; i < points.length; i += 1) {
        commands.push(`L ${formatNumber(points[i][0])} ${formatNumber(points[i][1])}`);
      }

      if (closed) {
        commands.push("Z");
      }

      return `${indent}<path d="${commands.join(" ")}"/>`;
    })
    .join("\n");
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSvg(paths, width, height, settings, compare = null) {
  const background = settings.whiteBackground
    ? `  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>\n`
    : "";
  const blackPaths = centerlinePathsToSvg(paths);
  const compareLayer = compare
    ? `  <g fill="none" stroke="#d71920" stroke-opacity="0.48" stroke-width="${compare.settings.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
${centerlinePathsToSvg(compare.paths)}
  </g>
`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Vector trace of abstract robot line drawings">
  <title>Centerline Vector Drawing</title>
  <desc>Single-stroke centerline vector paths traced from ${escapeXml(state.imageName)}. The paper background and marker thickness have been removed.</desc>
${background}  <g fill="none" stroke="#111111" stroke-width="${settings.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
${blackPaths}
  </g>
${compareLayer}
</svg>
`;
}

function cloneSettings(settings) {
  return { ...settings };
}

function buildFilteredBaseMask(settings) {
  const width = state.image.naturalWidth;
  const height = state.image.naturalHeight;
  const imageData = sourceContext.getImageData(0, 0, width, height);
  const rawMask = buildGrayAndInk(imageData, settings);
  const mask = removeSmallComponents(rawMask, width, height, settings.minimumArea);

  return { mask, width, height };
}

function buildFilteredMask(settings) {
  const filtered = buildFilteredBaseMask(settings);
  return {
    mask: applyBitmapEdits(filtered.mask, filtered.width, filtered.height),
    width: filtered.width,
    height: filtered.height,
  };
}

function generateVectorTrace(settings) {
  const filtered = buildFilteredMask(settings);
  const { mask, width, height } = filtered;
  const skeleton = skeletonize(mask, width, height);
  const rawPaths = traceCenterlinePaths(skeleton, width, height, settings);
  const cleanup = applyPathCleanups(rawPaths, settings);

  return {
    width,
    height,
    filteredMask: mask,
    skeleton,
    paths: cleanup.paths,
    stats: cleanup.stats,
  };
}

function traceImage() {
  if (!state.image) {
    setStatus("Open an image first");
    return;
  }

  setBusy(true);
  setWorkingOverlay(true, "Generating paths");
  setStatus("Tracing");
  const previousFocus = getCloseupCenterPoint(state.closeupZoom) || (hasFocusPoint() ? [state.focusX, state.focusY] : null);
  resetDownload(false);

  afterWorkingOverlayPaint(() => {
    try {
      const settings = cloneSettings(getSettings());
      const trace = generateVectorTrace(settings);
      const svg = buildSvg(trace.paths, trace.width, trace.height, settings);
      const [focusX, focusY] = previousFocus && isPointInsideImage(previousFocus, trace.width, trace.height)
        ? previousFocus
        : findCloseupFocus(trace.skeleton, trace.width, trace.height);
      state.focusX = focusX;
      state.focusY = focusY;
      state.baseline = {
        paths: trace.paths,
        settings,
        stats: trace.stats,
        width: trace.width,
        height: trace.height,
      };
      state.compare = null;

      drawFilteredBitmap(trace.filteredMask, trace.width, trace.height);
      drawCenterlines(trace.skeleton, trace.width, trace.height);
      setDownload(svg, trace.width, trace.height);
      setStatus(formatTraceStatus(trace.paths.length, trace.stats));
      updateCompareStatus();
    } catch (error) {
      setStatus(error.message || "Trace failed");
    } finally {
      setBusy(false);
      setWorkingOverlay(false);
    }
  });
}

function renderBaselineWithCompare(resetPosition = false) {
  if (!state.baseline) {
    return;
  }

  const svg = buildSvg(
    state.baseline.paths,
    state.baseline.width,
    state.baseline.height,
    state.baseline.settings,
    state.compare
  );
  setSvgPreview(svg, state.baseline.width, state.baseline.height, resetPosition);
}

function clearComparePreview() {
  state.previewRequestId += 1;
  state.compare = null;
  renderBaselineWithCompare(false);
  updateCompareStatus();
}

function requestComparePreview() {
  if (!elements.compareMode.checked) {
    clearComparePreview();
    return;
  }

  if (!state.image) {
    updateCompareStatus();
    return;
  }

  if (!state.baseline) {
    updateCompareStatus();
    setStatus("Generate black baseline first");
    return;
  }

  if (state.isBusy) {
    return;
  }

  const requestId = state.previewRequestId + 1;
  state.previewRequestId = requestId;
  const previousFocus = getCloseupCenterPoint(state.closeupZoom) || (hasFocusPoint() ? [state.focusX, state.focusY] : null);

  setBusy(true);
  setWorkingOverlay(true, "Generating red preview");
  setStatus("Comparing tweaks");

  afterWorkingOverlayPaint(() => {
    try {
      if (requestId !== state.previewRequestId || !elements.compareMode.checked || !state.baseline) {
        return;
      }

      const settings = cloneSettings(getSettings());
      const trace = generateVectorTrace(settings);
      const [focusX, focusY] = previousFocus && isPointInsideImage(previousFocus, trace.width, trace.height)
        ? previousFocus
        : findCloseupFocus(trace.skeleton, trace.width, trace.height);
      state.focusX = focusX;
      state.focusY = focusY;
      state.compare = {
        paths: trace.paths,
        settings,
        stats: trace.stats,
      };

      drawFilteredBitmap(trace.filteredMask, trace.width, trace.height);
      drawCenterlines(trace.skeleton, trace.width, trace.height);
      renderBaselineWithCompare(false);
      setStatus(`Red preview ${formatTraceStatus(trace.paths.length, trace.stats)}`);
      updateCompareStatus();
    } catch (error) {
      setStatus(error.message || "Red preview failed");
    } finally {
      setBusy(false);
      setWorkingOverlay(false);
    }
  });
}

function formatTraceStatus(pathCount, stats) {
  const parts = [`${pathCount.toLocaleString()} centerline paths`];

  if (stats.joined) {
    parts.push(`joined ${stats.joined.toLocaleString()}`);
  }

  if (stats.snapped) {
    parts.push(`snapped ${stats.snapped.toLocaleString()}`);
  }

  if (stats.smoothed) {
    parts.push(`smoothed ${stats.smoothed.toLocaleString()}`);
  }

  return parts.join(" · ");
}

function isPointInsideImage(point, width, height) {
  return point[0] >= 0 && point[0] <= width && point[1] >= 0 && point[1] <= height;
}

elements.fileInput.addEventListener("change", (event) => readFile(event.target.files[0]));
elements.cameraInput.addEventListener("change", (event) => readFile(event.target.files[0]));
elements.sampleButton.addEventListener("click", () => {
  loadImageFromUrl(SAMPLE_IMAGE, "source-robots.png").catch((error) => setStatus(error.message));
});
elements.traceButton.addEventListener("click", traceImage);
elements.copySettingsButton.addEventListener("click", copySettings);
elements.closeupZoom.addEventListener("input", () => {
  saveSettings();
  updateCloseupZoom(false);
});
elements.resetCloseup.addEventListener("click", resetCloseupView);
window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "svg-focus") {
    return;
  }

  focusCloseupAt(Number(event.data.x), Number(event.data.y));
});

const vectorSliders = [
  elements.absoluteThreshold,
  elements.relativeThreshold,
  elements.blurRadius,
  elements.minimumArea,
  elements.strokeWidth,
  elements.simplifyAmount,
  elements.minimumPathLength,
  elements.joinDistance,
  elements.joinAngle,
  elements.snapDistance,
  elements.smoothPasses,
];

const vectorToggles = [
  elements.medianFilter,
  elements.joinAlignedGaps,
  elements.snapEndpoints,
  elements.smoothPaths,
];

for (const input of vectorSliders) {
  input.addEventListener("input", () => {
    updateOutputs();
    saveSettings();
    previewFilteredBitmap();
  });

  input.addEventListener("change", () => {
    updateOutputs();
    saveSettings();
    requestComparePreview();
  });
}

for (const input of vectorToggles) {
  input.addEventListener("change", () => {
    saveSettings();
    previewFilteredBitmap();
    requestComparePreview();
  });
}

elements.whiteBackground.addEventListener("change", saveSettings);
elements.compareMode.addEventListener("change", () => {
  saveSettings();

  if (elements.compareMode.checked) {
    updateCompareStatus();
  } else {
    clearComparePreview();
  }
});

loadSettings();
state.closeupZoom = Number(elements.closeupZoom.value);
updateOutputs();
updateCompareStatus();
updateFilteredBitmapZoom(true);
installBitmapEditTools();
installFilteredBitmapInspector();
installCloseupDragging();
loadImageFromUrl(SAMPLE_IMAGE, "source-robots.png").catch(() => {
  setStatus("Open an image");
});
