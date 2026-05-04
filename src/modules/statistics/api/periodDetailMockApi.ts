// src/modules/statistics/api/periodDetailMockApi.ts
// Mock contract for GET /v1/statistics/periods/{period}/visits
// Replace with real API call when backend implements the endpoint.

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
    if (n.endsWith('wski')) return n.replace('wski', 'wska');
    return n + 'a';
});

const VEHICLES = [
    'BMW 5 Series (2022)', 'Mercedes-Benz C 300 (2021)', 'Audi A6 (2023)',
    'Porsche Cayenne (2022)', 'Tesla Model 3 (2023)', 'Volvo XC90 (2021)',
    'Range Rover Sport (2022)', 'BMW X5 (2023)', 'Lexus RX 350 (2022)',
    'Mercedes-Benz S 500 (2023)', 'Audi Q7 (2022)', 'BMW M4 (2023)',
    'Porsche 911 (2022)', 'Toyota Supra (2023)', 'Lamborghini Urus (2022)',
    'Ferrari Roma (2023)', 'Mercedes-Benz GLE (2021)', 'Volkswagen Touareg (2022)',
];

const SERVICES = [
    { serviceId: 's-001', serviceName: 'Polerowanie maszynowe jednoetapowe', prices: [39900, 59900, 79900] },
    { serviceId: 's-002', serviceName: 'Polerowanie maszynowe dwuetapowe', prices: [79900, 119900, 159900] },
    { serviceId: 's-003', serviceName: 'Powłoka ceramiczna Gtechniq Crystal Serum', prices: [299900, 399900, 499900] },
    { serviceId: 's-004', serviceName: 'Folia ochronna PPF (maska)', prices: [249900, 349900, 499900] },
    { serviceId: 's-005', serviceName: 'Detailing wnętrza kompleksowy', prices: [49900, 79900, 99900] },
    { serviceId: 's-006', serviceName: 'Renowacja tapicerki skórzanej', prices: [89900, 129900, 179900] },
    { serviceId: 's-007', serviceName: 'Mycie kompleksowe + wosk', prices: [24900, 34900, 49900] },
    { serviceId: 's-008', serviceName: 'Korekta lakieru (głębokie rysy)', prices: [149900, 199900, 299900] },
    { serviceId: 's-009', serviceName: 'Czyszczenie i impregnacja felg', prices: [19900, 29900, 39900] },
    { serviceId: 's-010', serviceName: 'Ozonowanie wnętrza', prices: [14900, 19900, 24900] },
    { serviceId: 's-011', serviceName: 'Mycie i odtłuszczenie silnika', prices: [29900, 44900, 59900] },
    { serviceId: 's-012', serviceName: 'Usuwanie wgnieceń bezlakierowych (PDR)', prices: [99900, 149900, 199900] },
];

// ─── Generator ────────────────────────────────────────────────────────────────

function pickFromArray<T>(arr: T[], seed: number, idx: number): T {
    return arr[Math.floor(seededRand(seed, idx) * arr.length)];
}

function generateDate(period: string, granularity: Granularity, visitIndex: number): string {
    // Parse year/month/day from the period label
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (/^\d{4}-\d{2}$/.test(period)) {
        // MONTHLY: "2025-04"
        [year, month] = period.split('-').map(Number);
        month -= 1;
    } else if (/^\d{4}$/.test(period)) {
        // YEARLY: "2025"
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

export async function fetchPeriodDetail(
    period: string,
    granularity: Granularity
): Promise<PeriodDetail> {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 280));

    const seed = seedHash(period + granularity);
    const visitCount = 3 + Math.floor(seededRand(seed, 0) * 8); // 3–10 visits

    let totalRevenue = 0;
    const visits = Array.from({ length: visitCount }, (_, vi) => {
        const isFemale = seededRand(seed, vi * 11) > 0.5;
        const firstName = pickFromArray(FIRST_NAMES, seed, vi * 2);
        const lastName = pickFromArray(isFemale ? LAST_NAMES_F : LAST_NAMES, seed, vi * 2 + 1);
        const vehicle = pickFromArray(VEHICLES, seed, vi * 3);
        const visitDate = generateDate(period, granularity, vi);

        // Each visit has 1–4 services
        const serviceCount = 1 + Math.floor(seededRand(seed, vi * 5 + 99) * 3);
        const usedIndices = new Set<number>();
        const services = Array.from({ length: serviceCount }, (_, si) => {
            let sIdx: number;
            let attempts = 0;
            do {
                sIdx = Math.floor(seededRand(seed, vi * 100 + si * 7 + attempts) * SERVICES.length);
                attempts++;
            } while (usedIndices.has(sIdx) && attempts < 20);
            usedIndices.add(sIdx);

            const svc = SERVICES[sIdx];
            const priceIdx = Math.floor(seededRand(seed, vi * 100 + si * 7 + 50) * svc.prices.length);
            return {
                serviceId: svc.serviceId,
                serviceName: svc.serviceName,
                priceGross: svc.prices[priceIdx],
            };
        });

        const visitTotal = services.reduce((sum, s) => sum + s.priceGross, 0);
        totalRevenue += visitTotal;

        return {
            visitId: `mock-${period}-${vi}`,
            visitDate: formatDatePL(visitDate),
            clientName: `${firstName} ${lastName}`,
            vehicleInfo: vehicle,
            totalRevenueGross: visitTotal,
            services,
        };
    });

    // Sort by date descending (most recent first)
    visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate));

    return {
        period,
        granularity,
        orderCount: visitCount,
        totalRevenueGross: totalRevenue,
        visits,
    };
}
