import { useState } from 'react';
import styled from 'styled-components';
import { Upload } from 'lucide-react';
import { useUploadVehiclePhoto } from '../hooks';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import {
    FormField,
    FieldLabel,
    InputShellTextArea,
    BareTextArea,
} from '@/common/components/Form';

const FilePickerArea = styled.label<{ $hasFile?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
    padding: 28px 16px;
    border: 2px dashed ${props => props.$hasFile ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: 12px;
    background: ${props => props.$hasFile ? '#f0f9ff' : props.theme.colors.surfaceHover};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        background: #f0f9ff;
    }
`;

const FilePickerText = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: ${props => props.theme.colors.textSecondary};
`;

const SelectedFileLabel = styled.div`
    margin-top: 8px;
    padding: 8px 12px;
    background: #f0f9ff;
    border: 1px solid var(--brand-primary);
    border-radius: 8px;
    font-size: 13px;
    color: var(--brand-primary);
    font-weight: 500;
`;

const HiddenFileInput = styled.input`
    display: none;
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
        const selected = e.target.files?.[0];
        if (selected) setFile(selected);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        try {
            await uploadPhotoAsync({ file, description: description || '' });
            setFile(null);
            setDescription('');
            onClose();
        } catch {
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
        <ModalShell isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj zdjęcie</ModalTitle>
                    <ModalSubtitle>Prześlij zdjęcie pojazdu</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                <form id="upload-photo-form" onSubmit={handleSubmit}>
                    <FormField $fullWidth>
                        <FieldLabel>Zdjęcie *</FieldLabel>
                        <FilePickerArea as="label" $hasFile={!!file}>
                            <Upload size={24} color="var(--brand-primary)" />
                            <FilePickerText>
                                {file ? 'Zmień zdjęcie' : 'Kliknij, aby wybrać zdjęcie'}
                            </FilePickerText>
                            <HiddenFileInput
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </FilePickerArea>
                        {file && <SelectedFileLabel>Wybrano: {file.name}</SelectedFileLabel>}
                    </FormField>

                    <FormField $fullWidth>
                        <FieldLabel htmlFor="photo-description">Opis (opcjonalnie)</FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="photo-description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Dodaj opis zdjęcia..."
                                disabled={isUploading}
                            />
                        </InputShellTextArea>
                    </FormField>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={handleClose} disabled={isUploading}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    type="submit"
                    form="upload-photo-form"
                    $variant="primary"
                    disabled={!file || isUploading}
                >
                    {isUploading ? 'Dodawanie...' : 'Dodaj zdjęcie'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
