import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Person } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import type { CategorySpending, PersonOwedTransaction } from "@/lib/transactions/summary";
import { renderPieChartToDataUrl } from "@/lib/reports/pie-chart-canvas";

function formatDateBr(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function groupByCategory(
  owedTransactions: PersonOwedTransaction[]
): Map<string, PersonOwedTransaction[]> {
  const groups = new Map<string, PersonOwedTransaction[]>();

  for (const item of owedTransactions) {
    const key = item.transaction.category?.name ?? "Sem categoria";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return new Map(
    [...groups.entries()].sort((a, b) => {
      const totalA = a[1].reduce((sum, item) => sum + item.owedCents, 0);
      const totalB = b[1].reduce((sum, item) => sum + item.owedCents, 0);
      return totalB - totalA;
    })
  );
}

export function generateReimbursementPdf(params: {
  person: Person;
  monthLabel: string;
  owedTransactions: PersonOwedTransaction[];
  categoryBreakdown: CategorySpending[];
}): void {
  const { person, monthLabel, owedTransactions, categoryBreakdown } = params;
  const totalOwed = owedTransactions.reduce((sum, item) => sum + item.owedCents, 0);
  const grandTotal = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Reembolso", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Para: ${person.name}`, 14, y);
  y += 6;
  doc.text(`Período: ${monthLabel}`, 14, y);
  y += 6;
  doc.text(`Total a pagar: ${formatCurrency(totalOwed)}`, 14, y);
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

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Transações", 14, y);
  y += 6;

  const grouped = groupByCategory(owedTransactions);

  for (const [categoryName, items] of grouped) {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }

    const categoryTotal = items.reduce((sum, item) => sum + item.owedCents, 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${categoryName} — ${formatCurrency(categoryTotal)}`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Data", "Descrição", "Conta", "Valor", "A pagar"]],
      body: items.map(({ transaction: tx, owedCents }) => [
        formatDateBr(tx.transaction_date),
        tx.description,
        tx.account?.name ?? "-",
        formatCurrency(tx.amount_cents),
        formatCurrency(owedCents),
      ]),
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (y > 265) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(totalOwed)}`, 14, y);

  const safeName = person.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  const safeMonth = monthLabel.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`reembolso-${safeName}-${safeMonth}.pdf`);
}
