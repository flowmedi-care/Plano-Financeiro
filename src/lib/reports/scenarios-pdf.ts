import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthInput, MonthProjection } from "@/lib/cash-flow/project";
import type { ProjectionScenarioWithValues } from "@/lib/cash-flow/scenario-variable";
import type { Card, CashFlowSettings } from "@/types/database";
import { formatCurrency, formatReferenceMonthLabel } from "@/lib/utils";
import { renderBarChartToDataUrl } from "@/lib/reports/bar-chart-canvas";

const RED: [number, number, number] = [220, 38, 38];
const BLACK: [number, number, number] = [15, 23, 42];

function getFinalY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? fallback;
}

function cardLabel(card: Card): string {
  return card.last_digits ? `${card.name} ${card.last_digits}` : card.name;
}

function writeCurrencyLine(
  doc: jsPDF,
  label: string,
  cents: number,
  x: number,
  y: number
) {
  doc.setTextColor(...(cents < 0 ? RED : BLACK));
  doc.text(`${label}: ${formatCurrency(cents)}`, x, y);
  doc.setTextColor(...BLACK);
}

function cashFlowTableStyles(
  projections: MonthProjection[]
): Parameters<typeof autoTable>[1] {
  return {
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105] },
    styles: { fontSize: 7, cellPadding: 1.5 },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section !== "body") return;

      const row = projections[data.row.index];
      if (!row) return;

      if (data.column.index === 5 && row.monthBalanceCents < 0) {
        data.cell.styles.textColor = RED;
      }
      if (data.column.index === 6 && row.openingBalanceCents < 0) {
        data.cell.styles.textColor = RED;
      }
      if (data.column.index === 7 && row.closingBalanceCents < 0) {
        data.cell.styles.textColor = RED;
      }
    },
  };
}

export function generateScenariosReportPdf(params: {
  settings: CashFlowSettings;
  monthInputs: MonthInput[];
  scenarios: {
    scenario: ProjectionScenarioWithValues;
    projections: MonthProjection[];
    monthValues: Record<string, number>;
  }[];
  cardGrid: {
    months: string[];
    cards: Card[];
    values: Record<string, number>;
    totalsByMonth: Record<string, number>;
  };
}): void {
  const { settings, monthInputs, scenarios, cardGrid } = params;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 28;
  let y = 18;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("Relatório de Cenários — Fluxo de Caixa", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  writeCurrencyLine(doc, "Saldo inicial", settings.opening_balance_cents, 14, y);
  y += 6;
  doc.setTextColor(...BLACK);
  doc.text(`Horizonte: ${settings.projection_months} meses`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Receitas por mês", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Mês", "Receitas", "Fixos", "Cartão"]],
    body: monthInputs.map((row) => [
      formatReferenceMonthLabel(row.referenceMonth),
      formatCurrency(row.incomeCents),
      formatCurrency(row.fixedCents),
      formatCurrency(row.cardCents),
    ]),
    theme: "grid",
    headStyles: { fillColor: [100, 116, 139] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  y = getFinalY(doc, y) + 10;

  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Fatura por cartão", 14, y);
  y += 4;

  const cardHead = ["Cartão", ...cardGrid.months.map((m) => m.slice(5) + "/" + m.slice(2, 4))];
  const cardBody = cardGrid.cards.map((card) => [
    cardLabel(card),
    ...cardGrid.months.map((month) => {
      const cents = cardGrid.values[`${card.id}|${month}`];
      return cents ? formatCurrency(cents) : "—";
    }),
  ]);

  if (cardGrid.cards.length > 0) {
    cardBody.push([
      "Total",
      ...cardGrid.months.map((month) => {
        const total = cardGrid.totalsByMonth[month];
        return total > 0 ? formatCurrency(total) : "—";
      }),
    ]);

    cardBody.push([
      "Evolução",
      ...cardGrid.months.map((month, index) => {
        if (index === 0) return "—";
        const current = cardGrid.totalsByMonth[month] ?? 0;
        const previous = cardGrid.totalsByMonth[cardGrid.months[index - 1]] ?? 0;
        if (previous <= 0 || current <= 0) return "—";
        const pct = ((current - previous) / previous) * 100;
        const sign = pct > 0 ? "+" : "";
        return `${sign}${pct.toFixed(1)}%`;
      }),
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [cardHead],
    body:
      cardBody.length > 0
        ? cardBody
        : [["Nenhum cartão cadastrado", ...cardGrid.months.map(() => "—")]],
    theme: "grid",
    headStyles: { fillColor: [100, 116, 139] },
    styles: { fontSize: 7, cellPadding: 1.5 },
    margin: { left: 14, right: 14 },
  });

  for (const { scenario, projections, monthValues } of scenarios) {
    doc.addPage();
    y = 18;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(`Cenário: ${scenario.name}`, 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (scenario.type === "fixed") {
      doc.setTextColor(...BLACK);
      doc.text(
        `Despesas variáveis: ${formatCurrency(scenario.fixed_amount_cents ?? 0)}/mês (fixo)`,
        14,
        y
      );
      y += 8;
    } else {
      doc.text("Despesas variáveis: valores mês a mês", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [cardGrid.months.map((m) => m.slice(5) + "/" + m.slice(2, 4))],
        body: [
          cardGrid.months.map((month) => {
            const cents = monthValues[month];
            return cents ? formatCurrency(cents) : "—";
          }),
        ],
        theme: "grid",
        headStyles: { fillColor: [100, 116, 139] },
        styles: { fontSize: 7 },
        margin: { left: 14, right: 14 },
      });
      y = getFinalY(doc, y) + 8;
    }

    const firstPositive = projections.find((p) => p.cumulativeBalanceCents > 0);
    if (firstPositive) {
      doc.setTextColor(...BLACK);
      doc.text(
        `Saldo acumulado positivo a partir de ${formatReferenceMonthLabel(firstPositive.referenceMonth)} (${formatCurrency(firstPositive.cumulativeBalanceCents)}).`,
        14,
        y
      );
    } else {
      doc.setTextColor(...RED);
      doc.text("Saldo acumulado não fica positivo no horizonte.", 14, y);
      doc.setTextColor(...BLACK);
    }
    y += 10;

    const chartImage = renderBarChartToDataUrl(
      projections.map((p) => ({
        label: p.referenceMonth.slice(5) + "/" + p.referenceMonth.slice(2, 4),
        value: p.cumulativeBalanceCents / 100,
      })),
      { width: 900, height: 340, step: 5000, pixelRatio: 3 }
    );

    if (chartImage) {
      const chartHeight = contentWidth * (340 / 900);
      doc.addImage(chartImage, "PNG", 14, y, contentWidth, chartHeight, undefined, "NONE");
      y += chartHeight + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Fluxo de caixa", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Mês", "Receitas", "Fixos", "Cartão", "Variáveis", "Saldo mês", "Saldo inicial", "Saldo final"]],
      body: projections.map((row) => [
        formatReferenceMonthLabel(row.referenceMonth),
        formatCurrency(row.incomeCents),
        formatCurrency(row.fixedCents),
        formatCurrency(row.cardCents),
        formatCurrency(row.variableCents),
        formatCurrency(row.monthBalanceCents),
        formatCurrency(row.openingBalanceCents),
        formatCurrency(row.closingBalanceCents),
      ]),
      ...cashFlowTableStyles(projections),
    });
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  doc.save(`cenarios-fluxo-caixa-${stamp}.pdf`);
}
