import styled from 'styled-components';
import type { VehicleDocument } from '../types';

const DocumentsContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const DocumentsHeader = styled.header`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const DocumentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
`;

const DocumentCard = styled.div`
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
    display: flex;
    gap: ${props => props.theme.spacing.md};
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
        border-color: var(--brand-primary);
    }
`;

const DocumentIcon = styled.div<{ $category: string }>`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 24px;

    ${props => {
        if (props.$category === 'protocols') return 'background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);';
        if (props.$category === 'invoices') return 'background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);';
        if (props.$category === 'photos') return 'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);';
        if (props.$category === 'technical') return 'background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);';
        return 'background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);';
    }}
`;

const DocumentInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DocumentName = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const DocumentMeta = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const DocumentCategory = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => props.theme.colors.surfaceHover};
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const DocumentDescription = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const DocumentActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ActionButton = styled.button`
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: white;
    color: ${props => props.theme.colors.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: #f0f9ff;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface VehicleDocumentsProps {
    documents?: VehicleDocument[];
    vehicleId: string;
}

const categoryIcons: Record<string, string> = {
    protocols: '📋',
    invoices: '💰',
    photos: '📸',
    technical: '🔧',
    other: '📄',
};

const categoryTranslations: Record<string, string> = {
    protocols: 'Protokoły',
    invoices: 'Faktury',
    photos: 'Zdjęcia',
    technical: 'Dokumentacja techniczna',
    other: 'Inne',
};

export const VehicleDocuments = ({ documents = [], vehicleId }: VehicleDocumentsProps) => {
    const handleAddDocument = () => {
        // TODO: Implementacja dodawania dokumentu
        console.log('Add document for vehicle:', vehicleId);
    };

    const handleDownload = (document: VehicleDocument) => {
        window.open(document.documentUrl, '_blank');
    };

    const handleDelete = (documentId: string) => {
        // TODO: Implementacja usuwania dokumentu
        console.log('Delete document:', documentId);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('pl-PL');
    };

    return (
        <DocumentsContainer>
            <DocumentsHeader>
                <div>
                    <Title>Dokumenty pojazdu</Title>
                    <Subtitle>
                        {documents.length === 0
                            ? 'Brak dokumentów'
                            : `${documents.length} ${documents.length === 1 ? 'dokument' : documents.length < 5 ? 'dokumenty' : 'dokumentów'}`
                        }
                    </Subtitle>
                </div>
                <AddButton onClick={handleAddDocument}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Dodaj dokument
                </AddButton>
            </DocumentsHeader>

            {documents.length === 0 ? (
                <EmptyState>
                    Brak dokumentów przypisanych do tego pojazdu.<br />
                    Kliknij "Dodaj dokument" aby dodać pierwszy dokument.
                </EmptyState>
            ) : (
                <DocumentList>
                    {documents.map(document => (
                        <DocumentCard key={document.id} onClick={() => handleDownload(document)}>
                            <DocumentIcon $category={document.category}>
                                {categoryIcons[document.category] || categoryIcons.other}
                            </DocumentIcon>
                            <DocumentInfo>
                                <DocumentName>{document.fileName}</DocumentName>
                                <DocumentMeta>
                                    <DocumentCategory>
                                        {categoryTranslations[document.category] || document.category}
                                    </DocumentCategory>
                                    <span>•</span>
                                    <span>{formatFileSize(document.fileSize)}</span>
                                    <span>•</span>
                                    <span>{formatDate(document.uploadedAt)}</span>
                                </DocumentMeta>
                                {document.description && (
                                    <DocumentDescription>{document.description}</DocumentDescription>
                                )}
                            </DocumentInfo>
                            <DocumentActions onClick={(e) => e.stopPropagation()}>
                                <ActionButton onClick={() => handleDownload(document)} title="Pobierz">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                                    </svg>
                                </ActionButton>
                                <ActionButton onClick={() => handleDelete(document.id)} title="Usuń">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </ActionButton>
                            </DocumentActions>
                        </DocumentCard>
                    ))}
                </DocumentList>
            )}
        </DocumentsContainer>
    );
};
