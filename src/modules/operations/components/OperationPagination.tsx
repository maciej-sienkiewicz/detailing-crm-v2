// src/modules/operations/components/OperationPagination.tsx

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { OperationListResponse } from '../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 20px;
    border-top: 1px solid ${st.border};
    background: ${st.bg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
`;

const Info = styled.span`
    font-size: 13px;
    color: ${st.textMuted};
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        text-align: left;
    }
`;

const Controls = styled.div`
    display: flex;
    gap: 4px;
    justify-content: center;
    align-items: center;
`;

const NavBtn = styled.button<{ $disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    color: ${props => props.$disabled ? st.textMuted : st.textSecondary};
    font-size: 14px;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${props => props.$disabled ? 0.45 : 1};
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    padding: 0 4px;
    border: 1px solid ${props => props.$active ? st.accentBlue : st.border};
    border-radius: ${st.radiusSm};
    background: ${props => props.$active ? st.accentBlue : st.bgCard};
    color: ${props => props.$active ? '#fff' : st.textSecondary};
    font-size: 13px;
    font-weight: ${props => props.$active ? 700 : 500};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        background: ${props => props.$active ? st.accentBlue : st.accentBlueDim};
        color: ${props => props.$active ? '#fff' : st.accentBlue};
    }
`;

const Ellipsis = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    font-size: 13px;
    color: ${st.textMuted};
`;

interface OperationPaginationProps {
    pagination: OperationListResponse['pagination'];
    onPageChange: (page: number) => void;
}

export const OperationPagination = ({ pagination, onPageChange }: OperationPaginationProps) => {
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPages = (): (number | '...')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

        const pages: (number | '...')[] = [1];
        if (currentPage > 3) pages.push('...');

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);

        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);

        return pages;
    };

    return (
        <Container>
            <Info>
                {startItem}–{endItem} z {totalItems} rekordów
            </Info>

            <Controls>
                <NavBtn
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    $disabled={currentPage === 1}
                    aria-label="Poprzednia strona"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </NavBtn>

                {getPages().map((p, i) =>
                    p === '...'
                        ? <Ellipsis key={`e-${i}`}>···</Ellipsis>
                        : (
                            <PageBtn
                                key={p}
                                $active={p === currentPage}
                                onClick={() => onPageChange(p as number)}
                            >
                                {p}
                            </PageBtn>
                        )
                )}

                <NavBtn
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    $disabled={currentPage === totalPages}
                    aria-label="Następna strona"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </NavBtn>
            </Controls>
        </Container>
    );
};
