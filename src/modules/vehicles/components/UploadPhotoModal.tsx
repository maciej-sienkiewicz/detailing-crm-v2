import { useState } from 'react';
import styled from 'styled-components';
import { useUploadVehiclePhoto } from '../hooks';

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
    background: white;
    border-radius: ${props => props.theme.radii.xl};
    padding: ${props => props.theme.spacing.xl};
    max-width: 500px;
    width: 90%;
    box-shadow: ${props => props.theme.shadows.xl};
`;

const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.full};
    border: none;
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.theme.colors.border};
        color: ${props => props.theme.colors.text};
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const TextArea = styled.textarea`
    padding: ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    min-height: 80px;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const FileInputWrapper = styled.div`
    position: relative;
`;

const FileInputLabel = styled.label`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    border: 2px dashed ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.theme.colors.surfaceHover};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        background: #f0f9ff;
    }

    svg {
        width: 24px;
        height: 24px;
        color: ${props => props.theme.colors.textMuted};
    }
`;

const FileInputText = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const SelectedFile = styled.div`
    margin-top: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm};
    background: #f0f9ff;
    border: 1px solid var(--brand-primary);
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: var(--brand-primary);
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.md};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    flex: 1;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => props.$variant === 'primary' ? `
        background: var(--brand-primary);
        color: white;

        &:hover:not(:disabled) {
            opacity: 0.9;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    ` : `
        background: ${props.theme.colors.surfaceHover};
        color: ${props.theme.colors.text};

        &:hover {
            background: ${props.theme.colors.border};
        }
    `}
`;

interface UploadPhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string;
}

export const UploadPhotoModal = ({ isOpen, onClose, vehicleId }: UploadPhotoModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const { uploadPhotoAsync, isUploading } = useUploadVehiclePhoto(vehicleId);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            await uploadPhotoAsync({
                file: file,
                description: description || '',
            });

            // Reset form
            setFile(null);
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Failed to upload photo:', error);
            // Optionally show error to user
            alert('Nie udało się dodać zdjęcia. Spróbuj ponownie.');
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            setFile(null);
            setDescription('');
            onClose();
        }
    };

    return (
        <ModalOverlay $isOpen={isOpen} onClick={handleClose}>
            <ModalContent onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Dodaj zdjęcie</ModalTitle>
                    <CloseButton onClick={handleClose} type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </CloseButton>
                </ModalHeader>

                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <Label>Zdjęcie *</Label>
                        <FileInputWrapper>
                            <FileInputLabel>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                </svg>
                                <FileInputText>
                                    {file ? 'Zmień zdjęcie' : 'Wybierz zdjęcie'}
                                </FileInputText>
                                <HiddenFileInput
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                            </FileInputLabel>
                            {file && (
                                <SelectedFile>
                                    Wybrano: {file.name}
                                </SelectedFile>
                            )}
                        </FileInputWrapper>
                    </FormGroup>

                    <FormGroup>
                        <Label>Opis (opcjonalnie)</Label>
                        <TextArea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Dodaj opis zdjęcia..."
                            disabled={isUploading}
                        />
                    </FormGroup>

                    <ButtonGroup>
                        <Button type="button" onClick={handleClose} disabled={isUploading}>
                            Anuluj
                        </Button>
                        <Button type="submit" $variant="primary" disabled={!file || isUploading}>
                            {isUploading ? 'Dodawanie...' : 'Dodaj zdjęcie'}
                        </Button>
                    </ButtonGroup>
                </Form>
            </ModalContent>
        </ModalOverlay>
    );
};
