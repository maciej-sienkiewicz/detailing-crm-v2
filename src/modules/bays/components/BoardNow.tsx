// src/modules/bays/components/BoardNow.tsx
//
// „Teraz": dzień hali. Po lewej auta, które czekają na przypisanie do stanowiska,
// po prawej oś dnia - kolumna na stanowisko, czas biegnie w dół (NowTimeline).
// Auto gotowe znika z tablicy: wydanie prowadzi wizyta.
//
// Auto „u nas, ale nikt przy nim nie pracuje" (czeka na część, na decyzję klienta,
// na wolny podnośnik) ma własną kolumnę na równi z halą - kalendarz pokazuje je jako
// trwającą wizytę i nie da się odróżnić pracy od czekania.
//
// Ekran ma być czytelny z dwóch metrów (tablet na hali): JEDEN przycisk na karcie -
// krok, który przy tym aucie zwykle jest następny. Rzadsze akcje są pod „Więcej".
//
// Przeciąganie to skrót na komputerze, nigdy jedyna droga (telefon, klawiatura,
// tablet w rękawicach).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowDownToLine, CalendarClock, Check, MoreHorizontal, PackageSearch } from 'lucide-react';
import { ActionMenu, Button, IconButton, MenuItem, StatusPill, ui, useActionMenu } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import { useToast } from '@/common/components/Toast';
import type { BayPerson, BaysSnapshot } from '../types';
import { buildBoard, viewOf, type CarView } from '../utils/boardState';
import { rangeText } from '../utils/slots';
import { baysApi, isConflict } from '../api/baysApi';
import { useBaysMutation, usePatchBoard } from '../hooks/useBays';
import { usePermissions } from '@/core/permissions';
import type { WeekBar } from '../utils/weekLayout';
import { NowTimeline } from './NowTimeline';
import { BarPreviewDrawer } from './BarPreviewDrawer';
import { CarCard, Meta } from './primitives';
import { BayPickerDialog, FinishDialog, PauseDialog, type FinishChoice } from './dialogs';

/*
 * Na szerokim ekranie: oczekujące z lewej, oś dnia obok. Węższy ekran: oczekujące
 * nad osią, w kolejności drogi auta.
 */
const Layout = styled.div`
    container: bays-board / inline-size;
    min-width: 0;
`;

const Areas = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    align-items: start;

    @container bays-board (min-width: 900px) {
        grid-template-columns: 264px minmax(0, 1fr);
    }
`;

/* Ta sama ramka co oś obok (obwódka, promień, biel) - miejsce na równi z halą, nie dopisek. */
const Waiting = styled.section<{ $drop: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 12px 10px 10px;
    border-radius: ${ui.radiusPanel};
    border: 1px solid ${p => (p.$drop ? ui.brand : ui.line)};
    background: ${p => (p.$drop ? ui.brandTint : ui.surface)};
    transition: background 150ms ease, border-color 150ms ease;
`;

const ColumnHead = styled.header`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 0 4px 2px;
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

/* Na pełnej szerokości (tablet, telefon) karty w siatce; w wąskiej kolumnie i tak jedna. */
const Cards = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
    gap: 8px;
    align-items: start;
`;

const Empty = styled.p`
    margin: 0;
    padding: 4px 4px 2px;
    font-size: 13px;
    color: ${ui.textMuted};
`;

type Dialog =
    | { kind: 'pick'; view: CarView; initialBayId?: string | null }
    | { kind: 'finish'; view: CarView }
    | { kind: 'pause'; view: CarView };

type DropTarget = { kind: 'yard' } | { kind: 'bay'; bayId: string };

const sameTarget = (a: DropTarget | null, b: DropTarget) =>
    !!a && a.kind === b.kind && (a.kind !== 'bay' || (b.kind === 'bay' && a.bayId === b.bayId));

interface Props {
    snap: BaysSnapshot;
    now: Date;
    canEdit: boolean;
}

