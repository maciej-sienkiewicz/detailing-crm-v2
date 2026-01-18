import { useState } from 'react';
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
    gap: ${props => props.theme.spacing.lg};
    max-height: 70vh;
    overflow-y: auto;
`;

const Section = styled.div`
    padding-bottom: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md} 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const TemplateList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    max-height: 300px;
    overflow-y: auto;
`;

const TemplateCard = styled.div<{ $isSelected: boolean }>`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.$isSelected ? 'var(--brand-primary)' : props.theme.colors.border};
    background: ${props => props.$isSelected ? 'rgb(239, 246, 255)' : 'white'};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        border-color: var(--brand-primary);
    }
`;

const TemplateName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const TemplateDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
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
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm};
    background: transparent;
    color: var(--brand-primary);
    border: 1px dashed var(--brand-primary);
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: rgb(239, 246, 255);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const EmptyState = styled.div`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const TemplateActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    margin-top: ${props => props.theme.spacing.sm};
`;

const SmallButton = styled.button<{ $variant?: 'danger' }>`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    border-radius: ${props => props.theme.radii.sm};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    border: 1px solid ${props => props.$variant === 'danger' ? props.theme.colors.error : props.theme.colors.border};
    background: transparent;
    color: ${props => props.$variant === 'danger' ? props.theme.colors.error : props.theme.colors.text};

    &:hover {
        background: ${props => props.$variant === 'danger' ? 'rgb(254, 242, 242)' : 'rgb(249, 250, 251)'};
    }
`;

// Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

interface ProtocolTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ProtocolTemplate[];
    onSuccess?: () => void;
}

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
    const [templateUrl, setTemplateUrl] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = useCreateProtocolTemplate();
    const updateMutation = useUpdateProtocolTemplate();
    const deleteMutation = useDeleteProtocolTemplate();

    const resetForm = () => {
        setName('');
        setDescription('');
        setTemplateUrl('');
        setErrors({});
        setEditingTemplate(null);
        setIsCreating(false);
    };

    const handleEdit = (template: ProtocolTemplate) => {
        setEditingTemplate(template);
        setName(template.name);
        setDescription(template.description || '');
        setTemplateUrl(template.templateUrl || '');
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

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim() || name.trim().length < 3) {
            newErrors.name = 'Nazwa musi mieć co najmniej 3 znaki';
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
                await updateMutation.mutateAsync({
                    id: editingTemplate.id,
                    data: {
                        name: name.trim(),
                        description: description.trim() || undefined,
                        templateUrl: templateUrl.trim() || undefined,
                    },
                });
            } else {
                await createMutation.mutateAsync({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    templateUrl: templateUrl.trim() || undefined,
                });
            }
            resetForm();
            onSuccess?.();
        } catch (error) {
            console.error('Failed to save template:', error);
            setErrors({ submit: 'Wystąpił błąd podczas zapisywania szablonu' });
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
                                <Label>URL szablonu PDF</Label>
                                <Input
                                    type="text"
                                    value={templateUrl}
                                    onChange={(e) => setTemplateUrl(e.target.value)}
                                    placeholder="/templates/protokol.pdf"
                                />
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
