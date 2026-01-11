import styled from 'styled-components';
import type { PaginationMeta } from '../types';
import { t } from '@/common/i18n';

const PaginationContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
`;

const PaginationInfo = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        text-align: left;
    }
`;

const PaginationControls = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    justify-content: center;
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
    min-width: 36px;
    height: 36px;
    padding: 0 ${props => props.theme.spacing.sm};
    background: ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surface};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    border: 1px solid ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surfaceHover};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface VehiclePaginationProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
}

export const VehiclePagination = ({ pagination, onPageChange }: VehiclePaginationProps) => {
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <PaginationContainer>
            <PaginationInfo>
                {t.vehicles.pagination.showing} {startItem}-{endItem} {t.vehicles.pagination.of} {totalItems} {t.vehicles.pagination.vehicles}
            </PaginationInfo>

            <PaginationControls>
                <PageButton
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ‹
                </PageButton>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                    })
                    .map((page, idx, arr) => {
                        if (idx > 0 && arr[idx - 1] !== page - 1) {
                            return (
                                <span key={`ellipsis-${page}`}>
                                    <PageButton disabled>...</PageButton>
                                    <PageButton
                                        $isActive={page === currentPage}
                                        onClick={() => onPageChange(page)}
                                    >
                                        {page}
                                    </PageButton>
                                </span>
                            );
                        }
                        return (
                            <PageButton
                                key={page}
                                $isActive={page === currentPage}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </PageButton>
                        );
                    })}

                <PageButton
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    ›
                </PageButton>
            </PaginationControls>
        </PaginationContainer>
    );
};