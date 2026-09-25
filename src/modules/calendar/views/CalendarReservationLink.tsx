// src/modules/calendar/views/CalendarReservationLink.tsx
//
// Adres rezerwacji w kalendarzu, którym da się podzielić: /calendar/rezerwacja/:id?start=<ISO>.
//
// Kalendarz umie przewinąć do rezerwacji i otworzyć jej podgląd, ale bierze cel
// z `location.state` - a tego nie przeniesie nic spoza aplikacji. Powiadomienie push
// („Nowa rezerwacja") otwiera zwykły adres, więc ta trasa tłumaczy go na ten sam stan,
// którego używają Tablica i Aktywność. `start` wystarcza kalendarzowi do skoku na
// właściwy miesiąc bez dociągania rezerwacji z serwera.

import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export function CalendarReservationLink() {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const [searchParams] = useSearchParams();

    if (!appointmentId) return <Navigate to="/calendar" replace />;

    return (
        <Navigate
            to="/calendar"
            replace
            state={{
                highlightEventId: appointmentId,
                highlightDate: searchParams.get('start') ?? '',
                openEventPopover: true,
            }}
        />
    );
}
