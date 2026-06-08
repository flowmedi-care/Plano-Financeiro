import type { InstallmentSchedule, Transaction } from "@/types/database";
import { toReferenceMonth } from "@/lib/utils";

export interface MonthlyProjection {
  referenceMonth: string;
  label: string;
  amountCents: number;
}

export function projectInstallmentsFromTransactions(
  transactions: Transaction[],
  monthsAhead = 12
): MonthlyProjection[] {
  const projections = new Map<string, number>();

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 1;

  for (const tx of transactions) {
    if (!tx.installment_current || !tx.installment_total) continue;
    if (tx.installment_current >= tx.installment_total) continue;
    if (tx.is_payment) continue;

    const txDate = new Date(tx.transaction_date);
    let year = txDate.getFullYear();
    let month = txDate.getMonth() + 1;

    for (let i = tx.installment_current + 1; i <= tx.installment_total; i++) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }

      const ref = toReferenceMonth(year, month);
      const current = projections.get(ref) ?? 0;
      projections.set(ref, current + tx.amount_cents);
    }
  }

  const result: MonthlyProjection[] = [];
  let year = startYear;
  let month = startMonth;

  for (let i = 0; i < monthsAhead; i++) {
    const ref = toReferenceMonth(year, month);
    result.push({
      referenceMonth: ref,
      label: ref,
      amountCents: projections.get(ref) ?? 0,
    });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}

export function projectInstallmentsFromSchedules(
  schedules: InstallmentSchedule[],
  monthsAhead = 12
): MonthlyProjection[] {
  const projections = new Map<string, number>();
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  for (const schedule of schedules) {
    const [refYear, refMonth] = schedule.reference_month.split("-").map(Number);
    let y = refYear;
    let m = refMonth;

    for (let i = schedule.installment_current; i <= schedule.installment_total; i++) {
      const ref = toReferenceMonth(y, m);
      const current = projections.get(ref) ?? 0;
      projections.set(ref, current + schedule.installment_amount_cents);

      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  const result: MonthlyProjection[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    const ref = toReferenceMonth(year, month);
    result.push({
      referenceMonth: ref,
      label: ref,
      amountCents: projections.get(ref) ?? 0,
    });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}
