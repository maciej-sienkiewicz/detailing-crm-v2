// src/modules/comms/components/ReplyComposer.tsx
// Odpowiedź w wątku lub nowa wiadomość. Treść jako prosty tekst zamieniany na
// bezpieczny HTML (backend i tak sanityzuje) — bez ciężkiego edytora WYSIWYG.
//
// Odpowiadając w wątku nie powtarzamy adresu odbiorcy: rozmowa ma jednego
// uczestnika, wypisanego już w nagłówku i w panelu klienta. Pole „Do" jest
// schowane pod dyskretnym przełącznikiem — na wypadek, gdy ktoś chce je sprawdzić.
import { useState } from 'react';
import styled from 'styled-components';
import { AtSign, Loader2, PenLine, Send, Settings2, SpellCheck, Undo2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { useMailSignature, useProofread, useSendMail } from '../hooks/useComms';
import { SignatureSettingsModal } from './SignatureSettingsModal';
import { PrimaryButton } from './shared';

const Composer = styled.div`
    border-top: 1px solid #e5e7eb;
    background: #ffffff;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6b7280;

    input {
        flex: 1;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        outline: none;

        &:focus { border-color: #9ca3af; }
    }
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 96px;
    resize: vertical;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.5;
    outline: none;

    &:focus { border-color: #9ca3af; }
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

const LeftActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

/**
 * Przełącznik stopki. Stan „włączony/wyłączony" musi być widoczny bez klikania —
 * decyzja o tym, co dokleimy do cudzej skrzynki, nie może wymagać sprawdzania.
 */
const SignatureToggle = styled.button<{ $on: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.border)};
    background: ${({ $on, theme }) => ($on ? '#f0f9ff' : theme.colors.surface)};
    color: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.full};
    padding: 6px 12px 6px 8px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.primary}; }

    .track {
        position: relative;
        width: 26px;
        height: 15px;
        flex-shrink: 0;
        border-radius: 999px;
        background: ${({ $on, theme }) => ($on ? theme.colors.primary : '#cbd5e1')};
        transition: background ${p => p.theme.transitions.fast};
    }
    .knob {
        position: absolute;
        top: 2px;
        left: ${({ $on }) => ($on ? '13px' : '2px')};
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: #ffffff;
        transition: left ${p => p.theme.transitions.fast};
    }
`;

const ConfigureButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;

    &:hover { color: ${p => p.theme.colors.textSecondary}; }
`;

const RecipientToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    color: #9ca3af;
    cursor: pointer;

    &:hover { color: #4b5563; }
`;

/** Przycisk korekty — obok „Wyślij", ale wizualnie wtórny wobec niego. */
const ProofreadButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 14px;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: all ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.surfaceHover};
        border-color: ${p => p.theme.colors.textMuted};
    }
    &:disabled { opacity: 0.55; cursor: default; }

    .spin {
        animation: proofreadSpin 900ms linear infinite;
    }
    @keyframes proofreadSpin {
        to { transform: rotate(360deg); }
    }
