// src/modules/subscription/pages/SubscriptionSettingsPage.tsx
//
// Ustawienia → Pakiet: bieżący pakiet, zmiana pakietu, moduły, historia płatności.
//
// Przed przebudową sekcja miała:
//   - własny nadtytuł wersalikami i tytuł „Abonament" pod nagłówkiem ramy, który
//     mówił już to samo;
//   - DWA wypełnione przyciski przedłużenia naraz (czerwony w banerze „wygasło"
//     i niebieski w panelu planu, z wymuszonym stylem inline), a do tego plan FULL
//     wypełniony gradientem - trzy nasycone bloki bez zwycięzcy (CLAUDE.md §2);
//   - baner „Problem z płatnością" bez żadnej akcji („zaktualizuj dane płatnicze" -
//     nie ma gdzie); tymczasem opłacenie kolejnych 30 dni (RENEWAL) przywraca stan
//     ACTIVE, więc to jest ta akcja;
//   - nieudaną wycenę planu albo modułu kwitowaną cichym zamknięciem okna;
//   - „Dezaktywuj" dwa razy dla tego samego modułu (lista aktywnych i siatka);
//   - ceny bez słowa „brutto".
//
// Teraz: jedna wyniesiona karta („Twój plan") z kwotą jako nagłówkiem, reszta płasko;
// dokładnie jeden przycisk przedłużenia - w nagłówku ramy, a przy zaległości w komunikacie,
// który tłumaczy, po co go kliknąć.
//
// Po audycie z 23.10.2026 ekran czyta pola, które serwer zwracał od dawna, a które dotąd
// ginęły: cenę KOLEJNEGO okresu (przycisk mówił 299 zł, serwer pobierał 99 zł), datę
// wyłączenia modułu i „Przywróć", „czy wolno teraz dokupić" (w karencji okna obiecywały
// zakup za darmo) oraz „czy zmianę da się odwołać".

import { useState } from 'react';
import styled from 'styled-components';
import {
    Button, Card, Notice, SectionTitle, StatusPill, SummaryStrip, ui, type PillTone,
} from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { SettingsHeaderActions } from '@/modules/settings/components/shared/SettingsHeaderActions';
import {
    useMyPlan,
    useFeaturePlans,
    useAddOns,
    useCheckout,
    useResumeAddOn,
} from '../api/subscriptionQueries';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { PlanChangeDialog, AddOnActivationDialog, AddOnDeactivationDialog, RenewDialog } from '../components/PlanChangeDialog';
import { PlanCard } from '../components/PlanCard';
import { AddOnCard } from '../components/AddOnCard';
import { PendingDowngradeBanner } from '../components/PendingDowngradeBanner';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import type { FeaturePlan, AddOnKey, AddOnDto, PlanChangePreview, AddOnPreview, BillingStatus, MyPlanResponse } from '../types';
import { daysLabel, formatCents, formatDate, monthlyPriceSuffix } from '../utils/formatters';
import { toastUnhandledError } from '../utils/apiErrors';
import { toastCheckoutProblem, useCheckoutHandoff } from '../hooks/useCheckoutHandoff';
import {
    PageWrap,
    CardBody,
    PlanHead,
    Block,
    PlansGrid,
    AddOnsGrid,
    AddOnList,
    AddOnRow,
    AddOnRowText,
    AddOnRowActions,
    Muted,
} from './SubscriptionSettingsPage.styles';
import { problemDetail } from '@/core/problem';

// ─── Billing status ──────────────────────────────────────────────────────────

const STATUS: Record<BillingStatus, { label: string; tone: PillTone }> = {
    NO_PLAN: { label: 'Bez pakietu', tone: 'neutral' },
    TRIALING: { label: 'Okres próbny', tone: 'info' },
    ACTIVE: { label: 'Aktywny', tone: 'ok' },
    PAST_DUE: { label: 'Okres minął', tone: 'warn' },
    EXPIRED: { label: 'Wygasł', tone: 'danger' },
};

const Suffix = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: ${ui.textMuted};
    margin-left: 6px;
