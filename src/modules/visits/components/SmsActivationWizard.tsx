import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button, Notice, StatusPill, StepPills, ui, type PillTone } from '@/common/components/ui';
import { BareTextArea, FieldLabel, InputShellTextArea } from '@/common/components/Form';
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
 * are already satisfied never appear: a studio missing only credits sees a one-step
 * dialog, not a tour of things it already bought. Whatever the caller was doing is
 * still on screen underneath, and [onReady] hands control straight back to it.
 */
interface SmsActivationWizardProps {
    isOpen: boolean;
    readiness: SmsReadiness;
    /** Which saved message the flow needs, when it is template-driven. */
    templateKey?: MessageKey;
    /** Context line under the title: the visit this is being set up for. */
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
                <ModalTitleGroup>
                    <ModalTitle>Uruchom SMS-y dla tej wizyty</ModalTitle>
                    {contextLabel && <ModalSubtitle>{contextLabel}</ModalSubtitle>}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            {started && plan.length > 1 && !done && (
                <Steps>
                    <StepPills
                        label={`Krok ${stepIndex + 1} z ${plan.length}`}
                        steps={plan.map((req, i) => ({
                            key: req.id,
                            label: STEP_TITLES[req.id],
                            state: i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo',
                        }))}
                    />
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
                            <Button onClick={onClose}>Nie teraz</Button>
                            <Button
                                variant="primary"
                                onClick={() => setStarted(true)}
                                disabled={plan.length === 0}
                            >
                                {plan.length === 0
                                    ? 'Nie ma czego konfigurować'
                                    : plan.length === 1 ? 'Skonfiguruj, to jeden krok' : `Skonfiguruj w ${plan.length} krokach`}
                                <ArrowRight />
                            </Button>
                        </>
                    ) : done ? (
                        <Button variant="primary" onClick={onReady} style={{ marginLeft: 'auto' }}>
                            Wróć do wysyłki SMS
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => (stepIndex === 0 ? setStarted(false) : setStepIndex(i => i - 1))}
                            >
                                <ArrowLeft />Wstecz
                            </Button>
                            {/* The module step finishes in the payment dialog, not here. */}
                            {current?.id === 'module' && (
                                <Button onClick={goNext}>Moduł już aktywny, dalej</Button>
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
                    ? 'Wszystko jest już gotowe, możesz wysyłać wiadomości.'
                    : 'Aby wysyłać SMS-y, potrzebne są poniższe elementy. Przeprowadzimy Cię przez wszystkie, bez opuszczania wizyty.'}
            </Lede>

            <CheckList>
                {readiness.requirements.map(req => (
                    <CheckRow key={req.id}>
                        <CheckLabel>{req.label}</CheckLabel>
                        <CheckDetail>{req.detail}</CheckDetail>
                        <StatusPill $tone={STATUS_TONE[req.status] ?? 'neutral'}>{statusLabel(req)}</StatusPill>
                    </CheckRow>
                ))}
            </CheckList>

            {unresolvablePhone && (
                <Notice tone="danger" title="Ten klient nie ma numeru telefonu">
                    Uzupełnij numer w kartotece klienta, bez niego nie wyślemy tej wiadomości,
                    nawet po skonfigurowaniu reszty.
                </Notice>
            )}
        </>
    );
}

const statusLabel = (req: SmsRequirement): string => {
    if (req.status === 'ok') return 'Gotowe';
    if (req.status === 'warning') return 'Mało';
    if (req.status === 'unknown') return 'Później';
    return req.id === 'credits' ? 'Brak kredytów' : 'Brak';
};

const STATUS_TONE: Record<string, PillTone> = { ok: 'ok', warning: 'warn', missing: 'danger', unknown: 'neutral' };

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
            // only this rule; anything else would broadcast edits nobody made.
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
            <InputShellTextArea>
                <BareTextArea
                    id="starter-body"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={3}
                    style={{ minHeight: 84 }}
                />
            </InputShellTextArea>
            <Hint>
                Dostępne zmienne: {spec.sms?.placeholders.map(p => `{{${p}}}`).join(', ')}
            </Hint>

            {/* Krok kreatora ma jedno wypełnienie: to jego akcja, stopka niesie tylko „Wstecz". */}
            <Button
                variant="primary"
                onClick={() => save.mutate(body)}
                disabled={!body.trim() || save.isPending}
                style={{ alignSelf: 'flex-start' }}
            >
                {save.isPending ? 'Zapisywanie...' : 'Włącz ten szablon'}
            </Button>
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
                <Lede>Wczytywanie pakietów...</Lede>
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
                            <Price>{pkg.priceGross.toFixed(2).replace('.', ',')} {pkg.currency === 'PLN' ? 'zł' : pkg.currency}</Price>
                        </Choice>
                    ))}
                </ChoiceList>
            )}

            <Notice tone="ok" title="Po zakupie wrócisz dokładnie tutaj">
                Wiadomość dla tej wizyty będzie gotowa do zatwierdzenia jednym kliknięciem.
            </Notice>

            <Button
                variant="primary"
                onClick={buy}
                disabled={!chosen || purchase.isPending}
                style={{ alignSelf: 'flex-start' }}
            >
                {purchase.isPending ? 'Doładowywanie...' : 'Kup i dokończ konfigurację'}
            </Button>
        </>
    );
}

// ─── Done ────────────────────────────────────────────────────────────────────

function DonePanel() {
    return (
        <DoneWrap>
            <DoneMark><Check aria-hidden="true" /></DoneMark>
            <DoneTitle>Gotowe, SMS-y są uruchomione</DoneTitle>
            <Lede>
                Wracamy do wysyłki dla tej wizyty. Wszystko, co przed chwilą włączyłeś,
                działa też dla kolejnych wizyt.
            </Lede>
        </DoneWrap>
    );
}

// ─── Styled ──────────────────────────────────────────────────────────────────


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
    font-size: 13.5px;
    color: ${ui.textSecondary};
    line-height: 1.6;
`;

const Steps = styled.div`
    padding: 14px 20px 0;
`;




const CheckList = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    overflow: hidden;
`;

const CheckRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid ${ui.lineFaint};
    &:last-child { border-bottom: none; }
`;


const CheckLabel = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 500;
    color: ${ui.ink};
`;

const CheckDetail = styled.span`
    flex-shrink: 0;
    font-size: 12.5px;
    color: ${ui.textMuted};

    @media (max-width: 480px) { display: none; }
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
    border: 1px solid ${p => (p.$selected ? ui.brandLine : ui.line)};
    background: ${p => (p.$selected ? ui.brandTint : ui.surface)};
    transition: border-color 150ms, background 150ms;

    &:hover { border-color: ${p => (p.$selected ? ui.brandLine : ui.lineStrong)}; }
`;

const Radio = styled.span<{ $selected: boolean }>`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    border: ${p => (p.$selected ? `5px solid ${ui.brandStrong}` : '1.5px solid #cbd5e1')};
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
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Price = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
`;



const Hint = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
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
    svg { width: 22px; height: 22px; }
`;

const DoneTitle = styled.h3`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
`;
