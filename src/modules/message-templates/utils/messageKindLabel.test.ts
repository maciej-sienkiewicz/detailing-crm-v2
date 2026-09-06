import { describe, expect, it } from 'vitest';
import { describeMessageKind } from './messageKindLabel';
import { MESSAGES } from '../catalog';

describe('describeMessageKind', () => {
  it('rozpoznaje kind dla każdej wiadomości SMS i e-mail w katalogu', () => {
    // Każdy klucz reguły w katalogu ma odpowiadający mu kind po stronie backendu
    // (MessageTemplateKind) - jeśli ta pętla by się nie domknęła, ekran próby
    // generalnej znowu pokazywałby surowy identyfikator zamiast nazwy z katalogu.
    MESSAGES.forEach(spec => {
      if (spec.sms) {
        expect(describeMessageKind(kindFor('SMS', spec.sms.ruleKey))).toBe(spec.name);
      }
      if (spec.email) {
        expect(describeMessageKind(kindFor('EMAIL', spec.email.ruleKey))).toBe(spec.name);
      }
    });
  });

  it('SMS_POST_VISIT to ten sam SMS, na który skarżył się biznes', () => {
    expect(describeMessageKind('SMS_POST_VISIT')).toBe('Podziękowanie po wizycie');
  });

  it('SMS_VISIT_READY_FOR_PICKUP odróżnia się od EMAIL_VISIT_READY_FOR_PICKUP', () => {
    expect(describeMessageKind('SMS_VISIT_READY_FOR_PICKUP')).toBe('Pojazd gotowy do odbioru');
    expect(describeMessageKind('EMAIL_VISIT_READY_FOR_PICKUP')).toBe('Pojazd gotowy do odbioru');
  });

  it('kind spoza katalogu (np. kampania marketingowa) wraca bez zmian, nie znika', () => {
    expect(describeMessageKind('CAMPAIGN')).toBe('CAMPAIGN');
  });
});

const toSnakeUpper = (camel: string): string => camel.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
const kindFor = (channel: 'SMS' | 'EMAIL', ruleKey: string) => `${channel}_${toSnakeUpper(ruleKey)}`;