`;

/**
 * Koniec trwającego opłaconego okresu - do niego działa wyłączany moduł. Poza nim (trial,
 * karencja) serwer wyłącza moduł od razu: ta sama reguła co `ProrationService.runningPeriodEnd`.
 */
const runningPeriodEnd = (plan: MyPlanResponse): string | null =>
    plan.billingStatus === 'ACTIVE' && plan.periodEndsAt && new Date(plan.periodEndsAt).getTime() > Date.now()
        ? plan.periodEndsAt
        : null;

// ─── Dialog state ──────────────────────────────────────────────────────────────

type DialogState =
    | { type: 'plan'; plan: FeaturePlan; preview: PlanChangePreview | null; loading: boolean }
    | { type: 'addon-activate'; key: AddOnKey; name: string; preview: AddOnPreview | null; loading: boolean }
    | { type: 'addon-deactivate'; key: AddOnKey; name: string }
    | { type: 'renew' }
    | null;

// ─── Main component ───────────────────────────────────────────────────────────

export function SubscriptionSettingsPage() {
    // To samo źródło co rama ustawień (OWNER_ONLY) - wcześniej `user.role === 'OWNER'`
    // rozjeżdżało się z nim przy kontach, których rola ma inną wielkość liter.
    const { isOwner } = usePermissions();

    const { data: myPlan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useMyPlan();
    const featurePlans = useFeaturePlans();
    const addOns = useAddOns();
    const checkout = useCheckout();
    const resumeAddOn = useResumeAddOn();
    const handoff = useCheckoutHandoff();
    const { showSuccess, showError, showInfo, showWarning } = useToast();

    const [dialog, setDialog] = useState<DialogState>(null);

    if (!isOwner) {
        return (
            <Notice tone="warn" title="Brak dostępu">
                Pakiet zmienia tylko właściciel studia.
            </Notice>
        );
    }

    if (planLoading) {
        return <Muted>Wczytywanie pakietu…</Muted>;
    }

    if (planError || !myPlan) {
        return (
            <Notice
                tone="danger"
                title="Nie udało się wczytać pakietu"
                action={<Button variant="ghost" size="sm" onClick={() => refetchPlan()}>Spróbuj ponownie</Button>}
            />
        );
    }

    const isExpired = myPlan.billingStatus === 'EXPIRED';
    const isTrial = myPlan.billingStatus === 'TRIALING';
    const isPastDue = myPlan.billingStatus === 'PAST_DUE';
    const isFull = myPlan.plan.key === 'FULL';
    const canBuyNow = myPlan.canPurchaseMidPeriod;
    const status = STATUS[myPlan.billingStatus] ?? { label: myPlan.billingStatus, tone: 'neutral' as PillTone };
    const periodEnd = runningPeriodEnd(myPlan);

    // Przedłużenie kupuje KOLEJNY okres: pakiet po zaplanowanym zejściu i moduły bez tych,
    // które się wyłączają - tę samą kwotę liczy serwer przy płatności.
    const renewalCents = myPlan.nextRenewalCostCents ?? myPlan.monthlyCostCents;
    const renewalAmount = renewalCents > 0 ? formatCents(renewalCents) : null;
    const renewalPlanName = myPlan.pendingDowngrade?.toPlanName ?? myPlan.plan.name;
    const renewingAddOns = myPlan.pendingDowngrade ? [] : myPlan.activeAddOns.filter(a => !a.cancelAt);
    const nextPeriodDiffers = !isTrial && !isExpired && renewalCents !== myPlan.monthlyCostCents;

    // ── Przedłużenie (Przelewy24) ─────────────────────────────────────────────
    // Przycisk otwiera okno z kwotą i zgodą na regulamin (RenewDialog) - dopiero ono płaci.
    const handleRenew = () => {
        if (checkout.isPending) return;
        setDialog({ type: 'renew' });
    };

    const confirmRenew = async () => {
        if (checkout.isPending) return;
        try {
            // Brak adresu płatności to NIE sukces - rozstrzyga stan zamówienia (useCheckoutHandoff).
            const step = handoff(await checkout.mutateAsync({ type: 'RENEWAL', acceptTerms: true }));
            if (step.kind === 'redirect' || step.kind === 'track') return;
            if (step.kind === 'done') {
                showSuccess('Pakiet przedłużony', myPlan.renewalPeriodEndsAt
                    ? `Pakiet działa do ${formatDate(myPlan.renewalPeriodEndsAt)}.`
                    : 'Pakiet działa przez kolejne 30 dni.');
            } else toastCheckoutProblem({ showError, showWarning }, step);
            setDialog(null);
        } catch (err: unknown) {
            toastUnhandledError(showError, err, 'Nie udało się rozpocząć płatności', 'Spróbuj ponownie za chwilę.');
        }
    };

    const renewButton = (label: string) => (
        <Button variant="primary" size="lg" onClick={handleRenew} disabled={checkout.isPending}>
            {checkout.isPending ? 'Przekierowywanie do płatności…' : label}
        </Button>
    );

    // ── Wycena zmiany planu ───────────────────────────────────────────────────
    const handleSelectPlan = async (plan: FeaturePlan) => {
        if (isExpired) return;
        setDialog({ type: 'plan', plan, preview: null, loading: true });

        try {
            const preview = await newSubscriptionApi.previewPlanChange(plan.key, { skipErrorToast: true });
            if (preview.changeType === 'NO_CHANGE') {
                setDialog(null);
                showInfo('Bez zmian', `Masz już pakiet ${plan.name}.`);
                return;
            }
            setDialog({ type: 'plan', plan, preview, loading: false });
        } catch (err) {
            // Wcześniej okno po prostu znikało - wyglądało, jakby kliknięcie nie zadziałało.
            setDialog(null);
            showError('Nie udało się pobrać wyceny', problemDetail(err) ?? 'Spróbuj ponownie za chwilę.');
        }
    };

    // ── Moduły ─────────────────────────────────────────────────────────────────
    const handleActivateAddOn = async (addOn: AddOnDto) => {
        if (isExpired || !canBuyNow) return;
        setDialog({ type: 'addon-activate', key: addOn.key, name: addOn.name, preview: null, loading: true });

        try {
            const preview = await newSubscriptionApi.previewAddOn(addOn.key, { skipErrorToast: true });
            setDialog({ type: 'addon-activate', key: addOn.key, name: addOn.name, preview, loading: false });
        } catch (err) {
            setDialog(null);
            showError('Nie udało się pobrać wyceny modułu', problemDetail(err) ?? 'Spróbuj ponownie za chwilę.');
        }
    };

    const handleDeactivateAddOn = (key: AddOnKey, name: string) => {
        if (isExpired) return;
        setDialog({ type: 'addon-deactivate', key, name });
    };

    const handleResumeAddOn = (key: AddOnKey, name: string) => {
        resumeAddOn.mutateAsync(key)
            .then(() => showSuccess('Moduł zostaje', `Moduł ${name} przedłuży się razem z pakietem.`))
            .catch((err: unknown) =>
                toastUnhandledError(showError, err, 'Nie udało się przywrócić modułu', 'Spróbuj ponownie za chwilę.'));
    };

    const activeKeys = new Set(myPlan.activeAddOns.map(a => a.key));
    const availableAddOns = (addOns.data ?? []).filter(a => !activeKeys.has(a.key));
    const sortedPlans = [...(featurePlans.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const monthlySuffix = monthlyPriceSuffix(myPlan.monthlyCostCents);

    const periodDetails = isExpired
        ? `wygasł ${formatDate(myPlan.periodEndsAt ?? myPlan.trialEndsAt)}`
        : isTrial && myPlan.trialEndsAt
            ? `okres próbny do ${formatDate(myPlan.trialEndsAt)}, zostało ${daysLabel(myPlan.daysRemaining)}`
            : isPastDue
                // Dawniej „odnowienie 22 października, za 5 dni" - data z przeszłości i liczba
                // dni karencji w jednym zdaniu.
                ? `okres minął ${formatDate(myPlan.periodEndsAt)}, dostęp do ${formatDate(myPlan.graceEndsAt)}`
                : `odnowienie ${formatDate(myPlan.periodEndsAt)}, za ${daysLabel(myPlan.daysRemaining)}`;

    // Dokładnie jedno miejsce z przyciskiem przedłużenia: przy zaległości stoi w komunikacie,
    // który mówi, dlaczego trzeba go kliknąć; w trwającym okresie w nagłówku ramy. W okresie
    // próbnym przedłużać nie ma czego - pakiet wybiera się po jego końcu.
    const renewInHeader = myPlan.billingStatus === 'ACTIVE';

    const isUpgrade = (plan: FeaturePlan) => plan.monthlyPriceGrossCents > myPlan.plan.monthlyPriceGrossCents;

    return (
        <PageWrap>
            {renewInHeader && (
                <SettingsHeaderActions>
                    {renewButton(renewalAmount ? `Przedłuż o 30 dni za ${renewalAmount}` : 'Przedłuż o 30 dni')}
                </SettingsHeaderActions>
            )}

            {isExpired && (
                <Notice tone="danger" title="Twój pakiet wygasł" role="alert">
                    Wybierz pakiet, żeby wrócić do pracy. Twoje dane są bezpieczne.
                </Notice>
            )}

            {isPastDue && (
                <Notice
                    tone="warn"
                    title="Opłacony okres minął"
                    action={renewButton(renewalAmount ? `Przedłuż za ${renewalAmount}` : 'Przedłuż pakiet')}
                >
                    {/* Dawniej „Ostatnia płatność nie przeszła" - płatności automatycznych nie ma,
                        więc żadna nie mogła „nie przejść". */}
                    Dostęp działa jeszcze do {formatDate(myPlan.graceEndsAt)}. Przedłuż pakiet przez
                    Przelewy24{renewalAmount ? ` (${renewalAmount} brutto)` : ''}, żeby go nie stracić.
                </Notice>
            )}

            {isTrial && myPlan.trialEndsAt && (
                <Notice tone="info" title="Okres próbny">
                    Zostało {daysLabel(myPlan.daysRemaining)}, do {formatDate(myPlan.trialEndsAt)}. Do tego dnia
                    zmieniasz pakiet i włączasz moduły bez opłat. Po okresie próbnym wybierzesz, co opłacić.
                </Notice>
            )}

            {myPlan.pendingDowngrade && (
                <PendingDowngradeBanner pendingDowngrade={myPlan.pendingDowngrade} />
            )}

            {/* ── Twój plan: jedyna wyniesiona karta sekcji ───────────────────── */}
            <Card>
                <CardBody>
                    <PlanHead>
                        <SectionTitle size="lg">Pakiet {myPlan.plan.name}</SectionTitle>
                        <StatusPill $tone={status.tone} $size="md">{status.label}</StatusPill>
                    </PlanHead>

                    <SummaryStrip
                        label={isTrial
                            ? 'Po okresie próbnym, miesięcznie'
                            : myPlan.activeAddOns.length > 0 && !isFull ? 'Miesięcznie, pakiet i moduły' : 'Miesięcznie'}
                        amount={(
                            <>
                                {formatCents(myPlan.monthlyCostCents)}
                                {monthlySuffix && <Suffix>brutto</Suffix>}
                            </>
                        )}
                        details={periodDetails}
                    />

                    {nextPeriodDiffers && (
                        <Muted>
                            Kolejny okres: {formatCents(renewalCents)} brutto ({renewalPlanName}
                            {renewingAddOns.length > 0 ? `, z modułami: ${renewingAddOns.map(a => a.name).join(', ')}` : ''}).
                        </Muted>
                    )}

                    {myPlan.activeAddOns.length > 0 && !isFull && (
                        <Block>
                            <SectionTitle as="h3" count={myPlan.activeAddOns.length}>Włączone moduły</SectionTitle>
                            <AddOnList>
                                {myPlan.activeAddOns.map(addOn => (
                                    <AddOnRow key={addOn.key}>
                                        <AddOnRowText>
                                            <strong>{addOn.name}</strong>
                                            <span>
                                                {addOn.cancelAt
                                                    ? `Działa do ${formatDate(addOn.cancelAt)}, potem się wyłączy`
                                                    : `${formatCents(addOn.monthlyPriceGrossCents)}${monthlyPriceSuffix(addOn.monthlyPriceGrossCents) ? ` ${monthlyPriceSuffix(addOn.monthlyPriceGrossCents)}` : ''}`}
                                            </span>
                                            {addOn.cancelAt && !addOn.resumable && (
                                                <span>
                                                    Kolejny okres opłacono bez tego modułu. Od {formatDate(addOn.cancelAt)} możesz go dokupić ponownie.
                                                </span>
                                            )}
                                        </AddOnRowText>
                                        <AddOnRowActions>
                                            {addOn.cancelAt ? (
                                                addOn.resumable && (
                                                    <Button
                                                        size="sm"
                                                        disabled={isExpired || resumeAddOn.isPending}
                                                        onClick={() => handleResumeAddOn(addOn.key, addOn.name)}
                                                        aria-label={`Przywróć moduł ${addOn.name}`}
                                                    >
                                                        Przywróć
                                                    </Button>
                                                )
                                            ) : (
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    disabled={isExpired}
                                                    onClick={() => handleDeactivateAddOn(addOn.key, addOn.name)}
                                                    aria-label={`Wyłącz moduł ${addOn.name}`}
                                                >
                                                    Wyłącz
                                                </Button>
                                            )}
                                        </AddOnRowActions>
                                    </AddOnRow>
                                ))}
                            </AddOnList>
                        </Block>
                    )}
                </CardBody>
            </Card>

            {/* ── Zmiana planu ──────────────────────────────────────────────────── */}
            <Block>
                <SectionTitle>Zmień pakiet</SectionTitle>
                {featurePlans.isLoading ? (
                    <Muted>Wczytywanie pakietów…</Muted>
                ) : featurePlans.isError ? (
                    <Notice
                        tone="danger"
                        title="Nie udało się wczytać pakietów"
                        action={<Button variant="ghost" size="sm" onClick={() => featurePlans.refetch()}>Spróbuj ponownie</Button>}
                    />
                ) : (
                    <PlansGrid>
                        {sortedPlans.map(plan => (
                            <PlanCard
                                key={plan.key}
                                plan={plan}
                                currentPlanKey={myPlan.plan.key}
                                // Na niższy pakiet wolno przejść zawsze (w karencji od razu, bez opłaty);
                                // na wyższy - tylko w trialu albo w trwającym opłaconym okresie.
                                disabled={isExpired || (isUpgrade(plan) && !canBuyNow)}
                                disabledHint={isExpired ? undefined : 'Na wyższy pakiet przejdziesz po przedłużeniu.'}
                                onSelect={handleSelectPlan}
                            />
                        ))}
                    </PlansGrid>
                )}
                {isExpired && <Muted>Pakiet wybierzesz w oknie odnowienia.</Muted>}
            </Block>

            {/* ── Moduły do dokupienia (plan FULL ma wszystkie) ───────────────── */}
            {!isFull && (addOns.isLoading || addOns.isError || availableAddOns.length > 0) && (
                <Block>
                    <SectionTitle>Moduły do dokupienia</SectionTitle>
                    {!canBuyNow && !isExpired && <Muted>Moduły dokupisz po przedłużeniu pakietu.</Muted>}
                    {addOns.isLoading ? (
                        <Muted>Wczytywanie modułów…</Muted>
                    ) : addOns.isError ? (
                        <Notice
                            tone="danger"
                            title="Nie udało się wczytać modułów"
                            action={<Button variant="ghost" size="sm" onClick={() => addOns.refetch()}>Spróbuj ponownie</Button>}
                        />
                    ) : (
                        <AddOnsGrid>
                            {availableAddOns.map(addOn => (
                                <AddOnCard
                                    key={addOn.key}
                                    addOn={addOn}
                                    isActive={false}
                                    disabled={isExpired || !canBuyNow}
                                    priceNote={isTrial ? 'Bez opłat do końca okresu próbnego' : undefined}
                                    onActivate={() => handleActivateAddOn(addOn)}
                                />
                            ))}
                        </AddOnsGrid>
                    )}
                </Block>
            )}

            <PaymentHistoryTable />

            {/* ── Okna ──────────────────────────────────────────────────────────── */}
            {dialog?.type === 'plan' && (
                <PlanChangeDialog
                    newPlanKey={dialog.plan.key}
                    newPlanName={dialog.plan.name}
                    currentPlanName={myPlan.plan.name}
                    preview={dialog.preview}
                    isLoadingPreview={dialog.loading}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.type === 'addon-activate' && (
                <AddOnActivationDialog
                    addOnKey={dialog.key}
                    addOnName={dialog.name}
                    preview={dialog.preview}
                    isLoadingPreview={dialog.loading}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.type === 'renew' && (
                <RenewDialog
                    planName={renewalPlanName}
                    addOnNames={renewingAddOns.map(a => a.name)}
                    amount={renewalAmount}
                    periodEndsAt={myPlan.renewalPeriodEndsAt}
                    isPending={checkout.isPending}
                    onConfirm={confirmRenew}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.type === 'addon-deactivate' && (
                <AddOnDeactivationDialog
                    addOnKey={dialog.key}
                    addOnName={dialog.name}
                    endsAt={periodEnd}
                    onClose={() => setDialog(null)}
                />
            )}
        </PageWrap>
    );
}
