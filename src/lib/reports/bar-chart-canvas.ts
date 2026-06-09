import { buildYAxisScale } from "@/lib/charts/y-axis-scale";

export interface BarChartPoint {
  label: string;
  value: number;
}

export function renderBarChartToDataUrl(
  points: BarChartPoint[],
  options?: { width?: number; height?: number; step?: number }
): string | null {
  if (points.length === 0) return null;

  const width = options?.width ?? 520;
  const height = options?.height ?? 220;
  const step = options?.step ?? 5000;
  const values = points.map((p) => p.value);
  const scale = buildYAxisScale(values, step);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const padding = { top: 16, right: 16, bottom: 36, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const [domainMin, domainMax] = scale.domain;
  const range = domainMax - domainMin || 1;

  const zeroY =
    padding.top + chartHeight - ((0 - domainMin) / range) * chartHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (const tick of scale.ticks) {
    const y = padding.top + chartHeight - ((tick - domainMin) / range) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(tick),
      padding.left - 6,
      y + 3
    );
  }

  if (domainMin < 0 && domainMax > 0) {
    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
  }

  const barWidth = Math.max(12, chartWidth / points.length - 8);
  const gap = (chartWidth - barWidth * points.length) / (points.length + 1);

  points.forEach((point, index) => {
    const x = padding.left + gap + index * (barWidth + gap);
    const barHeight = (Math.abs(point.value) / range) * chartHeight;
    const y = point.value >= 0 ? zeroY - barHeight : zeroY;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x, y, barWidth, Math.max(barHeight, 1));

    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(point.label, x + barWidth / 2, height - 10);
  });

  return canvas.toDataURL("image/png");
}
