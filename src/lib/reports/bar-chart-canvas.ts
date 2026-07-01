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

export function renderGroupedBarChartToDataUrl(
  points: {
    label: string;
    previousValue: number;
    currentValue: number;
  }[],
  options?: {
    width?: number;
    height?: number;
    previousLabel?: string;
    currentLabel?: string;
    pixelRatio?: number;
  }
): string | null {
  if (points.length === 0) return null;

  const logicalWidth = options?.width ?? 900;
  const logicalHeight = options?.height ?? 340;
  const pixelRatio = options?.pixelRatio ?? 3;
  const previousColor = "#94a3b8";
  const currentColor = "#334155";

  const values = points.flatMap((point) => [
    point.previousValue,
    point.currentValue,
  ]);
  const maxValue = Math.max(...values, 0);
  if (maxValue <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(logicalWidth * pixelRatio);
  canvas.height = Math.round(logicalHeight * pixelRatio);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(pixelRatio, pixelRatio);

  const width = logicalWidth;
  const height = logicalHeight;
  const padding = { top: 28, right: 20, bottom: 56, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const groupWidth = chartWidth / points.length;
  const barWidth = Math.min(22, groupWidth / 3);
  const groupGap = barWidth * 0.35;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const tickValue = (maxValue / tickCount) * i;
    const y = padding.top + chartHeight - (tickValue / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(tickValue / 100),
      padding.left - 8,
      y
    );
  }

  points.forEach((point, index) => {
    const groupX = padding.left + index * groupWidth + groupWidth / 2;
    const previousHeight = (point.previousValue / maxValue) * chartHeight;
    const currentHeight = (point.currentValue / maxValue) * chartHeight;
    const baseY = padding.top + chartHeight;

    ctx.fillStyle = previousColor;
    ctx.fillRect(
      groupX - barWidth - groupGap / 2,
      baseY - previousHeight,
      barWidth,
      Math.max(previousHeight, 2)
    );

    ctx.fillStyle = currentColor;
    ctx.fillRect(
      groupX + groupGap / 2,
      baseY - currentHeight,
      barWidth,
      Math.max(currentHeight, 2)
    );

    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const label =
      point.label.length > 12 ? `${point.label.slice(0, 11)}…` : point.label;
    ctx.fillText(label, groupX, height - padding.bottom + 8);
  });

  const legendY = 12;
  ctx.fillStyle = previousColor;
  ctx.fillRect(padding.left, legendY, 10, 10);
  ctx.fillStyle = "#334155";
  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    options?.previousLabel ?? "Mês anterior",
    padding.left + 14,
    legendY + 5
  );

  const currentLegendX = padding.left + 130;
  ctx.fillStyle = currentColor;
  ctx.fillRect(currentLegendX, legendY, 10, 10);
  ctx.fillText(
    options?.currentLabel ?? "Mês atual",
    currentLegendX + 14,
    legendY + 5
  );

  return canvas.toDataURL("image/png");
}

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
