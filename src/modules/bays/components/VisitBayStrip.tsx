// src/modules/bays/components/VisitBayStrip.tsx
//
// Wiersz „Na hali" w widoku wizyty - JEDEN pasek, nie kolejna sekcja: widok wizyty
// jest już gęsty. Mówi, gdzie auto stoi teraz i co ma w planie; przebiegu (ile stanowisk
// auto odwiedziło i ile czasu spędziło) tu nie ma - na życzenie studia. Stoi w miejscu paska Door to Door i mówi tym samym
// językiem (płaski pasek, każdy fakt osobno, CLAUDE.md §4).
//
// Dane bierze z modułu stanowisk, nie z odpowiedzi wizyty - wizyta nie dostaje
// ani jednego pola. Bez przełącznika funkcji tego paska po prostu nie ma.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, Warehouse } from 'lucide-react';
import { Button, ui } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import { useToast } from '@/common/components/Toast';
import { useBaysMutation, useBaysNow, useBaysSnapshot } from '../hooks/useBays';
import { useBaysEnabled, useStudioHours } from '../featureFlag';
import { baysApi, isConflict } from '../api/baysApi';
import { viewOf } from '../utils/boardState';
import { rangeText } from '../utils/slots';
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
    // „move": zmiana stanowiska po „Zakończ" - to samo okno wyboru, inny tytuł.
    const [dialog, setDialog] = useState<'pick' | 'move' | 'finish' | 'pause' | null>(null);
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
                {props.canEdit && !props.done && (
                    <Actions>
                        {v.place.kind === 'bay' ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setDialog('finish')}><Check aria-hidden="true" />Zakończ</Button>
                                <Button variant="outline" size="sm" onClick={() => setDialog('pause')}>Wstrzymaj</Button>
                            </>
                        ) : v.place.kind === 'yard' ? (
                            <Button variant="tinted" size="sm" onClick={() => setDialog('pick')}>Przypisz stanowisko</Button>
                        ) : null}
                    </Actions>
                )}
            </Line>
            {(dialog === 'pick' || dialog === 'move') && (
                <BayPickerDialog
                    title={dialog === 'move' ? 'Zmiana stanowiska' : 'Przypisz stanowisko'}
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
                            showError(isConflict(e) ? 'Stanowisko jest już zajęte' : 'Nie udało się przypisać stanowiska', isConflict(e) ? 'Wybierz, co z autem, które tam stoi, albo inne stanowisko.' : 'Spróbuj ponownie.');
                        }
                    }}
                />
            )}
            {dialog === 'finish' && (
                <FinishDialog view={v} onClose={() => setDialog(null)} onConfirm={async choice => {
                    if (choice === 'move') { setDialog('move'); return; }
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
