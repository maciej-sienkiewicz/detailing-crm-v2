// src/modules/comms/components/ReplyDraftButton.tsx
// „Szkic AI" w kompozytorze odpowiedzi: asystent pisze projekt odpowiedzi na maila klienta.
//
// Styl szkicu steruje jedna flaga (`useSentStyle`), o którą pytamy użytkownika, zamiast
// zgadywać za niego:
//  • w moim stylu - asystent czyta wysłane odpowiedzi studia na podobne pytania i pisze
//    tak, jak pisze studio (powitanie, ton, długość, sposób podania ceny),
//  • propozycja asystenta - własna, uprzejma i konkretna odpowiedź.
// Pierwsze kliknięcie otwiera wybór; zapamiętany wybór zmienia się ikoną obok przycisku.
//
// Przycisk jest wtórny wobec „Wyślij" (obwódka, bez wypełnienia) - krokiem następnym
// w kompozytorze pozostaje wysyłka, szkic to pomoc.
import { useState } from 'react';
import styled from 'styled-components';
import { Check, Loader2, SlidersHorizontal, Sparkles } from 'lucide-react';
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
import { useToast } from '@/common/components/Toast';
import { useDraftReply, useReplyDraftPreferences, useSaveReplyDraftPreferences } from '../hooks/useReplyDraft';
import type { ReplyDraft } from '../types';
import { sentMaterialHint } from '../utils/replyDraft';
import { PrimaryButton } from './shared';

const Group = styled.div`
    display: inline-flex;
    align-items: stretch;
`;

const DraftButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    border-right: none;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full} 0 0 ${p => p.theme.radii.full};
    padding: 7px 12px 7px 14px;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: all ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.surfaceHover};
        color: ${p => p.theme.colors.text};
    }
    &:disabled { opacity: 0.55; cursor: default; }

    .spin { animation: draftSpin 900ms linear infinite; }
    @keyframes draftSpin { to { transform: rotate(360deg); } }
`;

const StyleButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textMuted};
    border-radius: 0 ${p => p.theme.radii.full} ${p => p.theme.radii.full} 0;
    padding: 0 10px 0 8px;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.surfaceHover};
        color: ${p => p.theme.colors.textSecondary};
    }
    &:disabled { opacity: 0.55; cursor: default; }
`;

const Options = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

/**
 * Karta wyboru. Wybrana dostaje odcień marki jako obwódkę i tło - nie wypełnienie:
 * jedynym wypełnionym elementem okna jest „Napisz szkic".
 */
