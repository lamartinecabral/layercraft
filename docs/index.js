// Core State
const state = {
  canvasWidth: 1080,
  canvasHeight: 1080,
  zoom: 1,
  panX: 0,
  panY: 0,
  layers: [], // Array of { id, name, img, x, y, width, height, rotation, opacity, blendMode, visible, locked, filters }
  activeLayerId: null,
  activeTool: 'move', // 'move', 'pan'
  isPanning: false,
  panStart: { x: 0, y: 0 },
  dragState: null, // For layer moving / resizing / rotating
  nextLayerNum: 1
};

// DOM Elements
const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const viewportContainer = document.getElementById('viewport-container');
const canvasWrapper = document.getElementById('canvas-wrapper');
const emptyState = document.getElementById('empty-state');
const layersList = document.getElementById('layers-list');

// Inputs & Controls
const opacitySlider = document.getElementById('opacity-slider');
const opacityValDisplay = document.getElementById('opacity-val-display');
const blendModeSelect = document.getElementById('blend-mode-select');
const inputFile = document.getElementById('input-file');

// Filter Controls
const filterBrightness = document.getElementById('filter-brightness');
const filterContrast = document.getElementById('filter-contrast');
const filterSaturate = document.getElementById('filter-saturate');
const filterHue = document.getElementById('filter-hue');
const filterBlur = document.getElementById('filter-blur');
const filterGamma = document.getElementById('filter-gamma');
const filterSCurve = document.getElementById('filter-scurve');
const layerWidthInput = document.getElementById('layer-width-input');
const layerHeightInput = document.getElementById('layer-height-input');

window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupEventListeners();
  resizeViewportCanvas();
  render();
});

// Initialize Canvas size
function initCanvasDimensions(w, h) {
  state.canvasWidth = w;
  state.canvasHeight = h;
  canvas.width = w;
  canvas.height = h;
  document.getElementById('canvas-dim-display').textContent = `${w} × ${h} px`;
  fitCanvasToScreen();
}

function addImageLayer(imgElement, name = null) {
  // First image loaded sets canvas base resolution
  if (state.layers.length === 0) {
    initCanvasDimensions(imgElement.naturalWidth || 1080, imgElement.naturalHeight || 1080);
  }

  const layerId = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const layerName = name || `Layer ${state.nextLayerNum++}`;

  // Center image within canvas
  const imgW = imgElement.naturalWidth || 500;
  const imgH = imgElement.naturalHeight || 500;
  const x = (state.canvasWidth - imgW) / 2;
  const y = (state.canvasHeight - imgH) / 2;

  const newLayer = {
    id: layerId,
    name: layerName,
    img: imgElement,
    x: x,
    y: y,
    width: imgW,
    height: imgH,
    rotation: 0,
    opacity: 100,
    blendMode: 'source-over',
    visible: true,
    locked: false,
    filters: {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hue: 0,
      blur: 0,
      gamma: 0,
      sCurve: 0
    }
  };

  // Add new layer on top of stack
  state.layers.push(newLayer);
  state.activeLayerId = layerId;

  updateUI();
  render();
}

function addSolidLayer(h, s, l) {
  // If first layer, initialize canvas dimension to default 1080x1080
  if (state.layers.length === 0) {
    initCanvasDimensions(1080, 1080);
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = state.canvasWidth;
  tempCanvas.height = state.canvasHeight;
  const tCtx = tempCanvas.getContext('2d');
  tCtx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
  tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  const solidImg = new Image();
  solidImg.onload = () => {
    const layerId = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const layerName = `Solid (${h}°, ${s}%, ${l}%)`;

    const newLayer = {
      id: layerId,
      name: layerName,
      img: solidImg,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
      rotation: 0,
      opacity: 100,
      blendMode: 'source-over',
      visible: true,
      locked: false,
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        hue: 0,
        blur: 0,
        gamma: 0,
        sCurve: 0
      }
    };

    state.layers.push(newLayer);
    state.activeLayerId = layerId;
    updateUI();
    render();
  };
  solidImg.src = tempCanvas.toDataURL('image/png');
}

