// Regresja z produkcji: dodanie nowej usługi w QuickEventModal z ceną brutto 1900,00 zł
// (23% VAT) zapisywało się jako 1900,01 zł. Ten sam scenariusz w Ustawienia → Usługi
// zapisuje 1900,00 - bo tam basePriceGross jedzie do API razem z basePriceNet, więc
// backend nie musi go odtwarzać z netto (a odtworzenie się nie zgadza: 1900,00 → netto
// 1544,72 → z powrotem brutto 1900,01, przez zaokrąglenie „w stu"). Payload budowany
// tutaj dla QuickEventModal miał własny typ ServiceLineItemPayload bez pola
// basePriceGross - usługa bez serviceId (nowa, niezapisana w katalogu) nie miała więc
// jak przewieźć dokładnej kwoty do backendu, który akceptuje to pole
// (CreateAppointmentRequest.ServiceLineItemRequest.basePriceGross), tylko go nie dostawał.
import { describe, expect, it } from 'vitest';
import { buildAppointmentPayload } from './buildAppointmentPayload';
import type { QuickEventFormData } from '@/modules/calendar/components/QuickEventModal';

const baseData = (overrides: Partial<QuickEventFormData> = {}): QuickEventFormData => ({
  title: '',
  customer: { id: 'cust-1', isNew: false },
  vehicle: null,
  startDateTime: '2026-09-15T10:00',
  endDateTime: '2026-09-15T11:00',
  isAllDay: false,
  serviceIds: ['line-1'],
  colorId: 'color-1',
  sendConfirmationSms: false,
  sendReminderSms: false,
  sendVisitCard: false,
  ...overrides,
});

describe('buildAppointmentPayload - basePriceGross', () => {
  it('usługa spoza katalogu (bez serviceId) niesie dokładne brutto z formularza w groszach', () => {
    // 1900,00 zł brutto przy 23% VAT: netto = round(1900 * 100 / 123) = 1544,72 zł.
    // Odtworzenie brutto z tego netto (round(154472 * 1,23)) daje 1900,01, nie 1900,00 -
    // stąd zgłoszony błąd. basePriceGross musi nieść dokładną, wpisaną wartość.
    const data = baseData({
      tempServices: { 'temp-1': { name: 'Nowa usługa', basePriceNet: 154472, vatRate: 23 } },
      serviceRefs: { 'line-1': 'temp-1' },
      servicePrices: { 'line-1': 1900 },
    });

    const payload = buildAppointmentPayload(data);

    expect(payload.services[0].basePriceGross).toBe(190000);
    expect(payload.services[0].serviceId).toBeNull();
  });

  it('usługa z katalogu (z serviceId) też niesie basePriceGross - nieszkodliwe, backend i tak czyta własny rekord', () => {
    const data = baseData({
      serviceRefs: { 'line-1': 'catalog-svc-1' },
      serviceBasePrices: { 'line-1': 154472 },
      servicePrices: { 'line-1': 1900 },
    });

    const payload = buildAppointmentPayload(data);

    expect(payload.services[0].serviceId).toBe('catalog-svc-1');
    expect(payload.services[0].basePriceGross).toBe(190000);
  });

  it('grosze są zaokrąglane, nie ucinane (1900,005 → 190001, nie 190000)', () => {
    const data = baseData({
      tempServices: { 'temp-1': { name: 'X', basePriceNet: 0, vatRate: 23 } },
      serviceRefs: { 'line-1': 'temp-1' },
      servicePrices: { 'line-1': 1900.005 },
    });

    expect(buildAppointmentPayload(data).services[0].basePriceGross).toBe(190001);
  });

  it('brak ceny w servicePrices nie wysyła basePriceGross - stary, zdefiniowany fallback dla backendu', () => {
    const data = baseData({
      tempServices: { 'temp-1': { name: 'X', basePriceNet: 100000, vatRate: 23 } },
      serviceRefs: { 'line-1': 'temp-1' },
    });

    expect(buildAppointmentPayload(data).services[0].basePriceGross).toBeUndefined();
  });

  it('kilka pozycji: każda niesie swoje własne, dokładne brutto', () => {
    const data = baseData({
      serviceIds: ['line-1', 'line-2'],
      tempServices: {
        'temp-1': { name: 'A', basePriceNet: 154472, vatRate: 23 },
        'temp-2': { name: 'B', basePriceNet: 8130, vatRate: 8 },
      },
      serviceRefs: { 'line-1': 'temp-1', 'line-2': 'temp-2' },
      servicePrices: { 'line-1': 1900, 'line-2': 87.5 },
    });

    const payload = buildAppointmentPayload(data);

    expect(payload.services[0].basePriceGross).toBe(190000);
    expect(payload.services[1].basePriceGross).toBe(8750);
  });
});

describe('buildAppointmentPayload - vatRate dla usługi tworzonej w QuickEventModal', () => {
  it('stawka VAT wybrana przy tworzeniu usługi (np. 8%) nie zamienia się cichcem na 23%', () => {
    // Wcześniej handleQuickServiceCreate zapisywał do tempServices na sztywno vatRate: 23,
    // niezależnie od tego, jaką stawkę wybrał użytkownik w QuickServiceModal.
    const data = baseData({
      tempServices: { 'temp-1': { name: 'Usługa 8%', basePriceNet: 8130, vatRate: 8 } },
      serviceRefs: { 'line-1': 'temp-1' },
      servicePrices: { 'line-1': 87.5 },
    });

    expect(buildAppointmentPayload(data).services[0].vatRate).toBe(8);
  });

  it('jawnie ustawiona stawka na pozycji (serviceVatRates) nadal wygrywa nad domyślną z tempServices', () => {
    const data = baseData({
      tempServices: { 'temp-1': { name: 'X', basePriceNet: 154472, vatRate: 8 } },
      serviceRefs: { 'line-1': 'temp-1' },
      serviceVatRates: { 'line-1': 23 },
      servicePrices: { 'line-1': 1900 },
    });

    expect(buildAppointmentPayload(data).services[0].vatRate).toBe(23);
  });
});
