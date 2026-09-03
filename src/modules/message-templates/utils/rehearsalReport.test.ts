import { describe, expect, it } from 'vitest';
import { hasContent, summarizeReport } from './rehearsalReport';
import type { RehearsalItem, RehearsalReport } from '../types';

const sms = (kind: string, over: Partial<RehearsalItem> = {}): RehearsalItem => ({
  seq: 1, total: 10, kind, channel: 'SMS', enabled: true, subject: null,
  body: 'Jan 04.09.2026 10:00', segments: 1, findings: [], delivery: null, ...over,
});
const email = (kind: string, over: Partial<RehearsalItem> = {}): RehearsalItem => ({
  seq: 1, total: 5, kind, channel: 'EMAIL', enabled: true, subject: 'Temat',
  body: 'Treść wiadomości', segments: null, findings: [], delivery: null, ...over,
});
const report = (items: RehearsalItem[], over: Partial<RehearsalReport> = {}): RehearsalReport => ({
  generatedAt: '2026-09-03T10:00:00Z', redirectPhone: '+48500100200', redirectEmail: 'owner@studio.pl',
  sent: false, items,
  errorCount: items.reduce((n, i) => n + i.findings.filter(f => f.severity === 'ERROR').length, 0),
  warningCount: items.reduce((n, i) => n + i.findings.filter(f => f.severity === 'WARNING').length, 0),
  ...over,
});

describe('hasContent', () => {
  it('an sms has content when it rendered to a segment count', () => {
    expect(hasContent(sms('SMS_PRE_VISIT'))).toBe(true);
    expect(hasContent(sms('SMS_PRE_VISIT', { segments: null, body: '' }))).toBe(false);
  });
  it('an e-mail needs both subject and body', () => {
    expect(hasContent(email('EMAIL_VISIT_WELCOME'))).toBe(true);
    expect(hasContent(email('EMAIL_VISIT_WELCOME', { subject: '' }))).toBe(false);
    expect(hasContent(email('EMAIL_VISIT_WELCOME', { body: '' }))).toBe(false);
  });
});

describe('summarizeReport', () => {
  it('a plan with errors says nothing was sent and lists every broken template with its rules', () => {
    const r = report([
      sms('SMS_PRE_VISIT', { findings: [{ severity: 'ERROR', rule: 'orphan-braces', detail: '{{imie' }] }),
      sms('SMS_POST_VISIT'),
      email('EMAIL_VISIT_WELCOME', { findings: [
        { severity: 'ERROR', rule: 'html-in-plaintext-email', detail: '<b>' },
        { severity: 'WARNING', rule: 'subject-long', detail: '80 znaków' },
      ] }),
    ]);
    const s = summarizeReport(r);
    expect(s.tone).toBe('error');
    expect(s.headline).toBe('Nic nie wysłano: 2 błędy w szablonach. Popraw je i spróbuj ponownie.');
    expect(s.problems).toEqual([
      { key: 'SMS-SMS_PRE_VISIT', label: 'SMS · SMS_PRE_VISIT', detail: 'orphan-braces ({{imie)' },
      { key: 'EMAIL-EMAIL_VISIT_WELCOME', label: 'EMAIL · EMAIL_VISIT_WELCOME', detail: 'html-in-plaintext-email (<b>)' },
    ]);
  });

  it('polish plural forms for error counts', () => {
    const err = (n: number) => summarizeReport(report(
      Array.from({ length: n }, (_, i) => sms(`K${i}`, { findings: [{ severity: 'ERROR', rule: 'x', detail: '' }] }))
    )).headline;
    expect(err(1)).toContain('1 błąd w');
    expect(err(3)).toContain('3 błędy w');
    expect(err(5)).toContain('5 błędów w');
    expect(err(12)).toContain('12 błędów w');
    expect(err(22)).toContain('22 błędy w');
  });

  it('a clean plan reports how many templates have content and the warning count', () => {
    const r = report([
      sms('SMS_PRE_VISIT'),
      sms('SMS_POST_VISIT', { segments: null, body: '', findings: [{ severity: 'WARNING', rule: 'template-empty', detail: '' }] }),
      email('EMAIL_VISIT_WELCOME'),
    ]);
    const s = summarizeReport(r);
    expect(s.tone).toBe('ok');
    expect(s.headline).toBe('Szablony są poprawne: 2 z 3 ma treść i przeszło sprawdzenie, 1 ostrzeżenie.');
    expect(s.problems).toEqual([]);
  });

  it('a clean plan without warnings ends the sentence cleanly', () => {
    expect(summarizeReport(report([sms('A')])).headline).toBe('Szablony są poprawne: 1 z 1 ma treść i przeszło sprawdzenie.');
  });

  it('a fully delivered run tells where the messages went and how to tick them off', () => {
    const r = report([
      sms('SMS_PRE_VISIT', { delivery: { success: true, providerId: 'a', error: null } }),
      email('EMAIL_VISIT_WELCOME', { delivery: { success: true, providerId: 'b', error: null } }),
    ], { sent: true });
    const s = summarizeReport(r);
    expect(s.tone).toBe('ok');
    expect(s.headline).toContain('Wysłano 2 z 2 wiadomości na +48500100200 i owner@studio.pl');
    expect(s.headline).toContain('[R03/10]');
    expect(s.problems).toEqual([]);
  });

  it('a run with provider failures is amber and lists the failed items with the provider error', () => {
    const r = report([
      sms('SMS_PRE_VISIT', { delivery: { success: true, providerId: 'a', error: null } }),
      sms('SMS_UPSELL_CONSENT', { delivery: { success: false, providerId: null, error: 'Brak kredytów SMS' } }),
      sms('SMS_DELAYED_REMINDER', { segments: null, body: '' }),
    ], { sent: true });
    const s = summarizeReport(r);
    expect(s.tone).toBe('warn');
    expect(s.headline).toContain('Wysłano 1 z 2 wiadomości');
    expect(s.problems).toEqual([
      { key: 'SMS-SMS_UPSELL_CONSENT', label: 'SMS · SMS_UPSELL_CONSENT', detail: 'Brak kredytów SMS' },
    ]);
  });

  it('errors take precedence over a sent flag, so a stale report never reads as delivered', () => {
    const r = report([sms('A', { findings: [{ severity: 'ERROR', rule: 'x', detail: '' }] })], { sent: true });
    expect(summarizeReport(r).tone).toBe('error');
  });
});
