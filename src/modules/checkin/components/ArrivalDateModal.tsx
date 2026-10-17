import { useState } from 'react';
import styled from 'styled-components';
import { CalendarClock, CalendarCheck, CalendarDays } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
} from '@/common/components/ModalKit';
import { Button, ChoiceCard, ChoiceList, Notice } from '@/common/components/ui';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { fromDateToLocalInput } from '@/common/dateTime';
import {
    calendarDaysBetween,
    daysAgoLabel,
    formatPlannedDay,
    formatShortDay,
    isFutureArrival,
    resolveArrivalStart,
    type ArrivalChoice,
} from '../utils/arrivalDate';

/*
 * „Kiedy auto trafiło do studia?" - pierwsze, co widać po wejściu w przyjęcie
 * rezerwacji z minionego dnia (patrz utils/arrivalDate).
 *
 * Żadna odpowiedź nie jest zaznaczona z góry. Obie typowe historie („klient się
 * spóźnił" i „auto stoi od kilku dni, nikt tego nie kliknął") są równie częste,
 * a domyślne „dziś" to dokładnie ten cichy wybór, przed którym to okno chroni.
 *
 * Okna nie zamyka się Escape'em ani kliknięciem w tło: zamknięcie bez odpowiedzi
 * nie ma tu znaczenia. Wyjście jest jawne - „Wróć" opuszcza przyjęcie.
 */

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Lede = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: #334155;

    strong { color: #0f172a; font-weight: 700; }
`;

const Question = styled.h3`
    margin: 4px 0 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const OtherDate = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 0 0 28px;
`;

const FieldError = styled.span`
    font-size: 12.5px;
    color: #b91c1c;
`;

const Consequences = styled.ul`
    margin: 4px 0 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const Footnote = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;
`;

const ModalFooterSplit = styled(ModalFooter)`
    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

const monthName = (d: Date) => d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

interface ArrivalDateModalProps {
    /** Początek rezerwacji (Instant z API). */
    plannedStart: string;
    /** „BMW X5, WA 12345" - żeby było jasne, o które auto chodzi. */
    vehicleLabel?: string;
    /** Wartość pola „Data rozpoczęcia" w formacie datetime-local. */
    onConfirm: (visitStartAt: string) => void;
    /** Wyjście z przyjęcia bez odpowiedzi. */
    onBack: () => void;
    /** Wstrzykiwane w testach; domyślnie chwila otwarcia okna. */
    now?: Date;
}

export const ArrivalDateModal = ({ plannedStart, vehicleLabel, onConfirm, onBack, now: nowProp }: ArrivalDateModalProps) => {
    // Chwila otwarcia okna, nie każdego renderu - „dziś, 11:42" nie może pływać pod palcem.
    const [now] = useState(() => nowProp ?? new Date());
    const [choice, setChoice] = useState<ArrivalChoice | null>(null);
    const [otherValue, setOtherValue] = useState('');

    const planned = new Date(plannedStart);
    const daysLate = calendarDaysBetween(planned, now);
    const start = resolveArrivalStart(choice, plannedStart, otherValue, now);
    const otherInFuture = choice === 'other' && !!otherValue && isFutureArrival(otherValue, now);

    // Pulpit liczy przychód wizyty do miesiąca jej rozpoczęcia - przy wyborze z innego
    // miesiąca to jedyna konsekwencja, która nie jest oczywista, więc mówimy ją wprost.
    const startDate = start ? new Date(start) : null;
    const otherMonth = !!startDate
        && (startDate.getMonth() !== now.getMonth() || startDate.getFullYear() !== now.getFullYear());

    const pick = (next: ArrivalChoice) => () => {
        setChoice(next);
        // „Innego dnia" otwiera się na dniu rezerwacji - zwykle chodzi o dzień pomiędzy.
        if (next === 'other' && !otherValue) setOtherValue(fromDateToLocalInput(planned));
    };

    return (
        <ModalShell isOpen onClose={onBack} size="md" dismissible={false} labelledBy="arrival-date-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="arrival-date-title">Kiedy auto trafiło do studia?</ModalTitle>
                    {vehicleLabel && <ModalSubtitle>{vehicleLabel}</ModalSubtitle>}
                </ModalTitleGroup>
            </ModalHeader>

            <ModalContent>
                <Body>
                    <Lede>
                        Rezerwacja była na <strong>{formatPlannedDay(planned, now)}</strong>, czyli{' '}
                        {daysAgoLabel(daysLate)}. Przyjęcie zaczyna się dopiero teraz, więc potrzebujemy
                        prawdziwej daty, od której auto jest u Ciebie.
                    </Lede>

                    <Question>Od kiedy auto stoi w studiu?</Question>

                    <ChoiceList role="radiogroup" aria-label="Data przyjęcia auta">
                        <ChoiceCard
                            type="radio"
                            name="arrival"
                            checked={choice === 'today'}
                            onChange={pick('today')}
                            icon={<CalendarClock />}
                            title={`Od dziś, ${formatShortDay(now)}`}
                            detail="Klient przyjechał później, niż był umówiony"
                        />
                        <ChoiceCard
                            type="radio"
                            name="arrival"
                            checked={choice === 'planned'}
                            onChange={pick('planned')}
                            icon={<CalendarCheck />}
                            title={`Od dnia rezerwacji, ${formatShortDay(planned)}`}
                            detail="Auto stoi od terminu, przyjęcie wpisuję z opóźnieniem"
                        />
                        <ChoiceCard
                            type="radio"
                            name="arrival"
                            checked={choice === 'other'}
                            onChange={pick('other')}
                            icon={<CalendarDays />}
                            title="Od innego dnia"
                            detail="Wskażę datę i godzinę"
                        />
                    </ChoiceList>

                    {choice === 'other' && (
                        <OtherDate>
                            <DateTimePicker
                                value={otherValue}
                                onChange={setOtherValue}
                                hasError={otherInFuture}
                                placeholder="Wybierz datę i godzinę"
                            />
                            {otherInFuture && (
                                <FieldError role="alert">
                                    Ta chwila jeszcze nie nadeszła. Wybierz datę z przeszłości albo „Od dziś".
                                </FieldError>
                            )}
                        </OtherDate>
                    )}

                    <Notice tone="info" title="Ta data zostanie zapisana jako rozpoczęcie wizyty">
                        <Consequences>
                            <li>trafi na protokół przyjęcia, który podpisuje klient,</li>
                            <li>od niej wizyta zajmuje miejsce w kalendarzu i w historii klienta i pojazdu,</li>
                            <li>według jej miesiąca pulpit liczy przychód z wizyty,</li>
                            <li>pojawi się w wiadomościach do klienta jako data wizyty.</li>
                        </Consequences>
                    </Notice>

                    {otherMonth && startDate && (
                        <Notice tone="warn" role="status">
                            Przychód z tej wizyty zaliczy się do miesiąca {monthName(startDate)}, a nie{' '}
                            {monthName(now)}.
                        </Notice>
                    )}

                    <Footnote>
                        Termin rezerwacji zostaje bez zmian. Datę rozpoczęcia możesz jeszcze poprawić
                        w sekcji „Termin wizyty”, dopóki nie utworzysz wizyty.
                    </Footnote>
                </Body>
            </ModalContent>

            <ModalFooterSplit>
                <Button onClick={onBack}>Wróć</Button>
                <Button variant="primary" disabled={!start} onClick={() => start && onConfirm(start)}>
                    Przejdź do przyjęcia
                </Button>
            </ModalFooterSplit>
        </ModalShell>
    );
};
