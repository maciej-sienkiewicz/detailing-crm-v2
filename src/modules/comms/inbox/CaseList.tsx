// src/modules/comms/inbox/CaseList.tsx
// Lista spraw w zakładce „Sprawy" - wiersze z makiety „Jak czytać listę":
//
//   ● Audi RS6                    27 godz.   ← kropka: czeka na nas; czerwień: po progu
//     Nowe zapytanie                         ← zdanie, nie status; „Odpisał na wycenę"
//                                              w kolorze akcentu - to warto otworzyć pierwsze
//
// „Czeka na nas" stoi rozwinięte, najdłużej czekające na górze. „Ucichło" i „U klienta"
// to zwinięte wiersze z licznikiem - praca, której dziś nie trzeba robić, nie zajmuje
// ekranu, ale nie znika (jedno kliknięcie i jest).
import { Fragment, useState } from 'react';
import styled, { css } from 'styled-components';
import { ChevronDown, ChevronRight, CircleDot, Trash2, X } from 'lucide-react';
import { ChoiceModal, ConfirmationModal } from '@/common/components/ConfirmationModal';
import type { LeadStatus } from '../types';
import { useBulkChangeLeadStatus, useBulkDeleteLeads } from '../hooks/useLeads';
import { LeadStatusPicker } from '../components/LeadStatusPicker';
import { LeadLostReasonDialog } from '../components/LeadLostReasonDialog';
import type { Worklist, WorklistEntry, WorklistSection } from '../utils/leadWorklist';
import { caseSentence, caseTitle, rowAge } from './caseModel';
import { ix } from './tokens';

const Scroll = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: ${p => (p.$phone ? '0 0 16px' : '0 6px 12px')};
`;

const SectionTitle = styled.h2<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: ${p => (p.$phone ? '20px 20px 4px' : '14px 14px 4px')};
    font-size: ${p => (p.$phone ? 14 : 13)}px;
    font-weight: 600;
    color: ${ix.ink};

    span { font-weight: 500; color: ${ix.muted}; }
`;

