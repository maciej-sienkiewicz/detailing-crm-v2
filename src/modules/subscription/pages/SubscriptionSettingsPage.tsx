// src/modules/subscription/pages/SubscriptionSettingsPage.tsx
//
// Ustawienia → Abonament: bieżący plan, zmiana planu, moduły, historia płatności.
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
// dokładnie jeden przycisk przedłużenia - w nagłówku ramy, a przy zaległości albo
// wygaśnięciu w komunikacie, który tłumaczy, po co go kliknąć.

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
} from '../api/subscriptionQueries';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { PlanChangeDialog, AddOnActivationDialog, AddOnDeactivationDialog } from '../components/PlanChangeDialog';
import { PlanCard } from '../components/PlanCard';
import { AddOnCard } from '../components/AddOnCard';
import { PendingDowngradeBanner } from '../components/PendingDowngradeBanner';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import type { FeaturePlan, AddOnKey, AddOnDto, PlanChangePreview, AddOnPreview, BillingStatus } from '../types';
import { formatCents, formatDate, monthlyPriceSuffix } from '../utils/formatters';
import { apiErrorMessage, toastUnhandledError } from '../utils/apiErrors';
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
    Muted,
} from './SubscriptionSettingsPage.styles';

// ─── Billing status ──────────────────────────────────────────────────────────

const STATUS: Record<BillingStatus, { label: string; tone: PillTone }> = {
    TRIALING: { label: 'Okres próbny', tone: 'info' },
    ACTIVE: { label: 'Aktywny', tone: 'ok' },
    PAST_DUE: { label: 'Zaległa płatność', tone: 'warn' },
    EXPIRED: { label: 'Wygasł', tone: 'danger' },
};

const daysLabel = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);

const Suffix = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: ${ui.textMuted};
    margin-left: 6px;
