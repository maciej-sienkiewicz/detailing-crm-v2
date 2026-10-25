// src/modules/comms/components/ReplyDraftButton.tsx
// „Napisz z AI" w kompozytorze odpowiedzi: asystent pisze projekt odpowiedzi na maila klienta.
//
// Styl szkicu steruje jedna flaga (`useSentStyle`), o którą pytamy użytkownika, zamiast
// zgadywać za niego:
//  • w moim stylu - asystent czyta wysłane odpowiedzi studia na podobne pytania i pisze
//    tak, jak pisze studio (powitanie, ton, długość, sposób podania ceny),
//  • propozycja asystenta - własna, uprzejma i konkretna odpowiedź.
// Pierwsze kliknięcie otwiera wybór; zapamiętany wybór zmienia się w ustawieniach
// skrzynki (koło zębate → „Styl szkiców AI") albo ikoną obok przycisku, gdy stoi.
//
// Przycisk jest wtórny wobec „Wyślij" (obwódka, bez wypełnienia) - krokiem następnym
// w kompozytorze pozostaje wysyłka, szkic to pomoc.
//
// Każde kliknięcie najpierw pyta, czy odpowiedź ma zawierać ofertę (listę usług z cenami).
// „Z ofertą" otwiera wybór usług (ReplyDraftOfferModal): wycenę leada, jeśli jest, albo
// pustą listę - wybrana lista zapisuje się na leadzie albo zakłada go z tej rozmowy.
// „Bez oferty" znaczy naprawdę bez cen: backend nie pokazuje wtedy asystentowi nawet
// wyceny leada. W tym samym kroku można (nie trzeba) napisać, co odpowiedź ma przekazać -
// np. „kropek na szybie nie da się usunąć, to odpryski".

import { useState } from 'react';
import styled from 'styled-components';
import { Check, Loader2, SlidersHorizontal, Sparkle, Sparkles } from 'lucide-react';
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
import { MAX_DRAFT_INSTRUCTIONS, sentMaterialHint } from '../utils/replyDraft';
import { PrimaryButton } from './shared';
import { problemDetail } from '@/core/problem';
import { useCapabilityGate } from '@/modules/subscription/hooks/useCapabilityGate';

const Group = styled.div`
    display: inline-flex;
    align-items: stretch;
`;

/* „Napisz z AI" z makiety skrzynki: biała pigułka z obwódką, gwiazdka w kolorze
   marki. Wtórny wobec „Wyślij" - szkic to pomoc, nie krok następny. */
