import { createLayer, dom, initCanvasDimensions, state } from "../state.js";
import { render } from "../render.js";
import {
  drawShape,
  normalizeShapeBounds,
  shapeNames,
  shapePadding,
} from "../shapes.js";
import { updateUI } from "../ui.js";
import { fitCanvasToScreen } from "../viewport.js";

export function addImageLayer(img, name = null) {
  if (!state.layers.length) {
    initCanvasDimensions(img.naturalWidth || 1080, img.naturalHeight || 1080);
    fitCanvasToScreen();
  }

  const width = img.naturalWidth || 500;
  const height = img.naturalHeight || 500;
  const layer = createLayer({
    name: name || `Layer ${state.nextLayerNum++}`,
    img,
    x: (state.canvasWidth - width) / 2,
    y: (state.canvasHeight - height) / 2,
    width,
    height,
  });

  state.layers.push(layer);
  state.activeLayerId = layer.id;

  updateUI();
  render();
}

export function addSolidLayer(h, s, l) {
  if (!state.layers.length) {
    initCanvasDimensions(1080, 1080);
    fitCanvasToScreen();
  }

  const source = document.createElement("canvas");
  source.width = state.canvasWidth;
  source.height = state.canvasHeight;
  const sourceCtx = source.getContext("2d");
  sourceCtx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
  sourceCtx.fillRect(0, 0, source.width, source.height);

  const img = new Image();
  img.onload = () => {
    const layer = createLayer({
      name: `Solid (${h}°, ${s}%, ${l}%)`,
      img,
      x: 0,
      y: 0,
      width: state.canvasWidth,
      height: state.canvasHeight,
    });

    state.layers.push(layer);
    state.activeLayerId = layer.id;

    updateUI();
    render();
  };

  img.src = source.toDataURL("image/png");
}

export function addShapeLayer(
  type,
  startX,
  startY,
  endX,
  endY,
  { color, filled, lineWidth } = {},
) {
  if (
    !state.layers.length &&
    (dom.canvas.width !== state.canvasWidth ||
      dom.canvas.height !== state.canvasHeight)
  ) {
    initCanvasDimensions(state.canvasWidth, state.canvasHeight);
    fitCanvasToScreen();
  }

  const bounds = normalizeShapeBounds(startX, startY, endX, endY);
  const padding = shapePadding(type, lineWidth);
  const source = document.createElement("canvas");
  source.width = Math.max(1, Math.ceil(bounds.width + padding * 2));
  source.height = Math.max(1, Math.ceil(bounds.height + padding * 2));
  const sourceCtx = source.getContext("2d");
  drawShape(
    sourceCtx,
    type,
    startX - bounds.x + padding,
    startY - bounds.y + padding,
    endX - bounds.x + padding,
    endY - bounds.y + padding,
    { color, filled, lineWidth },
  );

  const image = new Image();
  image.onload = () => {
    const layer = createLayer({
      name: `${shapeNames[type]} ${state.nextLayerNum++}`,
      img: image,
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: source.width,
      height: source.height,
    });
    layer.shapeType = type;
    state.layers.push(layer);
    state.activeLayerId = layer.id;
    updateUI();
    render();
  };
  image.src = source.toDataURL("image/png");
}
