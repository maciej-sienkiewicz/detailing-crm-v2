// src/modules/comms/components/LeadDetailModal.tsx
// Okno szczegółów leada — jedno na całą aplikację.
//
// Wcześniej mieszkało w widoku leadów i dało się je otworzyć wyłącznie stamtąd,
// więc plakietka „Lead" w podglądzie rozmowy musiała przerzucać na inny adres.
// Kliknięcie stanu wyrzucało z korespondencji, którą się właśnie czytało — żeby
// pokazać dane o tej samej rozmowie. Okno otwiera się teraz na miejscu, w obu
// widokach z tego samego komponentu, więc nie ma dwóch wersji tej samej prawdy.
//
// Szeroki modal, nie wysuwany panel: wycena jest tu tabelą o czterech kolumnach
// kwot, a wąska szuflada ucinała nazwy usług do jednej litery i ściskała liczby
// tak, że nie dało się ich porównać.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { CalendarPlus, Car, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/common/components/Badge';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    CloseBtn,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalShell,
    ModalTitle,
    ModalTitleGroup,
} from '@/common/components/ModalKit';
import { EditableServicesTable } from '@/modules/checkin/components/EditableServicesTable';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { BookingFlowModal } from '@/modules/calendar';
import { useToast } from '@/common/components/Toast';
import {
    useDeleteLead,
    useLead,
    useLeadHistory,
    useUpdateLeadServices,
    useUpdateLeadVehicle,
} from '../hooks/useLeads';
import { useLeadStatusChange } from '../hooks/useLeadStatusChange';
import { useContactCard } from '../hooks/useComms';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { toLeadInputs, toQuoteRows, toServiceLines } from '../utils/leadServiceLines';
import { CLOSED_STATUSES, formatVehicle } from '../utils/leadFormat';
import { LEAD_STATUS_LABELS, type LeadServiceItemInput } from '../types';
import { LeadReplyBadge } from './LeadReplyBadge';
import { LeadSourceIcon } from './LeadSourceIcon';
import { LeadStatusPicker } from './LeadStatusPicker';
import { IconButton, PrimaryButton, formatDateTime, formatGrosze } from './shared';

/** Fakty, które mieszczą się w dwóch kolumnach: pierwsza wiadomość i historia. */
const FactGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: 1fr;
    }
`;

const Panel = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 14px 16px;
    background: ${p => p.theme.colors.surface};
    min-width: 0;

    h4 {
        margin: 0;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }
`;

/** Status w nagłówku — trzymany z dala od tytułu, tuż przed przyciskiem zamknięcia. */
const HeaderStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

/** Wyjaśnienie stanu „przegrany" — jedna linia nad treścią, nie pole formularza. */
const LostNote = styled.div`
    font-size: 12.5px;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 12px;

    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
`;

const ModalBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Podtytuł okna: skąd przyszedł lead i jak się z nim skontaktować. */
const LeadIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

const VehicleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: ${p => p.theme.colors.text};

    svg { color: ${p => p.theme.colors.textMuted}; flex-shrink: 0; }
    .grow { flex: 1; min-width: 0; }
    .muted { color: ${p => p.theme.colors.textMuted}; }
`;

const VehiclePickers = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
    }
`;

/**
 * Wycena w trybie podglądu. Jedna kwota brutto na pozycję nie wystarczała: lead
 * jest podstawą oferty, a rozmowa o cenie toczy się raz w netto (firma), raz
 * w brutto (klient prywatny) — przeliczanie w głowie przy każdym otwarciu panelu
 * to praca, którą tabela wykonuje raz. Kolumny i kolejność jak w edytorze wyceny,
 * żeby przejście w tryb edycji nie było przeskokiem na inny układ.
 */
const QuoteTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
        text-align: right;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
        padding: 0 0 6px;
        white-space: nowrap;
    }
    th:first-child { text-align: left; }

    td {
        padding: 6px 0;
        border-top: 1px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textSecondary};
        text-align: right;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }
    td:first-child {
        text-align: left;
        white-space: normal;
        color: ${p => p.theme.colors.text};
        width: 100%;
    }
    th + th, td + td { padding-left: 14px; }

    tfoot td {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        border-top: 1px solid ${p => p.theme.colors.text};
    }

    .note {
        display: block;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
    }
`;

/** Jedyna akcja nieodwracalna w tym oknie — i jedyna, która wygląda groźnie. */
const DangerButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    align-self: flex-start;
    border: 1px solid rgba(220, 38, 38, 0.28);
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.error};
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 14px;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.errorLight}; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

const HistoryLine = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};

    strong { color: ${p => p.theme.colors.text}; }
`;

