/**
 * Podpis porównania pod kafelkami miesięcznymi Tablicy: „vs. 1–3 wrz".
 *
 * Backend liczy deltę względem poprzedniego miesiąca do tego samego dnia
 * (previousMonthToDate), bo bieżący miesiąc jest zawsze niedokończony. Podpis
 * mówi wprost, z jakim okresem porównujemy - samo „vs. poprzedni miesiąc"
 * sugerowało cały miesiąc. Starszy backend (bez previousMonthToDate) porównuje
 * jeszcze z całym miesiącem, więc dla niego zostaje dawny podpis.
 */
export const comparisonLabel = (hasToDateBase: boolean, today: Date = new Date()): string => {
    if (!hasToDateBase) return 'vs. poprzedni miesiąc';
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const daysInPrevious = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    const lastDay = Math.min(today.getDate(), daysInPrevious);
    const month = previousMonthStart.toLocaleDateString('pl-PL', { month: 'short' });
    return lastDay === 1 ? `vs. 1 ${month}` : `vs. 1–${lastDay} ${month}`;
};
