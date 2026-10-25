// src/modules/bays/components/BoardNow.tsx
//
// „Teraz": gdzie fizycznie stoi każde auto. Po lewej to, co stoi POZA stanowiskami
// (plac, do wydania), po prawej hala.
//
// Plac jest kolumną na równi ze stanowiskami i to jest najważniejsza decyzja tego
// widoku: auto „u nas, ale nikt przy nim nie pracuje" (czeka na część, na decyzję
// klienta, na wolny podnośnik) jest dziś niewidoczne - kalendarz pokazuje je jako
// trwającą wizytę i nie da się odróżnić pracy od czekania.
//
// Ekran ma być czytelny z dwóch metrów (tablet na hali), więc mówi mało: nazwa
// kolumny, karta w trzech liniach, JEDEN przycisk na karcie - krok, który przy tym
// aucie zwykle jest następny. Rzadsze akcje są pod „Więcej". Bez paska liczb nad
// tablicą (liczby stoją w nagłówkach kolumn) i bez podpisów, które tłumaczyły nazwy
// kolumn: „Na placu" i „Do wydania" mówią to same.
//
// Przeciąganie to skrót na komputerze, nigdy jedyna droga (telefon, klawiatura,
// tablet w rękawicach).

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { ArrowDownToLine, CalendarClock, MoreHorizontal, PackageSearch } from 'lucide-react';
import { ActionMenu, Button, IconButton, MenuItem, StatusPill, ui, useActionMenu } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import { useToast } from '@/common/components/Toast';
import type { BayPerson, BaysSnapshot } from '../types';
import { buildBoard, viewOf, type CarView } from '../utils/boardState';
import { formatMinutes, rangeText } from '../utils/slots';
import { baysApi, BayOccupiedError } from '../api/baysApi';
import { useBaysMutation } from '../hooks/useBays';
import { CarCard, Meta } from './primitives';
import { BayPickerDialog, FinishDialog, PauseDialog, type FinishChoice } from './dialogs';

/*
 * Na szerokim ekranie: plac i wydanie z lewej, stanowiska w siatce, która się
 * zawija - pięć czy dziewięć stanowisk mieści się bez przewijania w bok. Węższy
 * ekran: plac, hala, do wydania jedno pod drugim, w kolejności drogi auta.
 */
const Layout = styled.div`
    container: bays-board / inline-size;
    min-width: 0;
`;

const Areas = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'yard' 'hall' 'ready';
    gap: 12px;
    align-items: start;

    @container bays-board (min-width: 900px) {
        grid-template-columns: 264px minmax(0, 1fr);
        grid-template-rows: auto 1fr;
        grid-template-areas: 'yard hall' 'ready hall';
    }
`;

const Hall = styled.div`
    grid-area: hall;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(224px, 1fr));
    gap: 12px;
    align-items: start;
    min-width: 0;
`;

/* Stanowisko leży na szarym tle (miejsce w hali); plac i wydanie mają tylko
   przerywany obrys - to miejsca POZA halą. Jedyna różnica, którą niesie tło. */
const Column = styled.section<{ $drop: boolean; $kind: 'yard' | 'bay' | 'ready' }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 10px;
    border-radius: ${ui.radiusPanel};
    background: ${p => (p.$kind === 'bay' ? ui.surfaceAlt : 'transparent')};
    border: 1px ${p => (p.$kind === 'bay' ? 'solid' : 'dashed')} ${p => (p.$kind === 'bay' ? 'transparent' : ui.lineStrong)};
    grid-area: ${p => (p.$kind === 'bay' ? 'auto' : p.$kind)};
    transition: background 150ms ease, border-color 150ms ease;

    ${p => p.$drop && css`
        background: ${ui.brandTint};
        border: 1px dashed ${ui.brand};
    `}
`;

const ColumnHead = styled.header`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 4px;
`;

const ColumnTitle = styled.h2`
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    color: ${ui.ink};
`;

const Count = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

/* Plac i wydanie na pełnej szerokości (tablet, telefon w poziomie): karty w siatce
   zamiast jednej pod drugą na całą szerokość - w wąskiej kolumnie z lewej i tak jedna. */
const Cards = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
    gap: 8px;
    align-items: start;
`;

const Empty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px;
    border: 1.5px dashed ${ui.line};
    border-radius: ${ui.radiusRow};
    font-size: 13px;
    color: ${ui.textMuted};
`;