`;

// ─── Dialog state ──────────────────────────────────────────────────────────────

type DialogState =
    | { type: 'plan'; plan: FeaturePlan; preview: PlanChangePreview | null; loading: boolean }
    | { type: 'addon-activate'; key: AddOnKey; name: string; preview: AddOnPreview | null; loading: boolean }
    | { type: 'addon-deactivate'; key: AddOnKey; name: string }
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
    const { showSuccess, showError, showInfo } = useToast();

    const [dialog, setDialog] = useState<DialogState>(null);

    if (!isOwner) {
        return (
            <Notice tone="warn" title="Brak dostępu">
                Abonamentem zarządza wyłącznie właściciel studia.
            </Notice>
        );
    }

    if (planLoading) {
        return <Muted>Wczytywanie abonamentu…</Muted>;
    }

    if (planError || !myPlan) {
        return (
            <Notice
                tone="danger"
                title="Nie udało się wczytać abonamentu"
                action={<Button variant="ghost" size="sm" onClick={() => refetchPlan()}>Spróbuj ponownie</Button>}
            />
        );
    }

    const isExpired = myPlan.billingStatus === 'EXPIRED';
    const isTrial = myPlan.billingStatus === 'TRIALING';
    const isPastDue = myPlan.billingStatus === 'PAST_DUE';
    const isFull = myPlan.plan.key === 'FULL';
    const status = STATUS[myPlan.billingStatus] ?? { label: myPlan.billingStatus, tone: 'neutral' as PillTone };

    const renewalCents = myPlan.monthlyCostCents;
    const renewalAmount = renewalCents > 0 ? formatCents(renewalCents) : null;

    // ── Przedłużenie (Przelewy24) ─────────────────────────────────────────────
    const handleRenew = async () => {
        if (checkout.isPending) return;
        try {
            const order = await checkout.mutateAsync({ type: 'RENEWAL' });
            if (order.paymentUrl) {
                window.location.assign(order.paymentUrl);
                return;
            }
            showSuccess('Abonament przedłużony', 'Twój plan działa przez kolejne 30 dni.');
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
                showInfo('Bez zmian', `Plan ${plan.name} jest już Twoim planem.`);
                return;
            }
            setDialog({ type: 'plan', plan, preview, loading: false });
        } catch (err) {
            // Wcześniej okno po prostu znikało - wyglądało, jakby kliknięcie nie zadziałało.
            setDialog(null);
            showError('Nie udało się pobrać wyceny', apiErrorMessage(err) ?? 'Spróbuj ponownie za chwilę.');
        }
    };

    // ── Moduły ─────────────────────────────────────────────────────────────────
    const handleActivateAddOn = async (addOn: AddOnDto) => {
        if (isExpired) return;
        setDialog({ type: 'addon-activate', key: addOn.key, name: addOn.name, preview: null, loading: true });

        try {
            const preview = await newSubscriptionApi.previewAddOn(addOn.key, { skipErrorToast: true });
            setDialog({ type: 'addon-activate', key: addOn.key, name: addOn.name, preview, loading: false });
        } catch (err) {
            setDialog(null);
            showError('Nie udało się pobrać wyceny modułu', apiErrorMessage(err) ?? 'Spróbuj ponownie za chwilę.');
        }
    };

    const handleDeactivateAddOn = (key: AddOnKey, name: string) => {
        if (isExpired) return;
        setDialog({ type: 'addon-deactivate', key, name });
    };

    const activeKeys = new Set(myPlan.activeAddOns.map(a => a.key));
    const availableAddOns = (addOns.data ?? []).filter(a => !activeKeys.has(a.key));
    const sortedPlans = [...(featurePlans.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const monthlySuffix = monthlyPriceSuffix(myPlan.monthlyCostCents);

    const periodDetails = isExpired
        ? `wygasł ${formatDate(myPlan.periodEndsAt)}`
        : isTrial && myPlan.trialEndsAt
            ? `okres próbny do ${formatDate(myPlan.trialEndsAt)}, zostało ${daysLabel(myPlan.daysRemaining)}`
            : `odnowienie ${formatDate(myPlan.periodEndsAt)}, za ${daysLabel(myPlan.daysRemaining)}`;

    // Dokładnie jedno miejsce z przyciskiem przedłużenia: przy zaległości i wygaśnięciu
    // stoi w komunikacie, który mówi, dlaczego trzeba go kliknąć; w pozostałych
    // przypadkach w nagłówku ramy. W okresie próbnym przedłużać nie ma czego - tam
    // krokiem jest wybór planu.
    const renewInHeader = !isTrial && !isExpired && !isPastDue;

    return (
        <PageWrap>
            {renewInHeader && (
                <SettingsHeaderActions>
                    {renewButton(renewalAmount ? `Przedłuż o 30 dni za ${renewalAmount}` : 'Przedłuż o 30 dni')}
                </SettingsHeaderActions>
            )}

            {isExpired && (
                <Notice
                    tone="danger"
                    title="Abonament wygasł"
                    role="alert"
                    action={renewButton(renewalAmount ? `Odnów za ${renewalAmount}` : 'Odnów abonament')}
                >
                    Odnów plan, żeby wrócić do pełnego dostępu. Płatność przez Przelewy24 obejmuje
                    kolejne 30 dni{renewalAmount ? `, ${renewalAmount} brutto` : ''}.
                </Notice>
            )}

            {isPastDue && (
                <Notice
                    tone="warn"
                    title="Ostatnia płatność nie przeszła"
                    action={renewButton(renewalAmount ? `Zapłać ${renewalAmount}` : 'Zapłać teraz')}
                >
                    Dostęp działa jeszcze przez {daysLabel(myPlan.daysRemaining)}. Opłać kolejne 30 dni
                    przez Przelewy24{renewalAmount ? ` (${renewalAmount} brutto)` : ''}, żeby go nie stracić.
                </Notice>
            )}

            {isTrial && myPlan.trialEndsAt && (
                <Notice tone="info" title="Okres próbny">
                    Zostało {daysLabel(myPlan.daysRemaining)}, do {formatDate(myPlan.trialEndsAt)}.
                    Wybierz plan poniżej, żeby korzystać z systemu dalej.
                </Notice>
            )}

            {myPlan.pendingDowngrade && (
                <PendingDowngradeBanner pendingDowngrade={myPlan.pendingDowngrade} />
            )}

            {/* ── Twój plan: jedyna wyniesiona karta sekcji ───────────────────── */}
            <Card>
                <CardBody>
                    <PlanHead>
                        <SectionTitle size="lg">Plan {myPlan.plan.name}</SectionTitle>
                        <StatusPill $tone={status.tone} $size="md">{status.label}</StatusPill>
                    </PlanHead>

                    <SummaryStrip
                        label={myPlan.activeAddOns.length > 0 && !isFull ? 'Miesięcznie, plan i moduły' : 'Miesięcznie'}
                        amount={(
                            <>
                                {formatCents(myPlan.monthlyCostCents)}
                                {monthlySuffix && <Suffix>brutto</Suffix>}
                            </>
                        )}
                        details={periodDetails}
                    />

                    {myPlan.activeAddOns.length > 0 && !isFull && (
                        <Block>
                            <SectionTitle as="h3" count={myPlan.activeAddOns.length}>Aktywne moduły</SectionTitle>
                            <AddOnList>
                                {myPlan.activeAddOns.map(addOn => (
                                    <AddOnRow key={addOn.key}>
                                        <AddOnRowText>
                                            <strong>{addOn.name}</strong>
                                            <span>
                                                {formatCents(addOn.monthlyPriceGrossCents)}
                                                {monthlyPriceSuffix(addOn.monthlyPriceGrossCents) ? ` ${monthlyPriceSuffix(addOn.monthlyPriceGrossCents)}` : ''}
                                            </span>
                                        </AddOnRowText>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={isExpired}
                                            onClick={() => handleDeactivateAddOn(addOn.key, addOn.name)}
                                        >
                                            Dezaktywuj
                                        </Button>
                                    </AddOnRow>
                                ))}
                            </AddOnList>
                        </Block>
                    )}
                </CardBody>
            </Card>

            {/* ── Zmiana planu ──────────────────────────────────────────────────── */}
            <Block>
                <SectionTitle>Zmień plan</SectionTitle>
                {featurePlans.isLoading ? (
                    <Muted>Wczytywanie planów…</Muted>
                ) : featurePlans.isError ? (
                    <Notice
                        tone="danger"
                        title="Nie udało się wczytać planów"
                        action={<Button variant="ghost" size="sm" onClick={() => featurePlans.refetch()}>Spróbuj ponownie</Button>}
                    />
                ) : (
                    <PlansGrid>
                        {sortedPlans.map(plan => (
                            <PlanCard
                                key={plan.key}
                                plan={plan}
                                currentPlanKey={myPlan.plan.key}
                                disabled={isExpired}
                                onSelect={handleSelectPlan}
                            />
                        ))}
                    </PlansGrid>
                )}
                {isExpired && <Muted>Plan zmienisz po odnowieniu abonamentu.</Muted>}
            </Block>

            {/* ── Moduły do dokupienia (plan FULL ma wszystkie) ───────────────── */}
            {!isFull && (addOns.isLoading || addOns.isError || availableAddOns.length > 0) && (
                <Block>
                    <SectionTitle>Moduły do dokupienia</SectionTitle>
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
                                    disabled={isExpired}
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

            {dialog?.type === 'addon-deactivate' && (
                <AddOnDeactivationDialog
                    addOnKey={dialog.key}
                    addOnName={dialog.name}
                    onClose={() => setDialog(null)}
                />
            )}
        </PageWrap>
    );
}
