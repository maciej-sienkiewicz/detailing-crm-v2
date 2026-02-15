import { useState, useRef } from 'react';
import styled from 'styled-components';
import { formatDateTime } from '@/common/utils';
import type { VisitDocument, DocumentType, VisitPhoto } from '../types';
import { ImageViewerModal } from './ImageViewerModal';

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
    transition: all 0.2s ease;
    background: #f8fafc;

    &:hover {
        box-shadow: ${props => props.theme.shadows.lg};
        transform: translateY(-2px);
    }
`;

const PhotoImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
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
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
`;

const PhotoInfo = styled.div`
    flex: 1;
    min-width: 0;
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

const PhotoActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    flex-shrink: 0;
`;

const IconButton = styled.button`
    width: 28px;
    height: 28px;
    border: none;
    border-radius: ${props => props.theme.radii.sm};
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;

    &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const DeleteIconButton = styled(IconButton)`
    &:hover {
        background: rgba(220, 38, 38, 0.9);
    }
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

const DocumentActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-shrink: 0;
`;

const ActionButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const DeleteButton = styled(ActionButton)`
    &:hover {
        border-color: #dc2626;
        color: #dc2626;
        background: rgba(220, 38, 38, 0.05);
    }
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

const SectionDivider = styled.div`
    height: 1px;
    background: ${props => props.theme.colors.border};
    margin: ${props => props.theme.spacing.xl} 0;
`;

interface DocumentGalleryProps {
    documents: VisitDocument[];
    visitPhotos?: VisitPhoto[];  // Photos from check-in
    isLoadingPhotos?: boolean;
    onUpload: (file: File, type: DocumentType, category: string) => void;
    onUploadPhoto: (file: File, description?: string) => void;
    onDelete: (documentId: string) => void;
    isUploading: boolean;
}

export const DocumentGallery = ({
                                     documents,
                                     visitPhotos = [],
                                     isLoadingPhotos = false,
                                     onUpload,
                                     onUploadPhoto,
                                     onDelete,
                                     isUploading,
                                 }: DocumentGalleryProps) => {
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Combine visit photos and document photos
    const documentPhotos = documents.filter(doc => doc.type === 'PHOTO' || doc.type === 'DAMAGE_MAP');

    // Convert visit photos to a common format for display
    const visitPhotosAsPhotos = visitPhotos.map(vp => ({
        id: vp.id,
        fileName: vp.fileName,
        fileUrl: vp.thumbnailUrl,
        fullSizeUrl: vp.fullSizeUrl,
        uploadedAt: vp.uploadedAt,
        description: vp.description,
        isVisitPhoto: true,
    }));

    // Merge all photos (visit photos first, then document photos)
    const allPhotos = [
        ...visitPhotosAsPhotos,
        ...documentPhotos.map(p => ({
            id: p.id,
            fileName: p.fileName,
            fileUrl: p.fileUrl,
            fullSizeUrl: p.fileUrl,
            uploadedAt: p.uploadedAt,
            description: undefined,
            isVisitPhoto: false,
        }))
    ];

    const pdfs = documents.filter(doc =>
        doc.type === 'PDF' ||
        doc.type === 'PROTOCOL' ||
        doc.type === 'INTAKE' ||
        doc.type === 'OUTTAKE' ||
        doc.type === 'OTHER'
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check if file is an image based on extension or MIME type
            const isImage = file.type.startsWith('image/') ||
                           /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);

            if (isImage) {
                // Use new photo upload endpoint for images
                onUploadPhoto(file);
            } else {
                // Use existing document upload for PDFs and other files
                const type: DocumentType = 'PDF';
                onUpload(file, type, 'inne');
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownload = (fileUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImageClick = (index: number) => {
        setSelectedPhotoIndex(index);
    };

    const handleCloseModal = () => {
        setSelectedPhotoIndex(null);
    };

    const handleNextImage = () => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex < allPhotos.length - 1) {
            setSelectedPhotoIndex(selectedPhotoIndex + 1);
        }
    };

    const handlePrevImage = () => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
            setSelectedPhotoIndex(selectedPhotoIndex - 1);
        }
    };

    const selectedPhoto = selectedPhotoIndex !== null ? allPhotos[selectedPhotoIndex] : null;

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
            </GalleryHeader>

            <GalleryContent>
                {/* All Photos Section */}
                {allPhotos.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
                            Zdjęcia ({allPhotos.length})
                        </h4>
                        <PhotoGrid>
                            {allPhotos.map((photo, index) => (
                                <PhotoCard key={photo.id}>
                                    {photo.fileUrl ? (
                                        <PhotoImage
                                            src={photo.fileUrl}
                                            alt={photo.fileName}
                                            onClick={() => handleImageClick(index)}
                                        />
                                    ) : (
                                        <PhotoPlaceholder>📸</PhotoPlaceholder>
                                    )}
                                    <PhotoOverlay>
                                        <PhotoInfo>
                                            <PhotoName>{photo.fileName}</PhotoName>
                                            {photo.description && (
                                                <PhotoDate style={{ marginTop: '2px' }}>{photo.description}</PhotoDate>
                                            )}
                                            <PhotoDate>{formatDateTime(photo.uploadedAt)}</PhotoDate>
                                        </PhotoInfo>
                                        <PhotoActions>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(photo.fullSizeUrl, photo.fileName);
                                                }}
                                                title="Pobierz"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                    <polyline points="7 10 12 15 17 10"/>
                                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                            </IconButton>
                                            {!photo.isVisitPhoto && (
                                                <DeleteIconButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(photo.id);
                                                    }}
                                                    title="Usuń"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6"/>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                        <line x1="10" y1="11" x2="10" y2="17"/>
                                                        <line x1="14" y1="11" x2="14" y2="17"/>
                                                    </svg>
                                                </DeleteIconButton>
                                            )}
                                        </PhotoActions>
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
                                            Dodano: {formatDateTime(doc.uploadedAt)} · {doc.uploadedByName}
                                        </DocumentMeta>
                                    </DocumentInfo>
                                    <DocumentActions>
                                        <ActionButton
                                            onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                <polyline points="7 10 12 15 17 10"/>
                                                <line x1="12" y1="15" x2="12" y2="3"/>
                                            </svg>
                                            Pobierz
                                        </ActionButton>
                                        <DeleteButton
                                            onClick={() => onDelete(doc.id)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                            Usuń
                                        </DeleteButton>
                                    </DocumentActions>
                                </DocumentCard>
                            ))}
                        </DocumentList>
                    </div>
                )}

                {allPhotos.length === 0 && pdfs.length === 0 && (
                    <EmptyState>
                        Brak dokumentów dla tej wizyty
                    </EmptyState>
                )}
            </GalleryContent>

            {/* Photo viewer modal */}
            {selectedPhoto && (
                <ImageViewerModal
                    imageUrl={selectedPhoto.fullSizeUrl}
                    imageName={selectedPhoto.fileName}
                    isOpen={selectedPhotoIndex !== null}
                    onClose={handleCloseModal}
                    onDownload={() => handleDownload(selectedPhoto.fullSizeUrl, selectedPhoto.fileName)}
                    hasNext={selectedPhotoIndex !== null && selectedPhotoIndex < allPhotos.length - 1}
                    hasPrev={selectedPhotoIndex !== null && selectedPhotoIndex > 0}
                    onNext={handleNextImage}
                    onPrev={handlePrevImage}
                />
            )}
        </GalleryContainer>
    );
};
