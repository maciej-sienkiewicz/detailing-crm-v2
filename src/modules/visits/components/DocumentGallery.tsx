import { useState, useRef } from 'react';
import styled from 'styled-components';
import { Button } from '@/common/components/Button';
import { formatDateTime } from '@/common/utils';
import type { VisitDocument, DocumentType } from '../types';

const GalleryContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const GalleryHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const HeaderTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const CategoryTabs = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const CategoryTab = styled.button<{ $isActive: boolean }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive
    ? 'linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%)'
    : props.theme.colors.surfaceAlt
};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
        background: ${props => props.$isActive
    ? 'linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%)'
    : props.theme.colors.surfaceHover
};
    }
`;

const GalleryContent = styled.div`
    padding: ${props => props.theme.spacing.lg};
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: ${props => props.theme.spacing.md};
`;

const PhotoCard = styled.div`
    position: relative;
    aspect-ratio: 1;
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        box-shadow: ${props => props.theme.shadows.lg};
        transform: translateY(-2px);
    }
`;

const PhotoPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
`;

const PhotoOverlay = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: ${props => props.theme.spacing.sm};
    background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
    color: white;
`;

const PhotoName = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PhotoDate = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    opacity: 0.8;
`;

const DocumentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const DocumentCard = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const DocumentIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.md};
    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
`;

const DocumentInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const DocumentMeta = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const UploadButton = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: var(--brand-primary);
    color: white;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface DocumentGalleryProps {
    documents: VisitDocument[];
    onUpload: (file: File, type: DocumentType, category: string) => void;
    onDelete: (documentId: string) => void;
    isUploading: boolean;
}

export const DocumentGallery = ({
                                    documents,
                                    onUpload,
                                    onDelete,
                                    isUploading,
                                }: DocumentGalleryProps) => {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categories = [
        { id: 'all', label: 'Wszystkie' },
        { id: 'przyjecie', label: 'Przyjęcie' },
        { id: 'realizacja', label: 'Realizacja' },
        { id: 'wydanie', label: 'Wydanie' },
        { id: 'protokoly', label: 'Protokoły' },
    ];

    const filteredDocuments = activeCategory === 'all'
        ? documents
        : documents.filter(doc => doc.category === activeCategory);

    const photos = filteredDocuments.filter(doc => doc.type === 'photo');
    const pdfs = filteredDocuments.filter(doc => doc.type === 'pdf' || doc.type === 'protocol');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const type: DocumentType = file.type.startsWith('image/') ? 'photo' : 'pdf';
            onUpload(file, type, activeCategory === 'all' ? 'inne' : activeCategory);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <GalleryContainer>
            <GalleryHeader>
                <HeaderTop>
                    <Title>Dokumentacja</Title>
                    <UploadButton>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        {isUploading ? 'Wysyłanie...' : 'Dodaj plik'}
                        <HiddenFileInput
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            disabled={isUploading}
                        />
                    </UploadButton>
                </HeaderTop>

                <CategoryTabs>
                    {categories.map(cat => (
                        <CategoryTab
                            key={cat.id}
                            $isActive={activeCategory === cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.label}
                        </CategoryTab>
                    ))}
                </CategoryTabs>
            </GalleryHeader>

            <GalleryContent>
                {photos.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
                            Zdjęcia ({photos.length})
                        </h4>
                        <PhotoGrid>
                            {photos.map(photo => (
                                <PhotoCard key={photo.id}>
                                    <PhotoPlaceholder>📸</PhotoPlaceholder>
                                    <PhotoOverlay>
                                        <PhotoName>{photo.fileName}</PhotoName>
                                        <PhotoDate>{formatDateTime(photo.uploadedAt)}</PhotoDate>
                                    </PhotoOverlay>
                                </PhotoCard>
                            ))}
                        </PhotoGrid>
                    </div>
                )}

                {pdfs.length > 0 && (
                    <div>
                        <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
                            Dokumenty PDF ({pdfs.length})
                        </h4>
                        <DocumentList>
                            {pdfs.map(doc => (
                                <DocumentCard key={doc.id}>
                                    <DocumentIcon>📄</DocumentIcon>
                                    <DocumentInfo>
                                        <DocumentName>{doc.fileName}</DocumentName>
                                        <DocumentMeta>
                                            Dodano: {formatDateTime(doc.uploadedAt)} · {doc.uploadedBy}
                                        </DocumentMeta>
                                    </DocumentInfo>
                                </DocumentCard>
                            ))}
                        </DocumentList>
                    </div>
                )}

                {filteredDocuments.length === 0 && (
                    <EmptyState>
                        Brak dokumentów w wybranej kategorii
                    </EmptyState>
                )}
            </GalleryContent>
        </GalleryContainer>
    );
};