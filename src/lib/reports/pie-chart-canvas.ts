export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

export function renderPieChartToDataUrl(
  slices: PieSlice[],
  size = 200
): string | null {
  if (slices.length === 0 || slices.every((s) => s.value <= 0)) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.45;

  let startAngle = -Math.PI / 2;

  for (const slice of slices) {
    const sliceAngle = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();

    startAngle = endAngle;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  return canvas.toDataURL("image/png");
}