`;

const SendGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Końcowe (i początkowe) puste linie ucinamy przed wysyłką: kilka Enterów przed
// kliknięciem „Wyślij" zostawiało w skrzynce odbiorcy pustą przestrzeń.
const textToHtml = (value: string): string =>
    `<div>${escapeHtml(value.trim()).replace(/\n/g, '<br>')}</div>`;

interface ReplyComposerProps {
    /** Odpowiedź w istniejącym wątku… */
    threadId?: string;
    /** …albo nowa wiadomość (wymaga accountId + adresata + tematu). */
    accountId?: string;
    initialTo?: string;
    /** Nazwa odbiorcy do dyskretnej etykiety, gdy pole „Do" jest schowane. */
    recipientLabel?: string;
    requireSubject?: boolean;
    onSent?: () => void;
}

export function ReplyComposer({
    threadId,
    accountId,
    initialTo,
    recipientLabel,
    requireSubject,
    onSent,
}: ReplyComposerProps) {
    const [to, setTo] = useState(initialTo ?? '');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const sendMail = useSendMail();
    const { data: signature } = useMailSignature();
    const { showSuccess, showError } = useToast();
    const [signatureSettingsOpen, setSignatureSettingsOpen] = useState(false);
    // Ręczna decyzja użytkownika wygrywa z ustawieniem domyślnym stopki; dopóki jej
    // nie podjął, przełącznik pokazuje to, co sam skonfigurował w ustawieniach.
    const [signatureChoice, setSignatureChoice] = useState<boolean | null>(null);
    // Treść sprzed korekty — dopóki użytkownik jej nie tknął, można wrócić jednym kliknięciem.
    const [beforeProofread, setBeforeProofread] = useState<string | null>(null);
    const proofread = useProofread();
    const hasSignature = Boolean(signature?.bodyHtml);
    const appendSignature = hasSignature && (signatureChoice ?? signature?.enabledByDefault ?? false);
    // W wątku odbiorca jest oczywisty — pokazujemy go dopiero na żądanie.
    const replyInThread = Boolean(threadId) && Boolean(initialTo);
    const [recipientShown, setRecipientShown] = useState(!replyInThread);

    const runProofread = () => {
        const source = body.trim();
        if (!source || proofread.isPending) return;
        proofread.mutate(source, {
            onSuccess: (corrected) => {
                if (corrected.trim() === source) {
                    showSuccess('Bez zmian', 'Nie znaleźliśmy błędów w tej treści');
                    return;
                }
                setBeforeProofread(body);
                setBody(corrected);
                showSuccess('Poprawiono', 'Przejrzyj zmiany przed wysłaniem');
            },
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się poprawić treści', message ?? 'Spróbuj ponownie za chwilę');
            },
        });
    };

    const undoProofread = () => {
        if (beforeProofread === null) return;
        setBody(beforeProofread);
        setBeforeProofread(null);
    };

    const submit = () => {
        if (!body.trim()) return;
        sendMail.mutate(
            {
                threadId,
                accountId,
                to: to.split(',').map((address) => address.trim()).filter(Boolean),
                subject: subject.trim() || undefined,
                bodyHtml: textToHtml(body),
                appendSignature,
            },
            {
                onSuccess: () => {
                    setBody('');
                    setBeforeProofread(null);
                    showSuccess('Wysłano', 'Wiadomość trafi też do folderu Wysłane na serwerze');
                    onSent?.();
                },
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się wysłać', message ?? 'Spróbuj ponownie za chwilę');
                },
            }
        );
    };

    return (
        <Composer>
            {recipientShown && (
                <MetaRow>
                    Do:
                    <input
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                        placeholder="adres@klienta.pl"
                        disabled={replyInThread}
                    />
                </MetaRow>
            )}
            {requireSubject && (
                <MetaRow>
                    Temat:
                    <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Temat wiadomości"
                    />
                </MetaRow>
            )}
            <TextArea
                value={body}
                onChange={(event) => {
                    setBody(event.target.value);
                    setBeforeProofread(null);
                }}
                placeholder={threadId ? 'Napisz odpowiedź…' : 'Napisz wiadomość…'}
                onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit();
                }}
            />
            <Actions>
                <LeftActions>
                    {replyInThread && !recipientShown && (
                        <RecipientToggle
                            onClick={() => setRecipientShown(true)}
                            title="Pokaż pełny adres odbiorcy"
                        >
                            <AtSign size={11} /> Do: {recipientLabel ?? initialTo}
                        </RecipientToggle>
                    )}

                    {hasSignature ? (
                        <SignatureToggle
                            $on={appendSignature}
                            onClick={() => setSignatureChoice(!appendSignature)}
                            role="switch"
                            aria-checked={appendSignature}
                            title={
                                appendSignature
                                    ? 'Stopka zostanie dołączona do tej wiadomości'
                                    : 'Wyślij bez stopki'
                            }
                        >
                            <span className="track"><span className="knob" /></span>
                            Dodaj stopkę
                        </SignatureToggle>
                    ) : (
                        <ConfigureButton onClick={() => setSignatureSettingsOpen(true)}>
                            <PenLine size={12} /> Ustaw stopkę
                        </ConfigureButton>
                    )}

                    {hasSignature && (
                        <ConfigureButton
                            onClick={() => setSignatureSettingsOpen(true)}
                            title="Zmień treść stopki"
                        >
                            <Settings2 size={12} /> Zmień
                        </ConfigureButton>
                    )}
                </LeftActions>

                <SendGroup>
                    {beforeProofread !== null && (
                        <ProofreadButton onClick={undoProofread} title="Przywróć treść sprzed korekty">
                            <Undo2 size={14} /> Cofnij
                        </ProofreadButton>
                    )}
                    <ProofreadButton
                        onClick={runProofread}
                        disabled={proofread.isPending || !body.trim()}
                        title="Popraw literówki, interpunkcję i odmianę — bez zmiany treści"
                    >
                        {proofread.isPending
                            ? <><Loader2 size={14} className="spin" /> Poprawiam…</>
                            : <><SpellCheck size={14} /> Popraw błędy</>}
                    </ProofreadButton>
                    <PrimaryButton onClick={submit} disabled={sendMail.isPending || !body.trim()}>
                        <Send size={14} />
                        {sendMail.isPending ? 'Wysyłanie…' : 'Wyślij'}
                    </PrimaryButton>
                </SendGroup>
            </Actions>

            {signatureSettingsOpen && (
                <SignatureSettingsModal
                    isOpen
                    onClose={() => setSignatureSettingsOpen(false)}
                />
            )}
        </Composer>
    );
}
