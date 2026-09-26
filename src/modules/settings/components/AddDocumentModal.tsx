// src/modules/settings/components/AddDocumentModal.tsx
//
// „Dodaj dokument" - nowy protokół do podpisu przy przyjęciu albo wydaniu pojazdu.
// Trzy kroki po stronie API: szablon (z uploadem i weryfikacją pól), potem reguła
// przypinająca go do etapu. Gdy reguła się nie uda, szablon jest sprzątany - inaczej
// każda ponowna próba zostawiała w bazie osierocony szablon.
//
// Co naprawiono:
//  - etap wybrany przyciskiem przy „Wydaniu pojazdu" docierał do okna dopiero przy
//    NASTĘPNYM otwarciu: okno było zawsze zamontowane, a `useState(initialStage)`
//    czyta wartość początkową tylko raz. Teraz treść okna montuje się przy każdym
//    otwarciu, więc stan startuje od aktualnego etapu (bez setState w efekcie);
//  - rollback sprawdzał `createRule.isSuccess` z domknięcia - wartość sprzed
//    wywołania, więc zawsze `false` i sprzątanie zależało od przypadku;
//  - błąd pokazywał „Request failed with status code 400" zamiast zdania z backendu;
//  - wybór etapu to ten sam Segmented co w oknie „Dodaj zgodę" (tam był <select>).

import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormField, FieldLabel, InputShell, BareInput, InputShellTextArea, BareTextArea, FormErrorMsg,
} from '@/common/components/Form';
import { useToast } from '@/common/components/Toast';
import { Button, FileDrop, Notice, Segmented, ui } from '@/common/components/ui';
import {
    useCreateProtocolTemplate,
    useDeleteProtocolTemplate,
    useCreateProtocolRule,
} from '@/modules/protocols/api/useProtocols';
import type { ProtocolStage } from '@/modules/protocols/types';
import {
    buildRejectionMessage,
    detectFileFormat,
    validateTemplateFile,
} from '@/modules/protocols/templateFileUtils';
import { readableError } from './studioErrors';
import { STAGE_OPTIONS } from './documentsModel';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Optional = styled.span`
    font-weight: 400;
    color: ${ui.textMuted};
`;

const Hint = styled.span`
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const Rejection = styled.div`
    white-space: pre-line;
