// src/modules/comms/components/InsightsPanel.tsx
// Kontekst CRM dla otwartej konwersacji: czy znamy ten adres, ile razy klient
// u nas był i ile zostawił, o co pytał wcześniej, jakie ma rezerwacje i leady.
// Panel jest sterowany z zewnątrz (chowany na mniejszych ekranach).
import styled from 'styled-components';
import { CalendarClock, History, Mail, Phone, UserCheck, UserPlus, Wallet } from 'lucide-react';
import { useContactInsights } from '../hooks/useComms';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../types';
import { EmptyHint, Pill, formatDateTime, formatGrosze, formatRelativeTime } from './shared';

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

const CustomerName = styled.div`
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

const Muted = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 6px;
`;

/** Dwie liczby, które zmieniają ton odpowiedzi: ile wizyt i ile pieniędzy. */
const ClientStats = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
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

const ThreadRow = styled.div`
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

const LeadRow = styled(ThreadRow)`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

interface InsightsPanelProps {
    email: string | null;
    threadId?: string;
}

export function InsightsPanel({ email, threadId }: InsightsPanelProps) {
    const { data, isLoading } = useContactInsights(email, threadId);

    if (!email) return null;

    return (
        <Panel>
            <Section>
                <SectionTitle>
                    {data?.customer ? <UserCheck size={13} /> : <UserPlus size={13} />}
                    Kontakt
                </SectionTitle>
                {isLoading && <Muted>Wczytywanie…</Muted>}
                {data && data.customer && (
                    <>
                        <CustomerName>{data.customer.name ?? email}</CustomerName>
                        <Muted><Mail size={12} /> {email}</Muted>
                        {data.customer.phone && (
                            <Muted><Phone size={12} /> {data.customer.phone}</Muted>
                        )}
                        <ClientStats>
                            <StatBox>
                                <div className="value">{data.customer.completedVisitCount}</div>
                                <div className="label"><CalendarClock size={10} /> wizyt</div>
                            </StatBox>
                            <StatBox>
                                <div className="value">{formatGrosze(data.customer.totalSpentGross)}</div>
                                <div className="label"><Wallet size={10} /> wydał u nas</div>
                            </StatBox>
                        </ClientStats>
                    </>
                )}
                {data && !data.customer && (
                    <>
                        <CustomerName>{email}</CustomerName>
                        <div>
                            <Pill $bg="#eff6ff" $fg="#1d4ed8">Nowy kontakt</Pill>
                        </div>
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
                            <LeadRow key={lead.id}>
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
                        <ThreadRow key={thread.id}>
                            <strong>{thread.subject ?? '(bez tematu)'}</strong>
                            {thread.snippet && <p>{thread.snippet}</p>}
                            <span>{formatRelativeTime(thread.lastMessageAt)}</span>
                        </ThreadRow>
                    ))}
                </Section>
            )}

            {data && data.pastAppointments.length > 0 && (
                <Section>
                    <SectionTitle>Poprzednie wizyty</SectionTitle>
                    {data.pastAppointments.map((appointment) => (
                        <ThreadRow key={appointment.id}>
                            <strong>{appointment.title ?? 'Wizyta'}</strong>
                            <span>{formatDateTime(appointment.startDateTime)}</span>
                        </ThreadRow>
                    ))}
                </Section>
            )}
        </Panel>
    );
}
