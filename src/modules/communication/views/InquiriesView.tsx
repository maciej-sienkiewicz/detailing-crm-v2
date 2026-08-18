// src/modules/communication/views/InquiriesView.tsx
// Główny ekran "Zapytania": topbar [Tablica|Lista] + wyszukiwarka + badge
// "Do przejrzenia"; kanban 5 kolumn / lista; stan w URL (?widok=&lead=);
// drawer szczegółów z prawej strony.
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import type { LeadStage } from '../types';
import { useLeadCards, useMailAccounts, useReviewQueue, useStageChange } from '../hooks';
import { vehicleTitle } from '../utils/format';
import { KanbanBoard } from '../components/KanbanBoard';
import { LeadDrawer } from '../components/LeadDrawer';
import { LeadListTable } from '../components/LeadListTable';
import { ReviewQueueDrawer } from '../components/ReviewQueueDrawer';

const Screen = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #fafafa;
`;

const Topbar = styled.div`
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 16px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
`;

const ViewToggle = styled.div`
    display: inline-flex;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: ${({ $active }) => ($active ? '#f3f4f6' : '#ffffff')};
    color: ${({ $active }) => ($active ? '#1a1a1a' : '#6b7280')};
`;

const SearchInput = styled.input`
    height: 32px;
    width: 240px;
    padding: 0 10px;
    font-size: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

const ReviewButton = styled.button`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
        background: #f8fafc;
    }
`;

const Badge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 11px;
    font-weight: 600;
    color: #ffffff;
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 9px;
    font-variant-numeric: tabular-nums;
`;

const WarningBar = styled.div`
    position: sticky;
    top: 56px;
    z-index: 35;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
    color: #78350f;
    background: #fffbeb;
    border-bottom: 1px solid #fde68a;
`;

const ErrorBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
    color: #7f1d1d;
    background: #fef2f2;
    border-bottom: 1px solid #fecaca;
`;

const BarLink = styled(Link)`
    font-weight: 600;
    color: inherit;
`;

const Master = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 96px 16px;
    text-align: center;
`;

const EmptySentence = styled.p`
    margin: 0;
    font-size: 14px;
    color: #6b7280;
`;

const ConnectButton = styled(Link)`
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 6px;
    text-decoration: none;
`;

const SkeletonBoard = styled.div`
    display: flex;
    gap: 12px;
    padding: 16px;
`;

const SkeletonColumn = styled.div`
    flex: 1;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SkeletonCard = styled.div`
    height: 92px;
    border-radius: 8px;
    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
    background-size: 200% 100%;
    animation: comm-shimmer 1.2s ease-out 1;

    @keyframes comm-shimmer {
        from { background-position: 200% 0; }
        to { background-position: -200% 0; }
    }
`;

export const InquiriesView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get('widok') === 'lista' ? 'lista' : 'tablica';
    const leadParam = searchParams.get('lead');
    const openLeadId = leadParam || null;

    const [query, setQuery] = useState('');
    const [reviewOpen, setReviewOpen] = useState(false);

    const leadsQuery = useLeadCards();
    const stageMutation = useStageChange();
    const reviewQueue = useReviewQueue();
    const mailAccounts = useMailAccounts();

    const setView = useCallback((next: 'tablica' | 'lista') => {
        setSearchParams((params) => {
            params.set('widok', next);
            return params;
        }, { replace: true });
    }, [setSearchParams]);

    const openLead = useCallback((id: string) => {
        setSearchParams((params) => {
            params.set('lead', String(id));
            return params;
        });
    }, [setSearchParams]);

    const closeLead = useCallback(() => {
        setSearchParams((params) => {
            params.delete('lead');
            return params;
        });
    }, [setSearchParams]);

    const allLeads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

    const filteredLeads = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allLeads;
        return allLeads.filter((lead) =>
            vehicleTitle(lead).toLowerCase().includes(q)
            || (lead.customerName ?? '').toLowerCase().includes(q)
            || lead.contactIdentifier.toLowerCase().includes(q)
            || lead.services.some((s) => s.toLowerCase().includes(q)));
    }, [allLeads, query]);

    // Tablica pokazuje pełen cykl życia — każdy status ma swoją kolumnę.
    const boardLeads = filteredLeads;

    const reviewCount = reviewQueue.data?.length ?? 0;
    const failedAccount = mailAccounts.data?.find((a) => a.status === 'AUTH_FAILED');

    const firstLoad = leadsQuery.isLoading && !leadsQuery.data;
    const showEmpty = !firstLoad && !leadsQuery.isError && allLeads.length === 0;
    const showNetworkError = leadsQuery.isError;

    const handleStageChange = (leadId: string, stage: LeadStage, reason?: string) => {
        stageMutation.mutate({ id: leadId, stage, reason });
    };

    return (
        <Screen>
            <Topbar>
                <Title>Zapytania</Title>
                <ViewToggle role="tablist" aria-label="Widok">
                    <ToggleButton $active={view === 'tablica'} onClick={() => setView('tablica')}>
                        Tablica
                    </ToggleButton>
                    <ToggleButton $active={view === 'lista'} onClick={() => setView('lista')}>
                        Lista
                    </ToggleButton>
                </ViewToggle>
                <SearchInput
                    type="search"
                    placeholder="Szukaj: auto, klient, usługa…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <ReviewButton onClick={() => setReviewOpen(true)}>
                    Do przejrzenia
                    {reviewCount > 0 && <Badge>{reviewCount}</Badge>}
                </ReviewButton>
            </Topbar>

            {failedAccount && (
                <WarningBar>
                    Utraciliśmy połączenie ze skrzynką {failedAccount.emailAddress} ·{' '}
                    <BarLink to="/communication/mailboxes">Połącz ponownie</BarLink>
                </WarningBar>
            )}

            {showNetworkError && (
                <ErrorBar>
                    {allLeads.length > 0
                        ? 'Brak połączenia — pokazuję ostatni znany stan.'
                        : 'Nie udało się pobrać zapytań. Sprawdź połączenie z internetem i odśwież stronę.'}
                </ErrorBar>
            )}

            <Master>
                {firstLoad && (
                    <SkeletonBoard aria-hidden>
                        {[0, 1, 2].map((col) => (
                            <SkeletonColumn key={col}>
                                {[0, 1, 2].map((row) => <SkeletonCard key={row} />)}
                            </SkeletonColumn>
                        ))}
                    </SkeletonBoard>
                )}

                {showEmpty && (
                    <EmptyState>
                        <EmptySentence>
                            Podłącz skrzynkę — zapytania z maila pojawią się tutaj same.
                        </EmptySentence>
                        <ConnectButton to="/communication/mailboxes">Podłącz skrzynkę</ConnectButton>
                    </EmptyState>
                )}

                {!firstLoad && !showEmpty && allLeads.length > 0 && (
                    view === 'tablica'
                        ? (
                            <KanbanBoard
                                leads={boardLeads}
                                onOpenLead={openLead}
                                onStageChange={handleStageChange}
                            />
                        )
                        : (
                            <LeadListTable
                                leads={filteredLeads}
                                onOpenLead={openLead}
                                onStageChange={(leadId, stage) => handleStageChange(leadId, stage)}
                            />
                        )
                )}
            </Master>

            {openLeadId && (
                <LeadDrawer leadId={openLeadId} onClose={closeLead} />
            )}

            {reviewOpen && <ReviewQueueDrawer onClose={() => setReviewOpen(false)} />}
        </Screen>
    );
};

export default InquiriesView;
