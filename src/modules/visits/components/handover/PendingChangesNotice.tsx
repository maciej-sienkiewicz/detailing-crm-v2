import { Notice } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';

interface PendingChangesNoticeProps {
    /** Liczba usług w statusie PENDING (patrz pendingApprovalCount). */
    count: number;
}

/**
 * Zmiany usług czekające na zgodę klienta, pokazane przy kwocie do zapłaty.
 *
 * Kwota wydania pomija je tak samo jak backend (settledPrice), bo dokument wychodzi
 * na to, co klient przyjął. Bez tego zdania sprzedawca widziałby kwotę „za niską"
 * bez wyjaśnienia - i dopisywał różnicę na fakturze, której serwer by nie przyjął,
 * albo pobierał od klienta więcej, niż pokaże paragon.
 *
 * Wydania nie blokujemy: od „Gotowe do odbioru" usługi wolno dalej zmieniać, a klient
 * stojący przy ladzie może nie chcieć dopisanej usługi - to normalne zakończenie.
 */
export const PendingChangesNotice = ({ count }: PendingChangesNoticeProps) => {
    if (count <= 0) return null;
    return (
        <Notice
            tone="warn"
            role="status"
            title={`${count} ${pluralPl(count, 'zmiana czeka', 'zmiany czekają', 'zmian czeka')} na zgodę klienta i ${pluralPl(count, 'nie wchodzi', 'nie wchodzą', 'nie wchodzi')} do rozliczenia`}
        >
            Kwota obejmuje tylko to, co klient już przyjął. Jeśli zmiana ma wejść do rozliczenia,
            zatwierdź ją na karcie wizyty przed wydaniem.
        </Notice>
    );
};
