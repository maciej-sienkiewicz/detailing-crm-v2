// src/modules/calendar/views/CalendarReservationLink.tsx
//
// Adres rezerwacji w kalendarzu, którym da się podzielić: /calendar/appointments/:id?start=<ISO>.
//
// Kalendarz umie przewinąć do rezerwacji i otworzyć jej podgląd, ale bierze cel
// z `location.state` - a tego nie przeniesie nic spoza aplikacji. Powiadomienie push
// („Nowa rezerwacja") otwiera zwykły adres, więc ta trasa tłumaczy go na ten sam stan,
// którego używają Tablica i Aktywność. `start` wystarcza kalendarzowi do skoku na
// właściwy miesiąc bez dociągania rezerwacji z serwera.
//
// Stan MUSI mieć stałą tożsamość. <Navigate> nawiguje w efekcie zależnym od `state`,
// a trasa kalendarza jest leniwa: do czasu pobrania modułu adres stoi w miejscu, za to
// każda zmiana stanu nawigacji renderuje tę trasę od nowa. Obiekt pisany w JSX był za
// każdym razem nowy, więc efekt nawigował znowu, nawigacja restartowała się i tak w kółko
// - „Maximum update depth exceeded", gdy moduł szedł wolno (zimny start, kilka kart naraz).

import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export function CalendarReservationLink() {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const [searchParams] = useSearchParams();
    const start = searchParams.get('start') ?? '';

    const state = useMemo(
        () => appointmentId
            ? { highlightEventId: appointmentId, highlightDate: start, openEventPopover: true }
            : undefined,
        [appointmentId, start],
    );

    return <Navigate to="/calendar" replace state={state} />;
}
