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
// istnieje i ląduje w „Bez planu" - nic nie ginie, a skutek awarii widać.
//
// O planie rozstrzyga to, co jest w formularzu w chwili zapisu, nie zaznaczenie:
// kto w formularzu przesunął koniec na piątek, ma plan do piątku - przyciągnięty do
// okienek stanowiska.

import { QuickEventModal, type QuickEventFormData } from '@/modules/calendar/components/QuickEventModal';
import { useQuickEventCreation } from '@/modules/calendar/hooks/useQuickEventCreation';
import { useToast } from '@/common/components/Toast';
import { problemDetail } from '@/core/problem';
import { rangeText } from '../utils/slots';
import { bookingRangeFromDates } from '../utils/weekLayout';
import { baysApi } from '../api/baysApi';
import { useBaysMutation } from '../hooks/useBays';

interface Props {
    bayId: string;
    bayName: string;
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

export function BayBookingFlow({ bayId, bayName, slotsPerDay, start, end, onClose }: Props) {
    const { createBookingAsync } = useQuickEventCreation();
    const { showSuccess, showError, showWarning } = useToast();
    const addCar = useBaysMutation(baysApi.addBookedCar);
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
        try {
            const vehicle = data.vehicle;
            const carId = await addCar.mutateAsync([{
                appointmentId: idOf(response),
                licensePlate: vehicle?.licensePlate || 'bez tablicy',
                vehicleName: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') + (vehicle.year ? `, ${vehicle.year}` : '') : 'Pojazd',
                jobTitle: data.title || 'Rezerwacja',
                promisedAt: data.endDateTime ? new Date(data.endDateTime).toISOString() : null,
            }]);
            if (range) await createBooking.mutateAsync([bayId, carId, range.start, range.end]);
            showSuccess('Rezerwacja utworzona', range ? `${bayName}, ${rangeText(range.start, range.end, new Date())}.` : 'Znajdziesz ją w kalendarzu.');
        } catch {
            showWarning('Rezerwacja zapisana, stanowisko nie', 'Przeciągnij ją z paska Bez planu na stanowisko.');
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
