import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { Input, Label, FieldGroup, ErrorMessage, TextArea } from '@/common/components/Form';
import {
    useCreateProtocolTemplate,
    useUpdateProtocolTemplate,
    useDeleteProtocolTemplate,
} from '../api/useProtocols';
import type { ProtocolTemplate } from '../types';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
    max-height: 70vh;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.xs};
`;

const Section = styled.div`
    &:not(:last-child) {
        padding-bottom: ${props => props.theme.spacing.xl};
        border-bottom: 2px solid ${props => props.theme.colors.border};
    }
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.lg} 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    &::before {
        content: '';
        width: 4px;
        height: 24px;
        background: linear-gradient(to bottom, var(--brand-primary), var(--brand-primary-dark, #1d4ed8));
        border-radius: 2px;
    }
`;

const TemplateList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    max-height: 350px;
    overflow-y: auto;
    padding: 2px;
`;

const TemplateCard = styled.div<{ $isSelected: boolean }>`
    padding: ${props => props.theme.spacing.lg};
    border: 2px solid ${props => props.$isSelected ? 'var(--brand-primary)' : 'transparent'};
    background: ${props => props.$isSelected
        ? 'linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(224, 242, 254) 100%)'
        : 'white'};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(to bottom, var(--brand-primary), var(--brand-primary-dark, #1d4ed8));
        opacity: ${props => props.$isSelected ? 1 : 0};
        transition: opacity ${props => props.theme.transitions.fast};
    }

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
        border-color: ${props => props.$isSelected ? 'var(--brand-primary)' : 'rgba(59, 130, 246, 0.3)'};

        &::before {
            opacity: 1;
        }
    }

    &:active {
        transform: translateY(0);
    }
`;

const TemplateName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
    letter-spacing: -0.01em;
`;

const TemplateDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    line-height: 1.5;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const AddTemplateButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark, #1d4ed8) 100%);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
    margin-top: ${props => props.theme.spacing.md};

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
    }

    &:active {
        transform: translateY(0);
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const EmptyState = styled.div`
    padding: ${props => props.theme.spacing.xl} ${props => props.theme.spacing.lg};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    background: linear-gradient(135deg, rgb(249, 250, 251) 0%, rgb(243, 244, 246) 100%);
    border-radius: ${props => props.theme.radii.lg};
    border: 2px dashed ${props => props.theme.colors.border};
    line-height: 1.6;

    &::before {
        content: '📄';
        display: block;
        font-size: 48px;
        margin-bottom: ${props => props.theme.spacing.md};
        opacity: 0.5;
    }
`;

const TemplateActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const SmallButton = styled.button<{ $variant?: 'danger' }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid ${props => props.$variant === 'danger' ? props.theme.colors.error : 'rgb(209, 213, 219)'};
    background: white;
    color: ${props => props.$variant === 'danger' ? props.theme.colors.error : props.theme.colors.text};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &:hover {
        background: ${props => props.$variant === 'danger' ? 'rgb(254, 242, 242)' : 'rgb(249, 250, 251)'};
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-color: ${props => props.$variant === 'danger' ? props.theme.colors.error : 'rgb(156, 163, 175)'};
    }

    &:active {
        transform: translateY(0);
    }
`;

const FileUploadArea = styled.div`
    border: 3px dashed ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    background: linear-gradient(135deg, rgb(249, 250, 251) 0%, rgb(243, 244, 246) 100%);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%);
        opacity: 0;
        transition: opacity ${props => props.theme.transitions.fast};
    }

    &:hover {
        border-color: var(--brand-primary);
        border-width: 3px;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);

        &::before {
            opacity: 1;
        }
    }
`;

const FileInput = styled.input`
    display: none;
`;

const UploadIcon = styled.div`
    width: 64px;
    height: 64px;
    margin: 0 auto ${props => props.theme.spacing.md};
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(219, 234, 254) 100%);
    color: var(--brand-primary);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    position: relative;
    z-index: 1;

    svg {
        width: 32px;
        height: 32px;
    }
`;

const UploadText = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
    font-weight: 600;
    margin-bottom: ${props => props.theme.spacing.xs};
    position: relative;
    z-index: 1;
`;

const UploadHint = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    position: relative;
    z-index: 1;
`;

const FilePreview = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, white 0%, rgb(249, 250, 251) 100%);
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const FileIcon = styled.div`
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${props => props.theme.radii.md};
    background: linear-gradient(135deg, rgb(254, 242, 242) 0%, rgb(254, 226, 226) 100%);
    color: rgb(220, 38, 38);
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.15);

    svg {
        width: 24px;
        height: 24px;
    }
`;

const FileInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const FileName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
`;

const FileSize = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    margin-top: ${props => props.theme.spacing.xs};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
`;

const RemoveFileButton = styled.button`
    padding: ${props => props.theme.spacing.sm};
    background: white;
    border: 1px solid rgb(254, 226, 226);
    color: ${props => props.theme.colors.error};
    cursor: pointer;
    border-radius: ${props => props.theme.radii.md};
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &:hover {
        background: rgb(254, 242, 242);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(220, 38, 38, 0.15);
        border-color: ${props => props.theme.colors.error};
    }

    &:active {
        transform: translateY(0);
    }

    svg {
        width: 18px;
        height: 18px;
        display: block;
    }
`;

const DownloadLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: var(--brand-primary);
    text-decoration: none;
    border-radius: ${props => props.theme.radii.md};
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;

    &:hover {
        background: rgb(239, 246, 255);
        border-color: rgba(59, 130, 246, 0.2);
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

// Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const UploadCloudIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const FilePdfIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

interface ProtocolTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ProtocolTemplate[];
    onSuccess?: () => void;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const ProtocolTemplateModal = ({
    isOpen,
    onClose,
    templates,
    onSuccess,
}: ProtocolTemplateModalProps) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ProtocolTemplate | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const createMutation = useCreateProtocolTemplate();
    const updateMutation = useUpdateProtocolTemplate();
    const deleteMutation = useDeleteProtocolTemplate();

    const resetForm = () => {
        setName('');
        setDescription('');
        setSelectedFile(null);
        setErrors({});
        setEditingTemplate(null);
        setIsCreating(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleEdit = (template: ProtocolTemplate) => {
        setEditingTemplate(template);
        setName(template.name);
        setDescription(template.description || '');
        setSelectedFile(null);
        setIsCreating(true);
    };

    const handleDelete = async (template: ProtocolTemplate) => {
        if (!confirm(`Czy na pewno chcesz usunąć szablon "${template.name}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(template.id);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to delete template:', error);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            setErrors({ file: 'Tylko pliki PDF są dozwolone' });
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setErrors({ file: 'Plik jest za duży. Maksymalny rozmiar to 10 MB' });
            return;
        }

        setSelectedFile(file);
        setErrors({});
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            setErrors({ file: 'Tylko pliki PDF są dozwolone' });
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setErrors({ file: 'Plik jest za duży. Maksymalny rozmiar to 10 MB' });
            return;
        }

        setSelectedFile(file);
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim() || name.trim().length < 3) {
            newErrors.name = 'Nazwa musi mieć co najmniej 3 znaki';
        }

        if (!editingTemplate && !selectedFile) {
            newErrors.file = 'Plik PDF szablonu jest wymagany';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (editingTemplate) {
                // Update existing template (no file upload on update)
                await updateMutation.mutateAsync({
                    id: editingTemplate.id,
                    data: {
                        name: name.trim(),
                        description: description.trim() || undefined,
                    },
                });
            } else {
                // Create new template with file upload
                await createMutation.mutateAsync({
                    data: {
                        name: name.trim(),
                        description: description.trim() || undefined,
                    },
                    file: selectedFile,
                });
            }
            resetForm();
            onSuccess?.();
        } catch (error) {
            console.error('Failed to save template:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Wystąpił błąd podczas zapisywania szablonu';
            setErrors({ submit: errorMessage });
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Zarządzaj szablonami protokołów"
        >
            <ModalContent>
                {!isCreating ? (
                    <Section>
                        <SectionTitle>Dostępne szablony</SectionTitle>
                        {templates.length === 0 ? (
                            <EmptyState>
                                Brak szablonów. Dodaj pierwszy szablon, aby móc tworzyć reguły dokumentacji.
                            </EmptyState>
                        ) : (
                            <TemplateList>
                                {templates.map(template => (
                                    <TemplateCard key={template.id} $isSelected={false}>
                                        <TemplateName>{template.name}</TemplateName>
                                        {template.description && (
                                            <TemplateDescription>{template.description}</TemplateDescription>
                                        )}
                                        {template.templateUrl && (
                                            <div style={{ marginTop: '8px' }}>
                                                <DownloadLink
                                                    href={template.templateUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <FilePdfIcon />
                                                    Podgląd PDF
                                                </DownloadLink>
                                            </div>
                                        )}
                                        <TemplateActions>
                                            <SmallButton onClick={() => handleEdit(template)}>
                                                Edytuj
                                            </SmallButton>
                                            <SmallButton
                                                $variant="danger"
                                                onClick={() => handleDelete(template)}
                                            >
                                                Usuń
                                            </SmallButton>
                                        </TemplateActions>
                                    </TemplateCard>
                                ))}
                            </TemplateList>
                        )}
                        <AddTemplateButton onClick={() => setIsCreating(true)}>
                            <PlusIcon />
                            Dodaj nowy szablon
                        </AddTemplateButton>
                    </Section>
                ) : (
                    <Section>
                        <SectionTitle>
                            {editingTemplate ? 'Edytuj szablon' : 'Dodaj nowy szablon'}
                        </SectionTitle>
                        <Form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Label>Nazwa szablonu *</Label>
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="np. Regulamin ogólny, Zgoda na korekta lakieru..."
                                />
                                {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Opis</Label>
                                <TextArea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Opcjonalny opis szablonu..."
                                    rows={3}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Szablon PDF *</Label>

                                {/* Hidden file input */}
                                <FileInput
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileSelect}
                                />

                                {/* Show upload area or file preview */}
                                {!selectedFile && !editingTemplate?.templateUrl ? (
                                    <FileUploadArea
                                        onClick={handleUploadClick}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <UploadIcon>
                                            <UploadCloudIcon />
                                        </UploadIcon>
                                        <UploadText>Kliknij aby wybrać plik PDF</UploadText>
                                        <UploadHint>lub przeciągnij i upuść (maks. 10 MB)</UploadHint>
                                    </FileUploadArea>
                                ) : selectedFile ? (
                                    <FilePreview>
                                        <FileIcon>
                                            <FilePdfIcon />
                                        </FileIcon>
                                        <FileInfo>
                                            <FileName>{selectedFile.name}</FileName>
                                            <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
                                        </FileInfo>
                                        <RemoveFileButton onClick={handleRemoveFile} type="button">
                                            <XIcon />
                                        </RemoveFileButton>
                                    </FilePreview>
                                ) : editingTemplate?.templateUrl ? (
                                    <FilePreview>
                                        <FileIcon>
                                            <FilePdfIcon />
                                        </FileIcon>
                                        <FileInfo>
                                            <FileName>{editingTemplate.name}.pdf</FileName>
                                            <FileSize>
                                                Szablon zapisany
                                                <DownloadLink
                                                    href={editingTemplate.templateUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <DownloadIcon />
                                                    Podgląd
                                                </DownloadLink>
                                            </FileSize>
                                        </FileInfo>
                                        <Button
                                            type="button"
                                            $variant="secondary"
                                            onClick={handleUploadClick}
                                            style={{ fontSize: '12px', padding: '4px 8px' }}
                                        >
                                            Zmień plik
                                        </Button>
                                    </FilePreview>
                                ) : null}

                                {errors.file && <ErrorMessage>{errors.file}</ErrorMessage>}
                            </FieldGroup>

                            {errors.submit && (
                                <ErrorMessage>{errors.submit}</ErrorMessage>
                            )}

                            <ButtonGroup>
                                <Button type="button" $variant="secondary" onClick={resetForm}>
                                    Anuluj
                                </Button>
                                <Button
                                    type="submit"
                                    $variant="primary"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Zapisywanie...'
                                        : editingTemplate
                                        ? 'Zapisz zmiany'
                                        : 'Dodaj szablon'}
                                </Button>
                            </ButtonGroup>
                        </Form>
                    </Section>
                )}
            </ModalContent>
        </Modal>
    );
};
