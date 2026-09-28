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
//
// Każde kliknięcie najpierw pyta, czy odpowiedź ma zawierać ofertę (listę usług z cenami).
// „Z ofertą" otwiera wybór usług (ReplyDraftOfferModal): wycenę leada, jeśli jest, albo
// pustą listę - wybrana lista zapisuje się na leadzie albo zakłada go z tej rozmowy.
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
import { useLead } from '../hooks/useLeads';
import type { DraftOfferLine, Lead, ReplyDraft } from '../types';
import { ReplyDraftOfferModal } from './ReplyDraftOfferModal';
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

interface ReplyDraftOfferQuestionProps {
    lead: Lead | null;
    onChoose: (withOffer: boolean) => void;
    onClose: () => void;
}

/** Pierwszy krok „Szkic AI": czy odpowiedź ma zawierać ofertę. */
export function ReplyDraftOfferQuestion({ lead, onChoose, onClose }: ReplyDraftOfferQuestionProps) {
    const [withOffer, setWithOffer] = useState<boolean | null>(null);
    const quoteCount = (lead?.services ?? []).filter(item => item.status === 'ACCEPTED').length;
    const offerDescription = quoteCount > 0
        ? `Asystent wypisze usługi z wyceny leada z cenami. W następnym kroku możesz ją zmienić.`
        : lead
            ? 'Wybierzesz usługi i rabat. Lista zostanie wyceną leada.'
            : 'Wybierzesz usługi i rabat. Rozmowa zostanie leadem z tą wyceną.';

    const option = (value: boolean, title: string, description: string) => (
        <Option
            type="button"
            $selected={withOffer === value}
            aria-pressed={withOffer === value}
            onClick={() => setWithOffer(value)}
        >
            <span className="mark">{withOffer === value && <Check size={12} strokeWidth={3} />}</span>
            <span>
                <span className="title">{title}</span>
                <span className="description">{description}</span>
            </span>
        </Option>
    );

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodać ofertę do odpowiedzi?</ModalTitle>
                    <ModalSubtitle>Oferta to lista usług z cenami w treści wiadomości.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Options role="radiogroup" aria-label="Oferta w odpowiedzi">
                    {option(true, 'Z ofertą', offerDescription)}
                    {option(false, 'Bez oferty', 'Asystent odpowie na wiadomość bez wypisywania usług i cen.')}
                </Options>
            </ModalContent>
            <ModalFooter>
                <PrimaryButton onClick={() => withOffer !== null && onChoose(withOffer)} disabled={withOffer === null}>
                    Dalej
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}

/** Wybory zebrane po drodze do szkicu; `undefined` = jeszcze nie padło pytanie. */
interface DraftFlow {
    useSentStyle?: boolean;
    offer?: DraftOfferLine[] | null;
}

interface ReplyDraftButtonProps {
    threadId: string;
    /** Czy wysyłka doklei stopkę - szkic nie ma jej wtedy powtarzać. */
    signatureAppended: boolean;
    disabled?: boolean;
    /** Lead przypięty do rozmowy (thread.leadId); null = rozmowa nie jest leadem. */
    leadId?: string | null;
    onDraft: (draft: ReplyDraft) => void;
}

export function ReplyDraftButton({ threadId, signatureAppended, disabled, leadId = null, onDraft }: ReplyDraftButtonProps) {
    const preferences = useReplyDraftPreferences();
    const savePreferences = useSaveReplyDraftPreferences();
    const draftReply = useDraftReply();
    // Ten sam cache co nagłówek rozmowy - pytanie o ofertę nie kosztuje osobnego żądania.
    const { data: lead } = useLead(leadId);
    const { showError } = useToast();
    const [step, setStep] = useState<'offer-question' | 'offer' | 'style' | null>(null);
    const [flow, setFlow] = useState<DraftFlow>({});

    const savedChoice = preferences.data?.useSentStyle ?? null;
    const busy = draftReply.isPending;
    const threadLead = leadId ? lead ?? null : null;

    const generate = (useSentStyle: boolean, offer: DraftOfferLine[] | null) => {
        if (busy) return;
        draftReply.mutate(
            { threadId, useSentStyle, signatureAppended, ...(offer ? { offer } : {}) },
            {
                // Oferta zostaje przy szkicu - „Popraw" wyśle ją znowu (z rabatami, których
                // wycena leada nie pamięta).
                onSuccess: (draft) => onDraft(offer ? { ...draft, offer } : draft),
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się przygotować szkicu', message ?? 'Spróbuj ponownie za chwilę');
                },
            }
        );
    };

    /** Następny brakujący krok albo - gdy wszystko wiadomo - sam szkic. */
    const advance = (next: DraftFlow) => {
        setFlow(next);
        if (next.offer === undefined) return setStep('offer-question');
        const useSentStyle = next.useSentStyle ?? savedChoice;
        if (useSentStyle === null) return setStep('style');
        setStep(null);
        setFlow({});
        generate(useSentStyle, next.offer);
    };

    const onMainClick = () => advance({});

    const onStyleConfirm = (useSentStyle: boolean, remember: boolean) => {
        if (remember && useSentStyle !== savedChoice) savePreferences.mutate(useSentStyle);
        advance({ ...flow, useSentStyle });
    };

    const close = () => {
        setStep(null);
        setFlow({});
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
                    onClick={() => { setFlow({}); setStep('style'); }}
                    disabled={disabled || busy || preferences.isLoading}
                    aria-label={styleLabel}
                    title={styleLabel}
                >
                    <SlidersHorizontal size={13} />
                </StyleButton>
            </Group>
            {step === 'offer-question' && (
                <ReplyDraftOfferQuestion
                    lead={threadLead}
                    onChoose={(withOffer) => (withOffer ? setStep('offer') : advance({ ...flow, offer: null }))}
                    onClose={close}
                />
            )}
            {step === 'offer' && (
                <ReplyDraftOfferModal
                    threadId={threadId}
                    lead={threadLead}
                    onClose={close}
                    onReady={(offer) => advance({ ...flow, offer })}
                />
            )}
            {step === 'style' && (
                <ReplyDraftStyleDialog
                    initialChoice={savedChoice}
                    sentMessageCount={preferences.data?.sentMessageCount ?? 0}
                    onConfirm={onStyleConfirm}
                    onClose={close}
                />
            )}
        </>
    );
}
