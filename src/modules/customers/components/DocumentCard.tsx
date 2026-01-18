// src/modules/customers/components/DocumentCard.tsx

import styled from 'styled-components';
import { customerEditApi } from '../api/customerEditApi';
import type { CustomerDocument, DocumentCategory } from '../types';
import { formatDateTime } from '@/common/utils';

const Card = styled.article`
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 70%, white) 100%);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.3s ease;
    }

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.lg};
        transform: translateY(-2px);

        &::before {
            transform: scaleX(1);
        }
    }
`;

const CardHeader = styled.header`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
`;

const FileIcon = styled.div<{ $category: DocumentCategory }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.md};
    flex-shrink: 0;

    ${({ $category }) => {
    const styles: Record<DocumentCategory, string> = {
        contracts: 'background: #dbeafe; color: #1e40af;',
        invoices: 'background: #dcfce7; color: #166534;',
        correspondence: 'background: #fef3c7; color: #92400e;',
        identity: 'background: #f3e8ff; color: #6b21a8;',
        consents: 'background: #fce7f3; color: #be185d;',
        other: 'background: #f3f4f6; color: #6b7280;',
    };
    return styles[$category];
}}

    svg {
        width: 24px;
        height: 24px;
    }
`;

const FileInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const FileName = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileDescription = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    line-height: 1.4;
`;

const FileMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.md};
`;

const MetaBadge = styled.span<{ $variant?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    background: ${props => props.theme.colors.surfaceAlt};
    color: ${props => props.theme.colors.textSecondary};
`;

const CategoryBadge = styled.span<{ $category: DocumentCategory }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    ${({ $category }) => {
    const styles: Record<DocumentCategory, string> = {
        contracts: 'background: #dbeafe; color: #1e40af;',
        invoices: 'background: #dcfce7; color: #166534;',
        correspondence: 'background: #fef3c7; color: #92400e;',
        identity: 'background: #f3e8ff; color: #6b21a8;',
        consents: 'background: #fce7f3; color: #be185d;',
        other: 'background: #f3f4f6; color: #6b7280;',
    };
    return styles[$category];
}}
`;

const TagsContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const Tag = styled.span`
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: 11px;
    font-weight: 500;
    background: ${props => props.theme.colors.surfaceAlt};
    color: ${props => props.theme.colors.textSecondary};
`;

const CardFooter = styled.footer`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const UploadInfo = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const Actions = styled.div`
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
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: var(--brand-primary);
        color: white;
        transform: scale(1.1);
    }

    &:active {
        transform: scale(0.95);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const DeleteButton = styled(ActionButton)`
    &:hover {
        background: #ef4444;
        color: white;
    }
`;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const categoryLabels: Record<DocumentCategory, string> = {
    contracts: 'Umowa',
    invoices: 'Faktura',
    correspondence: 'Korespondencja',
    identity: 'Dokument tożsamości',
    consents: 'Zgoda',
    other: 'Inne',
};

const fileIcons: Record<string, React.ReactNode> = {
    pdf: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
        </svg>
    ),
    default: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
        </svg>
    ),
};

interface DocumentCardProps {
    document: CustomerDocument;
    onDelete: (documentId: string) => void;
    isDeleting?: boolean;
}

export const DocumentCard = ({ document, onDelete, isDeleting = false }: DocumentCardProps) => {
    const handleDownload = async () => {
        try {
            const downloadData = await customerEditApi.getDocumentDownload(document.id);
            window.open(downloadData.downloadUrl, '_blank');
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleDelete = () => {
        if (confirm(`Czy na pewno chcesz usunąć dokument "${document.fileName}"?`)) {
            onDelete(document.id);
        }
    };

    const fileExtension = document.fileName.split('.').pop()?.toLowerCase() || 'default';
    const icon = fileIcons[fileExtension] || fileIcons.default;

    return (
        <Card>
            <CardHeader>
                <FileIcon $category={document.category}>
                    {icon}
                </FileIcon>
                <FileInfo>
                    <FileName title={document.fileName}>{document.fileName}</FileName>
                    <FileDescription>{document.description}</FileDescription>
                </FileInfo>
            </CardHeader>

            <FileMeta>
                <CategoryBadge $category={document.category}>
                    {categoryLabels[document.category]}
                </CategoryBadge>
                <MetaBadge>{formatFileSize(document.fileSize)}</MetaBadge>
                <MetaBadge>{document.mimeType}</MetaBadge>
            </FileMeta>

            {document.tags.length > 0 && (
                <TagsContainer>
                    {document.tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </TagsContainer>
            )}

            <CardFooter>
                <UploadInfo>
                    Dodano: {formatDateTime(document.uploadedAt)}
                    <br />
                    przez {document.uploadedBy}
                </UploadInfo>

                <Actions>
                    <ActionButton onClick={handleDownload} title="Pobierz">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </ActionButton>
                    <DeleteButton
                        onClick={handleDelete}
                        disabled={isDeleting}
                        title="Usuń"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </DeleteButton>
                </Actions>
            </CardFooter>
        </Card>
    );
};
