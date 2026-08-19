// src/modules/comms/components/ReplyComposer.tsx
// Odpowiedź w wątku lub nowa wiadomość. Treść jako prosty tekst zamieniany na
// bezpieczny HTML (backend i tak sanityzuje) — bez ciężkiego edytora WYSIWYG.
//
// Odpowiadając w wątku nie powtarzamy adresu odbiorcy: rozmowa ma jednego
// uczestnika, wypisanego już w nagłówku i w panelu klienta. Pole „Do" jest
// schowane pod dyskretnym przełącznikiem — na wypadek, gdy ktoś chce je sprawdzić.
import { useState } from 'react';
import styled from 'styled-components';
import { AtSign, Send } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { useSendMail } from '../hooks/useComms';
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

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const textToHtml = (value: string): string =>
    `<div>${escapeHtml(value).replace(/\n/g, '<br>')}</div>`;

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
    const { showSuccess, showError } = useToast();
    // W wątku odbiorca jest oczywisty — pokazujemy go dopiero na żądanie.
    const replyInThread = Boolean(threadId) && Boolean(initialTo);
    const [recipientShown, setRecipientShown] = useState(!replyInThread);

    const submit = () => {
        if (!body.trim()) return;
        sendMail.mutate(
            {
                threadId,
                accountId,
                to: to.split(',').map((address) => address.trim()).filter(Boolean),
                subject: subject.trim() || undefined,
                bodyHtml: textToHtml(body),
            },
            {
                onSuccess: () => {
                    setBody('');
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
                onChange={(event) => setBody(event.target.value)}
                placeholder={threadId ? 'Napisz odpowiedź…' : 'Napisz wiadomość…'}
                onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit();
                }}
            />
            <Actions>
                {replyInThread && !recipientShown ? (
                    <RecipientToggle
                        onClick={() => setRecipientShown(true)}
                        title="Pokaż pełny adres odbiorcy"
                    >
                        <AtSign size={11} /> Do: {recipientLabel ?? initialTo}
                    </RecipientToggle>
                ) : (
                    <span />
                )}
                <PrimaryButton onClick={submit} disabled={sendMail.isPending || !body.trim()}>
                    <Send size={14} />
                    {sendMail.isPending ? 'Wysyłanie…' : 'Wyślij'}
                </PrimaryButton>
            </Actions>
        </Composer>
    );
}
