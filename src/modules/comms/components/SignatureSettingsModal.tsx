// src/modules/comms/components/SignatureSettingsModal.tsx
// Konfiguracja stopki zalogowanego użytkownika.
//
// Stopka należy do osoby, nie do studia: z jednej skrzynki (biuro@…) odpisuje kilka
// osób i każda podpisuje się własnym nazwiskiem i telefonem. Backend trzyma ją per
// użytkownik i sam dokleja przy wysyłce - tu edytujemy treść i to, czy przełącznik
// „Dodaj stopkę" ma startować włączony.
//
// Edycja jest tekstowa (linie zamieniamy na <br>), bo stopka to cztery linijki
// danych kontaktowych, a nie dokument - pełny edytor WYSIWYG byłby tu ciężarem.
import { useState } from 'react';
import styled from 'styled-components';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/common/components/Modal';
import { useToast } from '@/common/components/Toast';
import { useDeleteMailSignature, useMailSignature, useSaveMailSignature } from '../hooks/useComms';
import { IconButton, PrimaryButton } from './shared';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 0 8px;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 140px;
    resize: vertical;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 12px 14px;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.6;
    outline: none;
    color: ${p => p.theme.colors.text};

    &:focus { border-color: ${p => p.theme.colors.primary}; }
`;

const PreviewLabel = styled.div`
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

const Preview = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surfaceAlt};
    padding: 12px 14px;
    font-size: 14px;
    line-height: 1.6;
    color: ${p => p.theme.colors.textSecondary};
    min-height: 52px;
    overflow-wrap: anywhere;
`;

const DefaultRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    input { width: 16px; height: 16px; accent-color: ${p => p.theme.colors.primary}; cursor: pointer; }
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 4px;
`;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const textToHtml = (value: string): string =>
    `<div>${escapeHtml(value.trim()).replace(/\n/g, '<br>')}</div>`;

/** Zapisany HTML z powrotem na tekst - stopkę edytujemy tak, jak ją napisano. */
const htmlToText = (html: string | null): string => {
    if (!html) return '';
    const withBreaks = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>\s*<div>/gi, '\n');
    const parsed = new DOMParser().parseFromString(withBreaks, 'text/html');
    return (parsed.body.textContent ?? '').trim();
};

interface SignatureSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SignatureSettingsModal({ isOpen, onClose }: SignatureSettingsModalProps) {
    const { data: signature } = useMailSignature();
    const saveSignature = useSaveMailSignature();
    const deleteSignature = useDeleteMailSignature();
    const { showSuccess, showError } = useToast();

    // Modal montuje się przy otwarciu (key w rodzicu), więc stan startowy
    // bierzemy raz - bez efektu synchronizującego go z zapytaniem.
    const [text, setText] = useState(() => htmlToText(signature?.bodyHtml ?? null));
    const [enabledByDefault, setEnabledByDefault] = useState(signature?.enabledByDefault ?? true);

    const submit = () => {
        if (!text.trim()) return;
        saveSignature.mutate(
            { bodyHtml: textToHtml(text), enabledByDefault },
            {
                onSuccess: () => {
                    showSuccess('Stopka zapisana', 'Dołączysz ją przełącznikiem przy wysyłce');
                    onClose();
                },
                onError: () => showError('Nie udało się zapisać stopki', 'Spróbuj ponownie za chwilę'),
            }
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Twoja stopka">
            <Body>
                <Hint>
                    Stopka jest przypisana do Ciebie, nie do skrzynki - inne osoby w studiu
                    podpisują się własną.
                </Hint>

                <TextArea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={'Jan Kowalski\nTwojaFirma\n123 123 123'}
                    aria-label="Treść stopki"
                />

                <div>
                    <PreviewLabel>Podgląd</PreviewLabel>
                    <Preview>
                        <div>--</div>
                        {text.trim()
                            ? text.split('\n').map((line, index) => <div key={index}>{line || ' '}</div>)
                            : <span>Stopka jest pusta</span>}
                    </Preview>
                </div>

                <DefaultRow>
                    <input
                        type="checkbox"
                        checked={enabledByDefault}
                        onChange={(event) => setEnabledByDefault(event.target.checked)}
                    />
                    Dołączaj stopkę domyślnie do nowych odpowiedzi
                </DefaultRow>

                <Actions>
                    {signature?.bodyHtml ? (
                        <IconButton
                            onClick={() =>
                                deleteSignature.mutate(undefined, {
                                    onSuccess: () => {
                                        setText('');
                                        showSuccess('Stopka usunięta');
                                        onClose();
                                    },
                                })
                            }
                            disabled={deleteSignature.isPending}
                        >
                            <Trash2 /> Usuń stopkę
                        </IconButton>
                    ) : (
                        <span />
                    )}
                    <PrimaryButton onClick={submit} disabled={saveSignature.isPending || !text.trim()}>
                        {saveSignature.isPending ? 'Zapisywanie…' : 'Zapisz stopkę'}
                    </PrimaryButton>
                </Actions>
            </Body>
        </Modal>
    );
}
