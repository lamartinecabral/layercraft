import { createLayer, initCanvasDimensions, state } from "../state.js";
import { render } from "../render.js";
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
