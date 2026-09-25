// src/modules/vehicles/components/UploadPhotoModal.tsx
//
// Dodanie zdjęcia do galerii pojazdu. Po wyborze pliku widać miniaturę - przed
// wysłaniem da się sprawdzić, czy to właściwe ujęcie. Błąd wysyłki mówi toastem
// zamiast systemowego `alert`.

import { useState, type FormEvent } from 'react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FormField, FieldLabel, InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { useToast } from '@/common/components/Toast';
import { Button, FileDrop } from '@/common/components/ui';
import { useUploadVehiclePhoto } from '../hooks';

interface UploadPhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string;
}

export const UploadPhotoModal = ({ isOpen, onClose, vehicleId }: UploadPhotoModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const { uploadPhotoAsync, isUploading } = useUploadVehiclePhoto(vehicleId);
    const { showSuccess, showError } = useToast();

    const reset = () => {
        setFile(null);
        setDescription('');
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) return;
        try {
            await uploadPhotoAsync({ file, description: description.trim() });
            showSuccess('Zdjęcie dodane', 'Jest już w galerii pojazdu.');
            reset();
            onClose();
        } catch {
            showError('Nie udało się dodać zdjęcia', 'Spróbuj ponownie za chwilę.');
        }
    };

    const close = () => {
        if (isUploading) return;
        reset();
        onClose();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={close} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj zdjęcie</ModalTitle>
                    <ModalSubtitle>Trafi do galerii pojazdu, poza wizytami</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={close} />
            </ModalHeader>

            <ModalContent>
                <form id="upload-photo-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FileDrop
                        file={file}
                        onChange={setFile}
                        disabled={isUploading}
                        accept="image/*"
                        preview
                        title="Wybierz zdjęcie albo upuść je tutaj"
                        hint="JPG albo PNG, prosto z aparatu albo z telefonu"
                    />
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="photo-description">Opis (opcjonalnie)</FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="photo-description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Np. rysa na tylnym zderzaku przed korektą"
                                disabled={isUploading}
                            />
                        </InputShellTextArea>
                    </FormField>
                </form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={close} disabled={isUploading}>Anuluj</Button>
                <Button type="submit" form="upload-photo-form" variant="primary" disabled={!file || isUploading}>
                    {isUploading ? 'Wysyłanie...' : 'Dodaj zdjęcie'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
};
