import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthInput, MonthProjection } from "@/lib/cash-flow/project";
import type { ProjectionScenarioWithValues } from "@/lib/cash-flow/scenario-variable";
import type { Card, CashFlowSettings } from "@/types/database";
import { formatCurrency, formatReferenceMonthLabel } from "@/lib/utils";
import { renderBarChartToDataUrl } from "@/lib/reports/bar-chart-canvas";

function getFinalY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? fallback;
}

function cardLabel(card: Card): string {
  return card.last_digits ? `${card.name} ${card.last_digits}` : card.name;
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
  let y = 18;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Cenários — Fluxo de Caixa", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Saldo inicial: ${formatCurrency(settings.opening_balance_cents)}`, 14, y);
  y += 6;
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
  doc.text("Fatura por cartão (projeção)", 14, y);
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
  }

  autoTable(doc, {
    startY: y,
    head: [cardHead],
    body: cardBody.length > 0 ? cardBody : [["Nenhum cartão cadastrado", ...cardGrid.months.map(() => "—")]],
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
    doc.text(`Cenário: ${scenario.name}`, 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (scenario.type === "fixed") {
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
      doc.text(
        `Saldo acumulado positivo a partir de ${formatReferenceMonthLabel(firstPositive.referenceMonth)} (${formatCurrency(firstPositive.cumulativeBalanceCents)})`,
        14,
        y
      );
    } else {
      doc.text("Saldo acumulado não fica positivo no horizonte.", 14, y);
    }
    y += 8;

    const chartImage = renderBarChartToDataUrl(
      projections.map((p) => ({
        label: p.referenceMonth.slice(5) + "/" + p.referenceMonth.slice(2, 4),
        value: p.cumulativeBalanceCents / 100,
      })),
      { width: 520, height: 200, step: 5000 }
    );

    if (chartImage) {
      doc.addImage(chartImage, "PNG", 14, y, 180, 70);
      y += 76;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Fluxo de caixa", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Mês", "Receitas", "Fixos", "Cartão", "Variáveis", "Saldo mês", "Acumulado"]],
      body: projections.map((row) => [
        formatReferenceMonthLabel(row.referenceMonth),
        formatCurrency(row.incomeCents),
        formatCurrency(row.fixedCents),
        formatCurrency(row.cardCents),
        formatCurrency(row.variableCents),
        formatCurrency(row.monthBalanceCents),
        formatCurrency(row.cumulativeBalanceCents),
      ]),
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 7, cellPadding: 1.5 },
      margin: { left: 14, right: 14 },
    });
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  doc.save(`cenarios-fluxo-caixa-${stamp}.pdf`);
}
