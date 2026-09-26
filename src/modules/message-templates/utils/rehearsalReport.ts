import type { RehearsalItem, RehearsalReport } from '../types';
import { describeFinding } from './findingMessages';
import { describeMessageKind } from './messageKindLabel';

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

const CHANNEL_DISPLAY: Record<RehearsalItem['channel'], string> = { SMS: 'SMS', EMAIL: 'E-mail' };

const itemKey = (i: RehearsalItem) => `${i.channel}-${i.kind}`;
/**
 * Human label: the same message name shown on the templates screen, channel in brackets.
 * It used to be "SMS · Przypomnienie przed wizytą" - a middle dot says nothing about how
 * the two parts relate (CLAUDE.md §4); the bracket reads as "this message, sent by SMS".
 */
const itemLabel = (i: RehearsalItem) => `${describeMessageKind(i.kind)} (${CHANNEL_DISPLAY[i.channel]})`;

/** A message the runner would actually send: it rendered, so it has a segment count (SMS) or subject+body (e-mail). */
export const hasContent = (i: RehearsalItem) =>
  i.channel === 'SMS' ? i.segments !== null : Boolean(i.subject && i.body);

export const plural = (n: number, one: string, few: string, many: string) => {
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
            .map(describeFinding)
            .join(' '),
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
    headline: `Wysłano ${delivered} z ${withContent} wiadomości na ${report.redirectPhone} i ${report.redirectEmail}. Każda ma na początku numer, np. [R03/10] - sprawdź je na telefonie po kolei.`,
    problems: failed.map(i => ({ key: itemKey(i), label: itemLabel(i), detail: i.delivery?.error ?? 'nieznany błąd' })),
  };
}

export interface SendPlan {
  sms: number;
  email: number;
}

/** What "Wyślij wszystkie testowo" would really send: every rendered template, per channel. */
export function sendPlan(report: RehearsalReport): SendPlan {
  const withContent = report.items.filter(hasContent);
  return {
    sms: withContent.filter(i => i.channel === 'SMS').length,
    email: withContent.filter(i => i.channel === 'EMAIL').length,
  };
}

/**
 * The sentence in the confirmation before a rehearsal run. The button used to fire straight
 * away: one click sent a dozen real SMS (paid from the studio's credits) and e-mails, with no
 * way back. The question names the count and the addresses, so the person sees exactly what
 * leaves the studio before it does.
 */
export function sendConfirmMessage(plan: SendPlan | null, phone: string, email: string): string {
  if (!plan) {
    return `Wyślemy każdy szablon z treścią naprawdę: SMS-y na ${phone}, e-maile na ${email}. SMS-y zużyją kredyty jak zwykła wysyłka.`;
  }
  const parts: string[] = [];
  if (plan.sms > 0) parts.push(`${plan.sms} ${plural(plan.sms, 'SMS', 'SMS-y', 'SMS-ów')} na ${phone}`);
  if (plan.email > 0) parts.push(`${plan.email} ${plural(plan.email, 'e-mail', 'e-maile', 'e-maili')} na ${email}`);
  const total = plan.sms + plan.email;
  const credits = plan.sms > 0 ? ' SMS-y zużyją kredyty jak zwykła wysyłka.' : '';
  return `To prawdziwa wysyłka: ${total} ${plural(total, 'wiadomość', 'wiadomości', 'wiadomości')}, ${parts.join(' i ')}.${credits}`;
}
