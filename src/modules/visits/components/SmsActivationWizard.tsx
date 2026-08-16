import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { ModuleGateCard } from '@/modules/subscription/components/ModuleGate';
import { AddOnActivationDialog } from '@/modules/subscription/components/PlanChangeDialog';
import { useAddOnUnlock } from '@/modules/subscription/hooks/useAddOnUnlock';
import { useSmsCreditPackages, usePurchaseCredits } from '@/modules/settings/hooks/useSmsCredits';
import { fetchAutomationConfig, updateAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';
import { MESSAGES } from '@/modules/message-templates';
import { STARTER_SMS } from '@/modules/message-templates/starters';
import type { MessageKey } from '@/modules/message-templates';
import type { AddOnKey } from '@/modules/subscription/types';
import type { SmsReadiness, SmsRequirement, SmsRequirementId } from '../hooks/useSmsReadiness';

/**
 * Turns "you can't send this" into "here is everything it takes, let's do it".
 *
 * Every step resolves its requirement without leaving the visit, and the steps that
 * are already satisfied never appear — a studio missing only credits sees a one-step
 * dialog, not a tour of things it already bought. Whatever the caller was doing is
 * still on screen underneath, and [onReady] hands control straight back to it.
 */
interface SmsActivationWizardProps {
    isOpen: boolean;
    readiness: SmsReadiness;
    /** Which saved message the flow needs, when it is template-driven. */
    templateKey?: MessageKey;
    /** Context line under the title — the visit this is being set up for. */
    contextLabel?: string;
    onClose: () => void;
    /** Fired once nothing blocks sending, so the caller can resume its own flow. */
    onReady: () => void;
}

const STEP_TITLES: Record<SmsRequirementId, string> = {
    module: 'Moduł',
    template: 'Szablon',
    credits: 'Kredyty',
    phone: 'Telefon',
};

export function SmsActivationWizard({
    isOpen, readiness, templateKey, contextLabel, onClose, onReady,
}: SmsActivationWizardProps) {
    // The step list is frozen when the wizard opens: resolving a requirement flips it
    // to satisfied, and a list that recomputed would drop the step out from under the
    // person still looking at it.
    const [plan] = useState<SmsRequirement[]>(() => readiness.blocking.filter(r => r.fixable));
    const [stepIndex, setStepIndex] = useState(0);
    const [started, setStarted] = useState(false);

    const unresolvablePhone = readiness.blocking.some(r => r.id === 'phone');
    const current = plan[stepIndex] ?? null;
    const done = started && !current;

    const goNext = () => setStepIndex(i => i + 1);

    if (!isOpen) return null;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="560px">
            <ModalHeader>
                <IconWrap>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </IconWrap>
                <ModalTitleGroup>
                    <ModalTitle>Uruchom SMS-y dla tej wizyty</ModalTitle>
                    {contextLabel && <ModalSubtitle>{contextLabel}</ModalSubtitle>}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            {started && plan.length > 1 && !done && (
                <Steps aria-label={`Krok ${stepIndex + 1} z ${plan.length}`}>
                    {plan.map((req, i) => (
                        <Step key={req.id} $state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'todo'}>
                            <StepDot $state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'todo'}>
                                {i < stepIndex ? '✓' : i + 1}
                            </StepDot>
                            {STEP_TITLES[req.id]}
                        </Step>
                    ))}
                </Steps>
            )}

            <Body>
                {!started ? (
                    <Overview
                        readiness={readiness}
                        plan={plan}
                        unresolvablePhone={unresolvablePhone}
                    />
                ) : done ? (
                    <DonePanel />
                ) : current?.id === 'module' ? (
                    <ModuleStep readiness={readiness} />
                ) : current?.id === 'template' ? (
                    <TemplateStep templateKey={templateKey} onDone={goNext} />
                ) : current?.id === 'credits' ? (
                    <CreditsStep onDone={goNext} />
                ) : null}
            </Body>

            <ModalFooter>
                <FooterRow>
                    {!started ? (
                        <>
                            <SharedButton $variant="secondary" onClick={onClose}>
                                Nie teraz, wróć do pracy
                            </SharedButton>
                            <SharedButton
                                $variant="primary"
                                onClick={() => setStarted(true)}
                                disabled={plan.length === 0}
                            >
                                {plan.length === 0
                                    ? 'Nie ma czego konfigurować'
                                    : `Skonfiguruj (${plan.length} ${plan.length === 1 ? 'krok' : 'kroki'}) →`}
                            </SharedButton>
                        </>
                    ) : done ? (
                        <SharedButton $variant="primary" onClick={onReady}>
                            Wróć do wysyłki SMS
                        </SharedButton>
                    ) : (
                        <>
                            <SharedButton
                                $variant="secondary"
                                onClick={() => (stepIndex === 0 ? setStarted(false) : setStepIndex(i => i - 1))}
                            >
                                ← Wstecz
                            </SharedButton>
                            {/* The module step finishes in the payment dialog, not here. */}
                            {current?.id === 'module' && (
                                <SharedButton $variant="secondary" onClick={goNext}>
                                    Moduł już aktywny — dalej
                                </SharedButton>
                            )}
                        </>
                    )}
                </FooterRow>
            </ModalFooter>
        </ModalShell>
    );
}