const DraftButton = styled.button<{ $joined: boolean; $h: number; $iconOnly: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: none;
    height: ${p => p.$h}px;
    ${p => (p.$iconOnly ? `width: ${p.$h}px; padding: 0;` : `padding: 0 ${p.$h >= 44 ? 16 : 14}px;`)}
    border: 1px solid #e2e8f0;
    ${p => p.$joined && 'border-right: none;'}
    background: #ffffff;
    color: #334155;
    border-radius: ${p => (p.$joined ? '999px 0 0 999px' : '999px')};
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms;

    svg { width: 16px; height: 16px; color: #0e6fa0; }
    &:hover:not(:disabled) { background: #f8fafc; }
    &:disabled { opacity: 0.55; cursor: default; }
    &:focus-visible { outline: 2px solid #0369a1; outline-offset: 2px; }

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
    background: ${({ $selected }) => ($selected ? '#f0f6f9' : '#ffffff')};
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

/** Wskazówka dla asystenta - pod wyborem oferty, bo dotyczy treści, nie oferty. */
const Hint = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 18px;

    .label {
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .optional { font-weight: ${p => p.theme.fontWeights.normal}; color: ${p => p.theme.colors.textMuted}; }

    textarea {
        width: 100%;
        min-height: 72px;
        resize: vertical;
        box-sizing: border-box;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 9px 12px;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.45;
        color: ${p => p.theme.colors.text};
        background: #ffffff;
        outline: none;

        &::placeholder { color: ${p => p.theme.colors.textMuted}; }
        &:focus { border-color: ${p => p.theme.colors.primary}; }
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
    /**
     * 'settings' - okno otwarte z menu jako ustawienie, bez wiadomości, na którą można by
     * odpisać. Dawniej i tam stał przycisk „Napisz szkic", choć nie było czego pisać.
     */
    mode?: 'draft' | 'settings';
}

export function ReplyDraftStyleDialog({ initialChoice, sentMessageCount, onConfirm, onClose, mode = 'draft' }: ReplyDraftStyleDialogProps) {
    const settings = mode === 'settings';
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
                    <ModalSubtitle>
                        {settings
                            ? 'Tak asystent napisze każdy szkic odpowiedzi. Szkic zawsze przeczytasz i poprawisz przed wysłaniem.'
                            : 'Szkic zawsze przeczytasz i poprawisz przed wysłaniem.'}
                    </ModalSubtitle>
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
                {!settings && (
                    <Remember>
                        <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                        Zapamiętaj wybór. Zmienisz go w Ustawieniach, w „Moim koncie”.
                    </Remember>
                )}
            </ModalContent>
            <ModalFooter>
                <PrimaryButton onClick={() => choice !== null && onConfirm(choice, settings || remember)} disabled={choice === null}>
                    {settings ? 'Zapisz' : <><Sparkles size={14} /> Napisz szkic</>}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}

interface ReplyDraftOfferQuestionProps {
    lead: Lead | null;
    /** `instructions` - co odpowiedź ma przekazać; pusta wskazówka to `undefined`. */
    onChoose: (withOffer: boolean, instructions: string | undefined) => void;
    onClose: () => void;
}

/** Pierwszy krok „Szkic AI": czy odpowiedź ma zawierać ofertę i (opcjonalnie) co ma przekazać. */
export function ReplyDraftOfferQuestion({ lead, onChoose, onClose }: ReplyDraftOfferQuestionProps) {
    const [withOffer, setWithOffer] = useState<boolean | null>(null);
    const [instructions, setInstructions] = useState('');
    const choose = () => withOffer !== null && onChoose(withOffer, instructions.trim() || undefined);
    const quoteCount = (lead?.services ?? []).filter(item => item.status === 'ACCEPTED').length;
    const offerDescription = quoteCount > 0
        ? 'Asystent wpisze usługi i ceny z wyceny. W następnym kroku możesz je zmienić.'
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
                    <ModalTitle>Napisz odpowiedź z AI</ModalTitle>
                    <ModalSubtitle>Oferta to lista usług z cenami w treści wiadomości.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Options role="radiogroup" aria-label="Oferta w odpowiedzi">
                    {option(true, 'Z ofertą', offerDescription)}
                    {option(false, 'Bez oferty', 'Asystent odpowie na wiadomość bez podawania usług i cen.')}
                </Options>
                <Hint>
                    <span className="label">
                        Co przekazać klientowi? <span className="optional">(opcjonalnie)</span>
                    </span>
                    <textarea
                        aria-label="Co przekazać klientowi"
                        placeholder="Np. kropek na szybie nie da się usunąć, to odpryski"
                        value={instructions}
                        maxLength={MAX_DRAFT_INSTRUCTIONS}
                        onChange={(event) => setInstructions(event.target.value)}
                        onKeyDown={(event) => {
                            // Ctrl/⌘+Enter = „Dalej"; sam Enter łamie wiersz.
                            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                choose();
                            }
                        }}
                    />
                </Hint>
            </ModalContent>
            <ModalFooter>
                <PrimaryButton onClick={choose} disabled={withOffer === null}>
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
    /** Co odpowiedź ma przekazać klientowi - z pierwszego kroku, opcjonalnie. */
    instructions?: string;
}

interface ReplyDraftButtonProps {
    threadId: string;
    /** Czy wysyłka doklei stopkę - szkic nie ma jej wtedy powtarzać. */
    signatureAppended: boolean;
    disabled?: boolean;
    /** Lead przypięty do rozmowy (thread.leadId); null = rozmowa nie jest leadem. */
    leadId?: string | null;
    onDraft: (draft: ReplyDraft) => void;
    /** Wysokość pigułki - 40 px w karcie edytora, 44 w zwiniętym rzędzie, 48 na telefonie. */
    height?: number;
    /** Sama gwiazdka (telefon) - podpis idzie do aria-label. */
    iconOnly?: boolean;
    /**
     * Ikona stylu obok przycisku. Skrzynka „Zapytania" jej nie pokazuje - styl
     * zmienia się tam w ustawieniach (ReplyDraftStyleSettings).
     */
    showStyleButton?: boolean;
}

export function ReplyDraftButton({
    threadId,
    signatureAppended,
    disabled,
    leadId = null,
    onDraft,
    height = 40,
    iconOnly = false,
    showStyleButton = true,
}: ReplyDraftButtonProps) {
    const preferences = useReplyDraftPreferences();
    const savePreferences = useSaveReplyDraftPreferences();
    const draftReply = useDraftReply();
    const aiGate = useCapabilityGate('AI_LEAD_ASSIST');
    // Ten sam cache co nagłówek rozmowy - pytanie o ofertę nie kosztuje osobnego żądania.
    const { data: lead } = useLead(leadId);
    const { showError } = useToast();
    const [step, setStep] = useState<'offer-question' | 'offer' | 'style' | null>(null);
    const [flow, setFlow] = useState<DraftFlow>({});

    const savedChoice = preferences.data?.useSentStyle ?? null;
    const busy = draftReply.isPending;
    const threadLead = leadId ? lead ?? null : null;

    const generate = (useSentStyle: boolean, offer: DraftOfferLine[] | null, instructions: string | undefined) => {
        if (busy) return;
        draftReply.mutate(
            { threadId, useSentStyle, signatureAppended, ...(offer ? { offer } : {}), ...(instructions ? { instructions } : {}) },
            {
                // Oferta zostaje przy szkicu - „Popraw" wyśle ją znowu (z rabatami, których
                // wycena leada nie pamięta).
                onSuccess: (draft) => onDraft(offer ? { ...draft, offer } : draft),
                onError: (error) => {
                    const message =
                        problemDetail(error);
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
        generate(useSentStyle, next.offer, next.instructions);
    };

    const onMainClick = () => aiGate.run(() => advance({}));

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
            {aiGate.upsell}
            <Group>
                <DraftButton
                    type="button"
                    $joined={showStyleButton}
                    $h={height}
                    $iconOnly={iconOnly}
                    onClick={onMainClick}
                    disabled={disabled || busy || preferences.isLoading}
                    aria-label={iconOnly ? (busy ? 'Piszę szkic…' : 'Napisz odpowiedź z AI') : undefined}
                    title="Asystent przygotuje szkic odpowiedzi na ostatnią wiadomość klienta"
                >
                    {busy
                        ? <><Loader2 className="spin" />{!iconOnly && ' Piszę szkic…'}</>
                        : <><Sparkle />{!iconOnly && ' Napisz z AI'}</>}
                </DraftButton>
                {showStyleButton && (
                <StyleButton
                    type="button"
                    onClick={() => { setFlow({}); setStep('style'); }}
                    disabled={disabled || busy || preferences.isLoading}
                    aria-label={styleLabel}
                    title={styleLabel}
                >
                    <SlidersHorizontal size={13} />
                </StyleButton>
                )}
            </Group>
            {step === 'offer-question' && (
                <ReplyDraftOfferQuestion
                    lead={threadLead}
                    onChoose={(withOffer, instructions) => {
                        if (withOffer) {
                            setFlow({ ...flow, instructions });
                            setStep('offer');
                        } else {
                            advance({ ...flow, offer: null, instructions });
                        }
                    }}
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

/**
 * „Styl szkiców AI" z ustawień skrzynki: ten sam wybór co przy pierwszym szkicu,
 * bez pisania szkicu - zapisuje się jako domyślny.
 */
export function ReplyDraftStyleSettings({ onClose }: { onClose: () => void }) {
    const preferences = useReplyDraftPreferences();
    const savePreferences = useSaveReplyDraftPreferences();
    if (preferences.isLoading) return null;
    return (
        <ReplyDraftStyleDialog
            mode="settings"
            initialChoice={preferences.data?.useSentStyle ?? null}
            sentMessageCount={preferences.data?.sentMessageCount ?? 0}
            onConfirm={(useSentStyle) => {
                savePreferences.mutate(useSentStyle);
                onClose();
            }}
            onClose={onClose}
        />
    );
}
