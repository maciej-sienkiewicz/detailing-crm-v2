// src/modules/batch-orders/components/EntriesTable.tsx
//
// Lista wpisów kontrahenta.
//
// Zgłoszenie, od którego zaczęła się przebudowa: „nie da się edytować cen -
// klikaliśmy w cały rekord, klikaliśmy w cenę i nic się nie działo". Działo się
// dokładnie nic: wiersz ustawiał wpis do edycji, ale nie otwierał edytora, a jedyne
// wejście - ⋮ - miało `opacity: 0` do czasu najechania. Stąd trzy zasady:
//   1. Wiersz otwiera edytor. Cały. Myszą i klawiaturą.
//   2. Kwota jest osobnym przyciskiem „Zmień cenę" z ołówkiem widocznym zawsze;
//      otwiera edytor z kursorem w polu ceny.
//   3. ⋮ jest widoczne zawsze - na komputerze tak samo jak na telefonie.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Camera, ChevronRight, Lock, MoreVertical, Pencil, RotateCcw, Trash2, Unlock } from 'lucide-react';
import type { BatchOrderEntry } from '../types';
import { formatAmount, formatMoney, photosLabel, vehicleName } from '../utils/format';
import { formatDay, formatDayShort } from '../utils/period';

/** Gdzie ustawić edytor po otwarciu: kursor w cenie, zdjęcia albo dane pojazdu. */
export type EntryFocus = 'price' | 'photos' | 'vehicle';

// ─── Desktop ──────────────────────────────────────────────────────────────────

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
`;

const Th = styled.th<{ $align?: 'right' }>`
    padding: 10px 12px;
    text-align: ${p => p.$align ?? 'left'};
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    background: ${p => p.theme.colors.surfaceHover};
    border-top: 1px solid #eef2f7;
    border-bottom: 1px solid #eef2f7;
    white-space: nowrap;

    &:first-child { padding-left: 28px; }
    &:last-child { padding-right: 20px; }
`;

const Tr = styled.tr<{ $settled: boolean }>`
    cursor: pointer;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    background: ${p => p.$settled ? '#fbfdfb' : p.theme.colors.surface};
    transition: background ${p => p.theme.transitions.fast};

    &:hover, &:focus-visible { background: ${p => p.theme.colors.surfaceHover}; }
    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
    &:last-child { border-bottom: none; }
`;

const Td = styled.td<{ $align?: 'right' }>`
    padding: 10px 12px;
    vertical-align: middle;
    text-align: ${p => p.$align ?? 'left'};
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    &:first-child { padding-left: 28px; }
    &:last-child { padding-right: 20px; }
`;

const DateText = styled.span`
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const Cell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
`;

const Primary = styled.span`
    max-width: 100%;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

/* Dwie linie zamiast wielokropka po pierwszej: nazwy usług bywają długie
   („Korekta lakieru 2-etapowa"), a to po nazwie rozpoznaje się wpis. */
const ServiceName = styled.span`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.35;
    color: ${p => p.theme.colors.text};
`;

const Secondary = styled.span`
    max-width: 100%;
    font-size: 12.5px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Plate = styled.span`
    padding: 2px 7px;
    border-radius: 5px;
    background: #1e293b;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    line-height: 1.5;
    white-space: nowrap;
`;

const StatusTag = styled.span<{ $tone: 'settled' | 'correction' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid ${p => p.$tone === 'settled' ? '#86efac' : '#fcd34d'};
    background: ${p => p.$tone === 'settled' ? p.theme.colors.successLight : '#fffbeb'};
    color: ${p => p.$tone === 'settled' ? '#15803d' : '#92400e'};

    svg { width: 11px; height: 11px; }
`;

/* Tablica i liczba zdjęć w jednej linii pod nazwą auta. Osobna kolumna „Zdjęcia"
   zabierała 84px kolumnie usług, która obok paska bocznego aplikacji ucinała
   nazwy do „Korekta la…". */
const IdentLine = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
`;

const Photos = styled.span<{ $empty: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12.5px;
    font-weight: 500;
    color: ${p => p.$empty ? '#94a3b8' : p.theme.colors.textSecondary};

    svg { width: 14px; height: 14px; }
`;

