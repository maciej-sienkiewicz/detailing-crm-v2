/**
 * Data YYYY-MM-DD w strefie przeglądarki (u nas: czas polski).
 *
 * `date.toISOString().slice(0, 10)` wygląda tak samo, ale liczy w UTC: między 0:00 a 2:00
 * (zimą do 1:00) daje WCZORAJ. Termin płatności przelewu „za 14 dni" wychodził wtedy
 * o dzień krótszy, a pole daty w formularzu pokazywało poprzedni dzień.
 */
export const localIsoDate = (date: Date = new Date()): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
