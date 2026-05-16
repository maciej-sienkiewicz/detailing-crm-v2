import { useState } from 'react';
import styled from 'styled-components';
import { useUploadVehiclePhoto } from '../hooks';
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
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="500px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj zdjęcie</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                <Form onSubmit={handleSubmit} id="upload-photo-form">
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
                </Form>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={handleClose} disabled={isUploading}>
                    Anuluj
                </SharedButton>
                <SharedButton type="submit" form="upload-photo-form" $variant="primary" disabled={!file || isUploading}>
                    {isUploading ? 'Dodawanie...' : 'Dodaj zdjęcie'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
