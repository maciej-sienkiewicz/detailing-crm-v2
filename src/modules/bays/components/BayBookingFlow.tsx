// src/modules/bays/components/BayBookingFlow.tsx
//
// Rezerwacja z osi stanowisk - ten sam formularz co w kalendarzu (QuickEventModal).
// Jedyna zmiana w nim to opcjonalna flaga `exact` zakresu: bez niej formularz brał
// zakres dłuższy niż doba za zaznaczenie dni w miesiącu i wstawiał 9:00-20:00. Wzorzec: BookingFlowModal z kalendarza (rezerwacja z leada):
// owijamy formularz, podajemy mu zakres i własne `onSave`.
//
// Zapis to DWA kroki i świadomie bez wspólnej transakcji:
//   1. zwykła rezerwacja (useQuickEventCreation - ten sam kod co w kalendarzu),
//   2. plan stanowiska wskazujący na nią.
// Wspólna transakcja wymagałaby wpięcia stanowisk w endpoint rezerwacji, czyli
// dokładnie tego sprzężenia, którego unikamy. Gdy krok 2 się nie uda, rezerwacja
// istnieje w kalendarzu, a człowiek dostaje o tym komunikat - nic nie ginie.
//
// O planie rozstrzyga to, co jest w formularzu w chwili zapisu, nie zaznaczenie:
// kto w formularzu przesunął koniec na piątek, ma plan do piątku - przyciągnięty do
// okienek stanowiska.

import { QuickEventModal, type QuickEventFormData } from '@/modules/calendar/components/QuickEventModal';
import { useQuickEventCreation } from '@/modules/calendar/hooks/useQuickEventCreation';
import { useToast } from '@/common/components/Toast';
import { problemDetail } from '@/core/problem';
import { bookingRangeFromDates } from '../utils/weekLayout';
import { baysApi } from '../api/baysApi';
import { useBaysMutation } from '../hooks/useBays';

interface Props {
    bayId: string;
    /** Podział dnia stanowiska - plan przyciąga się do jego okienek. */
    slotsPerDay: number;
    start: Date;
    end: Date;
    onClose: () => void;
}

const idOf = (response: unknown): string | null => {
    if (response && typeof response === 'object') {
        const r = response as Record<string, unknown>;
        const id = r.id ?? r.appointmentId;
        if (typeof id === 'string') return id;
    }
    return null;
};

export function BayBookingFlow({ bayId, slotsPerDay, start, end, onClose }: Props) {
    const { createBookingAsync } = useQuickEventCreation();
    const { showError, showWarning } = useToast();
    const createBooking = useBaysMutation(baysApi.createBooking);

    const handleSave = async (data: QuickEventFormData) => {
        let response: unknown;
        try {
            response = await createBookingAsync({ data });
        } catch (error) {
            showError('Nie udało się utworzyć rezerwacji', problemDetail(error) ?? 'Spróbuj ponownie');
            // Formularz zostaje otwarty: wpisane dane są warte więcej niż czysty stan.
            throw error;
        }

        const range = bookingRangeFromDates(new Date(data.startDateTime), new Date(data.endDateTime), slotsPerDay);
        const appointmentId = idOf(response);
        try {
            if (!appointmentId || !range) throw new Error('Brak rezerwacji albo zakresu');
            await createBooking.mutateAsync([bayId, { visitId: null, appointmentId }, range.start, range.end]);
        } catch {
            // Rezerwacja już jest w kalendarzu - tracimy tylko plan stanowiska, i mówimy to wprost.
            showWarning('Rezerwacja zapisana, stanowisko nie', 'Przeciągnij ją na stanowisko w widoku tygodnia.');
        }
        onClose();
    };

    return (
        <QuickEventModal
            isOpen
            eventData={{ start, end, allDay: false, exact: true }}
            onClose={onClose}
            onSave={handleSave}
            allowRecurrence={false}
        />
    );
}