`;

interface AddDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialStage?: ProtocolStage;
    onSuccess?: () => void;
}

/** Treść okna żyje tylko, gdy okno jest otwarte - patrz komentarz na górze pliku. */
export function AddDocumentModal(props: AddDocumentModalProps) {
    if (!props.isOpen) return null;
    return <AddDocumentModalBody {...props} />;
}

function AddDocumentModalBody({ onClose, initialStage = 'CHECK_IN', onSuccess }: AddDocumentModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<ProtocolStage>(initialStage);
    const [errors, setErrors] = useState<{ name?: string; file?: string }>({});
    const [submitError, setSubmitError] = useState<{ title: string; text: string } | null>(null);

    const createTemplate = useCreateProtocolTemplate();
    const deleteTemplate = useDeleteProtocolTemplate();
    const createRule = useCreateProtocolRule();
    const { showSuccess } = useToast();

    const pickFile = (picked: File | null) => {
        if (!picked) {
            setFile(null);
            return;
        }
        const validationError = validateTemplateFile(picked);
        if (validationError) {
            setErrors(prev => ({ ...prev, file: validationError }));
            return;
        }
        setFile(picked);
        setErrors(prev => ({ ...prev, file: undefined }));
    };

    const validate = () => {
        const next: { name?: string; file?: string } = {};
        if (name.trim().length < 3) next.name = 'Nazwa musi mieć co najmniej 3 znaki.';
        if (!file) next.file = 'Dodaj plik szablonu: PDF albo HTML.';
        setErrors(next);
        return !next.name && !next.file;
    };

    /** Szablon bez reguły nie jest nigdzie widoczny - sprzątamy go, żeby ponowna próba nie zostawiała duplikatów. */
    const rollbackTemplate = async (templateId: string) => {
        try { await deleteTemplate.mutateAsync(templateId); } catch { /* best-effort: ponowna próba i tak utworzy nowy */ }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (!validate() || !file) return;

        let templateId: string | undefined;
        try {
            const result = await createTemplate.mutateAsync({
                data: {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    fileFormat: detectFileFormat(file) ?? 'PDF',
                },
                file,
            });
            templateId = result.template.id;

            // Plik nie zawiera wymaganych pól: sprzątamy szablon i pokazujemy dokładny
            // raport braków, zostawiając formularz do poprawy.
            if (result.verification?.verificationStatus === 'REJECTED') {
                await rollbackTemplate(templateId);
                setSubmitError({ title: 'W pliku brakuje wymaganych pól', text: buildRejectionMessage(result.verification) });
                return;
            }

            await createRule.mutateAsync({
                protocolTemplateId: templateId,
                triggerType: 'GLOBAL_ALWAYS',
                stage,
                displayOrder: 999,
            });

            showSuccess(
                'Dokument dodany',
                `„${name.trim()}" będzie podpisywany przy ${stage === 'CHECK_IN' ? 'przyjęciu' : 'wydaniu'} pojazdu.`,
            );
            onSuccess?.();
            onClose();
        } catch (err) {
            // Reguła się nie utworzyła (albo upload padł po utworzeniu szablonu) - szablon
            // bez reguły jest osierocony, więc go usuwamy.
            if (templateId) await rollbackTemplate(templateId);
            setSubmitError({
                title: 'Nie udało się dodać dokumentu',
                text: readableError(err, 'Spróbuj ponownie za chwilę. Niczego nie zapisaliśmy.'),
            });
        }
    };

    const isPending = createTemplate.isPending || createRule.isPending || deleteTemplate.isPending;

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj dokument</ModalTitle>
                    <ModalSubtitle>Protokół, który klient podpisze przy każdej wizycie na wybranym etapie.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form id="add-document-form" onSubmit={handleSubmit} noValidate>
                    <FormField>
                        <FieldLabel as="span">Plik szablonu</FieldLabel>
                        <FileDrop
                            file={file}
                            onChange={pickFile}
                            accept=".pdf,.html,.htm,application/pdf,text/html"
                            hint="PDF albo HTML, do 10 MB. Sprawdzimy, czy ma wszystkie wymagane pola."
                            disabled={isPending}
                        />
                        {errors.file && <FormErrorMsg>{errors.file}</FormErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="add-document-name">Nazwa dokumentu</FieldLabel>
                        <InputShell $hasError={!!errors.name}>
                            <BareInput
                                id="add-document-name"
                                type="text"
                                placeholder="Np. Protokół przyjęcia pojazdu"
                                value={name}
                                aria-invalid={!!errors.name || undefined}
                                onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
                            />
                        </InputShell>
                        {errors.name && <FormErrorMsg>{errors.name}</FormErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="add-document-description">
                            Opis <Optional>(opcjonalnie)</Optional>
                        </FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="add-document-description"
                                placeholder="Do czego służy ten dokument"
                                value={description}
                                rows={2}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </InputShellTextArea>
                    </FormField>

                    <FormField>
                        <FieldLabel as="span">Kiedy klient go podpisuje</FieldLabel>
                        <Segmented
                            label="Etap wizyty"
                            options={STAGE_OPTIONS}
                            value={stage}
                            onChange={setStage}
                            block
                        />
                        <Hint>Dokument trafi na listę tego etapu i będzie podpisywany przy każdej wizycie.</Hint>
                    </FormField>

                    {submitError && (
                        <Notice tone="danger" role="alert" title={submitError.title}>
                            <Rejection>{submitError.text}</Rejection>
                        </Notice>
                    )}
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                <Button type="submit" form="add-document-form" variant="primary" disabled={isPending}>
                    {isPending ? 'Dodawanie...' : 'Dodaj dokument'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
