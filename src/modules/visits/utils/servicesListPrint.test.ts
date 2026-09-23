import { describe, expect, it } from 'vitest';
import type { ServiceLineItem } from '../types';
import { buildServicesListHtml, servicesListPrintData } from './servicesListPrint';

const line = (over: Partial<ServiceLineItem>): ServiceLineItem => ({
    id: 'l1',
    serviceId: 's1',
    serviceName: 'Mycie',
    basePriceNet: 154472,
    vatRate: 23,
    requireManualPrice: false,
    adjustment: null,
    note: '',
    finalPriceNet: 154472,
    finalPriceGross: 190000,
    status: 'CONFIRMED',
    ...over,
});

const visit = {
    visitNumber: 'VIS-2026-001',
    scheduledDate: '2026-09-20T08:00:00Z',
    estimatedCompletionDate: '2026-09-22T15:00:00Z',
    pickupDate: null,
    vehicle: {
        id: 'v1', licensePlate: 'KR 12345', brand: 'Porsche', model: '911',
        yearOfProduction: 2020, color: 'Czarny',
    },
};

const company = { name: 'Detail Studio', street: 'Prosta 1', postalCode: '00-001', city: 'Warszawa', logoUrl: 'https://cdn.example/logo.png' };

describe('buildServicesListHtml', () => {
    it('lists services, vehicle, dates and logo without any prices', () => {
        const html = buildServicesListHtml(servicesListPrintData(visit, [line({})], company));

        expect(html).toContain('WYKAZ USŁUG');
        expect(html).toContain('Porsche');
        expect(html).toContain('911');
        expect(html).toContain('VIS-2026-001');
        expect(html).toContain('DATA PRZYJĘCIA POJAZDU');
        expect(html).toContain('PLANOWANA DATA WYDANIA POJAZDU');
        expect(html).toContain('<img src="https://cdn.example/logo.png"');
        expect(html).toContain('Mycie');
        expect(html).not.toMatch(/1\s?900|zł|1544|brutto|netto/i);
    });

    it('uses the actual pickup date once the car was released', () => {
        const html = buildServicesListHtml(servicesListPrintData(
            { ...visit, pickupDate: '2026-09-23T10:00:00Z' }, [line({})], company));

        expect(html).toContain('>DATA WYDANIA POJAZDU<');
        expect(html).not.toContain('PLANOWANA');
    });

    it('expands packages into their items in catalogue order', () => {
        const html = buildServicesListHtml(servicesListPrintData(visit, [line({
            serviceName: 'Pakiet Premium',
            isPackage: true,
            packageItems: [
                { serviceId: 'b', serviceName: 'Ceramika', position: 2 },
                { serviceId: 'a', serviceName: 'Korekta lakieru', position: 1 },
            ],
        })], company));

        expect(html).toContain('Pakiet Premium');
        expect(html).toContain('PAKIET');
        expect(html.indexOf('Korekta lakieru')).toBeLessThan(html.indexOf('Ceramika'));
    });

    it('prints service comments and escapes user input', () => {
        const html = buildServicesListHtml(servicesListPrintData(visit, [line({
            serviceName: '<b>Mycie</b>',
            note: 'Uwaga na felgi\nlewy przód',
        })], company));

        expect(html).toContain('&lt;b&gt;Mycie&lt;/b&gt;');
        expect(html).toContain('Komentarz:');
        expect(html).toContain('Uwaga na felgi<br>lewy przód');
    });

    it('skips services rejected by the customer and works without a logo', () => {
        const html = buildServicesListHtml(servicesListPrintData(visit, [
            line({ id: '1', serviceName: 'Zostaje' }),
            line({ id: '2', serviceName: 'Odrzucona', status: 'REJECTED' }),
        ], { ...company, logoUrl: null }));

        expect(html).toContain('Zostaje');
        expect(html).not.toContain('Odrzucona');
        expect(html).not.toContain('<img');
    });
});