const Row = styled.button<{ $phone: boolean; $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: ${p => (p.$phone ? 2 : 1)}px;
    width: 100%;
    padding: ${p => (p.$phone ? '14px 20px' : '9px 14px')};
    border: none;
    border-radius: ${p => (p.$phone ? 0 : 10)}px;
    background: ${p => (p.$active ? ix.surfaceAlt : 'transparent')};
    color: ${ix.ink};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => (p.$active ? ix.surfaceAlt : ix.surfaceSoft)}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: -2px; }

    .top { display: flex; align-items: center; gap: 10px; }
    .dot { flex: none; width: 8px; height: 8px; border-radius: 999px; background: ${ix.accent}; }
    .nodot { flex: none; width: 8px; }
    .name {
        flex: 1;
        min-width: 0;
        font-size: ${p => (p.$phone ? 16 : 14)}px;
        line-height: ${p => (p.$phone ? 22 : 20)}px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .quiet { font-weight: 500; color: ${ix.text2}; }
    .age {
        flex: none;
        font-size: ${p => (p.$phone ? 13 : 12)}px;
        color: ${ix.muted};
        font-variant-numeric: tabular-nums;
    }
    .late { color: ${ix.late}; font-weight: 600; }
    .sub {
        padding-left: 18px;
        font-size: ${p => (p.$phone ? 14 : 13)}px;
        line-height: ${p => (p.$phone ? 20 : 18)}px;
        color: ${ix.text2};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .hot { font-weight: 600; color: ${ix.accentInk}; }
    input { flex: none; width: 16px; height: 16px; margin: 0; accent-color: ${ix.accentInk}; }
`;

const Fold = styled.button<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: ${p => (p.$phone ? 'calc(100% - 24px)' : 'calc(100% - 12px)')};
    margin: 4px ${p => (p.$phone ? 12 : 6)}px 0;
    padding: ${p => (p.$phone ? '14px 8px' : '10px 14px')};
    border: none;
    border-radius: 10px;
    background: transparent;
    font-family: inherit;
    font-size: ${p => (p.$phone ? 14 : 13)}px;
    font-weight: 600;
    color: ${ix.ink};
    text-align: left;
    cursor: pointer;

    .count { font-weight: 500; color: ${ix.muted}; }
    svg { margin-left: auto; width: 16px; height: 16px; color: ${ix.muted}; }
    &:hover { background: ${ix.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: -2px; }
`;

const Empty = styled.p`
    margin: 24px 20px;
    font-size: 14px;
    line-height: 1.5;
    color: ${ix.muted};
`;

const BulkBar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid ${ix.line};
    background: #ffffff;

    .count { flex: 1 1 auto; font-size: 13px; font-weight: 600; color: ${ix.ink}; }
`;

const BulkBtn = styled.button<{ $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid ${p => (p.$danger ? '#fecaca' : ix.line)};
    border-radius: 999px;
    background: ${p => (p.$danger ? '#fef2f2' : '#ffffff')};
    color: ${p => (p.$danger ? ix.late : ix.inkSoft)};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    svg { width: 15px; height: 15px; }
    &:disabled { opacity: 0.5; cursor: default; }
    ${p => p.$danger && css`&:hover:not(:disabled) { background: #fee2e2; }`}
`;

interface CaseListProps {
    worklist: Worklist;
    query: string;
    loading: boolean;
    truncated: boolean;
    activeId: string | null;
    onOpen: (leadId: string) => void;
    phone: boolean;
    selecting: boolean;
    onStopSelecting: () => void;
}

const matches = (entry: WorklistEntry, needle: string): boolean =>
    [entry.lead.customerName, entry.lead.contactIdentifier, entry.lead.vehicleBrand, entry.lead.vehicleModel, ...entry.lead.tagLabels]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));

export function CaseList({ worklist, query, loading, truncated, activeId, onOpen, phone, selecting, onStopSelecting }: CaseListProps) {
    const [open, setOpen] = useState<{ SILENT: boolean; CLIENT: boolean }>({ SILENT: false, CLIENT: false });
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    const [confirm, setConfirm] = useState<null | 'delete' | 'appointments' | 'lost'>(null);
    const bulkDelete = useBulkDeleteLeads();
    const bulkStatus = useBulkChangeLeadStatus();

    const needle = query.trim().toLowerCase();
    const filter = (section: WorklistSection) => (needle ? section.entries.filter((entry) => matches(entry, needle)) : section.entries);
    const ours = filter(worklist.ours);
    const silent = filter(worklist.silent);
    const client = filter(worklist.client);
    // Przy szukaniu sekcje rozwijają się same: szukający „Kowalskiego" nie wie, gdzie on jest.
    const silentOpen = open.SILENT || Boolean(needle);
    const clientOpen = open.CLIENT || Boolean(needle);

    const ordered = [...ours, ...silent, ...client].map((entry) => entry.lead.id).filter((id) => selected.has(id));
    const withAppointment = [...ours, ...silent, ...client].filter((entry) => selected.has(entry.lead.id) && entry.lead.appointmentId).length;

    const stop = () => {
        setSelected(new Set());
        onStopSelecting();
    };
    const toggle = (id: string) =>
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const runDelete = (deleteAppointments: boolean) => {
        setConfirm(null);
        if (ordered.length === 0) return;
        bulkDelete.mutate({ ids: ordered, deleteAppointments }, { onSettled: stop });
    };
    const runStatus = (status: LeadStatus, lostReasonCode?: string, lostNote?: string) => {
        if (ordered.length === 0) return;
        bulkStatus.mutate({ ids: ordered, status, lostReasonCode, lostNote }, { onSettled: () => { setConfirm(null); stop(); } });
    };

    const row = ({ lead, urgency }: WorklistEntry, waiting: boolean) => {
        const sentence = caseSentence(lead, urgency);
        const title = caseTitle(lead);
        return (
            <Row
                key={lead.id}
                // W trybie zaznaczania wiersz jest etykietą pola wyboru - pole w przycisku
                // byłoby elementem interaktywnym w interaktywnym.
                as={selecting ? 'label' : undefined}
                type={selecting ? undefined : 'button'}
                $phone={phone}
                $active={lead.id === activeId && !selecting}
                aria-current={lead.id === activeId ? 'true' : undefined}
                onClick={selecting ? undefined : () => onOpen(lead.id)}
            >
                <span className="top">
                    {selecting ? (
                        <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => toggle(lead.id)}
                            aria-label={`Zaznacz ${title}`}
                        />
                    ) : waiting ? (
                        <span className="dot" aria-hidden="true" />
                    ) : (
                        <span className="nodot" aria-hidden="true" />
                    )}
                    <span className={`name${waiting ? '' : ' quiet'}`}>{title}</span>
                    <span className={`age${urgency.overdue && waiting ? ' late' : ''}`} title={urgency.title}>
                        {rowAge(urgency.waitingMs)}
                    </span>
                </span>
                <span className={`sub${sentence.hot ? ' hot' : ''}`}>{sentence.text}</span>
            </Row>
        );
    };

    const fold = (key: 'SILENT' | 'CLIENT', title: string, entries: WorklistEntry[], isOpen: boolean) =>
        entries.length > 0 && (
            <Fragment key={key}>
                <Fold
                    type="button"
                    $phone={phone}
                    aria-expanded={isOpen}
                    style={key === 'SILENT' ? { marginTop: 12 } : undefined}
                    onClick={() => setOpen((current) => ({ ...current, [key]: !current[key] }))}
                >
                    {title} <span className="count">{entries.length}</span>
                    {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                </Fold>
                {isOpen && entries.map((entry) => row(entry, false))}
            </Fragment>
        );

    const nothing = !loading && ours.length + silent.length + client.length === 0;

    return (
        <>
            <Scroll $phone={phone}>
                {(ours.length > 0 || !needle) && (
                    <SectionTitle $phone={phone}>
                        Czeka na nas <span>{ours.length}</span>
                    </SectionTitle>
                )}
                {ours.map((entry) => row(entry, true))}
                {ours.length === 0 && !needle && !loading && (
                    <Empty>Nikt nie czeka na odpowiedź. Nowe zapytania pojawią się tutaj same.</Empty>
                )}
                {fold('SILENT', 'Ucichło', silent, silentOpen)}
                {fold('CLIENT', 'U klienta', client, clientOpen)}
                {nothing && needle && <Empty>Nic nie pasuje do „{query.trim()}".</Empty>}
                {truncated && (
                    <Empty>Otwartych spraw jest więcej, niż mieści jedna strona. Zamknij część zapytań, żeby zobaczyć resztę.</Empty>
                )}
            </Scroll>

            {selecting && (
                <BulkBar>
                    <span className="count">{selected.size === 0 ? 'Zaznacz sprawy' : `Zaznaczono ${selected.size}`}</span>
                    <LeadStatusPicker
                        onChange={(status) => (status === 'LOST' ? setConfirm('lost') : runStatus(status))}
                        disabled={selected.size === 0 || bulkStatus.isPending}
                        renderTrigger={({ open: menuOpen, toggle: toggleMenu, disabled }) => (
                            <BulkBtn type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={menuOpen} onClick={toggleMenu}>
                                <CircleDot /> {bulkStatus.isPending ? 'Zmieniam…' : 'Zmień status'}
                            </BulkBtn>
                        )}
                    />
                    <BulkBtn
                        type="button"
                        $danger
                        disabled={selected.size === 0 || bulkDelete.isPending}
                        onClick={() => setConfirm(withAppointment > 0 ? 'appointments' : 'delete')}
                    >
                        <Trash2 /> {bulkDelete.isPending ? 'Usuwanie…' : 'Usuń'}
                    </BulkBtn>
                    <BulkBtn type="button" onClick={stop} aria-label="Zakończ zaznaczanie">
                        <X />
                    </BulkBtn>
                </BulkBar>
            )}

            <ConfirmationModal
                isOpen={confirm === 'delete'}
                title={selected.size === 1 ? 'Usunąć zaznaczoną sprawę?' : `Usunąć ${selected.size} zaznaczonych spraw?`}
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={() => runDelete(false)}
                onCancel={() => setConfirm(null)}
            />
            <ChoiceModal
                isOpen={confirm === 'appointments'}
                title="Co zrobić z rezerwacjami?"
                message={`Zaznaczone sprawy z rezerwacją w kalendarzu: ${withAppointment}. Możesz usunąć rezerwacje razem ze sprawami albo zostawić je jako samodzielne terminy.`}
                variant="danger"
                primaryText="Usuń też rezerwacje"
                onPrimary={() => runDelete(true)}
                secondaryText="Zostaw terminy"
                onSecondary={() => runDelete(false)}
                onDismiss={() => setConfirm(null)}
            />
            {confirm === 'lost' && (
                <LeadLostReasonDialog
                    bulk={{ count: ordered.length, pending: bulkStatus.isPending, onSubmit: (reason, note) => runStatus('LOST', reason, note) }}
                    onClose={() => setConfirm(null)}
                />
            )}
        </>
    );
}
