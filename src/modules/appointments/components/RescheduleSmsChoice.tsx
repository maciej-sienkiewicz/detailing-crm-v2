// src/modules/appointments/components/RescheduleSmsChoice.tsx
//
// „Wyślij klientowi SMS o zmianie terminu" przy każdym zapisie, który przesuwa początek
// rezerwacji (edycja rezerwacji, „Zmień datę" na liście). Dawniej SMS wychodził zawsze,
// bez pytania - także przy poprawce, o której klient nie musiał wiedzieć, i raz z godziną
// „00:00" przy rezerwacji bez godzin.
//
// Pole pojawia się tylko, gdy studio ma włączoną wiadomość „Zmiana terminu" (Ustawienia →
// Wiadomości do klientów) - przy wyłączonej nic by nie wyszło. Startuje zaznaczone, bo
// zmiana terminu zwykle jest dla klienta. Ustawienie „Domyślnie zaznacz" tej wiadomości
// nie istnieje w ustawieniach, więc go tu nie czytamy. Stan i widoczność: useRescheduleSms.

import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import { Toggle } from '@/common/components/Toggle';
import { formatScheduleDateTime } from '@/common/dateTime';

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};

    label { font-size: 14px; font-weight: 600; color: ${ui.ink}; cursor: pointer; }
    p { margin: 2px 0 0; font-size: 12.5px; line-height: 1.45; color: ${ui.textMuted}; }
`;

interface Props {
    send: boolean;
    onChange: (next: boolean) => void;
    /** Nowy początek - zdanie mówi, z jakim terminem pójdzie SMS. */
    newStart: string | Date | null;
    id?: string;
}

export function RescheduleSmsChoice({ send, onChange, newStart, id = 'reschedule-sms' }: Props) {
    const when = newStart ? formatScheduleDateTime(newStart) : '';
    return (
        <Row>
            <div>
                <label htmlFor={id}>Wyślij klientowi SMS o zmianie terminu</label>
                <p>
                    {send
                        ? `Po zapisaniu klient dostanie SMS${when ? ` z nowym terminem: ${when}` : ''}.`
                        : 'Termin zmieni się bez wiadomości do klienta.'}
                </p>
            </div>
            <Toggle inputId={id} size="sm" checked={send} onChange={onChange} ariaLabel="Wyślij klientowi SMS o zmianie terminu" />
        </Row>
    );
}
