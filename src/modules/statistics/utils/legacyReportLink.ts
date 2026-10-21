// Powiadomienie push „Dostępny nowy raport" prowadziło do `/statistics?raport=WEEK&od=…`
// i otwierało okno „Raport PDF" w nagłówku Statystyk. Raport jest już tylko na zakładce
// „Raporty", więc stary adres - z powiadomień wysłanych przed zmianą - przenosi tam,
// od razu na tę długość okresu.

const PERIOD_PARAM: Record<string, string> = {
    WEEK: 'tydzien',
    TWO_WEEKS: '2-tygodnie',
    MONTH: 'miesiac',
};

/** Adres zakładki „Raporty" dla starego linku z powiadomienia; `null`, gdy to nie ten link. */
export const legacyReportLink = (params: URLSearchParams): string | null => {
    const length = params.get('raport');
    if (length === null) return null;
    const period = PERIOD_PARAM[length];
    return period ? `/statistics/reports?okres=${period}` : '/statistics/reports';
};
