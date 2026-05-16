// src/modules/statistics/components/CategoryFormModal.tsx
import { useState, useEffect, type FormEvent } from 'react';
import styled from 'styled-components';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalContent,
  ModalFooter,
  CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { t } from '@/common/i18n';
import type { Category } from '../types';
import { useCreateCategory, useUpdateCategory } from '../hooks/useCategories';

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.textSecondary};
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    transition: border-color ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const Textarea = styled.textarea`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    resize: vertical;
    min-height: 80px;
    transition: border-color ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const ColorPalette = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
`;

const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    border: 3px solid ${props => (props.$selected ? props.theme.colors.text : 'transparent')};
    cursor: pointer;
    transition: transform ${props => props.theme.transitions.fast};
    outline: none;

    &:hover {
        transform: scale(1.15);
    }
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
`;

const FormInner = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const COLOR_OPTIONS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
    '#6B7280', '#0EA5E9', '#A855F7', '#F43F5E',
];

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: Category;
}

export const CategoryFormModal = ({ isOpen, onClose, category }: CategoryFormModalProps) => {
    const isEdit = !!category;
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLOR_OPTIONS[4]);
    const [nameError, setNameError] = useState('');

    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const isPending = createMutation.isPending || updateMutation.isPending;

    useEffect(() => {
        if (isOpen) {
            setName(category?.name || '');
            setDescription(category?.description || '');
            setColor(category?.color || COLOR_OPTIONS[4]);
            setNameError('');
        }
    }, [isOpen, category]);

    const validate = () => {
        if (!name.trim()) {
            setNameError(t.statistics.categoryForm.nameRequired);
            return false;
        }
        if (name.trim().length < 2) {
            setNameError(t.statistics.categoryForm.nameMin);
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        const data = {
            name: name.trim(),
            description: description.trim() || null,
            color,
        };

        if (isEdit && category) {
            await updateMutation.mutateAsync({ categoryId: category.id, data });
        } else {
            await createMutation.mutateAsync(data);
        }
        onClose();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>
                        {isEdit ? t.statistics.categoryForm.titleEdit : t.statistics.categoryForm.titleCreate}
                    </ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <form onSubmit={handleSubmit}>
                <ModalContent>
                    <FormInner>
                        <FieldGroup>
                            <Label>{t.statistics.categoryForm.nameLabel}</Label>
                            <Input
                                value={name}
                                onChange={e => { setName(e.target.value); setNameError(''); }}
                                placeholder={t.statistics.categoryForm.namePlaceholder}
                                disabled={isPending}
                            />
                            {nameError && <ErrorText>{nameError}</ErrorText>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.statistics.categoryForm.descriptionLabel}</Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder={t.statistics.categoryForm.descriptionPlaceholder}
                                disabled={isPending}
                            />
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.statistics.categoryForm.colorLabel}</Label>
                            <ColorPalette>
                                {COLOR_OPTIONS.map(c => (
                                    <ColorSwatch
                                        key={c}
                                        type="button"
                                        $color={c}
                                        $selected={color === c}
                                        onClick={() => setColor(c)}
                                        disabled={isPending}
                                    />
                                ))}
                            </ColorPalette>
                        </FieldGroup>
                    </FormInner>
                </ModalContent>

                <ModalFooter>
                    <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isPending}>
                        {t.common.cancel}
                    </SharedButton>
                    <SharedButton $variant="primary" type="submit" disabled={isPending}>
                        {isPending
                            ? t.statistics.categoryForm.submitting
                            : t.common.save}
                    </SharedButton>
                </ModalFooter>
            </form>
        </ModalShell>
    );
};
