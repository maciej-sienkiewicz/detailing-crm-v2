// src/modules/vehicles/components/UploadVehicleDocumentModal.tsx
//
// Dodanie dokumentu do pojazdu. Wybór pliku stoi na wspólnej strefie `FileDrop`
// (ta sama co przy zdjęciu), a błąd wysyłki mówi toastem - wcześniej nieudana
// wysyłka nie mówiła nic i okno po prostu zostawało otwarte.

import { useState, type FormEvent } from 'react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { useToast } from '@/common/components/Toast';
import { Button, FileDrop } from '@/common/components/ui';
import { useUploadVehicleDocument } from '../hooks/useVehicleDocuments';

interface UploadVehicleDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string;
}

export const UploadVehicleDocumentModal = ({ isOpen, onClose, vehicleId }: UploadVehicleDocumentModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const { showSuccess, showError } = useToast();

    const reset = () => {
        setFile(null);
        setName('');
    };

    const { uploadDocument, isUploading } = useUploadVehicleDocument({
        vehicleId,
        onSuccess: () => {
            showSuccess('Dokument dodany', 'Plik jest już na liście dokumentów pojazdu.');
            reset();
            onClose();
        },
        onError: () => showError('Nie udało się dodać dokumentu', 'Sprawdź plik i spróbuj ponownie.'),
    });

    const close = () => {
        if (isUploading) return;
        reset();
        onClose();
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!file) return;
        uploadDocument({ file, vehicleId, name: name.trim() || file.name });
    };

    return (
        <ModalShell isOpen={isOpen} onClose={close} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj dokument</ModalTitle>
                    <ModalSubtitle>Dowód rejestracyjny, polisa, faktura za części</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={close} />
            </ModalHeader>

            <ModalContent>
                <form id="upload-document-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FileDrop
                        file={file}
                        onChange={setFile}
                        disabled={isUploading}
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xlsx"
                        hint="PDF, DOCX, XLSX, JPG albo PNG, do 10 MB"
                    />
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="doc-name">Nazwa na liście</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="doc-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={file ? file.name : 'Zostaw puste, żeby użyć nazwy pliku'}
                                autoComplete="off"
                                disabled={isUploading}
                            />
                        </InputShell>
                    </FormField>
                </form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={close} disabled={isUploading}>Anuluj</Button>
                <Button type="submit" form="upload-document-form" variant="primary" disabled={!file || isUploading}>
                    {isUploading ? 'Wysyłanie...' : 'Dodaj dokument'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
};
