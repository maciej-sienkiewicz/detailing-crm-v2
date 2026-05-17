import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useVehicleComments } from '../hooks/useVehicleComments';
import { formatDate, formatDateTime } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { VehicleComment, VehicleCommentType } from '../types';

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
`;

const EmptyBox = styled.div`
    padding: 32px 20px;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const List = styled.div`
    display: flex;
    flex-direction: column;
`;

const Item = styled.div`
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    flex-direction: column;
    gap: 6px;

    &:last-child {
        border-bottom: none;
    }
`;

const ItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const TypeBadge = styled.span<{ $type: VehicleCommentType }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    ${({ $type }) =>
        $type === 'INTERNAL'
            ? `background: rgba(245,158,11,0.10); color: #b45309; border: 1px solid rgba(245,158,11,0.25);`
            : `background: rgba(14,165,233,0.10); color: #0369a1; border: 1px solid rgba(14,165,233,0.25);`}
`;

const Author = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const Timestamp = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    margin-left: auto;
`;

const Content = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const VisitLink = styled.button`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: ${st.textMuted};
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    transition: color 150ms;

    &:hover {
        color: #0ea5e9;

        span { color: #0ea5e9; }
    }

    svg {
        flex-shrink: 0;
    }
`;

const VisitName = styled.span`
    font-weight: 500;
    color: ${st.textSecondary};
    transition: color 150ms;
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    border-top: 1px solid ${st.border};
    background: ${st.bg};
`;

const PageInfo = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
`;

const PageButtons = styled.div`
    display: flex;
    gap: 6px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    padding: 4px 10px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${p => p.$active ? '#0ea5e9' : st.border};
    background: ${p => p.$active ? 'rgba(14,165,233,0.08)' : st.bgCard};
    color: ${p => p.$active ? '#0369a1' : st.textSecondary};
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, color 150ms;

    &:hover:not(:disabled) {
        background: rgba(14,165,233,0.08);
        border-color: #0ea5e9;
        color: #0369a1;
    }
    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const SkeletonItem = styled.div`
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    flex-direction: column;
    gap: 8px;

    &:last-child { border-bottom: none; }
`;

const SkeletonLine = styled.div<{ $w?: string; $h?: string }>`
    height: ${p => p.$h ?? '12px'};
    width: ${p => p.$w ?? '100%'};
    border-radius: 4px;
    background: linear-gradient(90deg, ${st.border} 25%, ${st.bgCardAlt} 50%, ${st.border} 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 5;

const typeLabel: Record<VehicleCommentType, string> = {
    INTERNAL: 'Wewnętrzny',
    FOR_CUSTOMER: 'Dla klienta',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

interface Props {
    vehicleId: string;
}

export function VehicleComments({ vehicleId }: Props) {
    const [page, setPage] = useState(1);
    const navigate = useNavigate();
    const { comments, pagination, isLoading } = useVehicleComments(vehicleId, page, PAGE_SIZE);

    if (isLoading) {
        return (
            <Wrap>
                <List>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonItem key={i}>
                            <SkeletonLine $w="40%" $h="14px" />
                            <SkeletonLine $w="100%" />
                            <SkeletonLine $w="70%" />
                            <SkeletonLine $w="30%" $h="10px" />
                        </SkeletonItem>
                    ))}
                </List>
            </Wrap>
        );
    }

    if (!comments.length) {
        return <EmptyBox>Brak komentarzy do wizyt tego pojazdu.</EmptyBox>;
    }

    const totalPages = pagination?.totalPages ?? 1;
    const totalItems = pagination?.totalItems ?? comments.length;

    return (
        <Wrap>
            <List>
                {comments.map((c: VehicleComment) => (
                    <Item key={c.id}>
                        <ItemHeader>
                            <TypeBadge $type={c.type}>{typeLabel[c.type]}</TypeBadge>
                            <Author>{c.createdByName}</Author>
                            <Timestamp>{formatDateTime(c.createdAt)}</Timestamp>
                        </ItemHeader>
                        <Content>{c.content}</Content>
                        <VisitLink onClick={() => navigate(`/visits/${c.visitId}`)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <VisitName>{c.visitTitle}</VisitName>
                            <span>·</span>
                            <span>{formatDate(c.visitDate)}</span>
                        </VisitLink>
                    </Item>
                ))}
            </List>

            {totalPages > 1 && (
                <Footer>
                    <PageInfo>
                        {totalItems} komentarz{totalItems === 1 ? '' : totalItems < 5 ? 'e' : 'y'}, strona {page} z {totalPages}
                    </PageInfo>
                    <PageButtons>
                        <PageBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹ Poprzednia</PageBtn>
                        <PageBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Następna ›</PageBtn>
                    </PageButtons>
                </Footer>
            )}
        </Wrap>
    );
}
