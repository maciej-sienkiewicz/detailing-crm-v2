// src/modules/comms/components/InsightsPanel.tsx
// Kontekst CRM dla otwartej konwersacji: czy znamy ten adres, o co pytał wcześniej,
// jakie ma rezerwacje i leady. Wypełnia się sam — zero klikania.
import styled from 'styled-components';
import { CalendarClock, History, Mail, Phone, UserCheck, UserPlus } from 'lucide-react';
import { useContactInsights } from '../hooks/useComms';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../types';
import { EmptyHint, Pill, formatDateTime, formatGrosze, formatRelativeTime } from './shared';

const Panel = styled.aside`
    width: 300px;
    flex-shrink: 0;
    border-left: 1px solid #e5e7eb;
    background: #fafafa;
    overflow-y: auto;
    display: flex;
    flex-direction: column;

    @media (max-width: 1200px) { display: none; }
`;

const Section = styled.section`
    padding: 14px 16px;
    border-bottom: 1px solid #eef0f2;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SectionTitle = styled.h4`
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #9ca3af;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const CustomerName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #111827;
`;

const Muted = styled.div`
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const HighlightCard = styled.div<{ $tone: 'green' | 'blue' }>`
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    background: ${({ $tone }) => ($tone === 'green' ? '#f0fdf4' : '#eff6ff')};
    color: ${({ $tone }) => ($tone === 'green' ? '#166534' : '#1e40af')};
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ThreadRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: #ffffff;
    border: 1px solid #eef0f2;
    border-radius: 8px;

    strong { font-size: 12px; color: #374151; font-weight: 600; }
    span { font-size: 12px; color: #9ca3af; }
    p { margin: 0; font-size: 12px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
                        <Pill $bg="#f0fdf4" $fg="#15803d">Znany klient</Pill>
                    </>
                )}
                {data && !data.customer && (
                    <>
                        <CustomerName>{email}</CustomerName>
                        <Pill $bg="#eff6ff" $fg="#1d4ed8">Nowy kontakt</Pill>
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
