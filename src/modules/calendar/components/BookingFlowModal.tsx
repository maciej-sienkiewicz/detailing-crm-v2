// src/modules/calendar/components/BookingFlowModal.tsx
// Zakładanie rezerwacji z miejsca, w którym trwa rozmowa z klientem — z leada
// albo z korespondencji.
//
// Dwa kroki, w kolejności, w jakiej myśli człowiek: najpierw KIEDY, potem CO.
// Terminu nie da się sensownie wybrać z listy dat — trzeba zobaczyć, co już stoi
// w kalendarzu w okolicy, więc pierwszym krokiem jest pełny kalendarz, ten sam
// co w widoku głównym, tylko bez przycisków zakładania czegokolwiek obok.
//
// Wybór dnia (lub przeciągnięcie kilku) zamyka kalendarz i otwiera formularz
// rezerwacji wypełniony tym, co już wiemy: klientem, autem i wyceną z leada.
// Sens całości jest właśnie tutaj — przepisywanie tych danych ręcznie było
// pracą, którą system mógł wykonać sam.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { CalendarView, type CalendarRangeSelection } from './CalendarView';
import { QuickEventModal, type QuickEventFormData, type QuickEventInitialData } from './QuickEventModal';
import { useQuickEventCreation } from '../hooks/useQuickEventCreation';
import type { EventCreationData } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(6px);

    @media (max-width: 640px) {
        padding: 0;
    }
`;

const Sheet = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 1500px;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);

    @media (max-width: 640px) {
        border-radius: 0;
    }
`;

const SheetHeader = styled.header`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;

    h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.2px;
    }

    p {
        margin: 2px 0 0;
        font-size: 13px;
        color: #64748b;
    }
`;

const CloseButton = styled.button`
    margin-left: auto;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    color: #64748b;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #e2e8f0; color: #0f172a; }
`;

/**
 * Kalendarz zajmuje resztę arkusza i przewija się sam. min-height: 0 jest tu
 * konieczne — bez niego element flex nie skurczy się poniżej swojej zawartości
 * i kalendarz wypycha stopkę arkusza poza ekran.
 */
const CalendarSlot = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

/**
 * Kreator jest otwarty dokładnie wtedy, gdy jest zamontowany — nie ma propa `isOpen`.
 * Stan kroku (wybrany termin) żyje więc tyle, co jedno otwarcie, i nie ma jak
 * przetrwać do następnego; wariant z flagą wymagałby kasowania go efektem, czyli
 * dokładnie tej klasy błędu, którą to usuwa.
 */
interface BookingFlowModalProps {
    onClose: () => void;
    /** Dane, którymi wypełniamy formularz rezerwacji po wybraniu terminu. */
    prefill: QuickEventInitialData;
    /** Podany wiąże rezerwację z leadem i przestawia go w „Rezerwacja". */
    leadId?: string;
    /** Podpis pod nagłówkiem kalendarza — np. imię klienta, dla kogo szukamy terminu. */
    subtitle?: string;
    onBooked?: () => void;
}

export function BookingFlowModal({
    onClose,
    prefill,
    leadId,
    subtitle,
    onBooked,
}: BookingFlowModalProps) {
    const [range, setRange] = useState<EventCreationData | null>(null);
    const { createBookingAsync } = useQuickEventCreation();
    const { showSuccess, showError } = useToast();

    // Escape zamyka tylko krok kalendarza; w kroku formularza obsługuje go
    // ModalShell i zamknięcie należy do niego.
    useEffect(() => {
        if (range) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [range, onClose]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, []);

    const handleRangeSelected = (selection: CalendarRangeSelection) => {
        setRange({ start: selection.start, end: selection.end, allDay: selection.allDay });
    };

    const handleSave = async (data: QuickEventFormData) => {
        try {
            await createBookingAsync({ data, leadId });
            showSuccess('Rezerwacja utworzona', 'Znajdziesz ją w kalendarzu');
            onBooked?.();
            onClose();
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się utworzyć rezerwacji', message ?? 'Spróbuj ponownie');
            // Formularz zostaje otwarty: wpisane dane są warte więcej niż czysty stan
            throw error;
        }
    };

    // Krok 2: formularz rezerwacji. Kalendarz jest odmontowany — dwa nałożone
    // modale to dwie warstwy do zamknięcia i pytanie, którą właśnie zamykam.
    if (range) {
        return (
            <QuickEventModal
                isOpen
                eventData={range}
                initialData={prefill}
                onClose={onClose}
                onSave={handleSave}
            />
        );
    }

    return createPortal(
        <Overlay onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <Sheet onMouseDown={(event) => event.stopPropagation()}>
                <SheetHeader>
                    <div>
                        <h2>Wybierz termin</h2>
                        <p>
                            Kliknij dzień albo zaznacz kilka.
                            {subtitle ? ` Rezerwacja dla: ${subtitle}.` : ''}
                        </p>
                    </div>
                    <CloseButton type="button" onClick={onClose} aria-label="Zamknij">
                        <X size={16} />
                    </CloseButton>
                </SheetHeader>
                <CalendarSlot>
                    <CalendarView selectionMode onRangeSelected={handleRangeSelected} />
                </CalendarSlot>
            </Sheet>
        </Overlay>,
        document.body
    );
}