const Option = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    text-align: left;
    border: 1.5px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
    background: ${({ $selected }) => ($selected ? '#f0f9ff' : '#ffffff')};
    border-radius: ${p => p.theme.radii.md};
    padding: 14px 16px;
    font-family: inherit;
    cursor: pointer;
    transition: border-color ${p => p.theme.transitions.fast}, background ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.primary}; }

    .mark {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-top: 1px;
        border-radius: 50%;
        border: 1.5px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
        color: ${p => p.theme.colors.primary};
    }
    .title {
        display: block;
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .description {
        display: block;
        margin-top: 4px;
        font-size: 13px;
        line-height: 1.45;
        color: ${p => p.theme.colors.textSecondary};
    }
    .meta {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const Remember = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    input { width: 15px; height: 15px; margin: 0; cursor: pointer; }
`;

interface ReplyDraftStyleDialogProps {
    initialChoice: boolean | null;
    sentMessageCount: number;
    onConfirm: (useSentStyle: boolean, remember: boolean) => void;
    onClose: () => void;
}

export function ReplyDraftStyleDialog({ initialChoice, sentMessageCount, onConfirm, onClose }: ReplyDraftStyleDialogProps) {
    const [choice, setChoice] = useState<boolean | null>(initialChoice);
    const [remember, setRemember] = useState(true);

    const option = (value: boolean, title: string, description: string, meta?: string) => (
        <Option
            type="button"
            $selected={choice === value}
            aria-pressed={choice === value}
            onClick={() => setChoice(value)}
        >
            <span className="mark">{choice === value && <Check size={12} strokeWidth={3} />}</span>
            <span>
                <span className="title">{title}</span>
                <span className="description">{description}</span>
                {meta && <span className="meta">{meta}</span>}
            </span>
        </Option>
    );

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Jak ma pisać asystent?</ModalTitle>
                    <ModalSubtitle>Szkic zawsze przeczytasz i poprawisz przed wysłaniem.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Options role="radiogroup" aria-label="Styl szkicu">
                    {option(
                        true,
                        'W moim stylu',
                        'Asystent czyta wysłane odpowiedzi na podobne pytania i pisze tak jak Ty: to samo powitanie, ton i długość.',
                        sentMaterialHint(sentMessageCount)
                    )}
                    {option(
                        false,
                        'Propozycja asystenta',
                        'Asystent proponuje własną odpowiedź: uprzejmą, konkretną i z jasnym następnym krokiem.'
                    )}
                </Options>
                <Remember>
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    Zapamiętaj wybór. Zmienisz go ikoną obok przycisku „Szkic AI".
                </Remember>
            </ModalContent>
            <ModalFooter>
                <PrimaryButton onClick={() => choice !== null && onConfirm(choice, remember)} disabled={choice === null}>
                    <Sparkles size={14} /> Napisz szkic
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}

interface ReplyDraftButtonProps {
    threadId: string;
    /** Czy wysyłka doklei stopkę - szkic nie ma jej wtedy powtarzać. */
    signatureAppended: boolean;
    disabled?: boolean;
    onDraft: (draft: ReplyDraft) => void;
}

export function ReplyDraftButton({ threadId, signatureAppended, disabled, onDraft }: ReplyDraftButtonProps) {
    const preferences = useReplyDraftPreferences();
    const savePreferences = useSaveReplyDraftPreferences();
    const draftReply = useDraftReply();
    const { showError } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);

    const savedChoice = preferences.data?.useSentStyle ?? null;
    const busy = draftReply.isPending;

    const generate = (useSentStyle: boolean) => {
        if (busy) return;
        draftReply.mutate(
            { threadId, useSentStyle, signatureAppended },
            {
                onSuccess: onDraft,
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się przygotować szkicu', message ?? 'Spróbuj ponownie za chwilę');
                },
            }
        );
    };

    const onMainClick = () => {
        if (savedChoice === null) setDialogOpen(true);
        else generate(savedChoice);
    };

    const onConfirm = (useSentStyle: boolean, remember: boolean) => {
        setDialogOpen(false);
        if (remember && useSentStyle !== savedChoice) savePreferences.mutate(useSentStyle);
        generate(useSentStyle);
    };

    const styleLabel =
        savedChoice === null ? 'Wybierz styl szkicu' : savedChoice ? 'Styl szkicu: w moim stylu' : 'Styl szkicu: propozycja asystenta';

    return (
        <>
            <Group>
                <DraftButton
                    type="button"
                    onClick={onMainClick}
                    disabled={disabled || busy || preferences.isLoading}
                    title="Asystent przygotuje szkic odpowiedzi na ostatnią wiadomość klienta"
                >
                    {busy
                        ? <><Loader2 size={14} className="spin" /> Piszę szkic…</>
                        : <><Sparkles size={14} /> Szkic AI</>}
                </DraftButton>
                <StyleButton
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    disabled={disabled || busy || preferences.isLoading}
                    aria-label={styleLabel}
                    title={styleLabel}
                >
                    <SlidersHorizontal size={13} />
                </StyleButton>
            </Group>
            {dialogOpen && (
                <ReplyDraftStyleDialog
                    initialChoice={savedChoice}
                    sentMessageCount={preferences.data?.sentMessageCount ?? 0}
                    onConfirm={onConfirm}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </>
    );
}
