import { useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import {
    Container, Toolbar, AddButton, StatsRow, StatText, Card, ColLabel,
    Badge, Dot, EmptyWrap, EmptyTitle, EmptyDesc, SkeletonBox,
} from './rbacShared.styles';
import { useTablets, useDeleteTablet, TABLETS_KEY } from '../hooks/useTablets';
import { useTabletsSocket } from '../hooks/useTabletsSocket';
import { TabletPairingModal } from './tablets/TabletPairingModal';
import type { TabletSocketEvent } from '../tabletTypes';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function tokenStatus(tokenExpiresAt: string): 'active' | 'expiring' {
    const daysLeft = (new Date(tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft < 7 ? 'expiring' : 'active';
}

export function TabletsSection() {
    const { tablets, isLoading } = useTablets();
    const deleteTablet = useDeleteTablet();
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();

    const [pairingOpen, setPairingOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useTabletsSocket({
        onPaired: (_event: TabletSocketEvent) => {
            setPairingOpen(false);
            queryClient.invalidateQueries({ queryKey: TABLETS_KEY });
        },
        onRevoked: (_event: TabletSocketEvent) => {
            queryClient.invalidateQueries({ queryKey: TABLETS_KEY });
        },
    });

    const handleDelete = (tabletId: string) => {
        deleteTablet.mutate(tabletId, {
            onSuccess: () => {
                showSuccess('Tablet usunięty', 'Urządzenie zostało odłączone i unieważnione.');
                setConfirmDeleteId(null);
            },
        });
    };

    return (
        <Container>
            <Toolbar>
                <div style={{ flex: 1 }} />
                <AddButton onClick={() => setPairingOpen(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj tablet
                </AddButton>
            </Toolbar>

            <StatsRow>
                {!isLoading && (
                    <StatText>
                        <strong>{tablets.length}</strong> {tablets.length === 1 ? 'tablet' : 'tablety/ów'}
                    </StatText>
                )}
            </StatsRow>

            <Card>
                <ListHeader>
                    <ColLabel>Urządzenie</ColLabel>
                    <ColLabel>Sparowano</ColLabel>
                    <ColLabel>Token wygasa</ColLabel>
                    <ColLabel />
                </ListHeader>

                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonRow key={i}>
                            <SkeletonBox $w={`${50 + (i % 2) * 20}%`} />
                            <SkeletonBox $w="80px" />
                            <SkeletonBox $w="80px" />
                            <SkeletonBox $w="60px" />
                        </SkeletonRow>
                    ))
                ) : tablets.length === 0 ? (
                    <EmptyWrap>
                        <TabletEmptyIcon />
                        <EmptyTitle>Brak sparowanych tabletów</EmptyTitle>
                        <EmptyDesc>
                            Kliknij „Dodaj tablet", aby wygenerować kod parowania i podłączyć urządzenie.
                        </EmptyDesc>
                    </EmptyWrap>
                ) : (
                    tablets.map(tablet => {
                        const status = tokenStatus(tablet.tokenExpiresAt);
                        const isConfirming = confirmDeleteId === tablet.tabletId;
                        const isDeleting = deleteTablet.isPending && confirmDeleteId === tablet.tabletId;

                        return (
                            <Row key={tablet.tabletId}>
                                <NameCell>
                                    <TabletIcon />
                                    <strong>{tablet.deviceName}</strong>
                                </NameCell>
                                <DateCell>{formatDate(tablet.pairedAt)}</DateCell>
                                <div>
                                    {status === 'active'
                                        ? <Badge $variant="green"><Dot $color="#059669" />{formatDate(tablet.tokenExpiresAt)}</Badge>
                                        : <Badge $variant="amber"><Dot $color="#d97706" />Wygasa {formatDate(tablet.tokenExpiresAt)}</Badge>
                                    }
                                </div>
                                <ActionsCell>
                                    {isConfirming ? (
                                        <ConfirmRow>
                                            <ConfirmText>Na pewno?</ConfirmText>
                                            <DangerSmallBtn
                                                onClick={() => handleDelete(tablet.tabletId)}
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? '…' : 'Usuń'}
                                            </DangerSmallBtn>
                                            <CancelSmallBtn onClick={() => setConfirmDeleteId(null)}>
                                                Anuluj
                                            </CancelSmallBtn>
                                        </ConfirmRow>
                                    ) : (
                                        <DeleteBtn
                                            onClick={() => setConfirmDeleteId(tablet.tabletId)}
                                            title="Usuń tablet"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                <path d="M10 11v6M14 11v6" />
                                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                            </svg>
                                            Usuń
                                        </DeleteBtn>
                                    )}
                                </ActionsCell>
                            </Row>
                        );
                    })
                )}
            </Card>

            {pairingOpen && (
                <TabletPairingModal onClose={() => setPairingOpen(false)} />
            )}
        </Container>
    );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function TabletIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
    );
}

function TabletEmptyIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const GRID = '1fr 130px 180px 160px';

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafbfc;
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }
`;

const NameCell = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    strong { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const DateCell = styled.div`
    font-size: 12px;
    color: #475569;
`;

const ActionsCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
`;

const DeleteBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    font-size: 12px;
    font-weight: 500;
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms;

    &:hover { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.3); color: #dc2626; }
`;

const ConfirmRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ConfirmText = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    white-space: nowrap;
`;

const DangerSmallBtn = styled.button`
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 700;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms;
    &:hover:not(:disabled) { opacity: 0.85; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const CancelSmallBtn = styled.button`
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    background: white;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
    &:hover { background: #f8fafc; }
`;
