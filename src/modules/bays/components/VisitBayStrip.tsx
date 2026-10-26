// src/modules/bays/components/VisitBayStrip.tsx
//
// Wiersz „Na hali" w widoku wizyty - JEDEN zwinięty pasek, nie kolejna sekcja:
// widok wizyty jest już gęsty. Stoi w miejscu paska Door to Door i mówi tym samym
// językiem (płaski pasek, każdy fakt osobno, CLAUDE.md §4).
//
// Dane bierze z modułu stanowisk, nie z odpowiedzi wizyty - wizyta nie dostaje
// ani jednego pola. Bez przełącznika funkcji tego paska po prostu nie ma.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, ChevronDown, Warehouse } from 'lucide-react';
import { Button, ui } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import { useToast } from '@/common/components/Toast';
import { useBaysMutation, useBaysNow, useBaysSnapshot } from '../hooks/useBays';
import { useBaysEnabled, useStudioHours } from '../featureFlag';
import { baysApi, isConflict } from '../api/baysApi';
import { viewOf } from '../utils/boardState';
import { dayMonth, dayShort, formatMinutes, rangeText, toDateKey } from '../utils/slots';
import { BayPickerDialog, FinishDialog, PauseDialog } from './dialogs';

const Strip = styled.div`
    display: flex;
    flex-direction: column;
    border-radius: ${ui.radiusStrip};
    border: 1px solid ${ui.line};
    background: ${ui.surface};
`;

const Line = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 14px;
    padding: 10px 14px;
    font-size: 13px;
    color: ${ui.inkSoft};

    > svg { width: 16px; height: 16px; flex-shrink: 0; color: ${ui.brandInk}; }
    strong { font-weight: 700; color: ${ui.ink}; }
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-left: auto;

    @media (max-width: 640px) { margin-left: 0; width: 100%; > button { flex: 1 1 auto; } }
`;

const Toggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;

    svg { width: 14px; height: 14px; transition: transform 150ms ease; }
    &[aria-expanded='true'] svg { transform: rotate(180deg); }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; border-radius: 4px; }
`;

const Stints = styled.ol`
    margin: 0;
    padding: 4px 14px 12px 40px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: ${ui.textSecondary};

    li strong { color: ${ui.ink}; font-weight: 600; }
`;

const REASON: Record<string, string> = {
    DONE: 'skończone',
    WAITING_PART: 'zjechało, czeka na część',
    WAITING_CUSTOMER: 'zjechało, czeka na klienta',
    MOVED: 'przeniesione',
};

interface Props {
    visitId: string;
    /** Wizyta zamknięta (wydana, odrzucona) - pasek tylko pokazuje historię. */
    done: boolean;
    canEdit: boolean;
}

