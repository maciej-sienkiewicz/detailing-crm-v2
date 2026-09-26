// Logika sekcji „Studio" bez widoku: liczenie zmian w Danych firmy, rozpoznawanie
// dymków interceptora i to, kiedy wolno usunąć szablon protokołu.
import { describe, expect, it } from 'vitest';
import type { ProtocolRule } from '@/modules/protocols/types';
import { countChangedFields, validateCompanyForm, type CompanyForm } from './companyForm';
import { byDisplayOrder, isTemplateOrphanedBy } from './documentsModel';
import { readableError, shownByInterceptor } from './studioErrors';

const form: CompanyForm = {
    name: 'Detail Studio',
    taxId: '527-123-45-67',
    regon: '142836501',
    street: 'ul. Prosta 20',
    postalCode: '00-850',
    city: 'Warszawa',
    phone: '+48 600 100 300',
    email: 'biuro@studio.pl',
    bankAccount: '',
    website: '',
};

describe('Dane firmy - liczenie zmian', () => {
    it('zmiana cofnięta ręcznie przestaje się liczyć (pasek „Zapisz" znika)', () => {
        expect(countChangedFields({ ...form, phone: '+48 600 100 301' }, form)).toBe(1);
        expect(countChangedFields({ ...form, phone: '+48 600 100 300' }, form)).toBe(0);
    });

    it('liczy każde zmienione pole osobno', () => {
        expect(countChangedFields({ ...form, phone: 'x', regon: '' }, form)).toBe(2);
    });

    it('REGON: 9 albo 14 cyfr, inaczej błąd z wyjaśnieniem', () => {
        expect(validateCompanyForm(form).regon).toBeUndefined();
        expect(validateCompanyForm({ ...form, regon: '12345678901234' }).regon).toBeUndefined();
        expect(validateCompanyForm({ ...form, regon: '' }).regon).toMatch(/9 albo 14 cyfr/);
    });

    it('pola opcjonalne mogą być puste', () => {
        expect(validateCompanyForm(form)).toEqual({});
    });
});

describe('studioErrors - bez dubli i bez żargonu axiosa', () => {
    const axiosLike = (status: number, extra: object = {}) => ({
        message: `Request failed with status code ${status}`,
        response: { status, data: { message: 'NIP jest już używany' } },
        config: { method: 'put', ...extra },
    });

    it('4xx bez skipErrorToast pokazał już interceptor', () => {
        expect(shownByInterceptor(axiosLike(400))).toBe(true);
    });

    it('4xx ze skipErrorToast - komunikat pokazuje sekcja', () => {
        expect(shownByInterceptor(axiosLike(400, { skipErrorToast: true }))).toBe(false);
    });

    it('403 przy zapisie interceptor ogłasza zawsze', () => {
        expect(shownByInterceptor(axiosLike(403, { skipErrorToast: true }))).toBe(true);
    });

    it('5xx i brak sieci przechodzą bez słowa - wtedy mówi sekcja', () => {
        expect(shownByInterceptor(axiosLike(500))).toBe(false);
        expect(shownByInterceptor(new Error('Network Error'))).toBe(false);
    });

    it('w oknie pokazujemy zdanie z backendu, nie „Request failed with status code 400"', () => {
        expect(readableError(axiosLike(400), 'ogólnik')).toBe('NIP jest już używany');
        expect(readableError({ message: 'Request failed with status code 500', response: { status: 500 } }, 'ogólnik')).toBe('ogólnik');
        expect(readableError(new Error('Serwer plików odrzucił PDF (błąd 403). Spróbuj ponownie.'), 'ogólnik'))
            .toBe('Serwer plików odrzucił PDF (błąd 403). Spróbuj ponownie.');
    });
});

describe('Dokumenty - usuwanie szablonu protokołu', () => {
    const rule = (id: string, templateId: string, stage: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN', displayOrder = 0) =>
        ({ id, protocolTemplateId: templateId, stage, displayOrder, triggerType: 'GLOBAL_ALWAYS', serviceIds: [], serviceNames: [] }) as unknown as ProtocolRule;

    it('szablon używany przez inną regułę (drugi etap) zostaje', () => {
        const a = rule('r1', 't1', 'CHECK_IN');
        const b = rule('r2', 't1', 'CHECK_OUT');
        expect(isTemplateOrphanedBy(a, [a, b])).toBe(false);
    });

    it('szablon bez innych reguł jest do usunięcia', () => {
        const a = rule('r1', 't1');
        const b = rule('r2', 't2');
        expect(isTemplateOrphanedBy(a, [a, b])).toBe(true);
    });

    it('sortowanie nie przestawia tablicy z cache react-query', () => {
        const cached = [rule('r2', 't', 'CHECK_IN', 2), rule('r1', 't', 'CHECK_IN', 1)];
        const sorted = byDisplayOrder(cached);
        expect(sorted.map(r => r.id)).toEqual(['r1', 'r2']);
        expect(cached.map(r => r.id)).toEqual(['r2', 'r1']);
    });
});
