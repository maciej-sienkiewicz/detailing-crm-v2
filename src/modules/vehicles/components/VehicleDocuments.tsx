// src/modules/vehicles/components/VehicleDocuments.tsx

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useVehicleDocuments, useDeleteVehicleDocument } from '../hooks/useVehicleDocuments';
import { UploadVehicleDocumentModal } from './UploadVehicleDocumentModal';
import { ImageViewerModal } from '@/modules/customers/components/ImageViewerModal';
import { formatDateTime } from '@/common/utils';
import type { VehicleDocument } from '../types';

/* ─── Document Card ──────────────────────────────────── */

const Card = styled.article<{ $isClickable?: boolean }>`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    position: relative;
    overflow: hidden;
    cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    &::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 70%, white) 100%);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.25s ease;
    }

    &:hover {
        border-color: color-mix(in srgb, var(--brand-primary) 40%, transparent);
        box-shadow: ${props => props.theme.shadows.md};
        &::before { transform: scaleX(1); }
    }
`;

const CardBody = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    align-items: flex-start;
`;

const FileIcon = styled.div<{ $ext: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: ${props => props.theme.radii.md};
    flex-shrink: 0;

    ${({ $ext }) => {
        if ($ext === 'pdf') return 'background: #fee2e2; color: #dc2626;';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes($ext)) return 'background: #dbeafe; color: #2563eb;';
        if (['doc', 'docx'].includes($ext)) return 'background: #dbeafe; color: #1d4ed8;';
        if (['xls', 'xlsx'].includes($ext)) return 'background: #dcfce7; color: #16a34a;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}

    svg { width: 22px; height: 22px; }
`;

const FileInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
`;

const DocFileName = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CardFooter = styled.footer`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const UploadInfo = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    line-height: 1.5;
`;

const CardActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
`;

const ActionButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.theme.colors.surfaceAlt};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover { background: var(--brand-primary); color: white; }

    svg { width: 15px; height: 15px; }
`;

const DeleteButton = styled(ActionButton)`
    &:hover { background: #ef4444; color: white; }
`;

function getFileIcon(ext: string) {
    if (ext === 'pdf') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline fill="none" stroke="currentColor" strokeWidth="2" points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
        );
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
        </svg>
    );
}

interface VehicleDocumentCardProps {
    document: VehicleDocument;
    onDelete: (documentId: string) => void;
    onImageClick?: (document: VehicleDocument) => void;
    isDeleting?: boolean;
}

const VehicleDocumentCard = ({ document, onDelete, onImageClick, isDeleting = false }: VehicleDocumentCardProps) => {
    const ext = document.fileName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const isViewable = isImage || ext === 'pdf';

    const handleCardClick = () => {
        if (isViewable && onImageClick) onImageClick(document);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(document.fileUrl, '_blank');
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Czy na pewno chcesz usunąć dokument "${document.name}"?`)) {
            onDelete(document.id);
        }
    };

    return (
        <Card $isClickable={isViewable} onClick={handleCardClick}>
            <CardBody>
                <FileIcon $ext={ext}>{getFileIcon(ext)}</FileIcon>
                <FileInfo>
                    <DocName title={document.name}>{document.name}</DocName>
                    <DocFileName title={document.fileName}>{document.fileName}</DocFileName>
                </FileInfo>
            </CardBody>

            <CardFooter>
                <UploadInfo>
                    {formatDateTime(document.uploadedAt)}
                    {document.uploadedByName && (
                        <><br />przez {document.uploadedByName}</>
                    )}
                </UploadInfo>
                <CardActions>
                    <ActionButton onClick={handleDownload} title="Pobierz">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </ActionButton>
                    <DeleteButton onClick={handleDelete} disabled={isDeleting} title="Usuń">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </DeleteButton>
                </CardActions>
            </CardFooter>
        </Card>
    );
};

/* ─── Manager Layout ─────────────────────────────────── */

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
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

    svg { width: 16px; height: 16px; }
`;

const SearchInput = styled.input`
    width: 100%;
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

    &::placeholder { color: ${props => props.theme.colors.textMuted}; }
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
    padding: ${props => props.theme.spacing.xxl} ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surfaceAlt};
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
    svg { width: 32px; height: 32px; }
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
    @keyframes spin { to { transform: rotate(360deg); } }
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
    border: 1px solid ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive ? 'var(--brand-primary)' : 'white'};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--brand-primary);
        background: ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surfaceHover};
    }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ─── Main Component ─────────────────────────────────── */

interface VehicleDocumentsProps {
    vehicleId: string;
}

export const VehicleDocuments = ({ vehicleId }: VehicleDocumentsProps) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const limit = 9;

    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const { documents: allDocuments, isLoading, isError, refetch } = useVehicleDocuments(vehicleId);
    const deleteMutation = useDeleteVehicleDocument(vehicleId);

    const filteredDocuments = useMemo(() => {
        if (!searchQuery) return allDocuments;
        const q = searchQuery.toLowerCase();
        return allDocuments.filter(doc =>
            doc.fileName.toLowerCase().includes(q) ||
            doc.name.toLowerCase().includes(q)
        );
    }, [allDocuments, searchQuery]);

    const { documents, pagination } = useMemo(() => {
        const totalItems = filteredDocuments.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const paginatedDocs = filteredDocuments.slice(startIndex, startIndex + limit);
        return {
            documents: paginatedDocs,
            pagination: { currentPage: page, totalPages, totalItems },
        };
    }, [filteredDocuments, page]);

    const viewableDocuments = useMemo(
        () => allDocuments.filter(doc => /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(doc.fileName)),
        [allDocuments]
    );

    const handleImageClick = (doc: VehicleDocument) => {
        const idx = viewableDocuments.findIndex(d => d.id === doc.id);
        if (idx !== -1) {
            setCurrentImageIndex(idx);
            setIsImageViewerOpen(true);
        }
    };

    const currentDocument = viewableDocuments[currentImageIndex];

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
            <Header>
                <Title>Dokumenty ({pagination.totalItems})</Title>
                <UploadButton onClick={() => setIsUploadModalOpen(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17,8 12,3 7,8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Dodaj dokument
                </UploadButton>
            </Header>

            <SearchInput
                type="text"
                placeholder="Szukaj dokumentów..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />

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
                            <VehicleDocumentCard
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
                                        {i > 0 && arr[i - 1] !== p - 1 && <span>...</span>}
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

            <UploadVehicleDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                vehicleId={vehicleId}
            />

            {currentDocument && (
                <ImageViewerModal
                    isOpen={isImageViewerOpen}
                    onClose={() => setIsImageViewerOpen(false)}
                    imageUrl={currentDocument.fileUrl}
                    imageName={currentDocument.fileName}
                    isPDF={/\.pdf$/i.test(currentDocument.fileName)}
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