function applyMathFunctionFilter(filterKey) {
  const active = getActiveLayer();
  if (!active) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = active.width;
  tempCanvas.height = active.height;
  const tCtx = tempCanvas.getContext('2d');

  // Draw layer image onto temp canvas
  tCtx.drawImage(active.img, 0, 0, active.width, active.height);

  if (["multiply", "screen", "overlay", "color-dodge", "color-burn", "soft-light", "exclusion"].includes(filterKey)){
    // Self-blend
    tCtx.globalCompositeOperation = filterKey;
    tCtx.drawImage(active.img, 0, 0, active.width, active.height);
  } else {
    const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      if (filterKey === 'invert') {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      } else if (filterKey === 'sin') {
        r = Math.round(255 * Math.abs(Math.sin((r * 2 * Math.PI) / 255)));
        g = Math.round(255 * Math.abs(Math.sin((g * 2 * Math.PI) / 255)));
        b = Math.round(255 * Math.abs(Math.sin((b * 2 * Math.PI) / 255)));
      } else if (filterKey === 'cos') {
        r = Math.round(255 * Math.abs(Math.cos((r * 2 * Math.PI) / 255)));
        g = Math.round(255 * Math.abs(Math.cos((g * 2 * Math.PI) / 255)));
        b = Math.round(255 * Math.abs(Math.cos((b * 2 * Math.PI) / 255)));
      } else if (filterKey === 'solarize') {
        r = Math.round(255 * (1 - Math.abs(2 * (r / 255) - 1)));
        g = Math.round(255 * (1 - Math.abs(2 * (g / 255) - 1)));
        b = Math.round(255 * (1 - Math.abs(2 * (b / 255) - 1)));
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    tCtx.putImageData(imgData, 0, 0);
  }

  const filteredImg = new Image();
  filteredImg.onload = () => {
    active.img = filteredImg;
    active.name = `${active.name} (${filterKey})`;
    updateUI();
    render();
  };
  filteredImg.src = tempCanvas.toDataURL('image/png');
}

function getActiveLayer() {
  return state.layers.find(l => l.id === state.activeLayerId);
}

function updateLayerSizeInputs() {
  const active = getActiveLayer();
  if (!active) return;

  layerWidthInput.value = Math.round(active.width);
  layerHeightInput.value = Math.round(active.height);
}

function deleteActiveLayer() {
  if (!state.activeLayerId) return;
  const index = state.layers.findIndex(l => l.id === state.activeLayerId);
  if (index === -1) return;

  state.layers.splice(index, 1);

  if (state.layers.length === 0) {
    state.activeLayerId = null;
  } else {
    // Select the layer below (which now sits at index - 1, or 0 if we deleted the bottom layer)
    const newIndex = Math.max(0, index - 1);
    state.activeLayerId = state.layers[newIndex].id;
  }

  updateUI();
  render();
}

function duplicateActiveLayer() {
  const activeIndex = state.layers.findIndex(l => l.id === state.activeLayerId);
  if (activeIndex === -1) return;
  const active = state.layers[activeIndex];

  // When duplicating a layer, increment a counter in the name of the new layer, or add the number 2 if there is no counter in the name
  let newName;
  const match = active.name.match(/^(.*?)(\d+)(\D*)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10) + 1;
    const suffix = match[3];
    newName = `${prefix}${num}${suffix}`;
  } else {
    newName = `${active.name} 2`;
  }

  const newLayer = {
    ...JSON.parse(JSON.stringify(active)),
    id: 'layer_' + Date.now(),
    name: newName,
    img: active.img, // Reference same HTMLImageElement
    x: active.x,
    y: active.y
  };

  state.layers.splice(activeIndex + 1, 0, newLayer);
  state.activeLayerId = newLayer.id;
  updateUI();
  render();
}

function mergeActiveLayerDown() {
  const activeIndex = state.layers.findIndex(l => l.id === state.activeLayerId);
  if (activeIndex <= 0) return;

  const active = state.layers[activeIndex];
  const below = state.layers[activeIndex - 1];
  const mergeCanvas = document.createElement('canvas');
  mergeCanvas.width = state.canvasWidth;
  mergeCanvas.height = state.canvasHeight;
  const mergeCtx = mergeCanvas.getContext('2d');

  [below, active].forEach(layer => {
    drawLayerToContext(mergeCtx, layer);
  });

  const mergedImg = new Image();
  mergedImg.onload = () => {
    const mergedLayer = {
      id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: `${below.name} + ${active.name}`,
      img: mergedImg,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
      rotation: 0,
      opacity: 100,
      blendMode: 'source-over',
      visible: true,
      locked: false,
      filters: { brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0, gamma: 0, sCurve: 0 }
    };

    state.layers.splice(activeIndex - 1, 2, mergedLayer);
    state.activeLayerId = mergedLayer.id;
    updateUI();
    render();
  };
  mergedImg.src = mergeCanvas.toDataURL('image/png');
}

function moveLayerOrder(direction) {
  const index = state.layers.findIndex(l => l.id === state.activeLayerId);
  if (index === -1) return;

  if (direction === 'up' && index < state.layers.length - 1) {
    const temp = state.layers[index];
    state.layers[index] = state.layers[index + 1];
    state.layers[index + 1] = temp;
  } else if (direction === 'down' && index > 0) {
    const temp = state.layers[index];
    state.layers[index] = state.layers[index - 1];
    state.layers[index - 1] = temp;
  }

  updateUI();
  render();
}

