// Brutto pozycji cennika na granicy API (CLAUDE.md §1).
//
// Zapisane brutto przechodzi co do grosza. Brak brutta - null, brak pola albo 0 zł
// przy netto > 0 - to dopiero wtedy brutto liczone z netta. Wcześniej 0 zł
// przechodziło jako „dokładne brutto": formularz edycji pokazywał 0,00 i zapis bez
// dotykania ceny wysyłał parę, którą backend odrzuca.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/core', () => ({
    apiClient: {
        get: (...args: unknown[]) => get(...args),
        post: (...args: unknown[]) => post(...args),
    },
}));

import { servicesApi, toService } from './servicesApi';
import type { ServiceDto } from '../types';

const dto = (over: Partial<ServiceDto>): ServiceDto => ({
    id: 's1',
    name: 'Powłoka ceramiczna 3 lata',
    basePriceNet: 154472,
    basePriceGross: 190000,
    vatRate: 23,
    requireManualPrice: false,
    isActive: true,
    isPackage: false,
    packageItems: null,
    createdAt: '',
    updatedAt: '',
    createdByFirstName: '',
    createdByLastName: '',
    updatedBy: '',
    replacesServiceId: null,
    ...over,
});

describe('toService - brutto z cennika', () => {
    it('brutto wpisane jako 1900,00 zł zostaje 190000 gr, nie 190001', () => {
        expect(toService(dto({})).basePriceGross).toBe(190000);
    });

    it('brak brutta (null albo brak pola) → brutto z netta', () => {
        expect(toService(dto({ basePriceGross: null })).basePriceGross).toBe(190001);
        expect(toService(dto({ basePriceGross: undefined })).basePriceGross).toBe(190001);
    });

    it('0 zł przy netto > 0 to brak brutta, nie cena', () => {
        expect(toService(dto({ basePriceNet: 50000, basePriceGross: 0 })).basePriceGross).toBe(61500);
    });

    it('wycena ręczna (0 / 0) zostaje zerem', () => {
        expect(toService(dto({ basePriceNet: 0, basePriceGross: 0, requireManualPrice: true })).basePriceGross).toBe(0);
    });

    it('ZW: brak brutta → brutto równe netto', () => {
        expect(toService(dto({ basePriceNet: 50000, basePriceGross: null, vatRate: -1 })).basePriceGross).toBe(50000);
    });
});

describe('servicesApi - normalizacja odpowiedzi', () => {
    beforeEach(() => { get.mockReset(); post.mockReset(); });

    it('lista: każda pozycja ma brutto, zapisane przechodzi bez zmian', async () => {
        get.mockResolvedValue({
            data: {
                services: [dto({}), dto({ id: 's2', basePriceNet: 50000, basePriceGross: 0 })],
                pagination: { currentPage: 1, totalPages: 1, totalItems: 2, itemsPerPage: 15 },
            },
        });
        const res = await servicesApi.getServices({ search: '', page: 1, limit: 15 });
        expect(res.services.map(s => s.basePriceGross)).toEqual([190000, 61500]);
        expect(res.pagination.totalItems).toBe(2);
    });

    it('zapis: odpowiedź bez brutta dostaje brutto z netta', async () => {
        post.mockResolvedValue({ data: dto({ id: 'new', basePriceNet: 10000, basePriceGross: null }) });
        const created = await servicesApi.createService({
            name: 'Mycie', basePriceNet: 10000, basePriceGross: 12300, vatRate: 23, requireManualPrice: false,
        });
        expect(created.basePriceGross).toBe(12300);
    });
});
