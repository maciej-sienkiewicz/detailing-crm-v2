// src/modules/calendar/components/QuickColorModal.tsx

import { useState, useEffect } from 'react';
import styled from 'styled-components';

const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: opacity 0.2s ease;
`;

const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1)' : 'scale(0.95)'};
    transition: transform 0.2s ease;
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Title = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const Content = styled.div`
    padding: ${props => props.theme.spacing.xl};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surface};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const ColorPickerWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
`;

const ColorInput = styled.input`
    width: 80px;
    height: 48px;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    &::-webkit-color-swatch {
        border: none;
        border-radius: ${props => props.theme.radii.sm};
    }

    &:hover {
        border-color: ${props => props.theme.colors.primary};
    }
`;

const ColorHexInput = styled(Input)`
    font-family: monospace;
    flex: 1;
`;

const ErrorMessage = styled.div`
    color: ${props => props.theme.colors.error};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const Footer = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-top: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.md};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    border: none;

    ${props => props.$variant === 'primary' ? `
        background-color: ${props.theme.colors.primary};
        color: white;

        &:hover {
            background-color: ${props.theme.colors.primaryHover};
        }

        &:disabled {
            background-color: ${props.theme.colors.border};
            cursor: not-allowed;
        }
    ` : `
        background-color: transparent;
        color: ${props.theme.colors.text};
        border: 1px solid ${props.theme.colors.border};

        &:hover {
            background-color: ${props.theme.colors.surfaceHover};
        }
    `}
`;

const PresetColors = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const PresetColorButton = styled.button<{ $color: string }>`
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.sm};
    border: 2px solid ${props => props.theme.colors.border};
    background-color: ${props => props.$color};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        transform: scale(1.1);
        border-color: ${props => props.theme.colors.primary};
    }
`;

interface QuickColorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onColorCreate: (color: { name: string; hexColor: string }) => void;
}

const PRESET_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#84cc16', // lime
    '#f43f5e', // rose
];

export const QuickColorModal = ({ isOpen, onClose, onColorCreate }: QuickColorModalProps) => {
    const [name, setName] = useState('');
    const [hexColor, setHexColor] = useState('#3b82f6');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setName('');
            setHexColor('#3b82f6');
            setErrors({});
        }
    }, [isOpen]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        onColorCreate({
            name: name.trim(),
            hexColor,
        });

        onClose();
    };

    const handleColorChange = (newColor: string) => {
        setHexColor(newColor);
    };

    if (!isOpen) return null;

    return (
        <Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <ModalContainer $isOpen={isOpen}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Header>
                        <Title>Dodaj nowy kolor wizyty</Title>
                    </Header>

                    <Content>
                        <FieldGroup>
                            <Label>Nazwa koloru</Label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="np. Oklejanie PPF, Pilne, Mechanika..."
                                autoFocus
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
                                    onChange={(e) => handleColorChange(e.target.value.toUpperCase())}
                                    placeholder="#3B82F6"
                                />
                            </ColorPickerWrapper>
                            {errors.hexColor && <ErrorMessage>{errors.hexColor}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Predefiniowane kolory</Label>
                            <PresetColors>
                                {PRESET_COLORS.map((color) => (
                                    <PresetColorButton
                                        key={color}
                                        type="button"
                                        $color={color}
                                        onClick={() => handleColorChange(color)}
                                        title={color}
                                    />
                                ))}
                            </PresetColors>
                        </FieldGroup>
                    </Content>

                    <Footer>
                        <Button type="button" $variant="secondary" onClick={onClose}>
                            Anuluj
                        </Button>
                        <Button type="submit" $variant="primary">
                            Dodaj kolor
                        </Button>
                    </Footer>
                </form>
            </ModalContainer>
        </Overlay>
    );
};
