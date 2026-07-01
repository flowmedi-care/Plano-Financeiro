import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import type { CategoryMonthComparison, CategorySpending } from "@/lib/transactions/summary";
import type { Transaction } from "@/types/database";
import { renderGroupedBarChartToDataUrl } from "@/lib/reports/bar-chart-canvas";
import { renderPieChartToDataUrl } from "@/lib/reports/pie-chart-canvas";

export interface ReportLineItem {
  transaction: Transaction;
  amountCents: number;
}

function formatDateBr(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function groupByCategory(
  items: ReportLineItem[]
): Map<string, ReportLineItem[]> {
  const groups = new Map<string, ReportLineItem[]>();

  for (const item of items) {
    const key = item.transaction.category?.name ?? "Sem categoria";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return new Map(
    [...groups.entries()].sort((a, b) => {
      const totalA = a[1].reduce((sum, item) => sum + item.amountCents, 0);
      const totalB = b[1].reduce((sum, item) => sum + item.amountCents, 0);
      return totalB - totalA;
    })
  );
}

function getFinalY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? fallback;
}

export function generateSpendingReportPdf(params: {
  recipientName: string;
  reportTitle: string;
  totalLabel: string;
  amountColumnLabel: string;
  monthLabel: string;
  lineItems: ReportLineItem[];
  categoryBreakdown: CategorySpending[];
  filePrefix: string;
  monthComparison?: {
    previousMonthLabel: string;
    currentMonthLabel: string;
    items: CategoryMonthComparison[];
  };
}): void {
  const {
    recipientName,
    reportTitle,
    totalLabel,
    amountColumnLabel,
    monthLabel,
    lineItems,
    categoryBreakdown,
    filePrefix,
    monthComparison,
  } = params;

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const grandTotal = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Para: ${recipientName}`, 14, y);
  y += 6;
  doc.text(`Período: ${monthLabel}`, 14, y);
  y += 6;
  doc.text(`${totalLabel}: ${formatCurrency(totalAmount)}`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Gastos por categoria", 14, y);
  y += 4;

  const pieImage = renderPieChartToDataUrl(
    categoryBreakdown.map((item) => ({
      label: item.name,
      value: item.total,
      color: item.color,
    }))
  );

  if (pieImage) {
    doc.addImage(pieImage, "PNG", 14, y, 42, 42);
  }

  const legendX = pieImage ? 62 : 14;
  let legendY = y + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of categoryBreakdown) {
    const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : "0";
    doc.setFillColor(item.color);
    doc.circle(legendX, legendY - 1, 1.5, "F");
    doc.text(
      `${item.name}: ${formatCurrency(item.total)} (${pct}%)`,
      legendX + 4,
      legendY
    );
    legendY += 6;
  }

  y = Math.max(y + 48, legendY + 4);

  autoTable(doc, {
    startY: y,
    head: [["Categoria", "Valor", "%"]],
    body: categoryBreakdown.map((item) => {
      const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : "0";
      return [item.name, formatCurrency(item.total), `${pct}%`];
    }),
    theme: "grid",
    headStyles: { fillColor: [100, 116, 139] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = getFinalY(doc, y) + 10;

  if (monthComparison && monthComparison.items.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Comparação com fatura anterior", 14, y);
    y += 4;

    const comparisonPoints = monthComparison.items
      .filter(
        (item) =>
          item.delta !== 0 || item.currentTotal > 0 || item.previousTotal > 0
      )
      .slice(0, 8)
      .map((item) => ({
        label: item.name,
        previousValue: item.previousTotal,
        currentValue: item.currentTotal,
      }));

    const comparisonImage = renderGroupedBarChartToDataUrl(comparisonPoints, {
      previousLabel: monthComparison.previousMonthLabel,
      currentLabel: monthComparison.currentMonthLabel,
    });

    if (comparisonImage) {
      doc.addImage(comparisonImage, "PNG", 14, y, 182, 68);
      y += 74;
    }

    autoTable(doc, {
      startY: y,
      head: [["Categoria", monthComparison.previousMonthLabel, monthComparison.currentMonthLabel, "Variação"]],
      body: monthComparison.items.map((item) => {
        const sign = item.delta > 0 ? "+" : item.delta < 0 ? "−" : "";
        return [
          item.name,
          formatCurrency(item.previousTotal),
          formatCurrency(item.currentTotal),
          `${sign}${formatCurrency(Math.abs(item.delta))}`,
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [100, 116, 139] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    y = getFinalY(doc, y) + 10;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Transações", 14, y);
  y += 6;

  const grouped = groupByCategory(lineItems);

  for (const [categoryName, items] of grouped) {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }

    const categoryTotal = items.reduce((sum, item) => sum + item.amountCents, 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${categoryName} — ${formatCurrency(categoryTotal)}`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Data", "Descrição", "Conta", "Valor", amountColumnLabel]],
      body: items.map(({ transaction: tx, amountCents }) => [
        formatDateBr(tx.transaction_date),
        tx.description,
        tx.account?.name ?? "-",
        formatCurrency(tx.amount_cents),
        formatCurrency(amountCents),
      ]),
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    y = getFinalY(doc, y) + 8;
  }

  if (y > 265) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(totalAmount)}`, 14, y);

  const safeName = recipientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  const safeMonth = monthLabel.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`${filePrefix}-${safeName}-${safeMonth}.pdf`);
}
