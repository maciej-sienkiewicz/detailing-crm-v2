// src/modules/statistics/api/periodDetailMockApi.ts
// Mock contract for GET /v1/statistics/periods/{period}/visits
// Replace with real API call when backend implements the endpoint.
//
// When categoryId is provided, each service gets inCategory: boolean.
// The period/visit totalRevenueGross reflects only in-category services;
// totalRevenueGrossAll reflects the full visit revenue.

import type { PeriodDetail, Granularity } from '../types';

// ─── Seed-based deterministic pseudo-random ───────────────────────────────────

function seedHash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
}

function seededRand(seed: number, index: number): number {
    const h = seedHash(`${seed}_${index}`);
    return (h % 10000) / 10000;
}

// ─── Mock data pools ──────────────────────────────────────────────────────────

const FIRST_NAMES = [
    'Jan', 'Anna', 'Piotr', 'Maria', 'Krzysztof',
    'Katarzyna', 'Marek', 'Agnieszka', 'Tomasz', 'Małgorzata',
    'Michał', 'Joanna', 'Paweł', 'Monika', 'Robert',
];

const LAST_NAMES = [
    'Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kowalczyk',
    'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak',
    'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Wojciechowski',
];

const LAST_NAMES_F = LAST_NAMES.map(n => {
    if (n.endsWith('ski')) return n.replace('ski', 'ska');
    if (n.endsWith('ki')) return n.replace('ki', 'ka');
    return n + 'a';
});

const VEHICLES = [
    'BMW 5 Series (2022)', 'Mercedes-Benz C 300 (2021)', 'Audi A6 (2023)',
    'Porsche Cayenne (2022)', 'Tesla Model 3 (2023)', 'Volvo XC90 (2021)',
    'Range Rover Sport (2022)', 'BMW X5 (2023)', 'Lexus RX 350 (2022)',
    'Mercedes-Benz S 500 (2023)', 'Audi Q7 (2022)', 'BMW M4 (2023)',
    'Porsche 911 (2022)', 'Toyota Supra (2023)', 'Mercedes-Benz GLE (2021)',
    'Volkswagen Touareg (2022)', 'Lamborghini Urus (2022)', 'Ferrari Roma (2023)',
];

// Split services into two pools so a category filter can realistically
// cover ~half and leave the other half as "other services".
const SERVICES_POOL_A = [
    { serviceId: 's-001', serviceName: 'Mycie zewnętrzne + suszenie', prices: [14900, 19900, 24900] },
    { serviceId: 's-002', serviceName: 'Mycie kompleksowe z woskiem', prices: [24900, 34900, 49900] },
    { serviceId: 's-003', serviceName: 'Odkurzanie i czyszczenie wnętrza', prices: [19900, 29900, 39900] },
    { serviceId: 's-004', serviceName: 'Czyszczenie felg i opon', prices: [14900, 19900, 29900] },
    { serviceId: 's-005', serviceName: 'Ozonowanie wnętrza', prices: [14900, 19900, 24900] },
    { serviceId: 's-006', serviceName: 'Mycie silnika', prices: [29900, 44900, 59900] },
];

const SERVICES_POOL_B = [
    { serviceId: 's-007', serviceName: 'Polerowanie maszynowe jednoetapowe', prices: [39900, 59900, 79900] },
    { serviceId: 's-008', serviceName: 'Polerowanie maszynowe dwuetapowe', prices: [79900, 119900, 159900] },
    { serviceId: 's-009', serviceName: 'Powłoka ceramiczna Gtechniq Crystal Serum', prices: [299900, 399900, 499900] },
    { serviceId: 's-010', serviceName: 'Folia ochronna PPF (maska)', prices: [249900, 349900, 499900] },
    { serviceId: 's-011', serviceName: 'Renowacja tapicerki skórzanej', prices: [89900, 129900, 179900] },
    { serviceId: 's-012', serviceName: 'Korekta lakieru (głębokie rysy)', prices: [149900, 199900, 299900] },
];