function drawLayerToContext(targetCtx, layer) {
  if (!layer.visible) return;

  targetCtx.save();
  targetCtx.globalAlpha = layer.opacity / 100;
  targetCtx.globalCompositeOperation = layer.blendMode || 'source-over';

  const f = layer.filters;
  const hasGamma = f.gamma !== undefined && f.gamma !== 0;
  const hasSCurve = f.sCurve !== undefined && f.sCurve !== 0;

  if (hasGamma || hasSCurve) {
    // Gamma and screen gamma are applied via an offscreen canvas for pixel manipulation.
    const offCanvas = document.createElement('canvas');
    offCanvas.width = layer.width;
    offCanvas.height = layer.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) blur(${f.blur}px)`;
    offCtx.drawImage(layer.img, 0, 0, layer.width, layer.height);

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      if (hasGamma) {
        r = transforms.gamma(r, f.gamma);
        g = transforms.gamma(g, f.gamma);
        b = transforms.gamma(b, f.gamma);
      }
      if (hasSCurve) {
        r = transforms.sCurve(r, f.sCurve);
        g = transforms.sCurve(g, f.sCurve);
        b = transforms.sCurve(b, f.sCurve);
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    offCtx.putImageData(imgData, 0, 0);

    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    targetCtx.translate(centerX, centerY);
    if (layer.rotation) targetCtx.rotate((layer.rotation * Math.PI) / 180);
    targetCtx.drawImage(offCanvas, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  } else {
    targetCtx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) blur(${f.blur}px)`;
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    targetCtx.translate(centerX, centerY);
    if (layer.rotation) targetCtx.rotate((layer.rotation * Math.PI) / 180);
    targetCtx.drawImage(layer.img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  }

  targetCtx.restore();
}

function precomputeTransformation(func) {
  const memo = Array(256).fill(0).map(() => []);
  for(let source = 0; source < 256; source++) {
    for(let step = 0; step <= 100; step++) {
      const value = +(step / 10 - 5).toFixed(1); // [-5.0, 5.0] in 0.1 increments
      memo[source][step] = Math.round(255 * func(source / 255, value));
    }
  }
  return (source, value) => {
    const y = Math.round(value * 10 + 50);
    if(y < 0 || y > 100) throw new Error(`Factor out of bounds: ${value}. Must be between -5.0 and 5.0.`);
    return memo[source][y];
  };
}

const transforms = {
  gamma: precomputeTransformation((x, y) => {
    return y > 0
      ? Math.pow(x, 1 / Math.pow(2, y))
      : 1 - Math.pow(1 - x, 1 / Math.pow(2, -y));
  }),

  sCurve: precomputeTransformation((x, y) => {
    return x < 0.5
      ? Math.pow(x * 2, Math.pow(2, y / 2)) / 2
      : 1 - Math.pow((1 - x) * 2, Math.pow(2, y / 2)) / 2;
  }),
}

