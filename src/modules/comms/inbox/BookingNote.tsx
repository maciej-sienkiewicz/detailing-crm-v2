// src/modules/comms/inbox/BookingNote.tsx
// Pasek rezerwacji wpięty w rozmowę w chwili, w której rezerwację założono.
//
// Stoi na środku, między dymkami, i nie udaje wiadomości: to zdarzenie sprawy, nie
// coś, co klient przeczytał. Odcień niesie znaczenie (CLAUDE.md §2) - zieleń, gdy
// klient dostał potwierdzenie, bursztyn przy SMS-ie, który nie wyszedł albo którego
// nie było, bo to jest sytuacja, po której klient pisze drugi raz. Przycisk jest
// delikatny (bez wypełnienia): krok następny w oknie ma swój własny przycisk.
import styled from 'styled-components';
import { CalendarCheck, CalendarX, MessageSquareText, PenLine } from 'lucide-react';
import { formatAppointmentMoment } from '../utils/leadFormat';
import type { LeadBooking } from '../types';
import { bookingGone, bookingMoment, bookingSmsLine, type BookingTone } from './bookingNoteModel';
import { SoftBtn } from './primitives';
import { ix } from './tokens';

const Wrap = styled.section<{ $gone: boolean }>`
    align-self: center;
    width: min(100%, 520px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    border: 1px solid ${p => (p.$gone ? ix.line : '#bbf7d0')};
    border-radius: 14px;
    background: ${p => (p.$gone ? ix.surfaceSoft : ix.okTint)};
    font-size: 13px;
    line-height: 1.45;
    color: ${ix.text2};
`;

const Title = styled.p<{ $gone: boolean }>`
    margin: 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: ${p => (p.$gone ? ix.muted : ix.ink)};

    svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; color: ${p => (p.$gone ? ix.muted : ix.ok)}; }
    s { font-weight: 500; }
`;

/** Kiedy i kto - dwa fakty jako osobne elementy (CLAUDE.md §4: bez kropek). */
const Facts = styled.p`
    margin: 0;
    padding-left: 26px;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    color: ${ix.muted};
`;

const TONE: Record<BookingTone, string> = { ok: ix.ok, warn: '#92400e', muted: ix.muted };

const Sms = styled.p<{ $tone: BookingTone }>`
    margin: 0;
    padding-left: 26px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    color: ${p => TONE[p.$tone]};
    font-weight: 500;

    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 2px; }
`;

const Prepare = styled(SoftBtn)`
    align-self: flex-start;
    margin-left: 26px;
    height: auto;
    min-height: 34px;
    padding: 6px 14px;
    white-space: normal;
    text-align: left;
    font-size: 13px;
`;

interface Props {
    booking: LeadBooking;
    /** Brak = rozmowa bez kompozytora maila (np. Instagram) - bez przycisku szkicu. */
    onPrepareConfirmation?: () => void;
}

export function BookingNote({ booking, onPrepareConfirmation }: Props) {
    const gone = bookingGone(booking);
    const sms = bookingSmsLine(booking);
    return (
        <Wrap $gone={gone !== null} aria-label="Rezerwacja">
            <Title $gone={gone !== null}>
                {gone ? <CalendarX aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />}
                {gone
                    ? <span>{gone} <s>{bookingMoment(booking)}</s></span>
                    : <span>Rezerwacja na {bookingMoment(booking)}</span>}
            </Title>
            <Facts>
                <span>Założono {formatAppointmentMoment(booking.bookedAt)}</span>
                {booking.bookedByName && <span>Przez: {booking.bookedByName}</span>}
            </Facts>
            {!gone && (
                <Sms $tone={sms.tone}>
                    <MessageSquareText aria-hidden="true" />
                    <span>{sms.text}</span>
                </Sms>
            )}
            {!gone && onPrepareConfirmation && (
                <Prepare onClick={onPrepareConfirmation}>
                    <PenLine aria-hidden="true" />
                    Przygotuj treść wiadomości z potwierdzeniem rezerwacji
                </Prepare>
            )}
        </Wrap>
    );
}
