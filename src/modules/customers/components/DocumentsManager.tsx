// src/modules/customers/components/DocumentsManager.tsx

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useCustomerDocuments, useDeleteDocument } from '../hooks/useCustomerDocuments';
import { DocumentCard } from './DocumentCard';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ImageViewerModal } from './ImageViewerModal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CustomerDocument } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
`;

const Toolbar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 8px 14px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    background: ${st.bgCard};
    color: ${st.text};
    transition: border-color ${st.transition}, box-shadow ${st.transition};

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        box-shadow: ${st.shadowBlue};
    }

    &::placeholder { color: ${st.textMuted}; }
`;

const UploadButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 18px;
    background: ${st.accentBlue};
    color: white;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${st.shadowSm};
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
        background: #2563EB;
        box-shadow: ${st.shadowMd};
        transform: translateY(-1px);
    }

    svg { width: 14px; height: 14px; }
`;

const DocumentsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 52px;
    height: 52px;
    margin: 0 auto 12px;
    border-radius: ${st.radius};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${st.textMuted};

    svg { width: 26px; height: 26px; }
`;

const EmptyTitle = styled.h3`
    margin: 0 0 4px;
    font-size: ${st.fontMd};
    font-weight: 600;
    color: ${st.text};
`;

const EmptyDescription = styled.p`
    margin: 0;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
`;

const Spinner = styled.div`
    width: 34px;
    height: 34px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const ErrorContainer = styled.div`
    padding: 20px;
    text-align: center;
    background: ${st.accentRedDim};
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: ${st.radiusSm};
    color: ${st.accentRed};
    font-size: ${st.fontSm};

    button {
        display: inline-block;
        margin-top: 8px;
        padding: 5px 14px;
        background: ${st.accentRed};
        color: white;
        border: none;
        border-radius: ${st.radiusFull};
        font-size: ${st.fontXs};
        font-weight: 600;
        cursor: pointer;
    }
`;

const Pagination = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    padding-top: 4px;
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid ${props => props.$isActive ? st.accentBlue : st.border};
    border-radius: ${st.radiusSm};
    background: ${props => props.$isActive ? st.accentBlue : st.bgCard};
    color: ${props => props.$isActive ? 'white' : st.text};
    font-size: ${st.fontSm};
    font-weight: ${props => props.$isActive ? '700' : '500'};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        background: ${props => props.$isActive ? st.accentBlue : st.bgAccentBlue};
        color: ${props => props.$isActive ? 'white' : st.accentBlue};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface DocumentsManagerProps {
    customerId: string;
}

export const DocumentsManager = ({ customerId }: DocumentsManagerProps) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [searchQuery, setSearchQuery]             = useState('');
    const [page, setPage]                           = useState(1);
    const limit = 9;

    const [isImageViewerOpen, setIsImageViewerOpen]   = useState(false);
    const [currentImageIndex, setCurrentImageIndex]   = useState(0);

    const { documents: allDocuments, isLoading, isError, refetch } = useCustomerDocuments(customerId);
    const deleteMutation = useDeleteDocument(customerId);

    const filteredDocuments = useMemo(() => {
        if (!searchQuery) return allDocuments;
        const q = searchQuery.toLowerCase();
        return allDocuments.filter(doc =>
            doc.fileName.toLowerCase().includes(q) ||
            doc.name.toLowerCase().includes(q)
        );
    }, [allDocuments, searchQuery]);

    const { documents, pagination } = useMemo(() => {
        const totalItems  = filteredDocuments.length;
        const totalPages  = Math.ceil(totalItems / limit);
        const startIndex  = (page - 1) * limit;
        const paginatedDocs = filteredDocuments.slice(startIndex, startIndex + limit);
        return {
            documents: paginatedDocs,
            pagination: { currentPage: page, totalPages, totalItems, itemsPerPage: limit },
        };
    }, [filteredDocuments, page, limit]);

    const viewableDocuments = useMemo(() =>
        allDocuments.filter(doc => doc.fileName.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i)),
        [allDocuments]
    );

    const handleImageClick = (document: CustomerDocument) => {
        const idx = viewableDocuments.findIndex(doc => doc.id === document.id);
        if (idx !== -1) { setCurrentImageIndex(idx); setIsImageViewerOpen(true); }
    };

    const currentDocument = viewableDocuments[currentImageIndex];
    const currentDocumentIsPDF = !!(currentDocument?.fileName.match(/\.pdf$/i));

    if (isLoading) {
        return <LoadingContainer><Spinner /></LoadingContainer>;
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
            <Toolbar>
                <SearchInput
                    type="text"
                    placeholder="Szukaj dokumentów..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                />
                <UploadButton onClick={() => setIsUploadModalOpen(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj dokument
                </UploadButton>
            </Toolbar>

            {documents.length === 0 ? (
                <EmptyState>
                    <EmptyIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                        </svg>
                    </EmptyIcon>
                    <EmptyTitle>
                        {searchQuery ? 'Nie znaleziono dokumentów' : 'Brak dokumentów'}
                    </EmptyTitle>
                    <EmptyDescription>
                        {searchQuery
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
                                onDelete={id => deleteMutation.mutate(id)}
                                onImageClick={handleImageClick}
                                isDeleting={deleteMutation.isPending}
                            />
                        ))}
                    </DocumentsGrid>

                    {pagination.totalPages > 1 && (
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
                                    return Math.abs(p - page) <= 1;
                                })
                                .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                        {i > 0 && arr[i - 1] !== p - 1 && (
                                            <span style={{ color: st.textMuted, fontSize: st.fontSm }}>…</span>
                                        )}
                                        <PageButton $isActive={p === page} onClick={() => setPage(p)}>
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

            {currentDocument && (
                <ImageViewerModal
                    isOpen={isImageViewerOpen}
                    onClose={() => setIsImageViewerOpen(false)}
                    imageUrl={currentDocument.fileUrl}
                    imageName={currentDocument.fileName}
                    isPDF={currentDocumentIsPDF}
                    hasNext={currentImageIndex < viewableDocuments.length - 1}
                    hasPrev={currentImageIndex > 0}
                    onNext={() => setCurrentImageIndex(i => i + 1)}
                    onPrev={() => setCurrentImageIndex(i => i - 1)}
                    onDownload={() => window.open(currentDocument.fileUrl, '_blank')}
                />
            )}
        </Container>
    );
};