function render() {
  // Hide/Show Empty State
  if (state.layers.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Iterate and draw layers from bottom (index 0) to top
  state.layers.forEach(layer => {
    drawLayerToContext(ctx, layer);
  });

  // Draw bounding box and transform handles for selected layer
  drawTransformHandles();
}

function drawTransformHandles() {
  const active = getActiveLayer();
  if (!active || !active.visible || state.activeTool !== 'move') return;

  ctx.save();
  
  const centerX = active.x + active.width / 2;
  const centerY = active.y + active.height / 2;

  ctx.translate(centerX, centerY);
  if (active.rotation) {
    ctx.rotate((active.rotation * Math.PI) / 180);
  }

  const halfW = active.width / 2;
  const halfH = active.height / 2;

  // Bounding Box Line
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);
  ctx.strokeRect(-halfW, -halfH, active.width, active.height);
  ctx.setLineDash([]);

  // Corner Handles
  const handleSize = 10 / state.zoom;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2 / state.zoom;

  const corners = [
    { x: -halfW, y: -halfH }, // NW
    { x: halfW, y: -halfH },  // NE
    { x: halfW, y: halfH },   // SE
    { x: -halfW, y: halfH }   // SW
  ];

  corners.forEach(c => {
    ctx.beginPath();
    ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  });

  // Rotation Handle
  const rotY = -halfH - (25 / state.zoom);
  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(0, rotY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, rotY, handleSize / 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function getCanvasPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function checkHandleHit(pos, active) {
  if (!active) return null;

  const centerX = active.x + active.width / 2;
  const centerY = active.y + active.height / 2;

  // Translate mouse position to layer space
  let dx = pos.x - centerX;
  let dy = pos.y - centerY;

  if (active.rotation) {
    const rad = (-active.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    dx = rx;
    dy = ry;
  }

  const halfW = active.width / 2;
  const halfH = active.height / 2;
  const threshold = 15 / state.zoom;

  // Check Rotation Handle
  const rotY = -halfH - (25 / state.zoom);
  if (Math.hypot(dx - 0, dy - rotY) <= threshold) return 'rotate';

  // Check Corners
  if (Math.hypot(dx - (-halfW), dy - (-halfH)) <= threshold) return 'nw';
  if (Math.hypot(dx - halfW, dy - (-halfH)) <= threshold) return 'ne';
  if (Math.hypot(dx - halfW, dy - halfH) <= threshold) return 'se';
  if (Math.hypot(dx - (-halfW), dy - halfH) <= threshold) return 'sw';

  // Check inside layer box
  if (dx >= -halfW && dx <= halfW && dy >= -halfH && dy <= halfH) return 'move';

  return null;
}

canvas.addEventListener('mousedown', (e) => {
  if (state.layers.length === 0) return;

  const pos = getCanvasPointerPos(e);

  if (state.activeTool === 'pan') {
    state.isPanning = true;
    state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    return;
  }

  const active = getActiveLayer();
  const handle = checkHandleHit(pos, active);

  if (handle) {
    state.dragState = {
      type: handle,
      startX: pos.x,
      startY: pos.y,
      initialX: active.x,
      initialY: active.y,
      initialW: active.width,
      initialH: active.height,
      initialRot: active.rotation || 0,
      centerX: active.x + active.width / 2,
      centerY: active.y + active.height / 2
    };
  } else {
    // Pick layer under pointer (top to bottom search)
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i];
      if (!layer.visible || layer.locked) continue;

      const h = checkHandleHit(pos, layer);
      if (h === 'move') {
        state.activeLayerId = layer.id;
        updateUI();
        state.dragState = {
          type: 'move',
          startX: pos.x,
          startY: pos.y,
          initialX: layer.x,
          initialY: layer.y
        };
        render();
        return;
      }
    }
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (state.layers.length === 0) return;
  if (e.touches.length !== 1) return; // Only handle single touch for dragging/panning

  const touch = e.touches[0];
  const pos = getCanvasPointerPos(touch);

  if (state.activeTool === 'pan') {
    state.isPanning = true;
    state.panStart = { x: touch.clientX - state.panX, y: touch.clientY - state.panY };
    return;
  }

  const active = getActiveLayer();
  const handle = checkHandleHit(pos, active);

  if (handle) {
    state.dragState = {
      type: handle,
      startX: pos.x,
      startY: pos.y,
      initialX: active.x,
      initialY: active.y,
      initialW: active.width,
      initialH: active.height,
      initialRot: active.rotation || 0,
      centerX: active.x + active.width / 2,
      centerY: active.y + active.height / 2
    };
  } else {
    // Pick layer under pointer (top to bottom search)
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i];
      if (!layer.visible || layer.locked) continue;

      const h = checkHandleHit(pos, layer);
      if (h === 'move') {
        state.activeLayerId = layer.id;
        updateUI();
        state.dragState = {
          type: 'move',
          startX: pos.x,
          startY: pos.y,
          initialX: layer.x,
          initialY: layer.y
        };
        render();
        return;
      }
    }
  }
  e.preventDefault();
}, { passive: false });

window.addEventListener('mousemove', (e) => {
  if (state.isPanning) {
    state.panX = e.clientX - state.panStart.x;
    state.panY = e.clientY - state.panStart.y;
    applyViewportTransform();
    return;
  }

  if (!state.dragState) return;

  const pos = getCanvasPointerPos(e);
  const active = getActiveLayer();
  if (!active) return;

  const drag = state.dragState;

  if (drag.type === 'move') {
    const dx = pos.x - drag.startX;
    const dy = pos.y - drag.startY;
    active.x = drag.initialX + dx;
    active.y = drag.initialY + dy;
  } else if (drag.type === 'rotate') {
    const rad = Math.atan2(pos.y - drag.centerY, pos.x - drag.centerX);
    let deg = (rad * 180) / Math.PI + 90;
    active.rotation = Math.round(deg % 360);
  } else if (['nw', 'ne', 'se', 'sw'].includes(drag.type)) {
    // Scale calculations
    const dx = pos.x - drag.startX;
    const dy = pos.y - drag.startY;

    let newW = drag.initialW;
    let newH = drag.initialH;

    if (drag.type.includes('e')) newW += dx;
    if (drag.type.includes('w')) {
      newW -= dx;
      active.x = drag.initialX + dx;
    }
    if (drag.type.includes('s')) newH += dy;
    if (drag.type.includes('n')) {
      newH -= dy;
      active.y = drag.initialY + dy;
    }

    // Minimum size check
    active.width = Math.max(20, newW);
    active.height = Math.max(20, newH);
  }

  updateLayerSizeInputs();
  render();
});