/**
 * Treść pierwszego pytania klienta. Zachowuje łamanie wierszy z maila i przewija się
 * w miejscu — dłuższe zapytanie nie ma prawa rozpychać okna na cały ekran, a jego
 * skrócenie do jednej linijki zabierałoby dokładnie to, po co się tu zagląda.
 */
const MessageQuote = styled(HistoryLine)`
    max-height: 190px;
    overflow-y: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.55;
`;

export interface LeadDetailModalProps {
    leadId: string;
    onClose: () => void;
    /** Otworzyć od razu edytor wyceny — wejście „kliknięto wartość w tabeli". */
    openServicesEditor?: boolean;
    /**
     * Odnośnik do korespondencji w nagłówku. Wyłączany tam, gdzie okno otwarto
     * właśnie z tej korespondencji: przycisk prowadzący w miejsce, w którym się stoi,
     * to nie skrót, tylko zagadka.
     */
    showThreadLink?: boolean;
    /** Wywoływane po usunięciu leada — okno jest wtedy już zamknięte. */
    onDeleted?: () => void;
}

export function LeadDetailModal({
    leadId,
    onClose,
    openServicesEditor = false,
    showThreadLink = true,
    onDeleted,
}: LeadDetailModalProps) {
    const { data: lead } = useLead(leadId);
    const { data: history } = useLeadHistory(leadId);
    // null = podgląd, tablica = otwarty edytor wyceny (ten sam co przy przyjęciu auta).
    const [editingServices, setEditingServices] = useState<ServiceLineItem[] | null>(null);
    // null = podgląd, obiekt = edycja pojazdu. Marka i model wybierane z katalogu,
    // bo wpisane ręcznie „bèemka" psułaby wyszukiwanie tak samo jak surowy tekst z LLM-a.
    const [editingVehicle, setEditingVehicle] = useState<{ brand: string; model: string } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [booking, setBooking] = useState(false);
    // Edytor wyceny otwarty od pierwszej klatki, gdy wejściem było kliknięcie wartości.
    // Wystarczy stan początkowy: okno montuje się na jedno otwarcie jednego leada,
    // więc nie ma czego dosynchronizowywać efektem.
    const [servicesPrimed, setServicesPrimed] = useState(false);
    if (openServicesEditor && !servicesPrimed && lead) {
        setServicesPrimed(true);
        setEditingServices(toServiceLines(lead.services));
    }

    // Kartoteka kontaktu — stąd bierzemy telefon i auta klienta do rezerwacji.
    // Pobierana dopiero, gdy okno jest otwarte: lista leadów jej nie potrzebuje.
    const { data: contactCard } = useContactCard(lead?.contactIdentifier ?? null, {
        enabled: Boolean(lead?.contactIdentifier),
    });
    const status = useLeadStatusChange();
    const updateVehicle = useUpdateLeadVehicle();
    const updateServices = useUpdateLeadServices();
    const deleteLead = useDeleteLead();
    const { showSuccess, showError } = useToast();

    const saveVehicle = () => {
        if (!editingVehicle) return;
        updateVehicle.mutate(
            {
                leadId,
                vehicleBrand: editingVehicle.brand || null,
                vehicleModel: editingVehicle.model || null,
            },
            {
                onSuccess: () => {
                    setEditingVehicle(null);
                    showSuccess('Pojazd zapisany');
                },
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się zapisać pojazdu', message ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    const saveServices = () => {
        if (!editingServices) return;
        const payload: LeadServiceItemInput[] = toLeadInputs(editingServices);
        updateServices.mutate(
            { leadId, services: payload },
            {
                onSuccess: () => {
                    setEditingServices(null);
                    showSuccess('Zapisano usługi');
                },
            }
        );
    };

    const confirmDelete = () => {
        // Okno zamykamy PRZED wysłaniem żądania. Otwarte odpytuje `GET /leads/{id}`
        // i `…/history`; unieważnienie cache po usunięciu kazałoby mu pobrać leada,
        // którego już nie ma — i obok „Lead usunięty" wyskakiwało „Nie znaleziono
        // leada" z globalnego przechwytywacza błędów. Odmontowane okno nie pyta.
        setDeleteDialogOpen(false);
        onClose();
        onDeleted?.();
        deleteLead.mutate(leadId, {
            onSuccess: () => showSuccess('Lead usunięty', 'Korespondencja została w skrzynce'),
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się usunąć leada', message ?? 'Spróbuj ponownie');
            },
        });
    };

    if (!lead) return null;

    // Kreator rezerwacji zastępuje okno szczegółów, a nie kładzie się na nim. Dwie
    // nałożone nakładki nie pokrywają się geometrycznie — kreator jest przesunięty
    // o szerokość sidebara, okno leada nie — więc jedna z nich przyciemniała kawałek
    // ekranu drugi raz, zostawiając widoczny pionowy szew.
    if (booking) {
        return (
            <BookingFlowModal
                /* Lead z już przypiętą rezerwacją odrzuciłby drugą. */
                leadId={lead.appointmentId ? undefined : lead.id}
                subtitle={lead.customerName ?? lead.contactIdentifier}
                prefill={leadToBookingPrefill(lead, contactCard)}
                onClose={() => setBooking(false)}
                onBooked={() => setBooking(false)}
            />
        );
    }

    return (
        <>
            <ModalShell isOpen onClose={onClose} maxWidth="1040px">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{lead.customerName ?? lead.contactIdentifier}</ModalTitle>
                        <LeadIdentity>
                            <LeadSourceIcon source={lead.source} />
                            {lead.contactIdentifier}
                            {showThreadLink && lead.threadId && (
                                <Link to={`/communication?thread=${lead.threadId}`}>
                                    <Badge $variant="info" style={{ cursor: 'pointer' }}>
                                        Zobacz korespondencję
                                    </Badge>
                                </Link>
                            )}
                        </LeadIdentity>
                    </ModalTitleGroup>
                    {/* Status stoi w nagłówku, przy nazwie leada, bo to jego główna
                        właściwość i najczęściej zmieniane pole — a jako osobny panel
                        zajmował pół szerokości okna na jeden przycisk. Nagłówek jest
                        też jedynym miejscem widocznym niezależnie od przewinięcia. */}
                    <HeaderStatus>
                        <LeadReplyBadge
                            replyState={lead.replyState}
                            waitingSince={lead.waitingSince}
                            muted={CLOSED_STATUSES.has(lead.status)}
                        />
                        <LeadStatusPicker
                            status={lead.status}
                            disabled={status.isPending}
                            onChange={(next) => status.requestStatus(lead.id, next)}
                        />
                    </HeaderStatus>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <ModalBody>
                        {/* Powód przegranej to wyjaśnienie stanu, nie pole formularza —
                            pokazujemy go raz, u góry, i tylko gdy jest czego wyjaśniać. */}
                        {lead.status === 'LOST' && lead.lostReasonLabel && (
                            <LostNote>
                                Przegrany: <strong>{lead.lostReasonLabel}</strong>
                                {lead.lostReason && <> — {lead.lostReason}</>}
                            </LostNote>
                        )}

                        <Panel>
                            <h4>Pojazd</h4>
                            {lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null ? (
                                <VehicleRow className="muted">
                                    <Loader2 size={14} style={{ animation: 'none' }} />
                                    Rozpoznajemy auto z korespondencji…
                                </VehicleRow>
                            ) : editingVehicle === null ? (
                                <VehicleRow>
                                    <Car size={15} />
                                    <span className="grow">
                                        {formatVehicle(lead) ?? <span className="muted">Nie rozpoznano auta</span>}
                                    </span>
                                    <IconButton
                                        onClick={() => setEditingVehicle({
                                            brand: lead.vehicleBrand ?? '',
                                            model: lead.vehicleModel ?? '',
                                        })}
                                    >
                                        {lead.vehicleBrand ? 'Zmień' : 'Uzupełnij'}
                                    </IconButton>
                                </VehicleRow>
                            ) : (
                                <>
                                    {/* Ten sam wybierak co przy przyjęciu pojazdu i w rezerwacji:
                                        wyszukiwarka w rozwijanej liście zamiast natywnego <select>
                                        z kilkuset markami, których nie da się przefiltrować. */}
                                    <VehiclePickers>
                                        <BrandSelect
                                            value={editingVehicle.brand}
                                            placeholder="Marka…"
                                            onChange={(brand) => setEditingVehicle({
                                                brand,
                                                // Zmiana marki zeruje model: modele są per marka,
                                                // a zostawiony stary nie przeszedłby walidacji.
                                                model: '',
                                            })}
                                        />
                                        <ModelSelect
                                            brand={editingVehicle.brand}
                                            value={editingVehicle.model}
                                            placeholder="Model…"
                                            onChange={(model) => setEditingVehicle({
                                                brand: editingVehicle.brand,
                                                model,
                                            })}
                                        />
                                    </VehiclePickers>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <PrimaryButton onClick={saveVehicle} disabled={updateVehicle.isPending}>
                                            {updateVehicle.isPending ? 'Zapisywanie…' : 'Zapisz'}
                                        </PrimaryButton>
                                        <IconButton onClick={() => setEditingVehicle(null)}>Anuluj</IconButton>
                                    </div>
                                </>
                            )}
                        </Panel>

                        <Panel>
                            <h4>Usługi i wycena</h4>
                            {editingServices === null && (
                                <>
                                    {lead.services.length === 0 && (
                                        <HistoryLine>Nie przypisano jeszcze usług.</HistoryLine>
                                    )}
                                    {lead.services.length > 0 && (() => {
                                        const rows = toQuoteRows(lead.services);
                                        const sum = (pick: (row: typeof rows[number]) => number) =>
                                            rows.reduce((total, row) => total + pick(row), 0);
                                        return (
                                            <QuoteTable>
                                                <thead>
                                                    <tr>
                                                        <th>Usługa</th>
                                                        <th>Netto</th>
                                                        <th>VAT</th>
                                                        <th>Brutto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row) => (
                                                        <tr key={row.id}>
                                                            <td>
                                                                {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ''}
                                                                {row.note && <span className="note">{row.note}</span>}
                                                            </td>
                                                            <td>{formatGrosze(row.netCents)}</td>
                                                            <td>{formatGrosze(row.vatCents)}</td>
                                                            <td>{formatGrosze(row.grossCents)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td>Razem</td>
                                                        <td>{formatGrosze(sum((row) => row.netCents))}</td>
                                                        <td>{formatGrosze(sum((row) => row.vatCents))}</td>
                                                        <td>{formatGrosze(sum((row) => row.grossCents))}</td>
                                                    </tr>
                                                </tfoot>
                                            </QuoteTable>
                                        );
                                    })()}
                                    <IconButton
                                        style={{ alignSelf: 'flex-start' }}
                                        onClick={() => setEditingServices(toServiceLines(lead.services))}
                                    >
                                        Edytuj usługi
                                    </IconButton>
                                </>
                            )}
                            {editingServices !== null && (
                                <>
                                    {/* Ten sam edytor co przy przyjęciu pojazdu: rabaty, notatka
                                        do pozycji, korekta ceny i podpowiedzi z cennika. Lead nie
                                        potrzebuje własnej, uboższej listy — wycena to ta sama
                                        czynność, tylko wcześniej. */}
                                    <EditableServicesTable
                                        services={editingServices}
                                        onChange={setEditingServices}
                                    />
                                    {/* Sumy netto / VAT / łącznie liczy sam edytor —
                                        druga suma pod nim byłaby tą samą liczbą
                                        napisaną drugi raz, tylko innym stylem. */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <PrimaryButton onClick={saveServices} disabled={updateServices.isPending}>
                                            Zapisz
                                        </PrimaryButton>
                                        <IconButton onClick={() => setEditingServices(null)}>Anuluj</IconButton>
                                    </div>
                                </>
                            )}
                        </Panel>

                        <FactGrid>
                            <Panel>
                                <h4>Pierwsza wiadomość</h4>
                                <MessageQuote>
                                    {lead.initialMessage ?? 'Brak treści pierwszej wiadomości.'}
                                </MessageQuote>
                            </Panel>

                            <Panel>
                                <h4>Historia</h4>
                                {(history ?? []).length === 0 && (
                                    <HistoryLine>Brak zmian statusu.</HistoryLine>
                                )}
                                {(history ?? []).map((entry, index) => (
                                    <HistoryLine key={index}>
                                        {formatDateTime(entry.createdAt)} —{' '}
                                        <strong>{LEAD_STATUS_LABELS[entry.toStatus]}</strong>
                                        {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                                        {entry.changedByName && <> · {entry.changedByName}</>}
                                    </HistoryLine>
                                ))}
                            </Panel>
                        </FactGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>
                    {/* Usunięcie stoi po lewej, z dala od „Zamknij" — dwie akcje o wprost
                        przeciwnych skutkach nie mają prawa sąsiadować pod kursorem. */}
                    <DangerButton
                        type="button"
                        style={{ marginRight: 'auto' }}
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleteLead.isPending}
                    >
                        <Trash2 size={14} /> Usuń lead
                    </DangerButton>
                    {/* Rezerwacja to naturalne zakończenie leada, więc akcja stoi
                        jako główna. Gdy termin już jest, przycisk prowadzi do niego
                        zamiast pozwalać założyć drugi — backend i tak by odmówił. */}
                    {lead.appointmentId ? (
                        <Link to="/calendar">
                            <IconButton type="button">
                                <CalendarPlus size={14} /> Zobacz w kalendarzu
                            </IconButton>
                        </Link>
                    ) : (
                        <PrimaryButton type="button" onClick={() => setBooking(true)}>
                            <CalendarPlus size={14} /> Stwórz rezerwację
                        </PrimaryButton>
                    )}
                    <IconButton onClick={onClose}>Zamknij</IconButton>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={deleteDialogOpen}
                title="Usunąć ten lead?"
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
            />

            {status.lostDialog}
        </>
    );
}
