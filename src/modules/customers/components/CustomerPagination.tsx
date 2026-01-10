import styled from 'styled-components';
import type { PaginationMeta } from '../types';
import { t } from '@/common/i18n';

const PaginationContainer = styled.nav`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    align-items: center;
    padding: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        justify-content: space-between;
    }
`;

const PaginationInfo = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const PaginationControls = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 40px;
    padding: 0 ${props => props.theme.spacing.sm};
    border: 1px solid ${props =>
            props.$isActive ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props =>
            props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surface};
    color: ${props =>
            props.$isActive ? 'white' : props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--brand-primary);
        background: ${props =>
                props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surfaceHover};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface CustomerPaginationProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
}

export const CustomerPagination = ({
                                       pagination,
                                       onPageChange,
                                   }: CustomerPaginationProps) => {
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const renderPageButtons = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages.map((page, index) => {
            if (page === '...') {
                return (
                    <PageButton key={`ellipsis-${index}`} disabled>
                        ...
                    </PageButton>
                );
            }

            return (
                <PageButton
                    key={page}
                    $isActive={page === currentPage}
                    onClick={() => onPageChange(page as number)}
                >
                    {page}
                </PageButton>
            );
        });
    };

    return (
        <PaginationContainer aria-label="Pagination">
            <PaginationInfo>
                {t.customers.pagination.showing} {startItem}–{endItem} {t.customers.pagination.of} {totalItems} {t.customers.pagination.customers}
            </PaginationInfo>

            <PaginationControls>
                <PageButton
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label={t.common.previous}
                >
                    ←
                </PageButton>

                {renderPageButtons()}

                <PageButton
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label={t.common.next}
                >
                    →
                </PageButton>
            </PaginationControls>
        </PaginationContainer>
    );
};