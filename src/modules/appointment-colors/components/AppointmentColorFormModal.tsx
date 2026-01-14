// src/modules/appointment-colors/components/AppointmentColorFormModal.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { Input, Label, FieldGroup, ErrorMessage } from '@/common/components/Form';
import {
    useCreateAppointmentColor,
    useUpdateAppointmentColor,
} from '../hooks/useAppointmentColors';
import { t } from '@/common/i18n';
import type { AppointmentColor } from '../types';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const ColorPickerWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
`;

const ColorInput = styled.input`
    width: 80px;
    height: 40px;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    &::-webkit-color-swatch {
        border: none;
        border-radius: ${props => props.theme.radii.sm};
    }
`;

const ColorHexInput = styled(Input)`
    font-family: monospace;
`;

const Toast = styled.div<{ $show: boolean }>`
    position: fixed;
    bottom: ${props => props.$show ? props.theme.spacing.xl : '-100px'};
    left: 50%;
    transform: translateX(-50%);
    background: ${props => props.theme.colors.success};
    color: white;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    transition: bottom ${props => props.theme.transitions.normal};
    z-index: 10000;
    max-width: 90%;
    text-align: center;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

interface AppointmentColorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    color?: AppointmentColor;
    onSuccess?: () => void;
}

export const AppointmentColorFormModal = ({
    isOpen,
    onClose,
    color,
    onSuccess,
}: AppointmentColorFormModalProps) => {
    const [name, setName] = useState('');
    const [hexColor, setHexColor] = useState('#3b82f6');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showToast, setShowToast] = useState(false);

    const createMutation = useCreateAppointmentColor();
    const updateMutation = useUpdateAppointmentColor();

    useEffect(() => {
        if (isOpen) {
            if (color) {
                setName(color.name);
                setHexColor(color.hexColor);
            } else {
                setName('');
                setHexColor('#3b82f6');
            }
            setErrors({});
        }
    }, [isOpen, color]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim() || name.trim().length < 2) {
            newErrors.name = 'Nazwa koloru musi mieć co najmniej 2 znaki';
        }

        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(hexColor)) {
            newErrors.hexColor = 'Nieprawidłowy format koloru HEX (np. #3b82f6)';
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
            if (color) {
                await updateMutation.mutateAsync({
                    id: color.id,
                    data: { name: name.trim(), hexColor },
                });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
            } else {
                await createMutation.mutateAsync({
                    name: name.trim(),
                    hexColor,
                });
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to save appointment color:', error);
            setErrors({ submit: 'Wystąpił błąd podczas zapisywania koloru' });
        }
    };

    const handleColorChange = (newColor: string) => {
        setHexColor(newColor);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={color ? 'Edytuj kolor wizyty' : 'Dodaj nowy kolor wizyty'}
            >
                <Form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Label>Nazwa koloru</Label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="np. Oklejanie PPF, Pilne, Mechanika..."
                        />
                        {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Kolor (HEX)</Label>
                        <ColorPickerWrapper>
                            <ColorInput
                                type="color"
                                value={hexColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                            />
                            <ColorHexInput
                                type="text"
                                value={hexColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                placeholder="#3b82f6"
                            />
                        </ColorPickerWrapper>
                        {errors.hexColor && <ErrorMessage>{errors.hexColor}</ErrorMessage>}
                    </FieldGroup>

                    {errors.submit && (
                        <ErrorMessage>{errors.submit}</ErrorMessage>
                    )}

                    <ButtonGroup>
                        <Button type="button" $variant="secondary" onClick={onClose}>
                            Anuluj
                        </Button>
                        <Button type="submit" $variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Zapisywanie...' : color ? 'Zapisz zmiany' : 'Dodaj kolor'}
                        </Button>
                    </ButtonGroup>
                </Form>
            </Modal>

            <Toast $show={showToast}>
                ✓ Kolor został pomyślnie zaktualizowany
            </Toast>
        </>
    );
};
