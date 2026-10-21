// src/modules/services/api/serviceKeys.ts
import type { ServiceListFilters } from '../types';

/**
 * Klucze wszystkich odczytów GET /v1/services. Dawniej siedem miejsc pisało je ręcznie,
 * trzy poza prefiksem `['services']` (wyszukiwarka w wierszu wizyty, katalog kampanii),
 * więc zapis w cenniku ich nie odświeżał. Zapis unieważnia `serviceKeys.all` - całość.
 */
export const serviceKeys = {
    all: ['services'] as const,
    list: (filters: ServiceListFilters) => [...serviceKeys.all, 'list', filters] as const,
    /** Cały cennik strona po stronie (fetchWholeCatalog) - dla okien filtrujących u siebie. */
    catalog: () => [...serviceKeys.all, 'catalog'] as const,
    /** Podpowiedzi pod polem; `scope` rozróżnia wyszukiwarki o innej liczbie i kolejności wyników. */
    search: (scope: 'autocomplete' | 'catalog-panel' | 'inline', query: string) =>
        [...serviceKeys.all, 'search', scope, query] as const,
};
