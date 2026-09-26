// src/modules/settings/components/EditTemplateModal.tsx
//
// Zmiana nazwy i opisu protokołu (Ustawienia → Dokumenty i podpisy).
//
// Wcześniej było to okienko na własnej nakładce wewnątrz DocumentsSection: bez
// Escape, bez blokady przewijania tła (CLAUDE.md §3) i z dwiema cichymi pułapkami -
// nazwa krótsza niż 3 znaki po prostu nie zapisywała się bez słowa, a odrzucony
// zapis (mutateAsync bez try) zostawiał okno w stanie „nic się nie stało".

import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormField, FieldLabel, InputShell, BareInput, InputShellTextArea, BareTextArea, FormErrorMsg,
} from '@/common/components/Form';
import { useToast } from '@/common/components/Toast';
import { Button, ui } from '@/common/components/ui';
import { useUpdateProtocolTemplate } from '@/modules/protocols/api/useProtocols';
import type { ProtocolTemplate } from '@/modules/protocols/types';
import { backendMessage, shownByInterceptor } from './studioErrors';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Optional = styled.span`
    font-weight: 400;
    color: ${ui.textMuted};
`;

const MIN_TEMPLATE_NAME = 3;

interface EditTemplateModalProps {
    template: ProtocolTemplate;
    onClose: () => void;
}

export function EditTemplateModal({ template, onClose }: EditTemplateModalProps) {
    const [name, setName] = useState(template.name);
    const [description, setDescription] = useState(template.description ?? '');
    const [nameError, setNameError] = useState<string | null>(null);
    const updateTemplate = useUpdateProtocolTemplate();
    const { showSuccess, showError } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (name.trim().length < MIN_TEMPLATE_NAME) {
            setNameError(`Nazwa musi mieć co najmniej ${MIN_TEMPLATE_NAME} znaki.`);
            return;
        }
        try {
            await updateTemplate.mutateAsync({
                id: template.id,
                data: { name: name.trim(), description: description.trim() || undefined },
            });
            showSuccess('Dokument zapisany', `Nazwa „${name.trim()}" pojawi się przy kolejnych wizytach.`);
            onClose();
        } catch (err) {
            if (!shownByInterceptor(err)) {
                showError('Nie udało się zapisać dokumentu', backendMessage(err) ?? 'Spróbuj ponownie za chwilę.');
            }
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zmień nazwę dokumentu</ModalTitle>
                    <ModalSubtitle>Plik szablonu zostaje bez zmian.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form id="edit-template-form" onSubmit={handleSubmit} noValidate>
                    <FormField>
                        <FieldLabel htmlFor="edit-template-name">Nazwa dokumentu</FieldLabel>
                        <InputShell $hasError={!!nameError}>
                            <BareInput
                                id="edit-template-name"
                                type="text"
                                value={name}
                                autoFocus
                                aria-invalid={!!nameError || undefined}
                                onChange={e => { setName(e.target.value); setNameError(null); }}
                            />
                        </InputShell>
                        {nameError && <FormErrorMsg>{nameError}</FormErrorMsg>}
                    </FormField>
                    <FormField>
                        <FieldLabel htmlFor="edit-template-description">
                            Opis <Optional>(opcjonalnie)</Optional>
                        </FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="edit-template-description"
                                value={description}
                                rows={2}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </InputShellTextArea>
                    </FormField>
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                <Button type="submit" form="edit-template-form" variant="primary" disabled={updateTemplate.isPending}>
                    {updateTemplate.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