type Dialog =
    | { kind: 'pick'; view: CarView; initialBayId?: string | null }
    | { kind: 'finish'; view: CarView }
    | { kind: 'pause'; view: CarView };

type DropTarget = { kind: 'yard' } | { kind: 'bay'; bayId: string } | { kind: 'ready' };

const sameTarget = (a: DropTarget | null, b: DropTarget) =>
    !!a && a.kind === b.kind && (a.kind !== 'bay' || (b.kind === 'bay' && a.bayId === b.bayId));

interface Props {
    snap: BaysSnapshot;
    now: Date;
    canEdit: boolean;
}

export function BoardNow({ snap, now, canEdit }: Props) {
    const board = buildBoard(snap, now);
    const { showSuccess, showError } = useToast();
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropOver, setDropOver] = useState<DropTarget | null>(null);
    const menu = useActionMenu<CarView>();
    // Przeciąganie zostaje tylko pod myszą: na dotyku HTML5 DnD i tak nie działa.
    const canDrag = canEdit && typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const track = snap.settings.trackPeople;

    const start = useBaysMutation(baysApi.startStint);
    const end = useBaysMutation(baysApi.endStint);
    const clear = useBaysMutation(baysApi.clearWaiting);
    const handOver = useBaysMutation(baysApi.handOver);
    const busy = start.isPending || end.isPending;

    const bayName = (id: string) => snap.bays.find(b => b.id === id)?.name ?? '';
    const viewById = (carId: string) => {
        const car = snap.cars.find(c => c.id === carId);
        return car ? viewOf(car, snap, now) : null;
    };
    const peopleOf = (v: CarView): BayPerson[] => (track ? v.people : []);

    const enterBay = async (view: CarView, bayId: string, personIds: string[], evict: { carId: string; how: 'yard' | 'done' } | null) => {
        try {
            if (evict) await end.mutateAsync([evict.carId, evict.how === 'done' ? 'DONE' : 'MOVED']);
            await start.mutateAsync([view.car.id, bayId, track ? personIds : []]);
            setDialog(null);
            showSuccess(`${view.car.licensePlate}: ${bayName(bayId)}`, `Czas liczy się od ${formatClockTime(now)}.`);
        } catch (e) {
            if (e instanceof BayOccupiedError) setDialog({ kind: 'pick', view, initialBayId: bayId });
            else showError('Nie udało się zapisać wjazdu', 'Spróbuj ponownie.');
        }
    };

    const finish = async (view: CarView, choice: FinishChoice) => {
        if (choice === 'move') { setDialog({ kind: 'pick', view }); return; }
        await end.mutateAsync([view.car.id, 'DONE', { ready: choice === 'ready' }]);
        setDialog(null);
        showSuccess(
            choice === 'ready' ? `${view.car.licensePlate} gotowe do wydania` : `${view.car.licensePlate} na placu`,
            `Odcinek pracy zamknięty, ${formatMinutes(view.currentMinutes)}.`,
        );
    };

    /* Upuszczenie karty: ten sam skutek co przycisk, a gdy trzeba o coś zapytać
       (zajęte stanowisko, powód zjazdu) - to samo okno co przycisk. */
    const drop = (target: DropTarget) => {
        const view = draggingId ? viewById(draggingId) : null;
        setDraggingId(null);
        setDropOver(null);
        if (!view) return;
        const from = view.place;
        if (target.kind === 'bay') {
            if (from.kind === 'bay' && from.bayId === target.bayId) return;
            const bay = snap.bays.find(b => b.id === target.bayId);
            const occ = snap.stints.filter(s => s.bayId === target.bayId && s.endedAt === null && s.carId !== view.car.id);
            const people = from.kind === 'bay' ? from.stint.personIds : bay?.defaultPersonId ? [bay.defaultPersonId] : [];
            // Przy zapisie ludzi okno i tak trzeba otworzyć - pytamy, kto pracuje.
            if ((bay && occ.length >= bay.capacity) || (track && from.kind !== 'bay')) setDialog({ kind: 'pick', view, initialBayId: target.bayId });
            else void enterBay(view, target.bayId, people, null);
        } else if (target.kind === 'yard' && from.kind === 'bay') {
            setDialog({ kind: 'pause', view });
        } else if (target.kind === 'ready' && from.kind !== 'ready') {
            if (from.kind === 'bay') setDialog({ kind: 'finish', view });
            else void end.mutateAsync([view.car.id, 'DONE', { ready: true }]);
        }
    };

    const dropProps = (target: DropTarget) => (canDrag ? {
        onDragOver: (e: React.DragEvent) => { if (draggingId) { e.preventDefault(); if (!sameTarget(dropOver, target)) setDropOver(target); } },
        onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropOver(null); },
        onDrop: (e: React.DragEvent) => { e.preventDefault(); drop(target); },
    } : {});

    const dragProps = (carId: string) => (canDrag ? {
        draggable: true,
        dragging: draggingId === carId,
        onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', carId); setDraggingId(carId); },
        onDragEnd: () => { setDraggingId(null); setDropOver(null); },
    } : {});

    const more = (v: CarView) => (
        <IconButton label={`Więcej: ${v.car.licensePlate}`} variant="ghost" size="sm" onClick={e => menu.toggle(e, v, v.car.id)}>
            <MoreHorizontal />
        </IconButton>
    );

    const yardCard = (v: CarView) => (
        <CarCard
            key={v.car.id}
            plate={v.car.licensePlate}
            vehicle={v.car.vehicleName}
            job={v.car.jobTitle}
            aside={v.car.waiting ? <StatusPill $tone="warn">{v.car.waiting.reason === 'WAITING_PART' ? 'Czeka na część' : 'Czeka na klienta'}</StatusPill>
                : v.car.arrivedAt ? `od ${formatClockTime(v.car.arrivedAt)}` : null}
            asideTitle={v.car.arrivedAt ? `Przyjęte o ${formatClockTime(v.car.arrivedAt)}` : undefined}
            tone={v.car.waiting ? 'warn' : 'plain'}
            {...dragProps(v.car.id)}
            actions={canEdit && (v.car.waiting ? (
                <Button variant="outline" size="sm" onClick={() => clear.mutate([v.car.id])}>
                    {v.car.waiting.reason === 'WAITING_PART' ? 'Część dotarła' : 'Klient zdecydował'}
                </Button>
            ) : (
                <Button variant="tinted" size="sm" onClick={() => setDialog({ kind: 'pick', view: v, initialBayId: v.nextBooking?.bayId ?? null })}>
                    <ArrowDownToLine aria-hidden="true" />Wjedź
                </Button>
            ))}
        >
            {v.car.waiting?.note && <Meta $tone="warn"><PackageSearch aria-hidden="true" />{v.car.waiting.note}</Meta>}
            {v.nextBooking && <Meta title="Plan"><CalendarClock aria-label="Plan" />{bayName(v.nextBooking.bayId)}, {rangeText(new Date(v.nextBooking.start), new Date(v.nextBooking.end), now)}</Meta>}
        </CarCard>
    );

    const bayCard = (v: CarView) => {
        const stint = v.place.kind === 'bay' ? v.place.stint : null;
        // Plan już minął, a auto stoi: nextBooking go nie zwróci, więc szukamy po całym planie.
        const plan = snap.bookings.filter(b => b.carId === v.car.id).sort((a, b) => b.end.localeCompare(a.end))[0];
        const overPlan = !!plan && new Date(plan.end) < now;
        return (
            <CarCard
                key={v.car.id}
                plate={v.car.licensePlate}
                vehicle={v.car.vehicleName}
                job={v.car.jobTitle}
                aside={v.curing && stint?.curingUntil ? `schnie do ${formatClockTime(stint.curingUntil)}` : formatMinutes(v.currentMinutes)}
                asideTitle={stint ? `Na stanowisku od ${formatClockTime(stint.startedAt)}` : undefined}
                people={peopleOf(v)}
                {...dragProps(v.car.id)}
                actions={canEdit && (
                    <>
                        <Button variant="tintedSuccess" size="sm" onClick={() => setDialog({ kind: 'finish', view: v })}>Skończone</Button>
                        {more(v)}
                    </>
                )}
            >
                {overPlan && <Meta $tone="warn">Dłużej niż plan</Meta>}
            </CarCard>
        );
    };

    const readyCard = (v: CarView) => (
        <CarCard
            key={v.car.id}
            plate={v.car.licensePlate}
            vehicle={v.car.vehicleName}
            job={v.car.jobTitle}
            aside={v.car.readyAt ? `od ${formatClockTime(v.car.readyAt)}` : null}
            asideTitle="Gotowe do wydania od"
            actions={canEdit && (
                <Button variant="outline" size="sm" onClick={async () => {
                    await handOver.mutateAsync([v.car.id]);
                    showSuccess(`${v.car.licensePlate} wydane`, 'W CRM wydanie robi się w wizycie, tu tylko je odnotowujemy.');
                }}>Wydaj</Button>
            )}
        />
    );

    return (
        <>
            <Layout>
                <Areas>
                    <Column $kind="yard" $drop={sameTarget(dropOver, { kind: 'yard' })} {...dropProps({ kind: 'yard' })} aria-labelledby="col-yard">
                        <ColumnHead title="Auto jest u nas, nikt przy nim nie pracuje">
                            <ColumnTitle id="col-yard">Na placu</ColumnTitle>
                            <Count>{board.yard.length}</Count>
                        </ColumnHead>
                        {board.yard.length === 0 ? <Empty>Pusto</Empty> : <Cards>{board.yard.map(yardCard)}</Cards>}
                    </Column>

                    <Hall>
                        {board.bays.map(col => {
                            const target: DropTarget = { kind: 'bay', bayId: col.bay.id };
                            return (
                                <Column key={col.bay.id} $kind="bay" $drop={sameTarget(dropOver, target)} {...dropProps(target)} aria-labelledby={`col-${col.bay.id}`}>
                                    <ColumnHead>
                                        <ColumnTitle id={`col-${col.bay.id}`}>{col.bay.name}</ColumnTitle>
                                        {col.bay.capacity > 1 && <Count title="Zajęte miejsca">{col.items.length} z {col.bay.capacity}</Count>}
                                    </ColumnHead>
                                    {col.items.map(bayCard)}
                                    {col.freeSpots > 0 && (
                                        <Empty>{col.freeSince ? `Wolne od ${formatClockTime(col.freeSince)}` : 'Wolne'}</Empty>
                                    )}
                                </Column>
                            );
                        })}
                    </Hall>

                    <Column $kind="ready" $drop={sameTarget(dropOver, { kind: 'ready' })} {...dropProps({ kind: 'ready' })} aria-labelledby="col-ready">
                        <ColumnHead title="Praca skończona, auto czeka na klienta">
                            <ColumnTitle id="col-ready">Do wydania</ColumnTitle>
                            <Count>{board.ready.length}</Count>
                        </ColumnHead>
                        {board.ready.length === 0 ? <Empty>Pusto</Empty> : <Cards>{board.ready.map(readyCard)}</Cards>}
                    </Column>
                </Areas>
            </Layout>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Więcej akcji">
                {menu.menu && (
                    <>
                        <MenuItem onClick={() => { setDialog({ kind: 'pause', view: menu.menu!.item }); menu.close(); }}>Wstrzymaj, zjeżdża na plac</MenuItem>
                        <MenuItem onClick={() => { setDialog({ kind: 'pick', view: menu.menu!.item }); menu.close(); }}>Przenieś na inne stanowisko</MenuItem>
                    </>
                )}
            </ActionMenu>

            {dialog?.kind === 'pick' && (
                <BayPickerDialog
                    view={dialog.view}
                    snap={snap}
                    suggestedBayId={dialog.view.nextBooking?.bayId}
                    initialBayId={dialog.initialBayId}
                    title={dialog.view.place.kind === 'bay' ? 'Przenieś na inne stanowisko' : 'Wjazd na stanowisko'}
                    busy={busy}
                    onClose={() => setDialog(null)}
                    onConfirm={(bayId, people, evict) => void enterBay(dialog.view, bayId, people, evict)}
                />
            )}
            {dialog?.kind === 'finish' && (
                <FinishDialog view={dialog.view} busy={busy} onClose={() => setDialog(null)} onConfirm={c => void finish(dialog.view, c)} />
            )}
            {dialog?.kind === 'pause' && (
                <PauseDialog
                    view={dialog.view}
                    busy={busy}
                    onClose={() => setDialog(null)}
                    onConfirm={async (reason, note) => {
                        await end.mutateAsync([dialog.view.car.id, reason, { note }]);
                        setDialog(null);
                        showSuccess(`${dialog.view.car.licensePlate} na placu`, 'Stanowisko jest wolne.');
                    }}
                />
            )}
        </>
    );
}
