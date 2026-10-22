import { apiClient } from '@/core';
import type { Page } from '@/core/page';

/** Największa strona, jaką oddaje GET /v1/services. */
const PAGE_SIZE = 500;

/**
 * Cały cennik studia - dla okien, które filtrują usługi u siebie, w przeglądarce.
 *
 * GET /v1/services bez parametrów oddaje tylko pierwsze 50 pozycji, w dodatku w dowolnej
 * kolejności. Okno szybkiej rezerwacji brało właśnie tę stronę, więc w studiu z większym
 * cennikiem część usług (zgłoszone: pakiety) nigdy nie pojawiała się na liście, choć
 * formularz rezerwacji, który szuka po stronie serwera, je znajdował. Stąd strona po
 * stronie, aż do ostatniej, i sortowanie po nazwie - bez niego kolejne strony mogłyby
 * się nakładać.
 */
export const fetchWholeCatalog = async <T>(): Promise<T[]> => {
    const services: T[] = [];
    for (let page = 1; ; page++) {
        const { data } = await apiClient.get<Page<T>>(
            '/v1/services',
            { params: { page, pageSize: PAGE_SIZE, sortBy: 'name', sortDirection: 'asc' } },
        );
        const batch = data.items ?? [];
        services.push(...batch);
        if (batch.length === 0 || page >= (data.page?.totalPages ?? 1)) return services;
    }
};
