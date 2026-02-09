/**
 * Growth Engine API
 * Handles data fetching for market demand analysis
 * Currently uses mock data; will integrate with DataForSEO API
 */

import type { GrowthEngineData, LocationFilter } from '../types';
import { generateMockIntents, voivodeships } from './mockData';

const USE_MOCKS = true;

/**
 * Cached mock intents (regenerated per "session" but stable within)
 */
let cachedIntents: ReturnType<typeof generateMockIntents> | null = null;

function getMockIntents() {
  if (!cachedIntents) {
    cachedIntents = generateMockIntents();
  }
  return cachedIntents;
}

/**
 * Scale volumes by region (smaller regions have proportionally less volume)
 */
function scaleByRegion(
  intents: ReturnType<typeof generateMockIntents>,
  location: LocationFilter,
) {
  if (location === 'PL') return intents;

  // Regional scaling factors (approximate population ratios)
  const regionalScales: Record<string, number> = {
    'PL-MZ': 0.14, // Mazowieckie - largest
    'PL-SL': 0.12, // Śląskie
    'PL-WP': 0.09, // Wielkopolskie
    'PL-MA': 0.09, // Małopolskie
    'PL-DS': 0.08, // Dolnośląskie
    'PL-PM': 0.06, // Pomorskie
    'PL-LD': 0.07, // Łódzkie
    'PL-LU': 0.05, // Lubelskie
    'PL-PK': 0.05, // Podkarpackie
    'PL-KP': 0.05, // Kujawsko-pomorskie
    'PL-ZP': 0.04, // Zachodniopomorskie
    'PL-WN': 0.04, // Warmińsko-mazurskie
    'PL-PD': 0.03, // Podlaskie
    'PL-LB': 0.03, // Lubuskie
    'PL-SK': 0.03, // Świętokrzyskie
    'PL-OP': 0.03, // Opolskie
  };

  const scale = regionalScales[location] ?? 0.05;

  return intents.map((intent) => ({
    ...intent,
    demandVolume: Math.round(intent.demandVolume * scale),
    avgMonthlySearches: Math.round(intent.avgMonthlySearches * scale),
    monthlySearches: intent.monthlySearches.map((m) => ({
      ...m,
      searchVolume: Math.round(m.searchVolume * scale),
    })),
  }));
}

/**
 * Growth Engine API methods
 */
export const growthEngineApi = {
  /**
   * Fetches market demand data for the given location
   */
  getData: async (location: LocationFilter = 'PL'): Promise<GrowthEngineData> => {
    if (USE_MOCKS) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const baseIntents = getMockIntents();
          const scaledIntents = scaleByRegion(baseIntents, location);

          resolve({
            intents: scaledIntents,
            locations: voivodeships,
            lastUpdated: new Date().toISOString(),
            selectedLocation: location,
          });
        }, 800);
      });
    }

    // TODO: Real API integration with DataForSEO
    throw new Error('Real API not implemented yet');
  },
};
