/**
 * Modal for creating a new consent definition.
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal/Modal';
import { Button } from '@/common/components/Button/Button';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form/Form';
import { t } from '@/common/i18n';
import { useCreateDefinition } from '../hooks/useConsents';

interface CreateDefinitionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateDefinitionModal = ({ isOpen, onClose }: CreateDefinitionModalProps) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { createDefinition, isCreating, error: apiError } = useCreateDefinition({
        onSuccess: () => {
            handleClose();
        },
    });

    const handleClose = () => {
        setName('');
        setSlug('');
        setDescription('');
        setErrors({});
        onClose();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = t.consents.validation.nameRequired;
        } else if (name.length < 3) {
            newErrors.name = t.consents.validation.nameMin;
        } else if (name.length > 100) {
            newErrors.name = t.consents.validation.nameMax;
        }

        if (!slug.trim()) {
            newErrors.slug = t.consents.validation.slugRequired;
        } else if (slug.length < 2) {
            newErrors.slug = t.consents.validation.slugMin;
        } else if (slug.length > 50) {
            newErrors.slug = t.consents.validation.slugMax;
        } else if (!/^[a-z0-9-]+$/.test(slug)) {
            newErrors.slug = t.consents.validation.slugPattern;
        }

        if (description.length > 500) {
            newErrors.description = t.consents.validation.descriptionMax;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        createDefinition({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
        });
    };

    // Auto-generate slug from name
    const handleNameChange = (value: string) => {
        setName(value);
        if (!slug) {
            const autoSlug = value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50);
            setSlug(autoSlug);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} maxWidth="600px">
            <ModalHeader>
                <ModalTitle>{t.consents.createDefinitionModal.title}</ModalTitle>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
                <FormGrid>
                    <FieldGroup>
                        <Label>
                            {t.consents.createDefinitionModal.nameLabel}
                            <RequiredStar>*</RequiredStar>
                        </Label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder={t.consents.createDefinitionModal.namePlaceholder}
                            disabled={isCreating}
                            $hasError={!!errors.name}
                        />
                        {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>
                            {t.consents.createDefinitionModal.slugLabel}
                            <RequiredStar>*</RequiredStar>
                        </Label>
                        <Input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase())}
                            placeholder={t.consents.createDefinitionModal.slugPlaceholder}
                            disabled={isCreating}
                            $hasError={!!errors.slug}
                        />
                        {errors.slug && <ErrorMessage>{errors.slug}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroupFull>
                        <Label>{t.consents.createDefinitionModal.descriptionLabel}</Label>
                        <TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t.consents.createDefinitionModal.descriptionPlaceholder}
                            disabled={isCreating}
                            rows={3}
                            $hasError={!!errors.description}
                        />
                        {errors.description && <ErrorMessage>{errors.description}</ErrorMessage>}
                    </FieldGroupFull>
                </FormGrid>

                {apiError && (
                    <ErrorMessage>{t.consents.error.createDefinitionFailed}</ErrorMessage>
                )}

                <ModalActions>
                    <Button
                        type="button"
                        $variant="secondary"
                        onClick={handleClose}
                        disabled={isCreating}
                    >
                        {t.consents.createDefinitionModal.cancel}
                    </Button>
                    <Button type="submit" $variant="primary" disabled={isCreating}>
                        {isCreating
                            ? t.consents.createDefinitionModal.submitting
                            : t.consents.createDefinitionModal.submit}
                    </Button>
                </ModalActions>
            </Form>
        </Modal>
    );
};

const ModalHeader = styled.div`
    margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const ModalTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.lg};
`;

const FieldGroupFull = styled(FieldGroup)`
    grid-column: 1 / -1;
`;

const RequiredStar = styled.span`
    color: ${(props) => props.theme.colors.error};
    margin-left: 4px;
`;

const ModalActions = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.md};
    justify-content: flex-end;
    margin-top: ${(props) => props.theme.spacing.md};
`;
