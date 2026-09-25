// src/modules/customers/components/UploadDocumentModal.tsx
//
// Dodanie dokumentu do karty klienta. Wybór pliku stoi na wspólnej strefie
// `FileDrop` - tej samej co w oknach pojazdu. Poprzednia, własna strefa miała
// wypełnione gradientem koło ikony obok wypełnionego „Dodaj dokument", czyli dwa
// wypełnienia w jednym oknie (CLAUDE.md §2).
//
// Dwie ciche awarie poprzedniej wersji:
//  - nieudana wysyłka nie mówiła nic, okno po prostu zostawało otwarte;
//  - zamknięcie okna krzyżykiem lub „Anuluj" nie czyściło wyboru, więc po
//    ponownym otwarciu czekał w nim plik wybrany poprzednio.

import { useState, type FormEvent } from 'react';
import { useUploadDocument } from '../hooks/useUploadDocument';
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
import { FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { useToast } from '@/common/components/Toast';
import { Button, FileDrop } from '@/common/components/ui';

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
}

export const UploadDocumentModal = ({
    isOpen,
    onClose,
    customerId,
}: UploadDocumentModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const { showSuccess, showError } = useToast();

    const reset = () => {
        setFile(null);
        setName('');
    };

    const { uploadDocument, isUploading } = useUploadDocument({
        customerId,
        onSuccess: () => {
            showSuccess('Dokument dodany', 'Plik jest już na liście dokumentów klienta.');
            reset();
            onClose();
        },
        onError: () => showError('Nie udało się dodać dokumentu', 'Sprawdź plik i spróbuj ponownie.'),
    });

    // W trakcie wysyłki okna nie da się zamknąć: wynik i tak przyjdzie, a toast
    // o błędzie bez okna, w którym można ponowić, zostawia użytkownika z niczym.
    const close = () => {
        if (isUploading) return;
        reset();
        onClose();
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!file || isUploading) return;
        uploadDocument({
            file,
            customerId,
            name: name.trim() || file.name,
        });
    };

    return (
        <ModalShell isOpen={isOpen} onClose={close} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj dokument</ModalTitle>
                    <ModalSubtitle>Umowa, skan dokumentu, faktura</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={close} />
            </ModalHeader>

            <ModalContent>
                <form
                    id="upload-customer-document-form"
                    onSubmit={submit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                    <FileDrop
                        file={file}
                        onChange={setFile}
                        disabled={isUploading}
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xlsx"
                        hint="PDF, DOCX, XLSX, JPG albo PNG, do 10 MB"
                    />
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="customer-doc-name">Nazwa na liście</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="customer-doc-name"
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
                <Button
                    type="submit"
                    form="upload-customer-document-form"
                    variant="primary"
                    disabled={!file || isUploading}
                >
                    {isUploading ? 'Wysyłanie...' : 'Dodaj dokument'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
};
