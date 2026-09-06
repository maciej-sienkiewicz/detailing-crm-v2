import { describe, expect, it } from 'vitest';
import { describeFinding } from './findingMessages';

/**
 * Regresja z produkcji: właściciel studia widział "SMS_POST_VISIT sms-too-long
 * (5 segmentów)" i nie wiedział, co ma zrobić. Każdy przypadek tutaj jest zdaniem,
 * które mówi wprost co jest nie tak i co poprawić — nie kodem reguły backendu.
 */
describe('describeFinding', () => {
  it('sms-too-long tłumaczy liczbę segmentów na instrukcję skrócenia treści', () => {
    const text = describeFinding({ severity: 'ERROR', rule: 'sms-too-long', detail: '5 segmentów' });
    expect(text).toContain('za długa');
    expect(text).toContain('5 SMS-y');
    expect(text.toLowerCase()).not.toContain('sms-too-long');
  });

  it('sms-long (ostrzeżenie) różni się od sms-too-long (błąd)', () => {
    const text = describeFinding({ severity: 'WARNING', rule: 'sms-long', detail: '3 segmentów' });
    expect(text).toContain('dość długa');
    expect(text).toContain('3 SMS-y');
  });

  it('body-empty mówi wprost, że nic by nie poszło', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'body-empty', detail: '' }))
      .toBe('Treść wiadomości jest pusta - nic by nie zostało wysłane. Uzupełnij szablon.');
  });

  it('subject-empty dotyczy tematu e-maila', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'subject-empty', detail: '' }))
      .toBe('Temat e-maila jest pusty. Uzupełnij szablon.');
  });

  it('subject-long podaje liczbę znaków', () => {
    const text = describeFinding({ severity: 'WARNING', rule: 'subject-long', detail: '82 znaków' });
    expect(text).toContain('82 znaków');
    expect(text).toContain('Skróć temat');
  });

  it('body-suspiciously-short sugeruje sprawdzenie szablonu', () => {
    const text = describeFinding({ severity: 'WARNING', rule: 'body-suspiciously-short', detail: '12 znaków' });
    expect(text).toContain('12 znaków');
    expect(text).toContain('niekompletny');
  });

  it('html-in-sms i html-in-plaintext-email obie mówią o usunięciu znacznika', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'html-in-sms', detail: '<b>' })).toContain('usuń go z szablonu');
    expect(describeFinding({ severity: 'ERROR', rule: 'html-in-plaintext-email', detail: '<i>' })).toContain('usuń go z szablonu');
  });

  it('placeholder-with-diacritics podpowiada poprawną pisownię', () => {
    const text = describeFinding({ severity: 'ERROR', rule: 'placeholder-with-diacritics', detail: '{{imię}}' });
    expect(text).toContain('polskie litery');
    expect(text).toContain('{{imie}}');
  });

  it('orphan-braces i template-leftover pokazują, co dokładnie jest nie tak', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'orphan-braces', detail: '{{imie' }))
      .toContain('niesparowane nawiasy klamrowe');
    expect(describeFinding({ severity: 'ERROR', rule: 'template-leftover', detail: '${x}' }))
      .toContain('resztkę kodu');
  });

  it('value-missing wskazuje konkretną zmienną, gdy backend ją podał', () => {
    const text = describeFinding({
      severity: 'ERROR',
      rule: 'value-missing',
      detail: '{{link}} = "https://x" nie występuje w treści',
    });
    expect(text).toContain('{{link}}');
    expect(text).toContain('nie pojawia się w wysłanej wiadomości');
  });

  it('value-missing ma sensowny fallback, gdy nie da się wyłuskać nazwy zmiennej', () => {
    const text = describeFinding({ severity: 'ERROR', rule: 'value-missing', detail: 'coś dziwnego' });
    expect(text).toContain('coś dziwnego');
  });

  it('required-empty i link-format cytują wartość z detail', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'required-empty', detail: '{{godzina}}' }))
      .toContain('{{godzina}}');
    expect(describeFinding({ severity: 'ERROR', rule: 'link-format', detail: 'http://zly-link' }))
      .toContain('http://zly-link');
  });

  it('date-without-year i whitespace nie potrzebują parametrów z detail', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'date-without-year', detail: '' }))
      .toContain('pełnej daty z rokiem');
    expect(describeFinding({ severity: 'WARNING', rule: 'whitespace', detail: 'x' }))
      .toContain('zbędne spacje');
  });

  it('template-empty używa gotowego polskiego opisu z backendu', () => {
    expect(describeFinding({
      severity: 'WARNING',
      rule: 'template-empty',
      detail: 'reguła włączona, ale bez treści — nic nie wyjdzie',
    })).toBe('reguła włączona, ale bez treści — nic nie wyjdzie');
  });

  it('nieznana reguła nie znika po cichu - wraca z surowym kodem, żeby ktoś zauważył lukę', () => {
    expect(describeFinding({ severity: 'ERROR', rule: 'nowa-nieopisana-reguła', detail: 'coś' }))
      .toBe('nowa-nieopisana-reguła: coś');
    expect(describeFinding({ severity: 'ERROR', rule: 'nowa-nieopisana-reguła', detail: '' }))
      .toBe('nowa-nieopisana-reguła');
  });
});