// ─── Step 0: the whole cost, up front ────────────────────────────────────────

function Overview({ readiness, plan, unresolvablePhone }: {
    readiness: SmsReadiness;
    plan: SmsRequirement[];
    unresolvablePhone: boolean;
}) {
    return (
        <>
            <Lede>
                {plan.length === 0 && !unresolvablePhone
                    ? 'Wszystko jest już gotowe — możesz wysyłać wiadomości.'
                    : 'Aby wysyłać SMS-y, potrzebne są poniższe elementy. Przeprowadzimy Cię przez wszystkie — bez opuszczania wizyty.'}
            </Lede>

            <CheckList>
                {readiness.requirements.map(req => (
                    <CheckRow key={req.id}>
                        <StatusPill $status={req.status}>{statusLabel(req)}</StatusPill>
                        <CheckLabel>{req.label}</CheckLabel>
                        <CheckDetail>{req.detail}</CheckDetail>
                    </CheckRow>
                ))}
            </CheckList>

            {unresolvablePhone && (
                <Notice $tone="bad">
                    <NoticeTitle>Ten klient nie ma numeru telefonu</NoticeTitle>
                    Uzupełnij numer w kartotece klienta — bez niego nie wyślemy tej wiadomości,
                    nawet po skonfigurowaniu reszty.
                </Notice>
            )}
        </>
    );
}

const statusLabel = (req: SmsRequirement): string => {
    if (req.status === 'ok') return 'gotowe';
    if (req.status === 'warning') return 'mało';
    if (req.status === 'unknown') return '—';
    return req.id === 'credits' ? '0 szt.' : 'brak';
};

// ─── Step: module ────────────────────────────────────────────────────────────

function ModuleStep({ readiness }: { readiness: SmsReadiness }) {
    const { user } = useAuth();
    const unlock = useAddOnUnlock();

    const offer = readiness.upsell.find(u => u.isAvailable) ?? readiness.upsell[0] ?? null;
    const isOwner = user?.role === 'OWNER';

    return (
        <>
            <Lede>
                Wysyłka wiadomości do klientów jest osobnym modułem. Po jego włączeniu
                wrócisz dokładnie tutaj i dokończysz konfigurację.
            </Lede>

            <ModuleGateCard
                title={offer?.addOnName ?? readiness.capabilityDisplayName}
                subtitle="Odblokowuje SMS-y transakcyjne: przypomnienia, potwierdzenia i powiadomienia o gotowym pojeździe."
                benefits={[
                    'Przypomnienia przed wizytą i po niej',
                    'Powiadomienie, gdy pojazd jest gotowy do odbioru',
                    'Automatyczne potwierdzenia rezerwacji',
                ]}
                addOnKey={(offer?.addOnKey ?? null) as AddOnKey | null}
                priceCents={offer?.monthlyPriceGrossCents ?? null}
                isAvailable={offer?.isAvailable ?? false}
                isOwner={isOwner}
                onUnlock={() => offer && unlock.openUnlockDialog(offer.addOnKey, offer.addOnName)}
            />

            {unlock.dialogOpen && unlock.pendingKey && (
                <AddOnActivationDialog
                    addOnKey={unlock.pendingKey}
                    addOnName={unlock.pendingName}
                    preview={unlock.preview}
                    isLoadingPreview={unlock.loadingPreview}
                    onClose={unlock.closeDialog}
                />
            )}
        </>
    );
}

// ─── Step: template ──────────────────────────────────────────────────────────