window.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];

  if (state.isPanning) {
    state.panX = touch.clientX - state.panStart.x;
    state.panY = touch.clientY - state.panStart.y;
    applyViewportTransform();
    e.preventDefault();
    return;
  }

  if (!state.dragState) return;

  const pos = getCanvasPointerPos(touch);
  const active = getActiveLayer();
  if (!active) return;

  const drag = state.dragState;

  if (drag.type === 'move') {
    const dx = pos.x - drag.startX;
    const dy = pos.y - drag.startY;
    active.x = drag.initialX + dx;
    active.y = drag.initialY + dy;
  } else if (drag.type === 'rotate') {
    const rad = Math.atan2(pos.y - drag.centerY, pos.x - drag.centerX);
    let deg = (rad * 180) / Math.PI + 90;
    active.rotation = Math.round(deg % 360);
  } else if (['nw', 'ne', 'se', 'sw'].includes(drag.type)) {
    // Scale calculations
    const dx = pos.x - drag.startX;
    const dy = pos.y - drag.startY;

    let newW = drag.initialW;
    let newH = drag.initialH;

    if (drag.type.includes('e')) newW += dx;
    if (drag.type.includes('w')) {
      newW -= dx;
      active.x = drag.initialX + dx;
    }
    if (drag.type.includes('s')) newH += dy;
    if (drag.type.includes('n')) {
      newH -= dy;
      active.y = drag.initialY + dy;
    }

    // Minimum size check
    active.width = Math.max(20, newW);
    active.height = Math.max(20, newH);
  }

  updateLayerSizeInputs();
  render();
  e.preventDefault();
}, { passive: false });

window.addEventListener('mouseup', () => {
  state.dragState = null;
  state.isPanning = false;
});

window.addEventListener('touchend', () => {
  state.dragState = null;
  state.isPanning = false;
});

window.addEventListener('touchcancel', () => {
  state.dragState = null;
  state.isPanning = false;
});

function applyViewportTransform() {
  canvasWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  document.getElementById('zoom-level-display').textContent = `${Math.round(state.zoom * 100)}%`;
}

function fitCanvasToScreen() {
  const containerW = viewportContainer.clientWidth - 80;
  const containerH = viewportContainer.clientHeight - 80;

  const scaleX = containerW / state.canvasWidth;
  const scaleY = containerH / state.canvasHeight;

  state.zoom = Math.min(scaleX, scaleY, 1);
  state.panX = 0;
  state.panY = 0;
  applyViewportTransform();
}

function resizeViewportCanvas() {
  fitCanvasToScreen();
}

window.addEventListener('resize', resizeViewportCanvas);

viewportContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  state.zoom = Math.max(0.1, Math.min(3, state.zoom + delta));
  applyViewportTransform();
  render();
});

