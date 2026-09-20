const DEFAULT_SHAPE_LINE_WIDTH = 4;

export const shapeNames = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  arrow: "Arrow",
};

export function normalizeShapeBounds(startX, startY, endX, endY) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function arrowHeadLength(lineWidth) {
  return Math.max(16, lineWidth * 6);
}

export function shapePadding(type, lineWidth) {
  const strokeWidth = Math.max(1, Number(lineWidth) || DEFAULT_SHAPE_LINE_WIDTH);
  if (type !== "arrow") return Math.max(8, strokeWidth + 4);

  return arrowHeadLength(strokeWidth) + strokeWidth / 2 + 2;
}

export function drawShape(
  context,
  type,
  startX,
  startY,
  endX,
  endY,
  {
    color = "#818cf8",
    filled = false,
    lineWidth = DEFAULT_SHAPE_LINE_WIDTH,
    preview = false,
  } = {},
) {
  const bounds = normalizeShapeBounds(startX, startY, endX, endY);
  const strokeWidth = Math.max(
    1,
    Number(lineWidth) || DEFAULT_SHAPE_LINE_WIDTH,
  );

  context.save();
  context.globalAlpha = preview ? 0.85 : 1;
  context.lineWidth = strokeWidth;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = color;
  context.fillStyle = color;

  if (type === "rectangle") {
    context.beginPath();
    context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    if (filled) context.fill();
    context.stroke();
  } else if (type === "ellipse") {
    context.beginPath();
    context.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width / 2,
      bounds.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    if (filled) context.fill();
    context.stroke();
  } else if (type === "arrow") {
    const angle = Math.atan2(endY - startY, endX - startX);
    const headAngle = Math.PI / 7;
    // Keep the arrowhead proportional to the shaft, independent of arrow length.
    const headLength = arrowHeadLength(strokeWidth);
    const baseDistance = headLength * Math.cos(headAngle);
    const baseX = endX - baseDistance * Math.cos(angle);
    const baseY = endY - baseDistance * Math.sin(angle);

    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(baseX, baseY);
    context.stroke();

    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(
      endX - headLength * Math.cos(angle - headAngle),
      endY - headLength * Math.sin(angle - headAngle),
    );
    context.lineTo(
      endX - headLength * Math.cos(angle + headAngle),
      endY - headLength * Math.sin(angle + headAngle),
    );
    context.closePath();
    context.fillStyle = color;
    context.fill();
  }

  context.restore();
}
