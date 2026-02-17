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

const HeaderInfo = styled.div``;

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
    flex-shrink: 0;

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
    padding: ${props => props.theme.spacing.lg};
    gap: 0;
`;

const DocumentRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} 0;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background 0.15s ease;
    cursor: pointer;
    border-radius: ${props => props.theme.radii.sm};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        padding-left: ${props => props.theme.spacing.sm};
        padding-right: ${props => props.theme.spacing.sm};
        margin: 0 -${props => props.theme.spacing.sm};
    }
`;

const DocumentIcon = styled.div<{ $category: string }>`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 20px;

    ${props => {
        if (props.$category === 'protocols') return 'background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);';
        if (props.$category === 'invoices') return 'background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);';
        if (props.$category === 'photos') return 'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);';
        if (props.$category === 'technical') return 'background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);';
        return 'background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);';
    }}
`;

const DocumentInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentName = styled.h4`
    margin: 0 0 2px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const DocumentMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    flex-wrap: wrap;
`;

const CategoryBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => props.theme.colors.surfaceHover};
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${props => props.theme.colors.textSecondary};
`;

const Dot = styled.span`
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: ${props => props.theme.colors.textMuted};
    flex-shrink: 0;
`;

const DocumentDescription = styled.p`
    margin: 2px 0 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const DocumentActions = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
`;

const ActionButton = styled.button`
    width: 30px;
    height: 30px;
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
        width: 14px;
        height: 14px;
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl} ${props => props.theme.spacing.lg};
    gap: ${props => props.theme.spacing.md};
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 64px;
    height: 64px;
    border-radius: ${props => props.theme.radii.xl};
    background: ${props => props.theme.colors.surfaceHover};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const EmptySubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    max-width: 300px;
`;

const EmptyAddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;
    margin-top: ${props => props.theme.spacing.sm};

    &:hover {
        opacity: 0.9;
    }

    svg {
        width: 16px;
        height: 16px;
    }
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
        return new Date(dateString).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const countLabel = (n: number): string => {
        if (n === 1) return '1 dokument';
        if (n < 5) return `${n} dokumenty`;
        return `${n} dokumentów`;
    };

    return (
        <DocumentsContainer>
            <DocumentsHeader>
                <HeaderInfo>
                    <Title>Dokumenty pojazdu</Title>
                    <Subtitle>
                        {documents.length === 0 ? 'Brak dokumentów' : countLabel(documents.length)}
                    </Subtitle>
                </HeaderInfo>
                <AddButton onClick={handleAddDocument}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Dodaj dokument
                </AddButton>
            </DocumentsHeader>

            {documents.length === 0 ? (
                <EmptyState>
                    <EmptyIcon>📂</EmptyIcon>
                    <EmptyTitle>Brak dokumentów</EmptyTitle>
                    <EmptySubtitle>
                        Dodaj protokoły, faktury lub inną dokumentację związaną z pojazdem.
                    </EmptySubtitle>
                    <EmptyAddButton onClick={handleAddDocument}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Dodaj pierwszy dokument
                    </EmptyAddButton>
                </EmptyState>
            ) : (
                <DocumentList>
                    {documents.map(document => (
                        <DocumentRow key={document.id} onClick={() => handleDownload(document)}>
                            <DocumentIcon $category={document.category}>
                                {categoryIcons[document.category] ?? categoryIcons.other}
                            </DocumentIcon>
                            <DocumentInfo>
                                <DocumentName title={document.fileName}>{document.fileName}</DocumentName>
                                <DocumentMeta>
                                    <CategoryBadge>
                                        {categoryTranslations[document.category] ?? document.category}
                                    </CategoryBadge>
                                    <Dot />
                                    <span>{formatFileSize(document.fileSize)}</span>
                                    <Dot />
                                    <span>{formatDate(document.uploadedAt)}</span>
                                </DocumentMeta>
                                {document.description && (
                                    <DocumentDescription title={document.description}>
                                        {document.description}
                                    </DocumentDescription>
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
                        </DocumentRow>
                    ))}
                </DocumentList>
            )}
        </DocumentsContainer>
    );
};
