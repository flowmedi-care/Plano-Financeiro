import { buildYAxisScale } from "@/lib/charts/y-axis-scale";

export interface BarChartPoint {
  label: string;
  value: number;
}

const COLOR_POSITIVE = "#0f172a";
const COLOR_NEGATIVE = "#dc2626";
const COLOR_AXIS = "#64748b";
const COLOR_GRID = "#e2e8f0";
const COLOR_ZERO_LINE = "#94a3b8";

export function renderBarChartToDataUrl(
  points: BarChartPoint[],
  options?: { width?: number; height?: number; step?: number; pixelRatio?: number }
): string | null {
  if (points.length === 0) return null;

  const logicalWidth = options?.width ?? 900;
  const logicalHeight = options?.height ?? 340;
  const step = options?.step ?? 5000;
  const pixelRatio = options?.pixelRatio ?? 3;

  const values = points.map((p) => p.value);
  const scale = buildYAxisScale(values, step);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(logicalWidth * pixelRatio);
  canvas.height = Math.round(logicalHeight * pixelRatio);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const width = logicalWidth;
  const height = logicalHeight;
  const padding = { top: 20, right: 20, bottom: 44, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const [domainMin, domainMax] = scale.domain;
  const range = domainMax - domainMin || 1;

  const zeroY =
    padding.top + chartHeight - ((0 - domainMin) / range) * chartHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 1;
  for (const tick of scale.ticks) {
    const y = padding.top + chartHeight - ((tick - domainMin) / range) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick < 0 ? COLOR_NEGATIVE : COLOR_AXIS;
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(tick),
      padding.left - 8,
      y
    );
  }

  if (domainMin < 0 && domainMax > 0) {
    ctx.strokeStyle = COLOR_ZERO_LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
  }

  const barWidth = Math.max(18, chartWidth / points.length - 10);
  const gap = (chartWidth - barWidth * points.length) / (points.length + 1);

  points.forEach((point, index) => {
    const x = padding.left + gap + index * (barWidth + gap);
    const barHeight = (Math.abs(point.value) / range) * chartHeight;
    const y = point.value >= 0 ? zeroY - barHeight : zeroY;

    ctx.fillStyle = point.value < 0 ? COLOR_NEGATIVE : COLOR_POSITIVE;
    ctx.fillRect(x, y, barWidth, Math.max(barHeight, 2));

    ctx.fillStyle = COLOR_AXIS;
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(point.label, x + barWidth / 2, height - padding.bottom + 8);
  });

  return canvas.toDataURL("image/png");
}