const ALL_SERVICES = [...SERVICES_POOL_A, ...SERVICES_POOL_B];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickFromArray<T>(arr: T[], seed: number, idx: number): T {
    return arr[Math.floor(seededRand(seed, idx) * arr.length)];
}

function generateDate(period: string, visitIndex: number): string {
    let year = new Date().getFullYear();
    let month = new Date().getMonth();

    if (/^\d{4}-\d{2}$/.test(period)) {
        const parts = period.split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
    } else if (/^\d{4}$/.test(period)) {
        year = parseInt(period, 10);
        month = Math.floor(seededRand(seedHash(period), visitIndex * 7) * 12);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.floor(seededRand(seedHash(period), visitIndex * 3 + 1) * daysInMonth) + 1;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDatePL(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
    return `${d} ${months[m - 1]} ${y}`;
}

// ─── Main mock fetch ──────────────────────────────────────────────────────────

export async function fetchPeriodDetail(
    period: string,
    granularity: Granularity,
    options?: {
        categoryId?: string | null;
        categoryName?: string | null;
    }
): Promise<PeriodDetail> {
    await new Promise(r => setTimeout(r, 280));

    const { categoryId = null, categoryName = null } = options ?? {};
    const seed = seedHash(period + granularity + (categoryId ?? ''));
    const visitCount = 3 + Math.floor(seededRand(seed, 0) * 8);

    let totalRevenue = 0;
    let totalRevenueAll = 0;

    const visits = Array.from({ length: visitCount }, (_, vi) => {
        const isFemale = seededRand(seed, vi * 11) > 0.5;
        const firstName = pickFromArray(FIRST_NAMES, seed, vi * 2);
        const lastName = pickFromArray(isFemale ? LAST_NAMES_F : LAST_NAMES, seed, vi * 2 + 1);
        const vehicle = pickFromArray(VEHICLES, seed, vi * 3);
        const visitDate = formatDatePL(generateDate(period, vi));

        // Each visit: 1–4 services picked from full pool (no duplicates)
        const serviceCount = 1 + Math.floor(seededRand(seed, vi * 5 + 99) * 4);
        const usedIndices = new Set<number>();

        const services = Array.from({ length: serviceCount }, (_, si) => {
            let sIdx: number;
            let attempts = 0;
            do {
                sIdx = Math.floor(seededRand(seed, vi * 100 + si * 7 + attempts) * ALL_SERVICES.length);
                attempts++;
            } while (usedIndices.has(sIdx) && attempts < 20);
            usedIndices.add(sIdx);

            const svc = ALL_SERVICES[sIdx];
            const priceIdx = Math.floor(seededRand(seed, vi * 100 + si * 7 + 50) * svc.prices.length);

            // When a category filter is active: pool A = in-category, pool B = other.
            // This gives a natural split without needing real service→category mapping.
            const inCategory = categoryId != null
                ? sIdx < SERVICES_POOL_A.length
                : undefined;

            return {
                serviceId: svc.serviceId,
                serviceName: svc.serviceName,
                priceGross: svc.prices[priceIdx],
                ...(categoryId != null ? { inCategory } : {}),
            };
        });

        const visitRevenueAll = services.reduce((s, sv) => s + sv.priceGross, 0);
        const visitRevenue = categoryId != null
            ? services.filter(sv => sv.inCategory).reduce((s, sv) => s + sv.priceGross, 0)
            : visitRevenueAll;

        totalRevenue += visitRevenue;
        totalRevenueAll += visitRevenueAll;

        return {
            visitId: `mock-${period}-${vi}`,
            visitDate,
            clientName: `${firstName} ${lastName}`,
            vehicleInfo: vehicle,
            totalRevenueGross: visitRevenue,
            totalRevenueGrossAll: visitRevenueAll,
            services,
        };
    });

    visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate));

    return {
        period,
        granularity,
        orderCount: visitCount,
        totalRevenueGross: totalRevenue,
        totalRevenueGrossAll: totalRevenueAll,
        categoryName,
        visits,
    };
}
