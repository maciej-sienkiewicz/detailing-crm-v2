// src/modules/comms/views/LeadsView.tsx
// Pipeline leadów: filtry statusów jako zakładki, lista, szczegóły w wysuwanym
// panelu. Zamknięcie jako „przegrany" wymusza wybór powodu ze słownika — to jedyne
// obowiązkowe pole w całym module i warunek działania analityki porażek.
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { BarChart3, Check, Mail, Minus, Phone, Plus, Search, User, X } from 'lucide-react';
import { useServices } from '@/modules/services';
import { useToast } from '@/common/components/Toast';
import {
    useChangeLeadStatus,
    useLead,
    useLeadDictionaries,
    useLeadHistory,
    useLeads,
    useUpdateLeadServices,
} from '../hooks/useLeads';
import {
    LEAD_STATUS_COLORS,
    LEAD_STATUS_FLOW,
    LEAD_STATUS_LABELS,
    type Lead,
    type LeadServiceItemInput,
    type LeadStatus,
} from '../types';
import {
    EmptyHint,
    IconButton,
    Pill,
    PrimaryButton,
    formatDateTime,
    formatGrosze,
    formatRelativeTime,
} from '../components/shared';

const Screen = styled.div`
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 1200px;
    margin: 0 auto;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h2 { margin: 0; font-size: 20px; font-weight: 700; color: #111827; }
`;

