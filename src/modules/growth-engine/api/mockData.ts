/**
 * Growth Engine Mock Data
 * Realistic auto-detailing market data for Polish market
 * Simulates DataForSEO Keywords Data API response
 */

import type { ServiceIntent, Voivodeship } from '../types';

/**
 * Polish voivodeships (ISO 3166-2:PL)
 */
export const voivodeships: Voivodeship[] = [
  { code: 'PL-DS', name: 'dolnośląskie' },
  { code: 'PL-KP', name: 'kujawsko-pomorskie' },
  { code: 'PL-LU', name: 'lubelskie' },
  { code: 'PL-LB', name: 'lubuskie' },
  { code: 'PL-LD', name: 'łódzkie' },
  { code: 'PL-MA', name: 'małopolskie' },
  { code: 'PL-MZ', name: 'mazowieckie' },
  { code: 'PL-OP', name: 'opolskie' },
  { code: 'PL-PK', name: 'podkarpackie' },
  { code: 'PL-PD', name: 'podlaskie' },
  { code: 'PL-PM', name: 'pomorskie' },
  { code: 'PL-SL', name: 'śląskie' },
  { code: 'PL-SK', name: 'świętokrzyskie' },
  { code: 'PL-WN', name: 'warmińsko-mazurskie' },
  { code: 'PL-WP', name: 'wielkopolskie' },
  { code: 'PL-ZP', name: 'zachodniopomorskie' },
];

/**
 * Generate 12 months of mock search data with realistic seasonality
 * Auto-detailing peaks in spring (March-May) and early autumn (September)
 */
function generateMonthlySearches(
  baseVolume: number,
  seasonalPattern: number[],
  trendMultiplier: number = 1.0,
): { year: number; month: number; searchVolume: number }[] {
  const now = new Date();
  const months: { year: number; month: number; searchVolume: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIndex = date.getMonth(); // 0-11
    const seasonalFactor = seasonalPattern[monthIndex];
    const trendFactor = 1 + (trendMultiplier - 1) * ((12 - i) / 12);
    const noise = 0.9 + Math.random() * 0.2; // ±10% noise

    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      searchVolume: Math.round(baseVolume * seasonalFactor * trendFactor * noise),
    });
  }

  return months;
}

// Seasonal patterns for different service categories
// Index 0 = January, 11 = December
const SPRING_PEAK = [0.5, 0.6, 1.0, 1.2, 1.3, 1.1, 0.9, 0.8, 1.0, 0.9, 0.6, 0.4];
const SUMMER_PEAK = [0.4, 0.5, 0.7, 0.9, 1.1, 1.3, 1.2, 1.1, 0.9, 0.7, 0.5, 0.3];
const WINTER_PEAK = [1.2, 1.1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.4, 0.6, 0.8, 1.1, 1.3];
const FLAT_DEMAND = [0.9, 0.9, 1.0, 1.1, 1.1, 1.0, 1.0, 1.0, 1.1, 1.0, 0.9, 0.8];
const AUTUMN_PEAK = [0.6, 0.5, 0.7, 0.8, 0.9, 0.8, 0.7, 0.9, 1.3, 1.2, 1.0, 0.7];

/**
 * Chart color palette for service intents
 */
const CHART_COLORS = [
  '#00F5A0', // neon green
  '#00D9F5', // neon cyan
  '#F5A623', // amber
  '#BD10E0', // purple
  '#F5515F', // coral red
  '#7B61FF', // violet
  '#00B8D4', // teal
  '#FF6B6B', // salmon
  '#4ECDC4', // mint
  '#FFE66D', // yellow
  '#A8E6CF', // light green
  '#FF8A80', // light red
  '#B388FF', // light purple
  '#82B1FF', // light blue
  '#CCFF90', // lime
  '#FFD180', // light orange
  '#EA80FC', // pink
  '#84FFFF', // light cyan
  '#F4FF81', // light yellow
  '#FF80AB', // light pink
];

function computeMomentum(
  monthlySearches: { year: number; month: number; searchVolume: number }[],
): number {
  if (monthlySearches.length < 2) return 0;
  const last = monthlySearches[monthlySearches.length - 1].searchVolume;
  const prev = monthlySearches[monthlySearches.length - 2].searchVolume;
  if (prev === 0) return 0;
  return Math.round(((last - prev) / prev) * 100);
}

