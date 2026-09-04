import type { RehearsalItem, RehearsalReport } from '../types';

export type ReportTone = 'ok' | 'warn' | 'error';

export interface ReportProblem {
  key: string;
  label: string;
  detail: string;
}

export interface ReportSummary {
  tone: ReportTone;
  headline: string;
  problems: ReportProblem[];
}

const itemKey = (i: RehearsalItem) => `${i.channel}-${i.kind}`;
const itemLabel = (i: RehearsalItem) => `${i.channel} · ${i.kind}`;

/** A message the runner would actually send: it rendered, so it has a segment count (SMS) or subject+body (e-mail). */
export const hasContent = (i: RehearsalItem) =>
  i.channel === 'SMS' ? i.segments !== null : Boolean(i.subject && i.body);

const plural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
};

/**
 * Turns the runner's report into the one sentence the person at the screen needs, plus
 * the list of things to fix. Kept out of the component so it can be tested against every
 * shape of report without rendering anything.
 */
export function summarizeReport(report: RehearsalReport): ReportSummary {
  const withContent = report.items.filter(hasContent).length;

  if (report.errorCount > 0) {
    return {
      tone: 'error',
      headline: `Nic nie wysłano: ${report.errorCount} ${plural(report.errorCount, 'błąd', 'błędy', 'błędów')} w szablonach. Popraw je i spróbuj ponownie.`,
      problems: report.items
        .filter(i => i.findings.some(f => f.severity === 'ERROR'))
        .map(i => ({
          key: itemKey(i),
          label: itemLabel(i),
          detail: i.findings
            .filter(f => f.severity === 'ERROR')
            .map(f => (f.detail ? `${f.rule} (${f.detail})` : f.rule))
            .join(', '),
        })),
    };
  }

  if (!report.sent) {
    const warn = report.warningCount > 0 ? `, ${report.warningCount} ${plural(report.warningCount, 'ostrzeżenie', 'ostrzeżenia', 'ostrzeżeń')}` : '';
    return {
      tone: 'ok',
      headline: `Szablony są poprawne: ${withContent} z ${report.items.length} ma treść i przeszło sprawdzenie${warn}.`,
      problems: [],
    };
  }

  const delivered = report.items.filter(i => i.delivery?.success).length;
  const failed = report.items.filter(i => i.delivery && !i.delivery.success);
  return {
    tone: failed.length ? 'warn' : 'ok',
    headline: `Wysłano ${delivered} z ${withContent} wiadomości na ${report.redirectPhone} i ${report.redirectEmail}. Każda ma na początku numer, np. [R03/10] - odhacz je na telefonie po kolei.`,
    problems: failed.map(i => ({ key: itemKey(i), label: itemLabel(i), detail: i.delivery?.error ?? 'nieznany błąd' })),
  };
}
