// src/modules/comms/components/InsightsPanel.tsx
// Kontekst CRM dla otwartej konwersacji: czy znamy ten adres, ile razy klient
// u nas był i ile zostawił, o co pytał wcześniej, jakie ma rezerwacje i leady.
// Panel jest interaktywny: karta klienta prowadzi do jego profilu, nowy kontakt
// można od razu założyć w kartotece, a wcześniejsze rozmowy otwierają się kliknięciem.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
    CalendarClock,
    ChevronRight,
    History,
    Mail,
    Phone,
    UserCheck,
    UserPlus,
    Wallet,
} from 'lucide-react';
import { AddCustomerModal } from '@/modules/customers';
import { useToast } from '@/common/components/Toast';
import { COMMS_INSIGHTS_KEY, useContactInsights } from '../hooks/useComms';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../types';
import { EmptyHint, IconButton, Pill, formatDateTime, formatGrosze, formatRelativeTime } from './shared';

const Panel = styled.aside`
    width: 300px;
    flex-shrink: 0;
    border-left: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
`;

const Section = styled.section`
    padding: 14px 16px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SectionTitle = styled.h4`
    margin: 0;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    display: flex;
    align-items: center;
    gap: 6px;
`;

/** Cała wizytówka znanego klienta jest klikalna — prowadzi do jego profilu. */
const CustomerCardButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        box-shadow: ${p => p.theme.shadows.sm};
    }

    .grow { flex: 1; min-width: 0; }
    .name {
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .hint {
        font-size: 11px;
        color: ${p => p.theme.colors.primary};
        font-weight: ${p => p.theme.fontWeights.medium};
    }
    svg.chev { color: ${p => p.theme.colors.textMuted}; flex-shrink: 0; }
`;

const Muted = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-wrap: anywhere;
`;

/** Dwie liczby, które zmieniają ton odpowiedzi: ile wizyt i ile pieniędzy. */
const ClientStats = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const StatBox = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 10px;

    .value {
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
    }
    .label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: ${p => p.theme.colors.textMuted};
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
`;

const HighlightCard = styled.div<{ $tone: 'green' | 'blue' }>`
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 12px;
    font-size: 13px;
    background: ${({ $tone, theme }) =>
        $tone === 'green' ? theme.colors.successLight : '#eff6ff'};
    color: ${({ $tone, theme }) => ($tone === 'green' ? theme.colors.success : '#1e40af')};
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
`;

const RowCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};

    strong {
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
    span { font-size: 12px; color: ${p => p.theme.colors.textMuted}; }
    p {
        margin: 0;
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/** Wariant klikalny — wcześniejsza rozmowa otwiera się w liście wątków. */
const ClickableRow = styled(RowCard).attrs({ as: 'button' })`
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        background: ${p => p.theme.colors.surfaceHover};
    }
`;

const LeadRow = styled(ClickableRow)`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

interface InsightsPanelProps {
    email: string | null;
    threadId?: string;
    /** Nazwa nadawcy z wątku — podpowiedź przy zakładaniu kartoteki. */
    participantName?: string | null;
    /** Otwiera wskazany wątek w liście — używane przez „wcześniejsze rozmowy". */
    onSelectThread?: (threadId: string) => void;
}

export function InsightsPanel({
    email,
    threadId,
    participantName,
    onSelectThread,
}: InsightsPanelProps) {
    const { data, isLoading } = useContactInsights(email, threadId);
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();

    if (!email) return null;

    const customer = data?.customer ?? null;

    return (
        <Panel>
            <Section>
                <SectionTitle>
                    {customer ? <UserCheck size={13} /> : <UserPlus size={13} />}
                    Klient
                </SectionTitle>
                {isLoading && <Muted>Wczytywanie…</Muted>}

                {customer && (
                    <>
                        <CustomerCardButton
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            title="Otwórz profil klienta"
                        >
                            <div className="grow">
                                <div className="name">{customer.name ?? email}</div>
                                <div className="hint">Otwórz profil klienta</div>
                            </div>
                            <ChevronRight className="chev" size={16} />
                        </CustomerCardButton>
                        <Muted><Mail size={12} /> {email}</Muted>
                        {customer.phone && <Muted><Phone size={12} /> {customer.phone}</Muted>}
                        <ClientStats>
                            <StatBox>
                                <div className="value">{customer.completedVisitCount}</div>
                                <div className="label"><CalendarClock size={10} /> wizyt</div>
                            </StatBox>
                            <StatBox>
                                <div className="value">{formatGrosze(customer.totalSpentGross)}</div>
                                <div className="label"><Wallet size={10} /> wydał u nas</div>
                            </StatBox>
                        </ClientStats>
                    </>
                )}

                {data && !customer && (
                    <>
                        <Muted><Mail size={12} /> {email}</Muted>
                        <div>
                            <Pill $bg="#eff6ff" $fg="#1d4ed8">Nowy kontakt</Pill>
                        </div>
                        <IconButton
                            style={{ alignSelf: 'flex-start' }}
                            onClick={() => setAddCustomerOpen(true)}
                        >
                            <UserPlus /> Dodaj do kartoteki
                        </IconButton>
                    </>
                )}
            </Section>

            {data && data.upcomingAppointments.length > 0 && (
                <Section>
                    <SectionTitle><CalendarClock size={13} /> Nadchodzące rezerwacje</SectionTitle>
                    {data.upcomingAppointments.map((appointment) => (
                        <HighlightCard key={appointment.id} $tone="green">
                            <strong>{appointment.title ?? 'Rezerwacja'}</strong>
                            {formatDateTime(appointment.startDateTime)}
                        </HighlightCard>
                    ))}
                </Section>
            )}

            {data && data.leads.length > 0 && (
                <Section>
                    <SectionTitle>Leady</SectionTitle>
                    {data.leads.map((lead) => {
                        const colors = LEAD_STATUS_COLORS[lead.status];
                        return (
                            <LeadRow
                                key={lead.id}
                                onClick={() => navigate(`/leads?lead=${lead.id}`)}
                                title="Otwórz lead"
                            >
                                <div>
                                    <strong>{formatGrosze(lead.estimatedValue)}</strong>
                                    <span> · {formatRelativeTime(lead.createdAt)}</span>
                                </div>
                                <Pill $bg={colors.bg} $fg={colors.fg}>
                                    {LEAD_STATUS_LABELS[lead.status]}
                                </Pill>
                            </LeadRow>
                        );
                    })}
                </Section>
            )}

            {data && (
                <Section>
                    <SectionTitle><History size={13} /> Wcześniejsze rozmowy</SectionTitle>
                    {data.previousThreads.length === 0 && (
                        <EmptyHint>To pierwsza rozmowa z tym adresem</EmptyHint>
                    )}
                    {data.previousThreads.map((thread) => (
                        <ClickableRow
                            key={thread.id}
                            onClick={() => onSelectThread?.(thread.id)}
                            title="Otwórz tę rozmowę"
                        >
                            <strong>{thread.subject ?? '(bez tematu)'}</strong>
                            {thread.snippet && <p>{thread.snippet}</p>}
                            <span>{formatRelativeTime(thread.lastMessageAt)}</span>
                        </ClickableRow>
                    ))}
                </Section>
            )}

            {data && data.pastAppointments.length > 0 && (
                <Section>
                    <SectionTitle>Poprzednie wizyty</SectionTitle>
                    {data.pastAppointments.map((appointment) => (
                        <RowCard key={appointment.id}>
                            <strong>{appointment.title ?? 'Wizyta'}</strong>
                            <span>{formatDateTime(appointment.startDateTime)}</span>
                        </RowCard>
                    ))}
                </Section>
            )}

            <AddCustomerModal
                isOpen={addCustomerOpen}
                onClose={() => setAddCustomerOpen(false)}
                onSuccess={() => {
                    setAddCustomerOpen(false);
                    // Panel natychmiast pokazuje klienta z kartoteki zamiast „nowy kontakt".
                    queryClient.invalidateQueries({ queryKey: COMMS_INSIGHTS_KEY });
                    showSuccess('Klient dodany do kartoteki');
                }}
                initialValues={{
                    email,
                    // Nazwa z nagłówka maila jako podpowiedź — użytkownik i tak ją potwierdza.
                    firstName: participantName?.trim().split(/\s+/)[0],
                    lastName: participantName?.trim().split(/\s+/).slice(1).join(' ') || undefined,
                }}
            />
        </Panel>
    );
}