function updateUI() {
  const active = getActiveLayer();

  // Render Layers List
  layersList.innerHTML = '';

  state.layers.slice().reverse().forEach((layer) => {
    const isSelected = layer.id === state.activeLayerId;

    const item = document.createElement('div');
    item.className = `group/layer flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition relative ${
      isSelected 
      ? 'bg-indigo-600/20 border-indigo-500/50 text-white' 
      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
    }`;

    item.innerHTML = `
      <button class="btn-vis text-slate-400 hover:text-white p-1">
        <i data-lucide="${layer.visible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
      </button>
      <div class="w-8 h-8 rounded bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0">
        <img src="${layer.img.src}" class="w-full h-full object-cover">
      </div>
      <span class="layer-name-span font-medium truncate flex-1">${layer.name}</span>
      <button class="btn-rename opacity-0 group-hover/layer:opacity-100 transition p-1 text-slate-400 hover:text-white rounded" title="Rename Layer">
        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
      </button>
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 font-mono">${layer.opacity}%</span>
    `;

    // Select layer on click
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-vis') || e.target.closest('.btn-rename') || e.target.closest('input')) return;
      state.activeLayerId = layer.id;
      updateUI();
      render();
    });

    // Visibility Toggle
    item.querySelector('.btn-vis').addEventListener('click', (e) => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      updateUI();
      render();
    });

    // Rename Button
    item.querySelector('.btn-rename').addEventListener('click', (e) => {
      e.stopPropagation();
      const nameSpan = item.querySelector('.layer-name-span');
      const currentName = layer.name;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded border border-indigo-500 outline-none flex-1 font-medium';

      nameSpan.replaceWith(input);
      input.focus();
      input.select();

      input.addEventListener('blur', updateUI);
      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          const newName = input.value.trim();
          if (newName) {
            layer.name = newName;
          }
          updateUI();
        } else if (evt.key === 'Escape') {
          updateUI();
        }
      });
    });

    layersList.appendChild(item);
  });

  const activeIndex = state.layers.findIndex(l => l.id === state.activeLayerId);
  const mergeButton = document.getElementById('btn-merge-layer');
  mergeButton.disabled = activeIndex <= 0;
  mergeButton.classList.toggle('opacity-40', mergeButton.disabled);
  mergeButton.classList.toggle('cursor-not-allowed', mergeButton.disabled);

  lucide.createIcons();

  // Update Controls Inspector
  if (active) {
    opacitySlider.value = active.opacity;
    opacityValDisplay.textContent = `${active.opacity}%`;
    blendModeSelect.value = active.blendMode || 'source-over';
    updateLayerSizeInputs();

    // Adjustments
    filterBrightness.value = active.filters.brightness;
    filterContrast.value = active.filters.contrast;
    filterSaturate.value = active.filters.saturate;
    filterHue.value = active.filters.hue;
    filterBlur.value = active.filters.blur;
    filterGamma.value = active.filters.gamma !== undefined ? active.filters.gamma : 0;
    filterSCurve.value = active.filters.sCurve !== undefined ? active.filters.sCurve : 0;

    document.getElementById('brightness-val').textContent = `${active.filters.brightness}%`;
    document.getElementById('contrast-val').textContent = `${active.filters.contrast}%`;
    document.getElementById('saturate-val').textContent = `${active.filters.saturate}%`;
    document.getElementById('hue-val').textContent = `${active.filters.hue}°`;
    document.getElementById('blur-val').textContent = `${active.filters.blur}px`;
    document.getElementById('gamma-val').textContent = `${parseFloat(active.filters.gamma !== undefined ? active.filters.gamma : 0).toFixed(1)}`;
    document.getElementById('scurve-val').textContent = `${parseFloat(active.filters.sCurve !== undefined ? active.filters.sCurve : 0).toFixed(1)}`;

    document.getElementById('adjustments-no-selection').classList.add('hidden');
    document.getElementById('adjustments-controls').classList.remove('hidden');
  } else {
    document.getElementById('adjustments-no-selection').classList.remove('hidden');
    document.getElementById('adjustments-controls').classList.add('hidden');
  }
}

