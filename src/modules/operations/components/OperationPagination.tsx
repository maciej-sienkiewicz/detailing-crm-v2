// src/modules/operations/components/OperationPagination.tsx

import styled from 'styled-components';
import type { OperationListResponse } from '../types';

const PaginationContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 24px;
    border-top: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surface};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
`;

const PaginationInfo = styled.div`
    font-size: 14px;
    color: ${props => props.theme.colors.textSecondary};
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        text-align: left;
    }
`;

const PaginationControls = styled.div`
    display: flex;
    gap: 8px;
    justify-content: center;
`;

const PageButton = styled.button<{ $isActive?: boolean; $isDisabled?: boolean }>`
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 6px;
    background: ${props => props.$isActive ? 'var(--brand-primary)' : 'white'};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    font-size: 14px;
    font-weight: 500;
    cursor: ${props => props.$isDisabled ? 'not-allowed' : 'pointer'};
    transition: all 0.15s ease;
    opacity: ${props => props.$isDisabled ? 0.5 : 1};

    &:hover:not(:disabled) {
        border-color: var(--brand-primary);
        background: ${props => props.$isActive ? 'var(--brand-primary)' : '#f0f9ff'};
    }

    &:disabled {
        cursor: not-allowed;
    }
`;

interface OperationPaginationProps {
    pagination: OperationListResponse['pagination'];
    onPageChange: (page: number) => void;
}

export const OperationPagination = ({ pagination, onPageChange }: OperationPaginationProps) => {
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
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

        return pages;
    };

    return (
        <PaginationContainer>
            <PaginationInfo>
                Wyświetlanie {startItem} - {endItem} z {totalItems} operacji
            </PaginationInfo>

            <PaginationControls>
                <PageButton
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    $isDisabled={currentPage === 1}
                >
                    ←
                </PageButton>

                {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                        <PageButton
                            key={index}
                            onClick={() => onPageChange(page)}
                            $isActive={page === currentPage}
                        >
                            {page}
                        </PageButton>
                    ) : (
                        <PageButton key={index} disabled $isDisabled>
                            {page}
                        </PageButton>
                    )
                ))}

                <PageButton
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    $isDisabled={currentPage === totalPages}
                >
                    →
                </PageButton>
            </PaginationControls>
        </PaginationContainer>
    );
};