function computeTotal(
  monthlySearches: { year: number; month: number; searchVolume: number }[],
): number {
  return monthlySearches.reduce((sum, m) => sum + m.searchVolume, 0);
}

function computeAvg(
  monthlySearches: { year: number; month: number; searchVolume: number }[],
): number {
  return Math.round(computeTotal(monthlySearches) / monthlySearches.length);
}

/**
 * Generate all service intents with mock data
 */
export function generateMockIntents(): ServiceIntent[] {
  const intentsConfig: {
    id: string;
    name: string;
    description: string;
    category: string;
    baseVolume: number;
    pattern: number[];
    trend: number;
    inOffer: boolean;
  }[] = [
    // --- W ofercie studia ---
    {
      id: 'ceramic-coating',
      name: 'Powłoka ceramiczna',
      description: 'Aplikacja powłok ceramicznych na lakier',
      category: 'Ochrona',
      baseVolume: 2800,
      pattern: SPRING_PEAK,
      trend: 1.15,
      inOffer: true,
    },
    {
      id: 'interior-detailing',
      name: 'Detailing wnętrza',
      description: 'Kompleksowe czyszczenie i pielęgnacja wnętrza',
      category: 'Czyszczenie',
      baseVolume: 3200,
      pattern: FLAT_DEMAND,
      trend: 1.08,
      inOffer: true,
    },
    {
      id: 'paint-correction',
      name: 'Korekta lakieru',
      description: 'Polerowanie i usuwanie zarysowań',
      category: 'Korekta',
      baseVolume: 2400,
      pattern: SPRING_PEAK,
      trend: 1.05,
      inOffer: true,
    },
    {
      id: 'exterior-wash',
      name: 'Mycie premium',
      description: 'Profesjonalne mycie zewnętrzne z osuszaniem',
      category: 'Czyszczenie',
      baseVolume: 4500,
      pattern: SUMMER_PEAK,
      trend: 1.02,
      inOffer: true,
    },
    {
      id: 'wax-sealant',
      name: 'Woskowanie i sealant',
      description: 'Nakładanie wosku naturalnego lub syntetycznego',
      category: 'Ochrona',
      baseVolume: 1800,
      pattern: SPRING_PEAK,
      trend: 0.95,
      inOffer: true,
    },
    {
      id: 'leather-care',
      name: 'Pielęgnacja skóry',
      description: 'Czyszczenie i konserwacja tapicerki skórzanej',
      category: 'Czyszczenie',
      baseVolume: 1600,
      pattern: FLAT_DEMAND,
      trend: 1.03,
      inOffer: true,
    },
    {
      id: 'engine-detailing',
      name: 'Detailing silnika',
      description: 'Czyszczenie i konserwacja komory silnika',
      category: 'Czyszczenie',
      baseVolume: 900,
      pattern: SUMMER_PEAK,
      trend: 1.0,
      inOffer: true,
    },
    {
      id: 'wheel-detailing',
      name: 'Detailing felg',
      description: 'Czyszczenie, polerowanie i ochrona felg',
      category: 'Czyszczenie',
      baseVolume: 1400,
      pattern: SPRING_PEAK,
      trend: 1.06,
      inOffer: true,
    },
    // --- BRAK w ofercie (Opportunity Gap) ---
    {
      id: 'ppf-protection',
      name: 'Folia ochronna PPF',
      description: 'Folia zabezpieczająca lakier przed odpryskami',
      category: 'Ochrona',
      baseVolume: 2200,
      pattern: SPRING_PEAK,
      trend: 1.35,
      inOffer: false,
    },
    {
      id: 'graphene-coating',
      name: 'Powłoka grafenowa',
      description: 'Najnowsza generacja powłok ochronnych',
      category: 'Ochrona',
      baseVolume: 1800,
      pattern: SPRING_PEAK,
      trend: 1.55,
      inOffer: false,
    },
    {
      id: 'headlight-restoration',
      name: 'Regeneracja reflektorów',
      description: 'Polerowanie i zabezpieczanie kloszy lamp',
      category: 'Korekta',
      baseVolume: 2100,
      pattern: AUTUMN_PEAK,
      trend: 1.12,
      inOffer: false,
    },
    {
      id: 'window-tinting',
      name: 'Przyciemnianie szyb',
      description: 'Instalacja folii okiennych',
      category: 'Modyfikacja',
      baseVolume: 2600,
      pattern: SUMMER_PEAK,
      trend: 1.18,
      inOffer: false,
    },
    {
      id: 'odor-removal',
      name: 'Usuwanie zapachów (ozonowanie)',
      description: 'Neutralizacja zapachów ozonowaniem',
      category: 'Czyszczenie',
      baseVolume: 1500,
      pattern: FLAT_DEMAND,
      trend: 1.22,
      inOffer: false,
    },
    {
      id: 'vinyl-wrap',
      name: 'Oklejanie folią (car wrap)',
      description: 'Zmiana koloru auta folią winylową',
      category: 'Modyfikacja',
      baseVolume: 1900,
      pattern: SUMMER_PEAK,
      trend: 1.40,
      inOffer: false,
    },
    {
      id: 'rim-repair',
      name: 'Naprawa felg aluminiowych',
      description: 'Spawanie i regeneracja felg',
      category: 'Korekta',
      baseVolume: 1700,
      pattern: WINTER_PEAK,
      trend: 1.08,
      inOffer: false,
    },
    {
      id: 'glass-coating',
      name: 'Powłoka na szyby (hydrofobowa)',
      description: 'Niewidzialna wycieraczka - powłoka odpychająca wodę',
      category: 'Ochrona',
      baseVolume: 1300,
      pattern: AUTUMN_PEAK,
      trend: 1.25,
      inOffer: false,
    },
    {
      id: 'scratch-repair',
      name: 'Usuwanie głębokich rys',
      description: 'Lokalna naprawa zarysowań i otarć',
      category: 'Korekta',
      baseVolume: 2000,
      pattern: FLAT_DEMAND,
      trend: 1.10,
      inOffer: false,
    },
    {
      id: 'upholstery-cleaning',
      name: 'Pranie tapicerki materiałowej',
      description: 'Ekstrakcyjne czyszczenie siedzeń',
      category: 'Czyszczenie',
      baseVolume: 2900,
      pattern: SPRING_PEAK,
      trend: 1.04,
      inOffer: false,
    },
    {
      id: 'paint-protection-film-full',
      name: 'PPF Full Body',
      description: 'Pełne oklejenie auta folią PPF',
      category: 'Ochrona',
      baseVolume: 800,
      pattern: SPRING_PEAK,
      trend: 1.60,
      inOffer: false,
    },
    {
      id: 'ceramic-wheels',
      name: 'Ceramika na felgi',
      description: 'Powłoka ceramiczna dedykowana felgom',
      category: 'Ochrona',
      baseVolume: 700,
      pattern: SPRING_PEAK,
      trend: 1.30,
      inOffer: false,
    },
    {
      id: 'dent-removal-pdr',
      name: 'Usuwanie wgnieceń (PDR)',
      description: 'Bezlakierowe usuwanie wgnieceń',
      category: 'Korekta',
      baseVolume: 1600,
      pattern: WINTER_PEAK,
      trend: 1.15,
      inOffer: false,
    },
    {
      id: 'ac-cleaning',
      name: 'Czyszczenie klimatyzacji',
      description: 'Odgrzybianie i dezynfekcja klimatyzacji',
      category: 'Czyszczenie',
      baseVolume: 2300,
      pattern: SUMMER_PEAK,
      trend: 1.07,
      inOffer: false,
    },
    {
      id: 'convertible-care',
      name: 'Pielęgnacja dachu kabrioletu',
      description: 'Impregnacja i czyszczenie dachów materiałowych',
      category: 'Czyszczenie',
      baseVolume: 400,
      pattern: SUMMER_PEAK,
      trend: 1.10,
      inOffer: false,
    },
    {
      id: 'chrome-delete',
      name: 'Chrome delete',
      description: 'Oklejanie chromowanych elementów czarną folią',
      category: 'Modyfikacja',
      baseVolume: 1100,
      pattern: FLAT_DEMAND,
      trend: 1.45,
      inOffer: false,
    },
  ];

  return intentsConfig.map((config, index) => {
    const monthlySearches = generateMonthlySearches(
      config.baseVolume,
      config.pattern,
      config.trend,
    );

    return {
      id: config.id,
      name: config.name,
      description: config.description,
      category: config.category,
      demandVolume: computeTotal(monthlySearches),
      momentum: computeMomentum(monthlySearches),
      inOffer: config.inOffer,
      monthlySearches,
      avgMonthlySearches: computeAvg(monthlySearches),
      chartColor: CHART_COLORS[index % CHART_COLORS.length],
    };
  });
}
