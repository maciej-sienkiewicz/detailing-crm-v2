/**
 * Marka i model złożone w jedną nazwę pojazdu.
 *
 * Zwraca null, gdy nie ma z czego jej złożyć — i o to tu chodzi. Wcześniej brak
 * pojazdu zamieniał się w warstwie danych na '-', więc panel „Najbliższe wizyty"
 * rysował „Radek Radziwiłko · -": placeholder prezentacyjny wpisany w dane,
 * którego widok nie miał już jak odróżnić od prawdziwej nazwy. Brak ma dojechać
 * do widoku jako brak — to widok zna właściwe słowa i wie, że ma je pokazać
 * kursywą.
 *
 * Składamy z części NIEPUSTYCH, bo backend potrafi oddać samą markę bez modelu:
 * „BMW" jest wtedy lepsze niż „BMW undefined".
 */
export const vehicleLabel = (
    vehicle?: { brand?: string | null; model?: string | null } | null,
): string | null =>
    [vehicle?.brand, vehicle?.model]
        .map(part => part?.trim())
        .filter((part): part is string => !!part)
        .join(' ') || null;
