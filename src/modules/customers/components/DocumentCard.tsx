// src/modules/customers/components/DocumentCard.tsx

import styled from 'styled-components';
import type { CustomerDocument } from '../types';
import { formatDateTime } from '@/common/utils';

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
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 70%, white) 100%);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.25s ease;
    }

    &:hover {
        border-color: color-mix(in srgb, var(--brand-primary) 40%, transparent);
        box-shadow: ${props => props.theme.shadows.md};

        &::before {
            transform: scaleX(1);
        }
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

    svg {
        width: 22px;
        height: 22px;
    }
`;

const FileInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
`;

const FileName = styled.div`
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
    background: ${props => props.theme.colors.surfaceAlt};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: var(--brand-primary);
        color: white;
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

const DeleteButton = styled(ActionButton)`
    &:hover {
        background: #ef4444;
        color: white;
    }
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

interface DocumentCardProps {
    document: CustomerDocument;
    onDelete: (documentId: string) => void;
    onImageClick?: (document: CustomerDocument) => void;
    isDeleting?: boolean;
}

export const DocumentCard = ({ document, onDelete, onImageClick, isDeleting = false }: DocumentCardProps) => {
    const ext = document.fileName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const isPDF = ext === 'pdf';
    const isViewable = isImage || isPDF;

    const handleCardClick = () => {
        if (isViewable && onImageClick) {
            onImageClick(document);
        }
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
                <FileIcon $ext={ext}>
                    {getFileIcon(ext)}
                </FileIcon>
                <FileInfo>
                    <DocumentName title={document.name}>{document.name}</DocumentName>
                    <FileName title={document.fileName}>{document.fileName}</FileName>
                </FileInfo>
            </CardBody>

            <CardFooter>
                <UploadInfo>
                    {formatDateTime(document.uploadedAt)}
                    {document.uploadedByName && (
                        <><br />przez {document.uploadedByName}</>
                    )}
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
