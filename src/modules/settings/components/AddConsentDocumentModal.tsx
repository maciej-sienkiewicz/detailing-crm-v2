// src/modules/settings/components/AddConsentDocumentModal.tsx
//
// „Dodaj zgodę" - zgoda zbierana od klienta raz i pamiętana między wizytami.
//
// Po stronie API to trzy wywołania: definicja zgody → wersja (zwraca podpisany
// link S3) → upload PDF pod ten link. Wcześniej błąd po pierwszym kroku zostawiał
// definicję bez pliku, a „Spróbuj jeszcze raz" tworzył drugą - na liście lądowały
// duplikaty, z których jeden nie miał dokumentu. Do tego upload do S3 nie
// sprawdzał `response.ok` (odrzucony plik = „sukces"), a błąd pokazywał się jako
// „Request failed with status code 400".
//
// Teraz: każdy błąd po utworzeniu definicji usuwa ją z powrotem (rollback), upload
// rzuca przy odrzuceniu, a okno pokazuje zdanie z backendu.

import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormField, FieldLabel, InputShell, BareInput, InputShellTextArea, BareTextArea, FormErrorMsg,
} from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { Button, FileDrop, Notice, Segmented, ui } from '@/common/components/ui';
import { consentsApi } from '@/modules/consents/api/consentsApi';
import type { ProtocolStage } from '@/modules/consents/types';
import { readableError } from './studioErrors';
import { STAGE_OPTIONS } from './documentsModel';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Optional = styled.span`
    font-weight: 400;
    color: ${ui.textMuted};
`;

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
`;

const ToggleText = styled.label`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    cursor: pointer;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 12.5px; line-height: 1.45; color: ${ui.textMuted}; }
`;

interface AddConsentDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

/** Treść okna montuje się przy każdym otwarciu - formularz zawsze startuje czysty. */
export function AddConsentDocumentModal(props: AddConsentDocumentModalProps) {
    if (!props.isOpen) return null;
    return <AddConsentDocumentModalBody {...props} />;
}

const isPdf = (f: File) => f.type === 'application/pdf' || (f.type === '' && /\.pdf$/i.test(f.name));

function AddConsentDocumentModalBody({ onClose, onSuccess }: AddConsentDocumentModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [stage, setStage] = useState<ProtocolStage>('CHECK_IN');
    const [isMandatory, setIsMandatory] = useState(false);
    const [requiresResign, setRequiresResign] = useState(false);
    const [errors, setErrors] = useState<{ file?: string; name?: string }>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess } = useToast();

    const pickFile = (picked: File | null) => {
        if (!picked) {
            setFile(null);
            return;
        }
        if (!isPdf(picked)) {
            setErrors(prev => ({ ...prev, file: 'Zgoda musi być plikiem PDF.' }));
            return;
        }
        if (picked.size > MAX_PDF_BYTES) {
            setErrors(prev => ({ ...prev, file: 'Plik jest za duży. PDF może mieć najwyżej 10 MB.' }));
            return;
        }
        setFile(picked);
        setErrors(prev => ({ ...prev, file: undefined }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        const next: { file?: string; name?: string } = {};
        if (!file) next.file = 'Dodaj plik PDF ze zgodą.';
        if (name.trim().length < 3) next.name = 'Nazwa musi mieć co najmniej 3 znaki.';
        setErrors(next);
        if (next.file || next.name || !file) return;

        setIsSubmitting(true);
        let definitionId: string | undefined;
        try {
            const definition = await consentsApi.createConsentDefinition({
                name: name.trim(),
                description: description.trim() || undefined,
                stage,
                isMandatory,
            });
            definitionId = definition.id;

            const version = await consentsApi.addConsentVersion(definition.id, {
                requiresResign,
                setAsActive: true,
            });
            if (!version.pdfUrl) {
                throw new Error('Serwer nie przygotował miejsca na plik PDF. Spróbuj ponownie.');
            }
            await consentsApi.uploadFileToS3(version.pdfUrl, file);

            showSuccess('Zgoda dodana', `„${name.trim()}" pojawi się przy ${stage === 'CHECK_IN' ? 'przyjęciu' : 'wydaniu'} pojazdu.`);
            onSuccess?.();
            onClose();
        } catch (err) {
            let rollbackFailed = false;
            if (definitionId) {
                try {
                    await consentsApi.deleteConsentDefinition(definitionId);
                } catch {
                    rollbackFailed = true;
                }
            }
            const reason = readableError(err, 'Spróbuj ponownie za chwilę.');
            setSubmitError(rollbackFailed
                ? `${reason} Na liście zgód mogła zostać niepełna pozycja „${name.trim()}" - usuń ją przed ponowną próbą.`
                : reason);
            if (rollbackFailed) onSuccess?.();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj zgodę</ModalTitle>
                    <ModalSubtitle>Klient podpisuje ją raz, a system pamięta to przy kolejnych wizytach.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form id="add-consent-form" onSubmit={handleSubmit} noValidate>
                    <FormField>
                        <FieldLabel as="span">Plik PDF</FieldLabel>
                        <FileDrop
                            file={file}
                            onChange={pickFile}
                            accept=".pdf,application/pdf"
                            hint="PDF, do 10 MB."
                            disabled={isSubmitting}
                        />
                        {errors.file && <FormErrorMsg>{errors.file}</FormErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="add-consent-name">Nazwa zgody</FieldLabel>
                        <InputShell $hasError={!!errors.name}>
                            <BareInput
                                id="add-consent-name"
                                type="text"
                                placeholder="Np. Zgoda na treści marketingowe"
                                value={name}
                                aria-invalid={!!errors.name || undefined}
                                onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
                            />
                        </InputShell>
                        {errors.name && <FormErrorMsg>{errors.name}</FormErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="add-consent-description">
                            Opis <Optional>(opcjonalnie)</Optional>
                        </FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="add-consent-description"
                                placeholder="Czego dotyczy zgoda"
                                value={description}
                                rows={2}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </InputShellTextArea>
                    </FormField>

                    <FormField>
                        <FieldLabel as="span">Kiedy klient ją podpisuje</FieldLabel>
                        <Segmented
                            label="Etap wizyty"
                            options={STAGE_OPTIONS}
                            value={stage}
                            onChange={setStage}
                            block
                        />
                    </FormField>

                    <ToggleRow>
                        <ToggleText htmlFor="add-consent-mandatory">
                            <strong>Obowiązkowa</strong>
                            <span>Bez tej zgody nie da się dokończyć przyjęcia ani wydania.</span>
                        </ToggleText>
                        <Toggle
                            inputId="add-consent-mandatory"
                            checked={isMandatory}
                            onChange={setIsMandatory}
                            size="sm"
                        />
                    </ToggleRow>

                    <ToggleRow>
                        <ToggleText htmlFor="add-consent-resign">
                            <strong>Wymaga ponownego podpisu</strong>
                            <span>Klienci, którzy podpisali starszą wersję, podpiszą ją jeszcze raz.</span>
                        </ToggleText>
                        <Toggle
                            inputId="add-consent-resign"
                            checked={requiresResign}
                            onChange={setRequiresResign}
                            size="sm"
                        />
                    </ToggleRow>

                    {submitError && (
                        <Notice tone="danger" role="alert" title="Nie udało się dodać zgody">
                            {submitError}
                        </Notice>
                    )}
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                <Button type="submit" form="add-consent-form" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Dodawanie...' : 'Dodaj zgodę'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
