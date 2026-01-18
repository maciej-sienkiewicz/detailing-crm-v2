// src/modules/customers/components/DocumentsManager.tsx

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useCustomerDocuments } from '../hooks/useCustomerDocuments';
import { useDeleteDocument } from '../hooks/useDeleteDocument';
import { DocumentCard } from './DocumentCard';
import { UploadDocumentModal } from './UploadDocumentModal';
import type { DocumentCategory } from '../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const Header = styled.header`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
`;

const Title = styled.h2`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Actions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const UploadButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const Filters = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 200px;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const CategoryFilter = styled.select`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

const DocumentsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

const EmptyIcon = styled.div`
    width: 64px;
    height: 64px;
    margin: 0 auto ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.full};
    background: ${props => props.theme.colors.surfaceAlt};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.colors.textMuted};

    svg {
        width: 32px;
        height: 32px;
    }
`;

const EmptyTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const EmptyDescription = styled.p`
    margin: 0;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
`;

const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid ${props => props.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const ErrorContainer = styled.div`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: ${props => props.theme.radii.lg};
    color: #991b1b;
`;

const Pagination = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.lg};
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 40px;
    padding: 0 ${props => props.theme.spacing.sm};
    border: 1px solid ${props =>
    props.$isActive ? 'var(--brand-primary)' : props.theme.colors.border
};
    border-radius: ${props => props.theme.radii.md};
    background: ${props =>
    props.$isActive ? 'var(--brand-primary)' : 'white'
};
    color: ${props =>
    props.$isActive ? 'white' : props.theme.colors.text
};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--brand-primary);
        background: ${props =>
    props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surfaceHover
};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface DocumentsManagerProps {
    customerId: string;
}

export const DocumentsManager = ({ customerId }: DocumentsManagerProps) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | ''>('');
    const [page, setPage] = useState(1);
    const limit = 9;

    const filters = useMemo(() => ({
        search: searchQuery,
        category: categoryFilter || undefined,
        page,
        limit,
    }), [searchQuery, categoryFilter, page]);

    const { documents, pagination, isLoading, isError, refetch } = useCustomerDocuments(
        customerId,
        filters
    );

    const { deleteDocument, isDeleting } = useDeleteDocument({
        customerId,
    });

    if (isLoading) {
        return (
            <LoadingContainer>
                <Spinner />
            </LoadingContainer>
        );
    }

    if (isError) {
        return (
            <ErrorContainer>
                <p>Nie udało się załadować dokumentów.</p>
                <button onClick={() => refetch()}>Spróbuj ponownie</button>
            </ErrorContainer>
        );
    }

    return (
        <Container>
            <Header>
                <Title>Dokumenty ({pagination?.totalItems || 0})</Title>
                <Actions>
                    <UploadButton onClick={() => setIsUploadModalOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17,8 12,3 7,8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Dodaj dokument
                    </UploadButton>
                </Actions>
            </Header>

            <Filters>
                <SearchInput
                    type="text"
                    placeholder="Szukaj dokumentów..."
                    value={searchQuery}
                    onChange={e => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                />
                <CategoryFilter
                    value={categoryFilter}
                    onChange={e => {
                        setCategoryFilter(e.target.value as DocumentCategory | '');
                        setPage(1);
                    }}
                >
                    <option value="">Wszystkie kategorie</option>
                    <option value="contracts">Umowy</option>
                    <option value="invoices">Faktury</option>
                    <option value="correspondence">Korespondencja</option>
                    <option value="identity">Dokumenty tożsamości</option>
                    <option value="consents">Zgody</option>
                    <option value="other">Inne</option>
                </CategoryFilter>
            </Filters>

            {documents.length === 0 ? (
                <EmptyState>
                    <EmptyIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                        </svg>
                    </EmptyIcon>
                    <EmptyTitle>
                        {searchQuery || categoryFilter
                            ? 'Nie znaleziono dokumentów'
                            : 'Brak dokumentów'
                        }
                    </EmptyTitle>
                    <EmptyDescription>
                        {searchQuery || categoryFilter
                            ? 'Spróbuj zmienić kryteria wyszukiwania'
                            : 'Dodaj pierwszy dokument klikając przycisk powyżej'
                        }
                    </EmptyDescription>
                </EmptyState>
            ) : (
                <>
                    <DocumentsGrid>
                        {documents.map(document => (
                            <DocumentCard
                                key={document.id}
                                document={document}
                                onDelete={deleteDocument}
                                isDeleting={isDeleting}
                            />
                        ))}
                    </DocumentsGrid>

                    {pagination && pagination.totalPages > 1 && (
                        <Pagination>
                            <PageButton
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                ←
                            </PageButton>

                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                .filter(p => {
                                    if (pagination.totalPages <= 7) return true;
                                    if (p === 1 || p === pagination.totalPages) return true;
                                    if (Math.abs(p - page) <= 1) return true;
                                    return false;
                                })
                                .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                        {i > 0 && arr[i - 1] !== p - 1 && (
                                            <span>...</span>
                                        )}
                                        <PageButton
                                            $isActive={p === page}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </PageButton>
                                    </React.Fragment>
                                ))
                            }

                            <PageButton
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                            >
                                →
                            </PageButton>
                        </Pagination>
                    )}
                </>
            )}

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                customerId={customerId}
            />
        </Container>
    );
};
