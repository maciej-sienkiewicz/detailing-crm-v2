import React, { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { Label, FieldGroup, ErrorMessage, TextArea } from '@/common/components/Form';
import {
    useCreateProtocolTemplate,
    useUpdateProtocolTemplate,
    useDeleteProtocolTemplate,
} from '../api/useProtocols';
import type { ProtocolTemplate } from '../types';

// ─── Styles ───────────────────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const SectionHeader = styled.div`
    margin-bottom: 0.5rem;
`;

const SectionLabel = styled.div`
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgb(100, 116, 139);
    margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: rgb(15, 23, 42);
    letter-spacing: -0.02em;
`;

const TemplateList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const TemplateCard = styled.div`
    position: relative;
    padding: 1.25rem;
    background: white;
    border: 1px solid rgb(226, 232, 240);
    border-radius: 0.75rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        border-color: rgb(203, 213, 225);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
`;

const TemplateCardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
`;

const TemplateInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const TemplateName = styled.div`
    font-size: 1rem;
    font-weight: 600;
    color: rgb(15, 23, 42);
    margin-bottom: 0.25rem;
    letter-spacing: -0.01em;
`;

const TemplateDescription = styled.div`
    font-size: 0.875rem;
    color: rgb(100, 116, 139);
    line-height: 1.5;
`;

const TemplateActions = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;

    ${props => props.$variant === 'primary' ? `
        background: rgb(59, 130, 246);
        color: white;
        &:hover { background: rgb(37, 99, 235); }
        &:active { background: rgb(29, 78, 216); }
    ` : props.$variant === 'danger' ? `
        background: rgb(239, 68, 68);
        color: white;
        &:hover { background: rgb(220, 38, 38); }
        &:active { background: rgb(185, 28, 28); }
    ` : `
        background: rgb(241, 245, 249);
        color: rgb(51, 65, 85);
        &:hover { background: rgb(226, 232, 240); }
        &:active { background: rgb(203, 213, 225); }
    `}

    svg { width: 14px; height: 14px; }
`;

const TextBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: rgb(59, 130, 246);
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover { background: rgb(239, 246, 255); }
    &:active { background: rgb(219, 234, 254); }

    svg { width: 14px; height: 14px; }
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const FormField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const FormLabel = styled.label`
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(51, 65, 85);
`;

const BorderlessInput = styled.input`
    width: 100%;
    padding: 0.75rem 0;
    font-size: 1.125rem;
    font-weight: 500;
    color: rgb(15, 23, 42);
    background: transparent;
    border: none;
    border-bottom: 2px solid rgb(226, 232, 240);
    outline: none;
    transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:focus { border-bottom-color: rgb(59, 130, 246); }
    &::placeholder { color: rgb(148, 163, 184); }
`;

const FileUploadArea = styled.div<{ $isDragging?: boolean }>`
    position: relative;
    border: 2px dashed ${props => props.$isDragging ? 'rgb(59, 130, 246)' : 'rgb(203, 213, 225)'};
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    background: ${props => props.$isDragging ? 'rgb(239, 246, 255)' : 'rgb(248, 250, 252)'};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        border-color: rgb(59, 130, 246);
        background: rgb(239, 246, 255);
    }
`;

const FileInputHidden = styled.input`display: none;`;

const UploadIconWrap = styled.div`
    width: 56px;
    height: 56px;
    margin: 0 auto 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgb(219, 234, 254);
    color: rgb(59, 130, 246);
    svg { width: 28px; height: 28px; }
`;

const UploadText = styled.div`
    font-size: 0.9375rem;
    font-weight: 500;
    color: rgb(51, 65, 85);
    margin-bottom: 0.25rem;
`;

const UploadHint = styled.div`
    font-size: 0.8125rem;
    color: rgb(100, 116, 139);
`;

const FilePreview = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid rgb(226, 232, 240);
    border-radius: 0.75rem;
`;

const FileIconWrap = styled.div`
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    background: rgb(254, 226, 226);
    color: rgb(220, 38, 38);
    flex-shrink: 0;
    svg { width: 22px; height: 22px; }
`;

const FileInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const FileName = styled.div`
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(15, 23, 42);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileSize = styled.div`
    font-size: 0.8125rem;
    color: rgb(100, 116, 139);
    margin-top: 0.125rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const RemoveFileBtn = styled.button`
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: rgb(100, 116, 139);
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.15s;

    &:hover {
        background: rgb(254, 226, 226);
        color: rgb(220, 38, 38);
    }

    svg { width: 18px; height: 18px; display: block; }
`;

const DownloadLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: rgb(59, 130, 246);
    text-decoration: none;
    transition: color 0.15s;

    &:hover { color: rgb(37, 99, 235); }
    svg { width: 14px; height: 14px; }
`;

const AddTemplateBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: rgb(59, 130, 246);
    background: white;
    border: 1px dashed rgb(203, 213, 225);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        border-color: rgb(59, 130, 246);
        background: rgb(239, 246, 255);
    }

    svg { width: 18px; height: 18px; }
`;

const EmptyState = styled.div`
    padding: 3rem 2rem;
    text-align: center;
    background: rgb(248, 250, 252);
    border-radius: 0.75rem;
    border: 2px dashed rgb(226, 232, 240);
`;

const EmptyText = styled.div`
    font-size: 0.9375rem;
    color: rgb(100, 116, 139);
    line-height: 1.6;
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

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

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProtocolTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ProtocolTemplate[];
    onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
    const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const createMutation = useCreateProtocolTemplate();
    const updateMutation = useUpdateProtocolTemplate();
    const deleteMutation = useDeleteProtocolTemplate();

    const resetForm = () => {
        setName('');
        setDescription('');
        setSelectedFile(undefined);
        setErrors({});
        setEditingTemplate(null);
        setIsCreating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEdit = (template: ProtocolTemplate) => {
        setEditingTemplate(template);
        setName(template.name);
        setDescription(template.description || '');
        setSelectedFile(undefined);
        setIsCreating(true);
    };

    const handleDelete = async (template: ProtocolTemplate) => {
        if (!confirm(`Czy na pewno chcesz usunąć szablon "${template.name}"?`)) return;
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
        if (file.type !== 'application/pdf') {
            setErrors({ file: 'Tylko pliki PDF są dozwolone' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrors({ file: 'Plik jest za duży. Maksymalny rozmiar to 10 MB' });
            return;
        }
        setSelectedFile(file);
        setErrors({});
    };

    const handleRemoveFile = () => {
        setSelectedFile(undefined);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setErrors({ file: 'Tylko pliki PDF są dozwolone' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
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
        if (!validateForm()) return;
        try {
            if (editingTemplate) {
                await updateMutation.mutateAsync({
                    id: editingTemplate.id,
                    data: { name: name.trim(), description: description.trim() || undefined },
                });
            } else {
                await createMutation.mutateAsync({
                    data: { name: name.trim(), description: description.trim() || undefined },
                    file: selectedFile,
                });
            }
            resetForm();
            onSuccess?.();
        } catch (error) {
            console.error('Failed to save template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania szablonu';
            setErrors({ submit: errorMessage });
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="640px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zarządzaj szablonami protokołów</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                {!isCreating ? (
                    <Section>
                        <SectionHeader>
                            <SectionLabel>Szablony dokumentów</SectionLabel>
                            <SectionTitle>Twoje szablony</SectionTitle>
                        </SectionHeader>
                        {templates.length === 0 ? (
                            <EmptyState>
                                <EmptyText>
                                    Brak szablonów. Dodaj pierwszy szablon, aby móc tworzyć reguły dokumentacji.
                                </EmptyText>
                            </EmptyState>
                        ) : (
                            <TemplateList>
                                {templates.map(template => (
                                    <TemplateCard key={template.id}>
                                        <TemplateCardHeader>
                                            <TemplateInfo>
                                                <TemplateName>{template.name}</TemplateName>
                                                {template.description && (
                                                    <TemplateDescription>{template.description}</TemplateDescription>
                                                )}
                                            </TemplateInfo>
                                            <TemplateActions>
                                                {template.templateUrl && (
                                                    <TextBtn
                                                        as="a"
                                                        href={template.templateUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <DownloadIcon />
                                                        Podgląd
                                                    </TextBtn>
                                                )}
                                                <ActionBtn onClick={() => handleEdit(template)}>
                                                    <EditIcon />
                                                    Edytuj
                                                </ActionBtn>
                                                <ActionBtn $variant="danger" onClick={() => handleDelete(template)}>
                                                    <TrashIcon />
                                                    Usuń
                                                </ActionBtn>
                                            </TemplateActions>
                                        </TemplateCardHeader>
                                    </TemplateCard>
                                ))}
                            </TemplateList>
                        )}
                        <AddTemplateBtn onClick={() => setIsCreating(true)}>
                            <PlusIcon />
                            Dodaj nowy szablon
                        </AddTemplateBtn>
                    </Section>
                ) : (
                    <Section>
                        <SectionHeader>
                            <SectionLabel>{editingTemplate ? 'Edycja szablonu' : 'Nowy szablon'}</SectionLabel>
                            <SectionTitle>{editingTemplate ? 'Edytuj szablon' : 'Dodaj nowy szablon'}</SectionTitle>
                        </SectionHeader>
                        <Form id="template-form" onSubmit={handleSubmit}>
                            <FormField>
                                <FormLabel>Nazwa szablonu</FormLabel>
                                <BorderlessInput
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="np. Regulamin ogólny, Zgoda na korektę lakieru..."
                                />
                                {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                            </FormField>

                            <FieldGroup>
                                <Label>Opis (opcjonalnie)</Label>
                                <TextArea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Krótki opis szablonu..."
                                    rows={3}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Plik PDF szablonu</Label>
                                <FileInputHidden
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileSelect}
                                />
                                {!selectedFile && !editingTemplate?.templateUrl ? (
                                    <FileUploadArea
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <UploadIconWrap><UploadCloudIcon /></UploadIconWrap>
                                        <UploadText>Kliknij aby wybrać plik PDF</UploadText>
                                        <UploadHint>lub przeciągnij i upuść (maks. 10 MB)</UploadHint>
                                    </FileUploadArea>
                                ) : selectedFile ? (
                                    <FilePreview>
                                        <FileIconWrap><FilePdfIcon /></FileIconWrap>
                                        <FileInfo>
                                            <FileName>{selectedFile.name}</FileName>
                                            <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
                                        </FileInfo>
                                        <RemoveFileBtn onClick={handleRemoveFile} type="button">
                                            <XIcon />
                                        </RemoveFileBtn>
                                    </FilePreview>
                                ) : editingTemplate?.templateUrl ? (
                                    <FilePreview>
                                        <FileIconWrap><FilePdfIcon /></FileIconWrap>
                                        <FileInfo>
                                            <FileName>{editingTemplate.name}.pdf</FileName>
                                            <FileSize>
                                                <span>Szablon zapisany</span>
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
                                        <ActionBtn type="button" onClick={() => fileInputRef.current?.click()}>
                                            Zmień plik
                                        </ActionBtn>
                                    </FilePreview>
                                ) : null}
                                {errors.file && <ErrorMessage>{errors.file}</ErrorMessage>}
                            </FieldGroup>

                            {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}
                        </Form>
                    </Section>
                )}
            </ModalContent>

            {isCreating && (
                <ModalFooter>
                    <SharedButton type="button" $variant="secondary" $size="sm" onClick={resetForm}>
                        Anuluj
                    </SharedButton>
                    <SharedButton type="submit" form="template-form" $variant="primary" $size="sm" disabled={isSaving}>
                        {isSaving ? 'Zapisywanie...' : editingTemplate ? 'Zapisz zmiany' : 'Dodaj szablon'}
                    </SharedButton>
                </ModalFooter>
            )}
        </ModalShell>
    );
};
