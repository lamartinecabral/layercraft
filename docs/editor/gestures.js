import { dom, getActiveLayer, state } from "./state.js";
import { applyViewportTransform } from "./viewport.js";
import { render } from "./render.js";
import { updateLayerSizeInputs, updateUI } from "./ui.js";

const pointer = (event) => {
  const rect = dom.canvas.getBoundingClientRect();
  const x = event.clientX ?? event.touches[0].clientX;
  const y = event.clientY ?? event.touches[0].clientY;
  return {
    x: ((x - rect.left) * dom.canvas.width) / rect.width,
    y: ((y - rect.top) * dom.canvas.height) / rect.height,
  };
};

function hit(pos, layer) {
  if (!layer) return null;
  let dx = pos.x - layer.x - layer.width / 2,
    dy = pos.y - layer.y - layer.height / 2;
  if (layer.rotation) {
    const angle = (-layer.rotation * Math.PI) / 180;
    [dx, dy] = [
      dx * Math.cos(angle) - dy * Math.sin(angle),
      dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
  }
  const w = layer.width / 2,
    h = layer.height / 2,
    threshold = 15 / state.zoom,
    rotationY = -h - 25 / state.zoom;
  if (Math.hypot(dx, dy - rotationY) <= threshold) return "rotate";
  for (const [name, x, y] of [
    ["nw", -w, -h],
    ["ne", w, -h],
    ["se", w, h],
    ["sw", -w, h],
  ])
    if (Math.hypot(dx - x, dy - y) <= threshold) return name;
  return dx >= -w && dx <= w && dy >= -h && dy <= h ? "move" : null;
}

function begin(event) {
  if (!state.layers.length) return;
  const pos = pointer(event);
  if (state.activeTool === "pan") {
    state.isPanning = true;
    state.panStart = {
      x: event.clientX - state.panX,
      y: event.clientY - state.panY,
    };
    return;
  }

  let layer = getActiveLayer(),
    type = hit(pos, layer);
  if (!type)
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const candidate = state.layers[i];
      if (!candidate.visible || candidate.locked) continue;
      if (hit(pos, candidate) === "move") {
        layer = candidate;
        type = "move";
        state.activeLayerId = layer.id;
        updateUI();
        break;
      }
    }
  if (!type || !layer) return;

  state.dragState = {
    type,
    startX: pos.x,
    startY: pos.y,
    initialX: layer.x,
    initialY: layer.y,
    initialW: layer.width,
    initialH: layer.height,
    centerX: layer.x + layer.width / 2,
    centerY: layer.y + layer.height / 2,
  };
  render();
}

function move(event) {
  if (state.isPanning) {
    state.panX = event.clientX - state.panStart.x;
    state.panY = event.clientY - state.panStart.y;
    applyViewportTransform();
    return;
  }

  if (!state.dragState) return;

  const layer = getActiveLayer();
  if (!layer) return;

  const pos = pointer(event),
    drag = state.dragState;

  if (drag.type === "move") {
    layer.x = drag.initialX + pos.x - drag.startX;
    layer.y = drag.initialY + pos.y - drag.startY;
  } else if (drag.type === "rotate") {
    layer.rotation = Math.round(
      ((Math.atan2(pos.y - drag.centerY, pos.x - drag.centerX) * 180) /
        Math.PI +
        90) %
        360,
    );
  } else {
    const dx = pos.x - drag.startX,
      dy = pos.y - drag.startY;
    layer.width = Math.max(
      20,
      drag.initialW +
        (drag.type.includes("e") ? dx : drag.type.includes("w") ? -dx : 0),
    );
    layer.height = Math.max(
      20,
      drag.initialH +
        (drag.type.includes("s") ? dy : drag.type.includes("n") ? -dy : 0),
    );
    if (drag.type.includes("w")) layer.x = drag.initialX + dx;
    if (drag.type.includes("n")) layer.y = drag.initialY + dy;
  }

  updateLayerSizeInputs();
  render();
}

export function setupGestures() {
  dom.canvas.addEventListener("mousedown", begin);
  dom.canvas.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length === 1) {
        begin(event.touches[0]);
        event.preventDefault();
      }
    },
    { passive: false },
  );
  window.addEventListener("mousemove", move);
  window.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length === 1) {
        move(event.touches[0]);
        event.preventDefault();
      }
    },
    { passive: false },
  );

  for (const name of ["mouseup", "touchend", "touchcancel"])
    window.addEventListener(name, () => {
      state.dragState = null;
      state.isPanning = false;
    });
}
