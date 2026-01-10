// src/modules/customers/components/UploadDocumentModal.tsx

import { useState, useRef, ChangeEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styled, { keyframes } from 'styled-components';
import { useUploadDocument } from '../hooks/useUploadDocument';
import type { DocumentCategory } from '../types';
import { t } from '@/common/i18n';

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideIn = keyframes`
    from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
`;

const Overlay = styled(Dialog.Overlay)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 100;
    animation: ${fadeIn} 0.2s ease-out;
`;

const Content = styled(Dialog.Content)`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 540px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 20px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
    z-index: 101;
    animation: ${slideIn} 0.25s cubic-bezier(0.32, 0.72, 0, 1);
`;

const Header = styled.header`
    padding: 24px 32px;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

const Title = styled(Dialog.Title)`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
`;

const Body = styled.div`
    padding: 32px;
`;

const DropZone = styled.div<{ $isDragging?: boolean; $hasFile?: boolean }>`
    border: 2px dashed ${props =>
    props.$hasFile ? 'var(--brand-primary)' :
        props.$isDragging ? 'var(--brand-primary)' :
            props.theme.colors.border
};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    background: ${props =>
    props.$hasFile ? '#f0f9ff' :
        props.$isDragging ? '#f0f9ff' :
            props.theme.colors.surface
};
    transition: all 0.2s ease;
    cursor: pointer;
    margin-bottom: ${props => props.theme.spacing.lg};

    &:hover {
        border-color: var(--brand-primary);
        background: #f0f9ff;
    }
`;

const UploadIcon = styled.div`
    width: 64px;
    height: 64px;
    margin: 0 auto ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.full};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;

    svg {
        width: 32px;
        height: 32px;
    }
`;

const DropText = styled.p`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const DropHint = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const FileInput = styled.input`
    display: none;
`;

const SelectedFile = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const FileIconWrapper = styled.div`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.md};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const FileDetails = styled.div`
    flex: 1;
    min-width: 0;
`;

const FileName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileSize = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

const RemoveButton = styled.button`
    width: 32px;
    height: 32px;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: #fee2e2;
    color: #991b1b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #fecaca;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const FormField = styled.div`
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const Label = styled.label`
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
`;

const Select = styled.select`
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    background: white;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    background: white;
    color: #0f172a;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const TextArea = styled.textarea`
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    background: white;
    color: #0f172a;
    min-height: 80px;
    resize: vertical;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const Footer = styled.footer`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 24px 32px;
    background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    min-width: 120px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    
    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(180deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        
        &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
        }
    ` : `
        background: white;
        color: #374151;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.08);
        
        &:hover:not(:disabled) {
            background: #f9fafb;
        }
    `}

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
}

export const UploadDocumentModal = ({
                                        isOpen,
                                        onClose,
                                        customerId
                                    }: UploadDocumentModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState<DocumentCategory>('other');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadDocument, isUploading } = useUploadDocument({
        customerId,
        onSuccess: () => {
            handleReset();
            onClose();
        },
    });

    const handleReset = () => {
        setFile(null);
        setCategory('other');
        setDescription('');
        setTags('');
        setIsDragging(false);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) return;

        uploadDocument({
            file,
            category,
            description,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        });
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Overlay />
                <Content>
                    <Header>
                        <Title>Dodaj dokument</Title>
                        <Subtitle>Prześlij plik do magazynu dokumentów</Subtitle>
                    </Header>

                    <Body>
                        <form onSubmit={handleSubmit}>
                            {!file ? (
                                <DropZone
                                    $isDragging={isDragging}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <UploadIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="17,8 12,3 7,8"/>
                                            <line x1="12" y1="3" x2="12" y2="15"/>
                                        </svg>
                                    </UploadIcon>
                                    <DropText>
                                        Kliknij lub przeciągnij plik
                                    </DropText>
                                    <DropHint>
                                        Obsługiwane: PDF, DOCX, JPG, PNG (max 10 MB)
                                    </DropHint>
                                </DropZone>
                            ) : (
                                <SelectedFile>
                                    <FileIconWrapper>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                        </svg>
                                    </FileIconWrapper>
                                    <FileDetails>
                                        <FileName>{file.name}</FileName>
                                        <FileSize>{formatFileSize(file.size)}</FileSize>
                                    </FileDetails>
                                    <RemoveButton type="button" onClick={() => setFile(null)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </RemoveButton>
                                </SelectedFile>
                            )}

                            <FileInput
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xlsx"
                            />

                            <FormField>
                                <Label>Kategoria</Label>
                                <Select
                                    value={category}
                                    onChange={e => setCategory(e.target.value as DocumentCategory)}
                                >
                                    <option value="contracts">Umowy</option>
                                    <option value="invoices">Faktury</option>
                                    <option value="correspondence">Korespondencja</option>
                                    <option value="identity">Dokumenty tożsamości</option>
                                    <option value="consents">Zgody</option>
                                    <option value="other">Inne</option>
                                </Select>
                            </FormField>

                            <FormField>
                                <Label>Opis</Label>
                                <TextArea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Krótki opis dokumentu..."
                                    required
                                />
                            </FormField>

                            <FormField>
                                <Label>Tagi (oddzielone przecinkami)</Label>
                                <Input
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="np. 2024, umowa, ważne"
                                />
                            </FormField>
                        </form>
                    </Body>

                    <Footer>
                        <Button type="button" onClick={onClose}>
                            {t.common.cancel}
                        </Button>
                        <Button
                            type="submit"
                            $variant="primary"
                            disabled={!file || isUploading}
                            onClick={handleSubmit}
                        >
                            {isUploading ? 'Wysyłanie...' : 'Dodaj dokument'}
                        </Button>
                    </Footer>
                </Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};