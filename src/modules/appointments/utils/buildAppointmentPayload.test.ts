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
import { catalogLinePrices } from '@/modules/calendar/components/QuickEventModal/linePrices';
import { netToGross } from '@/common/utils/priceAdjustment';

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

  it('usługa z katalogu (z serviceId) też niesie basePriceGross', () => {
    const data = baseData({
      serviceRefs: { 'line-1': 'catalog-svc-1' },
      serviceBasePrices: { 'line-1': 154472 },
      servicePrices: { 'line-1': 1900 },
    });

    const payload = buildAppointmentPayload(data);

    expect(payload.services[0].serviceId).toBe('catalog-svc-1');
    expect(payload.services[0].basePriceGross).toBe(190000);
  });

  // Ten przypadek NIE jest ozdobnikiem, choć pozycja ma serviceId.
  //
  // Dla zwykłej usługi backend istotnie czyta cenę z własnego rekordu i kwota
  // z żądania go nie obchodzi. Usługa z `requireManualPrice` nie ma jednak ceny
  // katalogowej - serwer trzyma przy niej zero, celowo - więc obie kwoty z tego
  // payloadu są JEDYNYM źródłem ceny takiej pozycji. Zgubione tutaj, nie odtworzą
  // się już nigdzie: rezerwacja zapisze się za 0 zł.
  it('cena ustalona ręcznie jedzie w obu kwotach - dla usługi bez ceny w cenniku to jedyne źródło', () => {
    // Człowiek wpisał 1900,00 zł w polu BRUTTO okna „Wprowadź cenę". Netto jest
    // pochodne (154472 gr), ale brutto musi dojechać dokładnie takie, jakie wpisał:
    // odtworzone z netta dałoby 1900,01 zł.
    const data = baseData({
      serviceRefs: { 'line-1': 'manual-price-svc' },
      serviceBasePrices: { 'line-1': 154472 },
      servicePrices: { 'line-1': 1900 },
    });

    const payload = buildAppointmentPayload(data);

    expect(payload.services[0].serviceId).toBe('manual-price-svc');
    expect(payload.services[0].basePriceNet).toBe(154472);
    expect(payload.services[0].basePriceGross).toBe(190000);
    // Rabat zerowy: kwota bazowa JEST kwotą końcową, nic jej po drodze nie zmienia.
    expect(payload.services[0].adjustment).toEqual({ type: 'PERCENT', value: 0 });
  });

  it('usługa darmowa (0 zł) - payload niesie 0 netto i 0 brutto, nie jest pomijana', () => {
    // Cena 0 jest legalna: usługa ustalana ręcznie bywa darmowa. Payload ma nieść
    // jawne zero, żeby backend dostał cenę, a nie musiał jej zgadywać.
    const data = baseData({
      serviceRefs: { 'line-1': 'manual-price-svc' },
      serviceBasePrices: { 'line-1': 0 },
      servicePrices: { 'line-1': 0 },
    });

    const payload = buildAppointmentPayload(data);

    expect(payload.services[0].basePriceNet).toBe(0);
    expect(payload.services[0].basePriceGross).toBe(0);
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

// Regresja: pozycja z CENNIKA nietknięta w tabeli jechała do API z 23%, bo formularz
// nie zapisywał jej stawki przy dodaniu (serviceVatRates wypełniała dopiero zmiana
// w tabeli), a ten builder nie ma cennika, z którego mógłby ją wziąć. Backend bierze
// stawkę pozycji katalogowej z żądania, więc usługa z 8% zapisywała się z 23%.
// Mapy formularza budujemy tu tą samą funkcją, której używa addService.
describe('buildAppointmentPayload - vatRate pozycji z cennika', () => {
  const catalogLine = (service: { basePriceNet: number; basePriceGross: number; vatRate: number }) => {
    const line = catalogLinePrices(service);
    return baseData({
      serviceRefs: { 'line-1': 'catalog-svc' },
      servicePrices: { 'line-1': line.grossPln },
      serviceBasePrices: { 'line-1': line.netCents },
      serviceVatRates: { 'line-1': line.vatRate },
    });
  };

  it('usługa z cennika z 8% VAT jedzie z 8%, a jej brutto 1900,00 dokładnie', () => {
    // 1900,00 zł brutto przy 8%: netto 175926 gr, a 175926 × 1,08 = 190000,08 → 190000.
    const payload = buildAppointmentPayload(catalogLine({ basePriceNet: 175926, basePriceGross: 190000, vatRate: 8 }));

    expect(payload.services[0]).toMatchObject({
      serviceId: 'catalog-svc',
      vatRate: 8,
      basePriceNet: 175926,
      basePriceGross: 190000,
    });
  });

  it('usługa z cennika z 23% i brutto 1900,00: 190000, nie 190001 odtworzone z netta', () => {
    const payload = buildAppointmentPayload(catalogLine({ basePriceNet: 154472, basePriceGross: 190000, vatRate: 23 }));

    expect(payload.services[0]).toMatchObject({ vatRate: 23, basePriceNet: 154472, basePriceGross: 190000 });
  });

  it.each([5, 0, -1])('stawka %i z cennika nie zamienia się w 23%%', (vatRate) => {
    const payload = buildAppointmentPayload(
      catalogLine({ basePriceNet: 10000, basePriceGross: netToGross(10000, vatRate), vatRate }),
    );

    expect(payload.services[0].vatRate).toBe(vatRate);
  });
});

describe('buildAppointmentPayload - całodniowa tylko wizyta jednodniowa', () => {
  it('całodniowa na jeden dzień zostaje całodniowa', () => {
    const payload = buildAppointmentPayload(baseData({
      isAllDay: true,
      startDateTime: '2026-09-24',
      endDateTime: '2026-09-24T23:59:59',
    }));

    expect(payload.schedule.isAllDay).toBe(true);
    expect(payload.schedule.startDateTime).toBe(new Date('2026-09-24T00:00:00').toISOString());
  });

  it('isAllDay z końcem kilka dni dalej nie przechodzi - wielodniowa ma godziny', () => {
    const payload = buildAppointmentPayload(baseData({
      isAllDay: true,
      startDateTime: '2026-09-24',
      endDateTime: '2026-09-28T23:59:59',
    }));

    expect(payload.schedule.isAllDay).toBe(false);
  });
});
