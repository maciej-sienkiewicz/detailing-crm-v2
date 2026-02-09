/**
 * Growth Engine Module Types
 * Defines data structures for market demand analysis, trend monitoring,
 * and opportunity detection for auto-detailing businesses.
 */

/**
 * Monthly search volume data point from DataForSEO
 */
export interface MonthlySearch {
  /** Year of the data point */
  year: number;
  /** Month (1-12) */
  month: number;
  /** Number of searches in this month */
  searchVolume: number;
}

/**
 * A grouped service intent (e.g., "Ceramika", "PPF", "Wnętrze")
 * Aggregated from keyword-level data by LLM intent grouping
 */
export interface ServiceIntent {
  /** Unique identifier */
  id: string;
  /** Display name of the intent group (Polish) */
  name: string;
  /** Short description */
  description: string;
  /** Category for grouping (e.g., "Ochrona", "Czyszczenie", "Korekta") */
  category: string;
  /** Total search volume across last 12 months in the selected region */
  demandVolume: number;
  /** Month-over-month percentage change (momentum) */
  momentum: number;
  /** Whether the studio has this service in their offer */
  inOffer: boolean;
  /** Monthly search data (12 months) */
  monthlySearches: MonthlySearch[];
  /** Average monthly searches */
  avgMonthlySearches: number;
  /** Color for chart rendering */
  chartColor?: string;
}

/**
 * Polish voivodeship for location filtering
 */
export interface Voivodeship {
  /** ISO 3166-2:PL code */
  code: string;
  /** Display name */
  name: string;
}

/**
 * Location filter option
 */
export type LocationFilter = 'PL' | string; // 'PL' for whole Poland, or voivodeship code

/**
 * Complete Growth Engine data response
 */
export interface GrowthEngineData {
  /** All service intents with search data */
  intents: ServiceIntent[];
  /** Available location options */
  locations: Voivodeship[];
  /** Data freshness timestamp */
  lastUpdated: string;
  /** Currently selected location */
  selectedLocation: LocationFilter;
}

/**
 * Opportunity card data for the scanner grid
 */
export interface OpportunityCard {
  /** The service intent this opportunity is based on */
  intent: ServiceIntent;
  /** Average monthly local searches */
  localPotential: number;
  /** Location name for display */
  locationName: string;
}