const Tabs = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const TabChip = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active }) => ($active ? '#111827' : '#e5e7eb')};
    background: ${({ $active }) => ($active ? '#111827' : '#ffffff')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#4b5563')};
    border-radius: 999px;
    font-size: 13px;
    padding: 6px 14px;
    cursor: pointer;
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 7px 12px;
    color: #9ca3af;
    max-width: 320px;

    input { border: none; outline: none; flex: 1; font-size: 13px; }
`;

const Table = styled.div`
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
`;

const Row = styled.button<{ $active?: boolean }>`
    display: grid;
    grid-template-columns: 2fr 1.4fr 1fr 1fr 1fr;
    gap: 10px;
    align-items: center;
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    background: ${({ $active }) => ($active ? '#f8fafc' : '#ffffff')};
    cursor: pointer;
    font-size: 13px;
    color: #374151;

    &:hover { background: #f9fafb; }
    &:last-child { border-bottom: none; }

    .who { font-weight: 600; color: #111827; display: flex; align-items: center; gap: 6px; }
    .sub { font-size: 12px; color: #9ca3af; font-weight: 400; }
    .value { font-weight: 600; color: #111827; }
`;

const HeadRow = styled.div`
    display: grid;
    grid-template-columns: 2fr 1.4fr 1fr 1fr 1fr;
    gap: 10px;
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #9ca3af;
    background: #fafafa;
    border-bottom: 1px solid #eef0f2;
`;

// ── Panel szczegółów ─────────────────────────────────────────────────────────

const DrawerOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.35);
    z-index: 70;
`;

const Drawer = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 440px;
    max-width: 96vw;
    background: #ffffff;
    z-index: 71;
    box-shadow: -12px 0 40px rgba(17, 24, 39, 0.16);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`;

const DrawerHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid #eef0f2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;

    h3 { margin: 0 0 2px; font-size: 16px; color: #111827; }
    .sub { font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
    button.close { border: none; background: none; color: #9ca3af; cursor: pointer; padding: 4px; }
`;

const DrawerSection = styled.section`
    padding: 14px 20px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    gap: 8px;

    h4 {
        margin: 0;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #9ca3af;
    }
`;

const StatusGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const ServiceLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #374151;

    .grow { flex: 1; }
    .qty { display: inline-flex; align-items: center; gap: 4px; color: #6b7280; }
    .qty button {
        border: 1px solid #e5e7eb; background: #fff; border-radius: 4px;
        width: 18px; height: 18px; display: inline-flex; align-items: center;
        justify-content: center; cursor: pointer; color: #6b7280; padding: 0;
    }
    button.remove { border: none; background: none; color: #d1d5db; cursor: pointer; padding: 2px; }
`;

const TotalLine = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    padding-top: 6px;
    border-top: 1px dashed #e5e7eb;
`;

const HistoryLine = styled.div`
    font-size: 12px;
    color: #6b7280;

    strong { color: #374151; }
`;

// ── Dialog powodu przegranej ─────────────────────────────────────────────────

const LostDialog = styled.div`
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(17, 24, 39, 0.4);
`;

const LostCard = styled.div`
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    width: 380px;
    max-width: 92vw;
    display: flex;
    flex-direction: column;
    gap: 12px;

    h4 { margin: 0; font-size: 15px; color: #111827; }
    textarea {
        border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px;
        font-size: 13px; font-family: inherit; resize: vertical; min-height: 60px;
    }
`;

const ReasonOption = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active }) => ($active ? '#111827' : '#e5e7eb')};
    background: ${({ $active }) => ($active ? '#f8fafc' : '#ffffff')};
    color: #374151;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
`;

function SourceIcon({ source }: { source: Lead['source'] }) {
    if (source === 'PHONE') return <Phone size={13} color="#9ca3af" />;
    if (source === 'EMAIL') return <Mail size={13} color="#9ca3af" />;
    return <User size={13} color="#9ca3af" />;
}

interface EditableServiceItem {
    serviceId: string | null;
    name: string;
    priceGross: number;
    quantity: number;
}

export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [lostDialogFor, setLostDialogFor] = useState<string | null>(null);
    const [lostReason, setLostReason] = useState<string | null>(null);
    const [lostNote, setLostNote] = useState('');
    const [editingServices, setEditingServices] = useState<EditableServiceItem[] | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');

    const selectedLeadId = searchParams.get('lead');
    const selectLead = (leadId: string | null) => {
        setEditingServices(null);
        setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
    };

    const { data: leadPage } = useLeads({ status: statusFilter, query: query || undefined, page });
    const { data: lead } = useLead(selectedLeadId);
    const { data: history } = useLeadHistory(selectedLeadId);
    const { data: dictionaries } = useLeadDictionaries();
    const { services: catalog } = useServices({
        search: serviceSearch,
        page: 1,
        limit: 20,
        showInactive: false,
    });
    const changeStatus = useChangeLeadStatus();
    const updateServices = useUpdateLeadServices();
    const { showSuccess, showError } = useToast();

    const editedTotal = useMemo(
        () => (editingServices ?? []).reduce((sum, item) => sum + item.priceGross * item.quantity, 0),
        [editingServices]
    );

    const requestStatus = (leadId: string, status: LeadStatus) => {
        if (status === 'LOST') {
            setLostReason(null);
            setLostNote('');
            setLostDialogFor(leadId);
            return;
        }
        changeStatus.mutate(
            { leadId, status },
            {
                onError: (error) => {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message;
                    showError('Nie udało się zmienić statusu', message);
                },
            }
        );
    };

    const confirmLost = () => {
        if (!lostDialogFor || !lostReason) return;
        changeStatus.mutate(
            { leadId: lostDialogFor, status: 'LOST', lostReasonCode: lostReason, lostNote: lostNote || undefined },
            { onSuccess: () => setLostDialogFor(null) }
        );
    };

    const saveServices = () => {
        if (!lead || !editingServices) return;
        const payload: LeadServiceItemInput[] = editingServices.map((item) => ({
            serviceId: item.serviceId,
            name: item.serviceId ? undefined : item.name,
            priceGross: item.serviceId ? undefined : item.priceGross,
            quantity: item.quantity,
        }));
        updateServices.mutate(
            { leadId: lead.id, services: payload },
            {
                onSuccess: () => {
                    setEditingServices(null);
                    showSuccess('Zapisano usługi');
                },
            }
        );
    };

    return (
        <Screen>
            <HeaderRow>
                <h2>Leady</h2>
                <Link to="/leads/analytics">
                    <IconButton as="span"><BarChart3 size={14} /> Analityka</IconButton>
                </Link>
            </HeaderRow>

            <Tabs>
                <TabChip $active={!statusFilter} onClick={() => { setStatusFilter(undefined); setPage(0); }}>
                    Wszystkie
                </TabChip>
                {LEAD_STATUS_FLOW.map((status) => (
                    <TabChip
                        key={status}
                        $active={statusFilter === status}
                        onClick={() => { setStatusFilter(status); setPage(0); }}
                    >
                        {LEAD_STATUS_LABELS[status]}
                    </TabChip>
                ))}
            </Tabs>

            <SearchBox>
                <Search size={14} />
                <input
                    placeholder="Szukaj po adresie, telefonie, nazwisku…"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                />
            </SearchBox>

            <Table>
                <HeadRow>
                    <span>Kontakt</span>
                    <span>Kategoria</span>
                    <span>Wartość</span>
                    <span>Status</span>
                    <span>Utworzony</span>
                </HeadRow>
                {leadPage && leadPage.items.length === 0 && (
                    <EmptyHint>Brak leadów w tym widoku</EmptyHint>
                )}
                {(leadPage?.items ?? []).map((item) => {
                    const colors = LEAD_STATUS_COLORS[item.status];
                    return (
                        <Row key={item.id} $active={item.id === selectedLeadId} onClick={() => selectLead(item.id)}>
                            <span className="who">
                                <SourceIcon source={item.source} />
                                <span>
                                    {item.customerName ?? item.contactIdentifier}
                                    {item.customerName && <div className="sub">{item.contactIdentifier}</div>}
                                </span>
                            </span>
                            <span>{item.categoryLabel ?? '—'}</span>
                            <span className="value">
                                {item.estimatedValue > 0 ? formatGrosze(item.estimatedValue) : '—'}
                            </span>
                            <span>
                                <Pill $bg={colors.bg} $fg={colors.fg}>{LEAD_STATUS_LABELS[item.status]}</Pill>
                            </span>
                            <span>{formatRelativeTime(item.createdAt)}</span>
                        </Row>
                    );
                })}
            </Table>

            {lead && (
                <>
                    <DrawerOverlay onClick={() => selectLead(null)} />
                    <Drawer>
                        <DrawerHeader>
                            <div>
                                <h3>{lead.customerName ?? lead.contactIdentifier}</h3>
                                <div className="sub">
                                    <SourceIcon source={lead.source} />
                                    {lead.contactIdentifier}
                                    {lead.threadId && (
                                        <Link to={`/communication?thread=${lead.threadId}`}>
                                            <Pill $bg="#eff6ff" $fg="#1d4ed8" style={{ cursor: 'pointer' }}>
                                                Zobacz korespondencję
                                            </Pill>
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <button className="close" onClick={() => selectLead(null)} aria-label="Zamknij">
                                <X size={18} />
                            </button>
                        </DrawerHeader>

                        <DrawerSection>
                            <h4>Status</h4>
                            <StatusGrid>
                                {LEAD_STATUS_FLOW.map((status) => {
                                    const colors = LEAD_STATUS_COLORS[status];
                                    const active = lead.status === status;
                                    return (
                                        <Pill
                                            key={status}
                                            as="button"
                                            $bg={active ? colors.bg : '#ffffff'}
                                            $fg={active ? colors.fg : '#9ca3af'}
                                            style={{
                                                border: `1px solid ${active ? colors.fg : '#e5e7eb'}`,
                                                cursor: 'pointer',
                                                padding: '5px 10px',
                                            }}
                                            onClick={() => !active && requestStatus(lead.id, status)}
                                        >
                                            {active && <Check size={11} />}
                                            {LEAD_STATUS_LABELS[status]}
                                        </Pill>
                                    );
                                })}
                            </StatusGrid>
                            {lead.status === 'LOST' && lead.lostReasonLabel && (
                                <HistoryLine>
                                    Powód przegranej: <strong>{lead.lostReasonLabel}</strong>
                                    {lead.lostReason && <> — {lead.lostReason}</>}
                                </HistoryLine>
                            )}
                        </DrawerSection>

                        <DrawerSection>
                            <h4>Usługi i wycena</h4>
                            {editingServices === null && (
                                <>
                                    {lead.services.length === 0 && (
                                        <HistoryLine>Nie przypisano jeszcze usług.</HistoryLine>
                                    )}
                                    {lead.services.map((item) => (
                                        <ServiceLine key={item.id}>
                                            <span className="grow">
                                                {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                            </span>
                                            <span>{formatGrosze(item.totalGross)}</span>
                                        </ServiceLine>
                                    ))}
                                    {lead.estimatedValue > 0 && (
                                        <TotalLine>
                                            <span>Razem</span>
                                            <span>{formatGrosze(lead.estimatedValue)}</span>
                                        </TotalLine>
                                    )}
                                    <IconButton
                                        style={{ alignSelf: 'flex-start' }}
                                        onClick={() =>
                                            setEditingServices(
                                                lead.services.map((item) => ({
                                                    serviceId: item.serviceId,
                                                    name: item.name,
                                                    priceGross: item.priceGross,
                                                    quantity: item.quantity,
                                                }))
                                            )
                                        }
                                    >
                                        Edytuj usługi
                                    </IconButton>
                                </>
                            )}
                            {editingServices !== null && (
                                <>
                                    {editingServices.map((item, index) => (
                                        <ServiceLine key={`${item.serviceId}-${index}`}>
                                            <span className="grow">{item.name}</span>
                                            <span className="qty">
                                                <button
                                                    aria-label="Mniej"
                                                    onClick={() =>
                                                        setEditingServices(editingServices.map((current, i) =>
                                                            i === index
                                                                ? { ...current, quantity: Math.max(1, current.quantity - 1) }
                                                                : current
                                                        ))
                                                    }
                                                >
                                                    <Minus size={11} />
                                                </button>
                                                {item.quantity}
                                                <button
                                                    aria-label="Więcej"
                                                    onClick={() =>
                                                        setEditingServices(editingServices.map((current, i) =>
                                                            i === index
                                                                ? { ...current, quantity: current.quantity + 1 }
                                                                : current
                                                        ))
                                                    }
                                                >
                                                    <Plus size={11} />
                                                </button>
                                            </span>
                                            <span>{formatGrosze(item.priceGross * item.quantity)}</span>
                                            <button
                                                className="remove"
                                                aria-label="Usuń pozycję"
                                                onClick={() =>
                                                    setEditingServices(editingServices.filter((_, i) => i !== index))
                                                }
                                            >
                                                <X size={13} />
                                            </button>
                                        </ServiceLine>
                                    ))}
                                    <SearchBox style={{ maxWidth: '100%' }}>
                                        <Search size={13} />
                                        <input
                                            placeholder="Dodaj usługę z cennika…"
                                            value={serviceSearch}
                                            onChange={(event) => setServiceSearch(event.target.value)}
                                        />
                                    </SearchBox>
                                    {serviceSearch && (
                                        <div>
                                            {catalog.slice(0, 5).map((service) => (
                                                <ServiceLine key={service.id}>
                                                    <button
                                                        className="grow"
                                                        style={{
                                                            border: 'none', background: 'none', textAlign: 'left',
                                                            cursor: 'pointer', color: '#2563eb', fontSize: 13, padding: '2px 0',
                                                        }}
                                                        onClick={() => {
                                                            setEditingServices([
                                                                ...editingServices,
                                                                {
                                                                    serviceId: service.id,
                                                                    name: service.name,
                                                                    priceGross: service.basePriceGross,
                                                                    quantity: 1,
                                                                },
                                                            ]);
                                                            setServiceSearch('');
                                                        }}
                                                    >
                                                        + {service.name} ({formatGrosze(service.basePriceGross)})
                                                    </button>
                                                </ServiceLine>
                                            ))}
                                        </div>
                                    )}
                                    <TotalLine>
                                        <span>Razem</span>
                                        <span>{formatGrosze(editedTotal)}</span>
                                    </TotalLine>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <PrimaryButton onClick={saveServices} disabled={updateServices.isPending}>
                                            Zapisz
                                        </PrimaryButton>
                                        <IconButton onClick={() => setEditingServices(null)}>Anuluj</IconButton>
                                    </div>
                                </>
                            )}
                        </DrawerSection>

                        {lead.initialMessage && (
                            <DrawerSection>
                                <h4>Pierwsza wiadomość</h4>
                                <HistoryLine>{lead.initialMessage}</HistoryLine>
                            </DrawerSection>
                        )}

                        <DrawerSection>
                            <h4>Historia</h4>
                            {(history ?? []).map((entry, index) => (
                                <HistoryLine key={index}>
                                    {formatDateTime(entry.createdAt)} —{' '}
                                    <strong>{LEAD_STATUS_LABELS[entry.toStatus]}</strong>
                                    {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                                    {entry.changedByName && <> · {entry.changedByName}</>}
                                </HistoryLine>
                            ))}
                        </DrawerSection>
                    </Drawer>
                </>
            )}

            {lostDialogFor && (
                <LostDialog onClick={() => setLostDialogFor(null)}>
                    <LostCard onClick={(event) => event.stopPropagation()}>
                        <h4>Dlaczego przegraliśmy to zapytanie?</h4>
                        {(dictionaries?.lostReasons ?? []).map((reason) => (
                            <ReasonOption
                                key={reason.code}
                                $active={lostReason === reason.code}
                                onClick={() => setLostReason(reason.code)}
                            >
                                {reason.label}
                            </ReasonOption>
                        ))}
                        <textarea
                            placeholder="Notatka (opcjonalnie)"
                            value={lostNote}
                            onChange={(event) => setLostNote(event.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <IconButton onClick={() => setLostDialogFor(null)}>Anuluj</IconButton>
                            <PrimaryButton disabled={!lostReason || changeStatus.isPending} onClick={confirmLost}>
                                Zamknij jako przegrany
                            </PrimaryButton>
                        </div>
                    </LostCard>
                </LostDialog>
            )}
        </Screen>
    );
}