function TemplateStep({ templateKey, onDone }: { templateKey?: MessageKey; onDone: () => void }) {
    const qc = useQueryClient();
    const { showError } = useToast();
    const spec = useMemo(() => MESSAGES.find(m => m.key === templateKey) ?? null, [templateKey]);
    const starters = (templateKey && STARTER_SMS[templateKey]) || [];

    const [choice, setChoice] = useState(0);
    const [body, setBody] = useState(starters[0] ?? '');

    const save = useMutation({
        mutationFn: async (text: string) => {
            if (!spec?.sms) throw new Error('Brak definicji szablonu');
            // PUT replaces the whole config, so start from the server's copy and change
            // only this rule — anything else would broadcast edits nobody made.
            const config = await fetchAutomationConfig();
            const ruleKey = spec.sms.ruleKey;
            const next = {
                ...config,
                [ruleKey]: { ...config[ruleKey], enabled: true, messageTemplate: text },
            };
            return updateAutomationConfig(next);
        },
        onSuccess: result => {
            qc.setQueryData(['sms-automation'], result);
            onDone();
        },
        onError: (err: unknown) => {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Nie udało się włączyć szablonu.';
            showError('Szablon niezapisany', message);
        },
    });

    if (!spec) return <Lede>Nie znaleziono definicji tej wiadomości.</Lede>;

    return (
        <>
            <Lede>
                Wybierz treść wiadomości „{spec.name}". Zapisany szablon możesz później
                dowolnie zmienić w Ustawieniach → Szablony wiadomości.
            </Lede>

            <ChoiceList>
                {starters.map((text, i) => (
                    <Choice
                        key={i}
                        type="button"
                        $selected={choice === i}
                        onClick={() => { setChoice(i); setBody(text); }}
                    >
                        <Radio $selected={choice === i} aria-hidden="true" />
                        <ChoiceText>{text}</ChoiceText>
                    </Choice>
                ))}
            </ChoiceList>

            <FieldLabel htmlFor="starter-body">Treść (możesz edytować)</FieldLabel>
            <Textarea
                id="starter-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
            />
            <Hint>
                Dostępne zmienne: {spec.sms?.placeholders.map(p => `{{${p}}}`).join(', ')}
            </Hint>

            <SharedButton
                $variant="primary"
                onClick={() => save.mutate(body)}
                disabled={!body.trim() || save.isPending}
            >
                {save.isPending ? 'Zapisywanie…' : 'Włącz ten szablon'}
            </SharedButton>
        </>
    );
}

// ─── Step: credits ───────────────────────────────────────────────────────────

function CreditsStep({ onDone }: { onDone: () => void }) {
    const { data: packages, isLoading } = useSmsCreditPackages();
    const purchase = usePurchaseCredits();
    const { showSuccess, showError } = useToast();
    const [selected, setSelected] = useState<string | null>(null);

    const chosen = selected ?? packages?.[Math.min(1, (packages?.length ?? 1) - 1)]?.id ?? null;

    const buy = () => {
        if (!chosen) return;
        purchase.mutate(chosen, {
            onSuccess: result => {
                showSuccess('Kredyty doładowane', `Dostępne: ${result.availableCredits} szt.`);
                onDone();
            },
            onError: (err: unknown) => {
                const message =
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'Nie udało się doładować kredytów.';
                showError('Doładowanie nieudane', message);
            },
        });
    };

    return (
        <>
            <Lede>Ostatni krok: doładuj kredyty, z których wyślemy tę i kolejne wiadomości.</Lede>

            {isLoading ? (
                <Lede>Wczytywanie pakietów…</Lede>
            ) : (
                <ChoiceList>
                    {(packages ?? []).map(pkg => (
                        <Choice
                            key={pkg.id}
                            type="button"
                            $selected={chosen === pkg.id}
                            onClick={() => setSelected(pkg.id)}
                        >
                            <Radio $selected={chosen === pkg.id} aria-hidden="true" />
                            <ChoiceText>
                                <strong>{pkg.creditAmount} SMS</strong>
                                <ChoiceSub>{pkg.name}</ChoiceSub>
                            </ChoiceText>
                            <Price>{pkg.priceGross.toFixed(2).replace('.', ',')} {pkg.currency}</Price>
                        </Choice>
                    ))}
                </ChoiceList>
            )}

            <Notice $tone="good">
                <NoticeTitle>Po zakupie wrócisz dokładnie tutaj</NoticeTitle>
                Wiadomość dla tej wizyty będzie gotowa do zatwierdzenia jednym kliknięciem.
            </Notice>

            <SharedButton
                $variant="primary"
                onClick={buy}
                disabled={!chosen || purchase.isPending}
            >
                {purchase.isPending ? 'Doładowywanie…' : 'Kup i dokończ konfigurację'}
            </SharedButton>
        </>
    );
}

