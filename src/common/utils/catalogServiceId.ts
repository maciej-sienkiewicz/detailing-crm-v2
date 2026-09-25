/**
 * Czy identyfikator usługi wskazuje pozycję ZAPISANĄ w cenniku.
 *
 * Formularze zakładają usługi „w locie" (QuickServiceModal bez zapisu do cennika,
 * pozycja z wyceny leada bez usługi z katalogu) i nadają im identyfikator
 * zastępczy: `temp-<Date.now()>`, `temp-lead-…` (kalendarz, lead) albo `temp_…`
 * (przyjęcie pojazdu). Taka pozycja żyje wyłącznie w stanie formularza - w bazie
 * jej nie ma, więc nie da się jej ani zaktualizować w cenniku, ani na nią wskazać.
 *
 * Tak właśnie powstał błąd „Edytuj pozycję → Zapisz" w szybkiej rezerwacji:
 * `temp-1790326470364` poszedł do `POST /services/update` jako `originalServiceId`,
 * backend nie sparsował go jako UUID i oddał 400 - a cena nie dała się zmienić
 * wcale. Sprawdzamy prefiks, a nie kształt UUID, bo tryb mockowy nadaje usługom
 * identyfikatory '1', '2', … i one SĄ w (mockowym) cenniku.
 */
export const isCatalogServiceId = (serviceId: string | null | undefined): serviceId is string =>
    !!serviceId
    && serviceId !== 'null'
    && !serviceId.startsWith('temp-')
    && !serviceId.startsWith('temp_');