function setupEventListeners() {
  // Mobile Sidebar Toggle
  const rightSidebar = document.getElementById('right-sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');

  if (btnToggleSidebar && rightSidebar) {
    btnToggleSidebar.addEventListener('click', (e) => {
      e.stopPropagation();
      rightSidebar.classList.toggle('hidden');
      rightSidebar.classList.toggle('flex');
    });
  }

  if (btnCloseSidebar && rightSidebar) {
    btnCloseSidebar.addEventListener('click', () => {
      rightSidebar.classList.add('hidden');
      rightSidebar.classList.remove('flex');
    });
  }

  // Add Layer Dropdown Toggle
  const addLayerDropdownBtn = document.getElementById('btn-add-layer-dropdown');
  const addLayerMenu = document.getElementById('add-layer-menu');

  addLayerDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addLayerMenu.classList.toggle('hidden');
  });

  window.addEventListener('click', (e) => {
    if (!addLayerMenu.contains(e.target) && !addLayerDropdownBtn.contains(e.target)) {
      addLayerMenu.classList.add('hidden');
    }
  });

  // Upload button
  const triggerUpload = () => {
    addLayerMenu.classList.add('hidden');
    inputFile.click();
  };
  document.getElementById('btn-add-image').addEventListener('click', triggerUpload);
  document.getElementById('empty-add-btn').addEventListener('click', () => inputFile.click());

  inputFile.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => addImageLayer(img, file.name.split('.')[0]);
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
    inputFile.value = '';
  });

  // Layer Stack Buttons
  document.getElementById('btn-layer-up').addEventListener('click', () => moveLayerOrder('up'));
  document.getElementById('btn-layer-down').addEventListener('click', () => moveLayerOrder('down'));
  document.getElementById('btn-duplicate-layer').addEventListener('click', duplicateActiveLayer);
  document.getElementById('btn-merge-layer').addEventListener('click', mergeActiveLayerDown);
  document.getElementById('btn-delete-layer').addEventListener('click', deleteActiveLayer);

  // Opacity & Blend Mode Inputs
  opacitySlider.addEventListener('input', (e) => {
    const active = getActiveLayer();
    if (active) {
      active.opacity = parseInt(e.target.value);
      opacityValDisplay.textContent = `${active.opacity}%`;
      updateUI();
      render();
    }
  });

  blendModeSelect.addEventListener('change', (e) => {
    const active = getActiveLayer();
    if (active) {
      active.blendMode = e.target.value;
      render();
    }
  });

  // Filter Adjustments
  const bindLayerDimension = (inputEl, dimension) => {
    inputEl.addEventListener('input', (e) => {
      const active = getActiveLayer();
      const value = Number(e.target.value);
      if (!active || !Number.isFinite(value) || value < 20) return;

      const center = active[dimension === 'width' ? 'x' : 'y'] + active[dimension] / 2;
      active[dimension] = Math.round(value);
      active[dimension === 'width' ? 'x' : 'y'] = center - active[dimension] / 2;
      render();
    });

    inputEl.addEventListener('change', () => updateUI());
  };

  bindLayerDimension(layerWidthInput, 'width');
  bindLayerDimension(layerHeightInput, 'height');

  const bindFilter = (inputEl, displayEl, key, suffix) => {
    inputEl.addEventListener('input', (e) => {
      const active = getActiveLayer();
      if (active) {
        active.filters[key] = parseInt(e.target.value);
        displayEl.textContent = `${active.filters[key]}${suffix}`;
        render();
      }
    });
  };

  bindFilter(filterBrightness, document.getElementById('brightness-val'), 'brightness', '%');
  bindFilter(filterContrast, document.getElementById('contrast-val'), 'contrast', '%');
  bindFilter(filterSaturate, document.getElementById('saturate-val'), 'saturate', '%');
  bindFilter(filterHue, document.getElementById('hue-val'), 'hue', '°');
  bindFilter(filterBlur, document.getElementById('blur-val'), 'blur', 'px');

  const bindFloatFilter = (inputEl, displayEl, key, suffix) => {
    inputEl.addEventListener('input', (e) => {
      const active = getActiveLayer();
      if (active) {
        const val = parseFloat(e.target.value);
        active.filters[key] = val;
        displayEl.textContent = `${val.toFixed(1)}${suffix}`;
        render();
      }
    });
  };

  bindFloatFilter(filterGamma, document.getElementById('gamma-val'), 'gamma', '');
  bindFloatFilter(filterSCurve, document.getElementById('scurve-val'), 'sCurve', '');

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    const active = getActiveLayer();
    if (active) {
      active.filters = { brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0, gamma: 0, sCurve: 0 };
      updateUI();
      render();
    }
  });

  document.getElementById('btn-reset-transform').addEventListener('click', () => {
    const active = getActiveLayer();
    if (active) {
      const imgW = active.img.naturalWidth || 500;
      const imgH = active.img.naturalHeight || 500;
      active.width = imgW;
      active.height = imgH;
      active.x = (state.canvasWidth - imgW) / 2;
      active.y = (state.canvasHeight - imgH) / 2;
      active.rotation = 0;
      updateUI();
      render();
    }
  });

  // Tabs Switch
  const tabLayersBtn = document.getElementById('tab-layers-btn');
  const tabAdjustBtn = document.getElementById('tab-adjustments-btn');
  const tabLayersContent = document.getElementById('tab-layers-content');
  const tabAdjustContent = document.getElementById('tab-adjustments-content');

  tabLayersBtn.addEventListener('click', () => {
    tabLayersBtn.className = "flex-1 py-3 text-xs font-semibold text-indigo-400 border-b-2 border-indigo-500 flex items-center justify-center gap-2";
    tabAdjustBtn.className = "flex-1 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent flex items-center justify-center gap-2";
    tabLayersContent.classList.remove('hidden');
    tabAdjustContent.classList.add('hidden');
  });

  tabAdjustBtn.addEventListener('click', () => {
    tabAdjustBtn.className = "flex-1 py-3 text-xs font-semibold text-indigo-400 border-b-2 border-indigo-500 flex items-center justify-center gap-2";
    tabLayersBtn.className = "flex-1 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent flex items-center justify-center gap-2";
    tabAdjustContent.classList.remove('hidden');
    tabLayersContent.classList.add('hidden');
  });

  // Tools Switching
  const moveToolBtn = document.getElementById('tool-move');
  const panToolBtn = document.getElementById('tool-pan');

  moveToolBtn.addEventListener('click', () => {
    state.activeTool = 'move';
    moveToolBtn.className = "tool-btn active p-2.5 rounded-lg text-indigo-400 bg-slate-800 hover:text-white transition relative group";
    panToolBtn.className = "tool-btn p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition relative group";
    viewportContainer.style.cursor = 'default';
    render();
  });

  panToolBtn.addEventListener('click', () => {
    state.activeTool = 'pan';
    panToolBtn.className = "tool-btn active p-2.5 rounded-lg text-indigo-400 bg-slate-800 hover:text-white transition relative group";
    moveToolBtn.className = "tool-btn p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition relative group";
    viewportContainer.style.cursor = 'grab';
    render();
  });

  // Zoom Buttons
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    state.zoom = Math.min(3, state.zoom + 0.15);
    applyViewportTransform();
    render();
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    state.zoom = Math.max(0.1, state.zoom - 0.15);
    applyViewportTransform();
    render();
  });

  document.getElementById('btn-zoom-fit').addEventListener('click', fitCanvasToScreen);

  // Clear All
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    state.layers = [];
    state.activeLayerId = null;
    updateUI();
    render();
  });

  // Export Modal logic
  const exportModal = document.getElementById('export-modal');
  document.getElementById('btn-export').addEventListener('click', () => exportModal.classList.remove('hidden'));
  document.getElementById('btn-close-export').addEventListener('click', () => exportModal.classList.add('hidden'));

  // Solid Color Layer Modal logic
  const solidModal = document.getElementById('solid-layer-modal');
  const solidHueInput = document.getElementById('solid-hue-input');
  const solidSatInput = document.getElementById('solid-sat-input');
  const solidLightInput = document.getElementById('solid-light-input');
  const solidHueVal = document.getElementById('solid-hue-val');
  const solidSatVal = document.getElementById('solid-sat-val');
  const solidLightVal = document.getElementById('solid-light-val');
  const solidPreviewSwatch = document.getElementById('solid-preview-swatch');

  const updateSolidPreview = () => {
    const h = solidHueInput.value;
    const s = solidSatInput.value;
    const l = solidLightInput.value;
    solidHueVal.textContent = h + '°';
    solidSatVal.textContent = s + '%';
    solidLightVal.textContent = l + '%';
    solidPreviewSwatch.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
  };

  document.getElementById('btn-add-solid').addEventListener('click', () => {
    addLayerMenu.classList.add('hidden');
    solidHueInput.value = 210;
    solidSatInput.value = 50;
    solidLightInput.value = 50;
    updateSolidPreview();
    solidModal.classList.remove('hidden');
  });

  document.getElementById('btn-close-solid').addEventListener('click', () => {
    solidModal.classList.add('hidden');
  });

  solidHueInput.addEventListener('input', updateSolidPreview);
  solidSatInput.addEventListener('input', updateSolidPreview);
  solidLightInput.addEventListener('input', updateSolidPreview);

  document.getElementById('btn-confirm-solid').addEventListener('click', () => {
    const h = parseInt(solidHueInput.value);
    const s = parseInt(solidSatInput.value);
    const l = parseInt(solidLightInput.value);
    addSolidLayer(h, s, l);
    solidModal.classList.add('hidden');
  });

  // Layer Filter Modal logic
  const layerFilterModal = document.getElementById('layer-filter-modal');
  const layerMathFilterSelect = document.getElementById('layer-math-filter-select');

  document.getElementById('btn-layer-filter-modal').addEventListener('click', () => {
    const active = getActiveLayer();
    if (!active) return;
    layerFilterModal.classList.remove('hidden');
  });

  document.getElementById('btn-close-layer-filter').addEventListener('click', () => {
    layerFilterModal.classList.add('hidden');
  });

  document.getElementById('btn-confirm-layer-filter').addEventListener('click', () => {
    const mathFilter = layerMathFilterSelect.value;
    applyMathFunctionFilter(mathFilter);
    layerFilterModal.classList.add('hidden');
  });

  document.getElementById('btn-confirm-export').addEventListener('click', () => {
    // Render flat export without transform controls
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = state.canvasWidth;
    exportCanvas.height = state.canvasHeight;
    const expCtx = exportCanvas.getContext('2d');

    state.layers.forEach(layer => {
      if (!layer.visible) return;
      expCtx.save();
      expCtx.globalAlpha = layer.opacity / 100;
      expCtx.globalCompositeOperation = layer.blendMode || 'source-over';

      const f = layer.filters;
      expCtx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) blur(${f.blur}px)`;

      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      expCtx.translate(centerX, centerY);
      if (layer.rotation) expCtx.rotate((layer.rotation * Math.PI) / 180);

      expCtx.drawImage(layer.img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      expCtx.restore();
    });

    const format = document.getElementById('export-format').value;
    const filename = document.getElementById('export-filename').value || 'artwork';
    const link = document.createElement('a');
    link.download = `${filename}.${format.split('/')[1]}`;
    link.href = exportCanvas.toDataURL(format, 0.95);
    link.click();

    exportModal.classList.add('hidden');
  });
}