// ─── Done ────────────────────────────────────────────────────────────────────

function DonePanel() {
    return (
        <DoneWrap>
            <DoneMark>✓</DoneMark>
            <DoneTitle>Gotowe — SMS-y są uruchomione</DoneTitle>
            <Lede>
                Wracamy do wysyłki dla tej wizyty. Wszystko, co przed chwilą włączyłeś,
                działa też dla kolejnych wizyt.
            </Lede>
        </DoneWrap>
    );
}

// ─── Styled ──────────────────────────────────────────────────────────────────

const IconWrap = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 14px; height: 14px; }
`;

const Body = styled.div`
    padding: 20px;
    overflow-y: auto;
    overscroll-behavior: contain;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;

    @media (max-width: 640px) { padding: 16px; }
`;

const Lede = styled.p`
    margin: 0;
    font-size: 13px;
    color: #475569;
    line-height: 1.6;
`;

const Steps = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px 0;
    flex-wrap: wrap;
`;

type StepState = 'done' | 'now' | 'todo';

const Step = styled.span<{ $state: StepState }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: ${p => (p.$state === 'now' ? 600 : 500)};
    color: ${p => (p.$state === 'now' ? '#0f172a' : '#94a3b8')};
`;

const StepDot = styled.span<{ $state: StepState }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    background: ${p => (p.$state === 'done' ? '#10b981' : 'white')};
    color: ${p => (p.$state === 'done' ? 'white' : p.$state === 'now' ? '#0ea5e9' : '#94a3b8')};
    border: 1.5px solid ${p => (p.$state === 'done' ? '#10b981' : p.$state === 'now' ? '#0ea5e9' : '#e2e8f0')};
`;

const CheckList = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
`;

const CheckRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 13px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }
`;

const StatusPill = styled.span<{ $status: string }>`
    flex-shrink: 0;
    min-width: 56px;
    text-align: center;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    ${p => {
        switch (p.$status) {
            case 'ok':      return 'background: rgba(16,185,129,0.12); color: #059669;';
            case 'warning': return 'background: rgba(245,158,11,0.14); color: #d97706;';
            case 'missing': return 'background: rgba(239,68,68,0.1); color: #dc2626;';
            default:        return 'background: #f1f5f9; color: #94a3b8;';
        }
    }}
`;

const CheckLabel = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: #0f172a;
`;

const CheckDetail = styled.span`
    flex-shrink: 0;
    font-size: 11.5px;
    color: #94a3b8;
`;

const Notice = styled.div<{ $tone: 'good' | 'bad' | 'warn' }>`
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 12.5px;
    line-height: 1.55;
    ${p => {
        switch (p.$tone) {
            case 'good': return 'border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.07); color: #065f46;';
            case 'bad':  return 'border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.06); color: #7f1d1d;';
            default:     return 'border: 1px solid rgba(245,158,11,0.35); background: rgba(245,158,11,0.08); color: #78350f;';
        }
    }}
`;

const NoticeTitle = styled.strong`
    display: block;
    font-weight: 700;
    margin-bottom: 2px;
`;

const ChoiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Choice = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 13px;
    text-align: left;
    font-family: inherit;
    border-radius: 10px;
    cursor: pointer;
    border: 1.5px solid ${p => (p.$selected ? '#0ea5e9' : '#e2e8f0')};
    background: ${p => (p.$selected ? 'rgba(14,165,233,0.06)' : 'white')};
    transition: border-color 150ms, background 150ms;

    &:hover { border-color: #0ea5e9; }
`;

const Radio = styled.span<{ $selected: boolean }>`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    border: ${p => (p.$selected ? '5px solid #0ea5e9' : '1.5px solid #cbd5e1')};
`;

const ChoiceText = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: #0f172a;
    line-height: 1.5;
`;

const ChoiceSub = styled.span`
    display: block;
    font-size: 11.5px;
    color: #94a3b8;
`;

const Price = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
`;

const FieldLabel = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: #334155;
`;

const Textarea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    resize: vertical;
    outline: none;

    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
`;

const Hint = styled.span`
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.5;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    flex-wrap: wrap;
`;

const DoneWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 20px 0;
`;

const DoneMark = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(16,185,129,0.12);
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
`;

const DoneTitle = styled.h3`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
`;
