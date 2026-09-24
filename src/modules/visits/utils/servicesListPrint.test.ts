import { describe, expect, it } from 'vitest';
import type { ServiceLineItem } from '../types';
import { buildServicesListHtml, damageMapImagePath, servicesListPrintData } from './servicesListPrint';
import type { ServicesListPrintData } from './servicesListPrint';

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

const visit = (over: Partial<Parameters<typeof servicesListPrintData>[0]> = {}): Parameters<typeof servicesListPrintData>[0] => ({
    visitNumber: 'VIS-2026-001',
    scheduledDate: '2026-09-20T08:00:00Z',
    estimatedCompletionDate: '2026-09-22T15:00:00Z',
    pickupDate: null,
    technicalNotes: undefined,
    mileageAtArrival: undefined,
    vehicle: {
        id: 'v1', licensePlate: 'KR 12345', brand: 'Porsche', model: '911',
        yearOfProduction: 2020, color: 'Czarny',
    },
    services: [line({})],
    ...over,
});

const company = { name: 'Detail Studio', street: 'Prosta 1', postalCode: '00-001', city: 'Warszawa', logoUrl: 'https://cdn.example/logo.png' };

const html = (v = visit(), map: Parameters<typeof servicesListPrintData>[2] = null, c: ServicesListPrintData['company'] = company) =>
    buildServicesListHtml(servicesListPrintData(v, c, map));

describe('buildServicesListHtml', () => {
    it('lists services, vehicle, dates and logo without any prices', () => {
        const out = html();

        expect(out).toContain('WYKAZ USŁUG');
        expect(out).toContain('Porsche');
        expect(out).toContain('911');
        expect(out).toContain('VIS-2026-001');
        expect(out).toContain('DATA PRZYJĘCIA');
        expect(out).toContain('PLANOWANA DATA WYDANIA');
        expect(out).toContain('20.09.2026');
        expect(out).toContain('22.09.2026');
        expect(out).not.toContain('20.09.2026,');
        expect(out).not.toContain('NOTATKA TECHNICZNA');
        expect(out).not.toContain('MAPA USZKODZEŃ');
        expect(out).toContain('<img src="https://cdn.example/logo.png"');
        expect(out).toContain('Mycie');
        expect(out).not.toMatch(/1\s?900|zł|1544|brutto|netto/i);
    });

    it('uses the actual pickup date once the car was released', () => {
        const out = html(visit({ pickupDate: '2026-09-23T10:00:00Z' }));

        expect(out).toContain('>DATA WYDANIA<');
        expect(out).not.toContain('PLANOWANA');
    });

    it('prints mileage at arrival', () => {
        expect(html(visit({ mileageAtArrival: 123456 }))).toMatch(/Przebieg<\/label><div class="box">123\s456 km</);
        expect(html()).toContain('Przebieg</label><div class="box">—<');
    });

    it('expands packages into their items in catalogue order', () => {
        const out = html(visit({
            services: [line({
                serviceName: 'Pakiet Premium',
                isPackage: true,
                packageItems: [
                    { serviceId: 'b', serviceName: 'Ceramika', position: 2 },
                    { serviceId: 'a', serviceName: 'Korekta lakieru', position: 1 },
                ],
            })],
        }));

        expect(out).toContain('Pakiet Premium');
        expect(out).toContain('PAKIET');
        expect(out.indexOf('Korekta lakieru')).toBeLessThan(out.indexOf('Ceramika'));
    });

    it('prints service comments and escapes user input', () => {
        const out = html(visit({
            services: [line({ serviceName: '<b>Mycie</b>', note: 'Uwaga na felgi\nlewy przód' })],
        }));

        expect(out).toContain('&lt;b&gt;Mycie&lt;/b&gt;');
        expect(out).toContain('Komentarz:');
        expect(out).toContain('Uwaga na felgi<br>lewy przód');
    });

    it('skips services rejected by the customer and works without a logo', () => {
        const out = html(visit({
            services: [
                line({ id: '1', serviceName: 'Zostaje' }),
                line({ id: '2', serviceName: 'Odrzucona', status: 'REJECTED' }),
            ],
        }), null, { ...company, logoUrl: null });

        expect(out).toContain('Zostaje');
        expect(out).not.toContain('Odrzucona');
        expect(out).not.toContain('<img');
    });

    it('prints the technical note with line breaks', () => {
        const out = html(visit({ technicalNotes: 'Rysa na drzwiach\n<pilnować>' }));

        expect(out).toContain('NOTATKA TECHNICZNA');
        expect(out).toContain('Rysa na drzwiach<br>&lt;pilnować&gt;');
    });

    it('draws the damage map with numbered markers and their descriptions', () => {
        const out = html(visit(), {
            vehicleType: 'suv',
            damagePoints: [
                { id: 7, x: 25.5, y: 40, note: 'Rysa na drzwiach' },
                { id: 9, x: 130, y: -5, note: '' },
            ],
        });

        expect(out).toContain('MAPA USZKODZEŃ');
        expect(out).toContain('src="/assets/suv.webp"');
        // Numeracja jak w edytorze - kolejność punktów, nie ich id.
        expect(out).toContain('style="left:25.5%;top:40%">1</span>');
        // Punkt spoza obrazka przyklejony do krawędzi.
        expect(out).toContain('style="left:100%;top:0%">2</span>');
        expect(out).toContain('Rysa na drzwiach');
        expect(out).toContain('<em>bez opisu</em>');
    });

    it('skips the damage map section when the map has no points', () => {
        expect(html(visit(), { vehicleType: 'sedan', damagePoints: [] })).not.toContain('MAPA USZKODZEŃ');
    });
});

describe('damageMapImagePath', () => {
    it('falls back to the sedan silhouette like the map editor does', () => {
        expect(damageMapImagePath('van')).toBe('/assets/van.webp');
        expect(damageMapImagePath(null)).toBe('/assets/sedan.webp');
        expect(damageMapImagePath('../../etc')).toBe('/assets/sedan.webp');
    });
});