/**
 * Kwota jako przycisk. Ołówek jest widoczny ZAWSZE (nie dopiero po najechaniu) -
 * właśnie jego brak sprawił, że nikt nie wiedział, że cenę da się zmienić.
 */
const PriceBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-right: -10px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px dashed transparent;
    background: transparent;
    font-family: inherit;
    text-align: right;
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast}, border-color ${p => p.theme.transitions.fast};

    > svg { width: 15px; height: 15px; flex-shrink: 0; color: #64748b; }

    ${Tr}:hover &, &:focus-visible {
        border-color: #7dd3fc;
        background: #f0f9ff;
        > svg { color: #0369a1; }
    }
    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: 1px; }
`;

const PriceBtnStatic = styled(PriceBtn)`
    cursor: pointer;
    > svg { color: #94a3b8; }
    ${Tr}:hover &, &:focus-visible {
        border-color: ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surfaceAlt};
        > svg { color: #64748b; }
    }
`;

const Amounts = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
`;

const Gross = styled.span`
    font-size: 14.5px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const Net = styled.span`
    font-size: 12px;
    color: #64748b;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const MenuBtn = styled.button<{ $open: boolean }>`
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    border: 1px solid ${p => p.$open ? '#94a3b8' : p.theme.colors.border};
    background: ${p => p.$open ? p.theme.colors.surfaceAlt : p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover { border-color: #94a3b8; color: ${p => p.theme.colors.text}; }
    @media (hover: none) and (pointer: coarse) { width: 44px; height: 44px; }
`;

// ─── Mobile ───────────────────────────────────────────────────────────────────

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const Row = styled.li`
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    &:last-child { border-bottom: none; }
`;

/**
 * Pozycja listy to jeden duży przycisk: auto, data, usługa, kwota i strzałka.
 * Strzałka mówi „to się otwiera" - na dotyku nie ma najechania, które by to zdradziło.
 */
const RowMain = styled.button`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 62px;
    padding: 10px 4px 10px 14px;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active { background: ${p => p.theme.colors.surfaceHover}; }
    > svg { width: 16px; height: 16px; flex-shrink: 0; color: #94a3b8; }
`;

const RowText = styled.span`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const RowTitle = styled.span`
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
`;

const MobilePlate = styled.span`
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: #64748b;
    white-space: nowrap;
`;

/* Data i usługa jako dwa elementy z odstępem, nie „24.09 · Korekta" (CLAUDE.md §4). */
const SubLine = styled.span`
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;

    > span:first-child {
        flex-shrink: 0;
        font-size: 12.5px;
        color: #64748b;
        font-variant-numeric: tabular-nums;
    }
`;

const RowMenu = styled.div`
    display: flex;
    align-items: center;
    padding-right: 8px;
`;

// ─── Menu ─────────────────────────────────────────────────────────────────────

const Dropdown = styled.div`
    position: fixed;
    z-index: 900;
    min-width: 200px;
    max-width: calc(100vw - 16px);
    padding: 4px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.16);
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 38px;
    padding: 0 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    text-align: left;
    color: ${p => p.$danger ? '#b91c1c' : p.theme.colors.text};
    cursor: pointer;

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${p => p.$danger ? '#b91c1c' : '#64748b'}; }
    &:hover, &:focus-visible { background: ${p => p.$danger ? p.theme.colors.errorLight : p.theme.colors.surfaceAlt}; outline: none; }
    @media (hover: none) and (pointer: coarse) { min-height: 46px; }
`;

const MenuDivider = styled.div`
    height: 1px;
    margin: 4px 2px;
    background: ${p => p.theme.colors.border};
`;

interface MenuState { entry: BatchOrderEntry; top: number; right: number; }

interface Props {
    entries: BatchOrderEntry[];
    isDesktop: boolean;
    onOpen: (entry: BatchOrderEntry, focus?: EntryFocus) => void;
    onDelete: (entry: BatchOrderEntry) => void;
    onReopen: (entry: BatchOrderEntry) => void;
}

function servicesSummary(entry: BatchOrderEntry): { first: string; rest: string } {
    const [first, ...rest] = entry.services;
    if (!first) return { first: 'Brak usług', rest: '' };
    if (rest.length === 0) return { first: first.name, rest: '' };
    if (rest.length === 1) return { first: first.name, rest: `+ ${rest[0].name}` };
    return { first: first.name, rest: `+ ${rest.length} kolejne usługi` };
}

function StatusBadge({ entry }: { entry: BatchOrderEntry }) {
    if (entry.isClosed) return <StatusTag $tone="settled"><Lock />W zestawieniu</StatusTag>;
    if (entry.isCorrection) return <StatusTag $tone="correction"><RotateCcw />Korekta</StatusTag>;
    return null;
}

export function EntriesTable({ entries, isDesktop, onOpen, onDelete, onReopen }: Props) {
    const [menu, setMenu] = useState<MenuState | null>(null);

    useEffect(() => {
        if (!menu) return;
        const close = () => setMenu(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        // Menu stoi w `position: fixed` - przy przewinięciu odjechałoby od swojego wiersza.
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('click', close);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [menu]);

    function toggleMenu(e: React.MouseEvent<HTMLButtonElement>, entry: BatchOrderEntry) {
        e.stopPropagation();
        if (menu?.entry.id === entry.id) { setMenu(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        const vpWidth = window.visualViewport?.width ?? window.innerWidth;
        const vpHeight = window.visualViewport?.height ?? window.innerHeight;
        // Przy ostatnich wierszach menu otwiera się w górę, zamiast wyjeżdżać pod ekran.
        const openUp = vpHeight - rect.bottom < 220;
        setMenu({
            entry,
            top: openUp ? Math.max(8, rect.top - 4 - 190) : rect.bottom + 4,
            right: Math.max(8, vpWidth - rect.right),
        });
    }

    function run(action: () => void) {
        setMenu(null);
        action();
    }

    const menuButton = (entry: BatchOrderEntry) => (
        <MenuBtn
            type="button"
            $open={menu?.entry.id === entry.id}
            aria-label={`Więcej akcji: ${vehicleName(entry)}`}
            aria-haspopup="menu"
            aria-expanded={menu?.entry.id === entry.id}
            onClick={e => toggleMenu(e, entry)}
            onKeyDown={e => e.stopPropagation()}
        >
            <MoreVertical />
        </MenuBtn>
    );

    return (
        <>
            {isDesktop ? (
                <Table>
                    <colgroup>
                        <col style={{ width: 124 }} />
                        <col style={{ width: '30%' }} />
                        <col />
                        <col style={{ width: 172 }} />
                        <col style={{ width: 64 }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <Th>Data</Th>
                            <Th>Pojazd</Th>
                            <Th>Usługi</Th>
                            <Th $align="right">Kwota brutto</Th>
                            <Th><span className="sr-only">Akcje</span></Th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(entry => {
                            const svc = servicesSummary(entry);
                            const sub = svc.rest || (entry.notes ? `Uwagi: ${entry.notes}` : '');
                            return (
                                <Tr
                                    key={entry.id}
                                    $settled={entry.isClosed}
                                    tabIndex={0}
                                    aria-label={`${vehicleName(entry)}, ${formatDay(entry.serviceDate)}, ${formatMoney(entry.grossAmountCents)}. Otwórz auto`}
                                    onClick={() => onOpen(entry)}
                                    onKeyDown={e => {
                                        if (e.target !== e.currentTarget) return;
                                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(entry); }
                                    }}
                                >
                                    <Td>
                                        <Cell>
                                            <DateText>{formatDay(entry.serviceDate)}</DateText>
                                            <StatusBadge entry={entry} />
                                        </Cell>
                                    </Td>
                                    <Td>
                                        <Cell>
                                            <Primary>{vehicleName(entry)}</Primary>
                                            <IdentLine>
                                                {entry.vehicleLicensePlate && <Plate>{entry.vehicleLicensePlate}</Plate>}
                                                <Photos $empty={entry.photoCount === 0} title={photosLabel(entry.photoCount)}>
                                                    <Camera aria-hidden="true" />{entry.photoCount}
                                                </Photos>
                                            </IdentLine>
                                        </Cell>
                                    </Td>
                                    <Td>
                                        <Cell>
                                            <ServiceName title={entry.services.map(s => s.name).join(', ')}>{svc.first}</ServiceName>
                                            {sub && <Secondary title={entry.notes ?? undefined}>{sub}</Secondary>}
                                        </Cell>
                                    </Td>
                                    <Td $align="right">
                                        {entry.isClosed ? (
                                            <PriceBtnStatic
                                                type="button"
                                                title="Auto jest już w zestawieniu. Otwórz, żeby odblokować je do korekty"
                                                onClick={e => { e.stopPropagation(); onOpen(entry, 'price'); }}
                                            >
                                                <Lock />
                                                <Amounts>
                                                    <Gross>{formatMoney(entry.grossAmountCents)}</Gross>
                                                    <Net>{formatAmount(entry.netAmountCents)} netto</Net>
                                                </Amounts>
                                            </PriceBtnStatic>
                                        ) : (
                                            <PriceBtn
                                                type="button"
                                                title="Zmień cenę"
                                                aria-label={`Zmień cenę: ${formatMoney(entry.grossAmountCents)}`}
                                                onClick={e => { e.stopPropagation(); onOpen(entry, 'price'); }}
                                            >
                                                <Pencil />
                                                <Amounts>
                                                    <Gross>{formatMoney(entry.grossAmountCents)}</Gross>
                                                    <Net>{formatAmount(entry.netAmountCents)} netto</Net>
                                                </Amounts>
                                            </PriceBtn>
                                        )}
                                    </Td>
                                    <Td $align="right">{menuButton(entry)}</Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </Table>
            ) : (
                <List>
                    {entries.map(entry => {
                        const svc = servicesSummary(entry);
                        const extra = entry.services.length > 1 ? ` +${entry.services.length - 1}` : '';
                        return (
                            <Row key={entry.id}>
                                <RowMain type="button" onClick={() => onOpen(entry)}>
                                    <RowText>
                                        <RowTitle>
                                            <Primary>{vehicleName(entry)}</Primary>
                                            {entry.vehicleLicensePlate && <MobilePlate>{entry.vehicleLicensePlate}</MobilePlate>}
                                        </RowTitle>
                                        <SubLine>
                                            <span>{formatDayShort(entry.serviceDate)}</span>
                                            <Secondary>{svc.first}{extra}</Secondary>
                                        </SubLine>
                                        <StatusBadge entry={entry} />
                                    </RowText>
                                    <Gross>{formatMoney(entry.grossAmountCents)}</Gross>
                                    <ChevronRight />
                                </RowMain>
                                <RowMenu>{menuButton(entry)}</RowMenu>
                            </Row>
                        );
                    })}
                </List>
            )}

            {menu && createPortal(
                <Dropdown
                    role="menu"
                    style={{ top: menu.top, right: menu.right }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* „Popraw auto" = marka, model, tablica, data - edytor otwiera się od razu
                        na tej sekcji, a nie na cenach, które stoją w nim pierwsze. */}
                    <MenuItem role="menuitem" type="button" onClick={() => run(() => onOpen(menu.entry, menu.entry.isClosed ? undefined : 'vehicle'))}>
                        <Pencil />{menu.entry.isClosed ? 'Otwórz' : 'Popraw auto'}
                    </MenuItem>
                    {!menu.entry.isClosed && (
                        <MenuItem role="menuitem" type="button" onClick={() => run(() => onOpen(menu.entry, 'price'))}>
                            <span aria-hidden="true" style={{ width: 15, textAlign: 'center', fontWeight: 700, color: '#64748b' }}>zł</span>
                            Zmień cenę
                        </MenuItem>
                    )}
                    <MenuItem role="menuitem" type="button" onClick={() => run(() => onOpen(menu.entry, 'photos'))}>
                        <Camera />Zdjęcia ({menu.entry.photoCount})
                    </MenuItem>
                    <MenuDivider />
                    {menu.entry.isClosed ? (
                        <MenuItem role="menuitem" type="button" onClick={() => run(() => onReopen(menu.entry))}>
                            <Unlock />Odblokuj do korekty
                        </MenuItem>
                    ) : (
                        <MenuItem role="menuitem" type="button" $danger onClick={() => run(() => onDelete(menu.entry))}>
                            <Trash2 />Usuń z listy
                        </MenuItem>
                    )}
                </Dropdown>,
                document.body,
            )}
        </>
    );
}