export function VisitBayStrip(props: Props) {
    const enabled = useBaysEnabled();
    useStudioHours();
    const { data: snap } = useBaysSnapshot(undefined, enabled);
    const now = useBaysNow();
    const { showError } = useToast();
    const [open, setOpen] = useState(false);
    const [dialog, setDialog] = useState<'pick' | 'finish' | 'pause' | null>(null);
    const start = useBaysMutation(baysApi.startStint);
    const end = useBaysMutation(baysApi.endStint);
    // Wizyty nie ma w odczycie hali, dopóki przyjęcie nie jest skończone (szkic) - wtedy
    // auta fizycznie jeszcze nie ma na placu i pasek się nie pokazuje.
    const car = snap?.cars.find(c => c.visitId === props.visitId);

    if (!enabled || !snap || !car) return null;
    const v = viewOf(car, snap, now);
    const bayName = (id: string) => snap.bays.find(b => b.id === id)?.name ?? '';
    const plan = v.nextBooking ? `Plan: ${bayName(v.nextBooking.bayId)}, ${rangeText(new Date(v.nextBooking.start), new Date(v.nextBooking.end), now)}` : 'Bez planu stanowiska';

    let state: React.ReactNode;
    if (v.place.kind === 'bay') {
        state = <><strong>{bayName(v.place.bayId)}</strong><span>od {formatClockTime(v.place.stint.startedAt)}{snap.settings.trackPeople && v.people.length ? `, ${v.people.map(p => p.name).join(' i ')}` : ''}</span></>;
    } else if (v.place.kind === 'ready') {
        state = <strong>Do wydania</strong>;
    } else if (car.stage === 'HANDED_OVER') {
        state = <strong>Wydane</strong>;
    } else if (car.workDone) {
        state = <><strong>Praca skończona</strong><span>czeka na wydanie</span></>;
    } else {
        state = <><strong>Oczekuje na przypisanie</strong>{car.waiting && <span>{car.waiting.note || (car.waiting.reason === 'WAITING_PART' ? 'czeka na część' : 'czeka na klienta')}</span>}</>;
    }

    return (
        <Strip aria-label="Na hali">
            <Line>
                <Warehouse aria-hidden="true" />
                {state}
                <span>{plan}</span>
                {v.stints.length > 0 && (
                    <Toggle type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                        Przebieg: {v.stints.length} {v.stints.length === 1 ? 'odcinek' : v.stints.length < 5 ? 'odcinki' : 'odcinków'}, {formatMinutes(v.totalMinutes)}
                        <ChevronDown aria-hidden="true" />
                    </Toggle>
                )}
                {props.canEdit && !props.done && (
                    <Actions>
                        {v.place.kind === 'bay' ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setDialog('finish')}><Check aria-hidden="true" />Zakończ</Button>
                                <Button variant="outline" size="sm" onClick={() => setDialog('pause')}>Wstrzymaj</Button>
                            </>
                        ) : v.place.kind === 'yard' ? (
                            <Button variant="tinted" size="sm" onClick={() => setDialog('pick')}>Wjedź na stanowisko</Button>
                        ) : null}
                    </Actions>
                )}
            </Line>
            {open && (
                <Stints>
                    {v.stints.map(s => (
                        <li key={s.id}>
                            <strong>{bayName(s.bayId)}</strong>, {dayShort(toDateKey(new Date(s.startedAt)))} {dayMonth(toDateKey(new Date(s.startedAt)))} {formatClockTime(s.startedAt)}
                            {s.endedAt ? `–${formatClockTime(s.endedAt)}` : ', trwa'}
                            {s.endReason ? `, ${REASON[s.endReason]}` : ''}
                        </li>
                    ))}
                </Stints>
            )}

            {dialog === 'pick' && (
                <BayPickerDialog
                    view={v}
                    snap={snap}
                    suggestedBayId={v.nextBooking?.bayId}
                    onClose={() => setDialog(null)}
                    onConfirm={async (bayId, people, evict) => {
                        try {
                            await start.mutateAsync([props.visitId, bayId, snap.settings.trackPeople ? people : [], evict]);
                            setDialog(null);
                        } catch (e) {
                            // Zajęte w międzyczasie: okno zostaje, odczyt hali już się odświeża.
                            showError(isConflict(e) ? 'Stanowisko jest już zajęte' : 'Nie udało się zapisać wjazdu', isConflict(e) ? 'Wybierz, co z autem, które tam stoi, albo inne stanowisko.' : 'Spróbuj ponownie.');
                        }
                    }}
                />
            )}
            {dialog === 'finish' && (
                <FinishDialog view={v} onClose={() => setDialog(null)} onConfirm={async choice => {
                    if (choice === 'move') { setDialog('pick'); return; }
                    // Status wizyty zmienia kierownik przyciskiem w nagłówku - tu tylko zamykamy pracę.
                    await end.mutateAsync([props.visitId, choice === 'ready' ? 'FINISHED' : 'DONE']);
                    setDialog(null);
                }} />
            )}
            {dialog === 'pause' && (
                <PauseDialog view={v} onClose={() => setDialog(null)} onConfirm={async (reason, note) => {
                    await end.mutateAsync([props.visitId, reason, note]);
                    setDialog(null);
                }} />
            )}
        </Strip>
    );
}