export function BoardNow({ snap, now, canEdit }: Props) {
    const board = buildBoard(snap, now);
    const { showError, showInfo } = useToast();
    const { can } = usePermissions();
    const patchBoard = usePatchBoard();
    const removeBooking = useBaysMutation(baysApi.deleteBooking);
    const [preview, setPreview] = useState<{ bar: WeekBar; bayId: string } | null>(null);
    const navigate = useNavigate();
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
    const busy = start.isPending || end.isPending;

    const bayName = (id: string) => snap.bays.find(b => b.id === id)?.name ?? '';
    const viewById = (carId: string) => {
        const car = snap.cars.find(c => c.id === carId);
        return car ? viewOf(car, snap, now) : null;
    };
    const peopleOf = (v: CarView): BayPerson[] => (track ? v.people : []);

    /** Id wizyty auta - na stanowisko wjeżdża tylko auto przyjęte, czyli z wizytą. */
    const visitOf = (view: CarView) => view.car.visitId ?? view.car.id;

    /**
     * Gotowość do wydania idzie kreatorem wizyty (powiadomienie klienta, sprawdzenie
     * usług) - tablica go nie omija, tylko prowadzi do niego.
     */
    const goReady = (view: CarView) => {
        showInfo(`${view.car.licensePlate}: oznacz w wizycie jako gotowe`, 'Odcinek na stanowisku jest zamknięty.');
        navigate(`/visits/${visitOf(view)}`);
    };

    const enterBay = async (view: CarView, bayId: string, personIds: string[], evict: { carId: string; how: 'yard' | 'done' } | null) => {
        try {
            await start.mutateAsync([visitOf(view), bayId, track ? personIds : [], evict]);
            setDialog(null);
        } catch (e) {
            // Ktoś zajął stanowisko w międzyczasie: to samo okno co przy zajętym od początku.
            if (isConflict(e)) setDialog({ kind: 'pick', view, initialBayId: bayId });
            else showError('Nie udało się zapisać wjazdu', 'Spróbuj ponownie.');
        }
    };

    const finish = async (view: CarView, choice: FinishChoice) => {
        if (choice === 'move') { setDialog({ kind: 'pick', view }); return; }
        await end.mutateAsync([visitOf(view), 'DONE']);
        setDialog(null);
        if (choice === 'ready') goReady(view);
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
                <Button variant="outline" size="sm" onClick={() => clear.mutate([visitOf(v)])}>
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

    /** Trwająca praca na osi dnia - jedyny blok z akcjami. */
    const activeCard = (bar: WeekBar) => {
        const v = viewById(bar.carId);
        if (!v) return null;
        const stint = v.place.kind === 'bay' ? v.place.stint : null;
        return (
            <CarCard
                plate={v.car.licensePlate}
                vehicle={v.car.vehicleName}
                job={v.car.jobTitle}
                aside={v.curing && stint?.curingUntil ? `schnie do ${formatClockTime(stint.curingUntil)}` : stint ? `od ${formatClockTime(stint.startedAt)}` : null}
                asideTitle={stint ? `Na stanowisku od ${formatClockTime(stint.startedAt)}` : undefined}
                people={peopleOf(v)}
                {...dragProps(v.car.id)}
                actions={canEdit && (
                    <>
                        {/* Obrys i ikona: przy kilku autach naraz pełna zieleń byłaby kilkoma
                            wypełnieniami w oknie, a sam odcień czytał się jak plakietka stanu. */}
                        <Button variant="outline" size="sm" onClick={() => setDialog({ kind: 'finish', view: v })}>
                            <Check aria-hidden="true" />Zakończ
                        </Button>
                        {more(v)}
                    </>
                )}
            >
                {bar.overPlan && <Meta $tone="warn">Dłużej niż plan</Meta>}
            </CarCard>
        );
    };

    const deleteBooking = async (bookingId: string) => {
        await patchBoard(s => ({ ...s, bookings: s.bookings.filter(b => b.id !== bookingId) }));
        removeBooking.mutate([bookingId], { onError: () => showError('Nie udało się usunąć z planu', 'Spróbuj ponownie.') });
    };

    return (
        <>
            <Layout>
                <Areas>
                    <Waiting $drop={sameTarget(dropOver, { kind: 'yard' })} {...dropProps({ kind: 'yard' })} aria-labelledby="col-yard">
                        <ColumnHead title="Auto jest u nas, ale nie stoi na żadnym stanowisku">
                            <ColumnTitle id="col-yard">Oczekuje na przypisanie</ColumnTitle>
                            <Count>{board.yard.length}</Count>
                        </ColumnHead>
                        {board.yard.length === 0 ? <Empty>Każde auto ma stanowisko.</Empty> : <Cards>{board.yard.map(yardCard)}</Cards>}
                    </Waiting>

                    <NowTimeline
                        snap={snap}
                        now={now}
                        renderActive={activeCard}
                        onOpenBar={(bar, bayId) => setPreview({ bar, bayId })}
                        dropProps={bayId => dropProps({ kind: 'bay', bayId })}
                        dropOverBayId={dropOver?.kind === 'bay' ? dropOver.bayId : null}
                    />
                </Areas>
            </Layout>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Więcej akcji">
                {menu.menu && (
                    <>
                        <MenuItem onClick={() => { setDialog({ kind: 'pause', view: menu.menu!.item }); menu.close(); }}>Wstrzymaj, zjeżdża ze stanowiska</MenuItem>
                        <MenuItem onClick={() => { setDialog({ kind: 'pick', view: menu.menu!.item }); menu.close(); }}>Przenieś na inne stanowisko</MenuItem>
                    </>
                )}
            </ActionMenu>

            {preview && (
                <BarPreviewDrawer
                    bar={preview.bar}
                    snap={snap}
                    now={now}
                    canEdit={can('VISITS_CREATE')}
                    onClose={() => setPreview(null)}
                    onDeleteBooking={id => void deleteBooking(id)}
                    onAddStage={can('VISITS_CREATE') ? () => navigate(`/bays?view=week&place=${preview.bar.carId}`) : undefined}
                />
            )}
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
                        await end.mutateAsync([visitOf(dialog.view), reason, note]);
                        setDialog(null);
                    }}
                />
            )}
        </>
    );
}
