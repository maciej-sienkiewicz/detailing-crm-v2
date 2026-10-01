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
//
// Rozliczenia według backendu (nie ma automatycznego obciążenia karty):
//   - po końcu opłaconego okresu studio wchodzi w karencję (PAST_DUE) z pełnym
//     dostępem do `graceEndsAt`; przedłużenie opłacone w karencji liczy się od końca
//     STAREGO okresu - dni karencji są płatne, nie darmowe. Stąd żadnego „płatność
//     nie przeszła": okres minął i trzeba go przedłużyć;
//   - wyższy plan i moduły (dopłata za resztę okresu) da się kupić tylko w trakcie
//     okresu - decyduje backendowe `canPurchaseMidPeriod`, nie zgadujemy po statusie;
//   - „Dezaktywuj" moduł planuje jego wyłączenie na koniec opłaconego okresu, a
//     „Przywróć" to odwołuje - ale tylko dopóki kolejny okres nie jest opłacony
//     (`resumable`); przedłużenie kosztuje `nextRenewalCostCents`;
//   - nic się samo nie odnawia: przy aktywnym planie data to koniec OPŁACONEGO
//     okresu, a nie dzień, w którym coś zostanie pobrane;
//   - pakiet kupiony w trakcie okresu próbnego daje ACTIVE z `trialEndsAt` w przyszłości:
//     opłacony okres zaczyna się z końcem próby i tak go opisujemy.

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
import { PlanChangeDialog, AddOnActivationDialog, AddOnDeactivationDialog } from '../components/PlanChangeDialog';
import { PlanCard } from '../components/PlanCard';
import { AddOnCard } from '../components/AddOnCard';
import { PendingDowngradeBanner } from '../components/PendingDowngradeBanner';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import { ADD_ON_RENEWAL_ALREADY_PAID_CODE } from '../types';
import type { FeaturePlan, AddOnKey, AddOnDto, PlanChangePreview, AddOnPreview, BillingStatus } from '../types';
import { formatCents, formatDate, monthlyPriceSuffix } from '../utils/formatters';
import { renewalCoverage } from '../utils/renewal';
import { apiErrorCode, apiErrorMessage, toastUnhandledError } from '../utils/apiErrors';
import { checkoutOutcome, describeCheckoutError } from '../utils/checkout';
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
    AddOnRowSide,
    Muted,
} from './SubscriptionSettingsPage.styles';

// ─── Billing status ──────────────────────────────────────────────────────────

const STATUS: Record<BillingStatus, { label: string; tone: PillTone }> = {
    NO_PLAN: { label: 'Bez planu', tone: 'neutral' },
    TRIALING: { label: 'Okres próbny', tone: 'info' },
    ACTIVE: { label: 'Aktywny', tone: 'ok' },
    PAST_DUE: { label: 'Do przedłużenia', tone: 'warn' },
    EXPIRED: { label: 'Wygasł', tone: 'danger' },
};

const daysLabel = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);

/** „, zostało 5 dni" - albo nic, gdy liczby nie ma. */
const daysSuffix = (prefix: string, n: number | null) => (n == null ? '' : `, ${prefix} ${daysLabel(n)}`);

const DAY_MS = 86_400_000;

/**
 * Rozpoczęte dni do końca opłaconego okresu - tak samo liczy je dopłata za resztę
 * okresu, więc „zostało 19 dni" tutaj i w wycenie modułu to ta sama liczba.
 *
 * Nie `daysRemaining` z backendu: przy ACTIVE liczy ono do końca DOSTĘPU, czyli
 * razem z karencją po końcu okresu. Obok daty końca okresu dawało dwie sprzeczne
 * liczby („do 20 października, zostało 26 dni" przy 19 dniach okresu).
 */
const startedDaysUntil = (iso: string | null, now: number): number | null => {
    if (!iso) return null;
    const ms = Date.parse(iso) - now;
    return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / DAY_MS) : null;
};

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
    const resumeAddOn = useResumeAddOn();
    const { showSuccess, showError, showInfo, showWarning } = useToast();

    const [dialog, setDialog] = useState<DialogState>(null);
    // Chwila wejścia na stronę: render ma być czysty (react-hooks/purity), a do
    // opisu okresu dzień w tę czy tamtą nie gra roli.
    const [now] = useState(() => Date.now());

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
    // Co da przedłużenie zapłacone teraz - datę liczy backend (po karencji mniej niż 30 dni od dziś).
    const coverage = renewalCoverage(myPlan);
    // Wygasł sam okres próbny: studio nigdy nie płaciło, więc nie ma czego „odnawiać".
    const expiredTrialOnly = isExpired && myPlan.periodEndsAt == null;
    const isTrial = myPlan.billingStatus === 'TRIALING';
    // Karencja to także ACTIVE, którego okres właśnie minął, zanim zadanie w tle
    // przestawi status: backend już wtedy podaje `graceEndsAt` i odmawia zakupów
    // w trakcie okresu, a baner karencji chowa się na tej stronie, bo liczy na jej
    // komunikat. Traktowane jako „aktywny" pokazywało „odnowienie" z datą z przeszłości
    // i liczbą dni do końca karencji - dwie sprzeczne liczby i żadnego wyjaśnienia.
    const isPastDue = myPlan.billingStatus === 'PAST_DUE'
        || (myPlan.billingStatus === 'ACTIVE' && myPlan.graceEndsAt != null);
    const isFull = myPlan.plan.key === 'FULL';
    const status = isPastDue
        ? STATUS.PAST_DUE
        : STATUS[myPlan.billingStatus] ?? { label: myPlan.billingStatus, tone: 'neutral' as PillTone };

    // Wyższy plan i moduły: tylko w trakcie okresu (próbnego albo opłaconego).
    // Po jego końcu backend odrzuca zakup - najpierw przedłużenie.
    const canPurchase = myPlan.canPurchaseMidPeriod;
    // Opłacony okres trwa: wyłączony moduł działa do jego końca. W okresie próbnym
    // i w karencji opłaconego okresu nie ma, więc moduł znika od razu.
    const paidPeriodRunning = canPurchase && !isTrial;

    // Przedłużenie kosztuje cenę KOLEJNEGO okresu (plan po obniżeniu, bez modułów
    // z zaplanowanym wyłączeniem). `monthlyCostCents` to dzisiejsza suma - przycisk
    // z nią obiecywał inną kwotę niż ta, którą pobierały Przelewy24.
    const renewalCents = myPlan.nextRenewalCostCents ?? myPlan.monthlyCostCents;
    const renewalAmount = renewalCents > 0 ? formatCents(renewalCents) : null;

    // ── Przedłużenie (Przelewy24) ─────────────────────────────────────────────
    const handleRenew = async () => {
        if (checkout.isPending) return;
        try {
            const order = await checkout.mutateAsync({ type: 'RENEWAL' });
            const outcome = checkoutOutcome(order);
            if (outcome.kind === 'redirect') {
                window.location.assign(outcome.url);
                return;
            }
            if (outcome.kind === 'fulfilled') {
                showSuccess('Abonament przedłużony', coverage
                    ? `Twój plan działa do ${formatDate(coverage.endsAt)}.`
                    : 'Twój plan działa przez kolejne 30 dni.');
                return;
            }
            showError(outcome.copy.title, outcome.copy.message);
        } catch (err: unknown) {
            const copy = describeCheckoutError(err);
            showError(copy.title, copy.message);
        }
    };

    const renewButton = (label: string) => (
        <Button variant="primary" size="lg" onClick={handleRenew} disabled={checkout.isPending}>
            {checkout.isPending ? 'Przekierowywanie do płatności…' : label}
        </Button>
    );

    // ── Wycena zmiany planu ───────────────────────────────────────────────────
    // Wyższy plan to dopłata za resztę okresu (checkout); niższy jest bez opłaty
    // i backend przyjmuje go także w karencji (wchodzi wtedy od razu).
    const isUpgrade = (plan: FeaturePlan) => plan.monthlyPriceGrossCents > myPlan.plan.monthlyPriceGrossCents;
    const planDisabled = (plan: FeaturePlan) => isExpired || (isUpgrade(plan) && !canPurchase);

    const handleSelectPlan = async (plan: FeaturePlan) => {
        if (planDisabled(plan)) return;
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
        if (!canPurchase) return;
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

    const handleResumeAddOn = async (key: AddOnKey, name: string) => {
        if (resumeAddOn.isPending) return;
        try {
            await resumeAddOn.mutateAsync(key);
            showSuccess('Moduł zostaje', `${name} nie wyłączy się z końcem okresu i wejdzie do kolejnej płatności.`);
        } catch (err: unknown) {
            // Kolejny okres opłacono bez modułu w międzyczasie (np. w drugiej karcie):
            // to nie awaria, tylko stan, który trzeba wytłumaczyć. Wiersz odświeża
            // `onSettled` i sam pokaże, od kiedy moduł da się dokupić.
            if (apiErrorCode(err) === ADD_ON_RENEWAL_ALREADY_PAID_CODE) {
                showWarning(
                    'Nie da się już przywrócić modułu',
                    apiErrorMessage(err) ?? `Kolejny okres opłacono już bez modułu ${name}.`,
                );
                return;
            }
            toastUnhandledError(showError, err, 'Nie udało się przywrócić modułu', 'Spróbuj ponownie za chwilę.');
        }
    };

    // Moduł z zaplanowanym wyłączeniem dalej jest aktywny, więc nie wraca na listę
    // do dokupienia - drogą powrotu jest „Przywróć" w jego wierszu.
    const activeKeys = new Set(myPlan.activeAddOns.map(a => a.key));
    const availableAddOns = (addOns.data ?? []).filter(a => !activeKeys.has(a.key));
    const sortedPlans = [...(featurePlans.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const monthlySuffix = monthlyPriceSuffix(myPlan.monthlyCostCents);

    // Pakiet kupiony w trakcie próby: płatny okres biegnie dopiero od jej końca. Status
    // jest ACTIVE, więc żadnego „okresu próbnego" w plakietce - tylko uczciwe daty.
    const paidPeriodStartsAt = !isTrial && !isPastDue && !isExpired && myPlan.trialEndsAt
        && Date.parse(myPlan.trialEndsAt) > now
        ? myPlan.trialEndsAt
        : null;

    const periodDetails = isExpired
        ? myPlan.periodEndsAt
            ? `wygasł ${formatDate(myPlan.periodEndsAt)}`
            : myPlan.trialEndsAt ? `okres próbny skończył się ${formatDate(myPlan.trialEndsAt)}` : 'wygasł'
        : isPastDue
            ? `okres minął ${formatDate(myPlan.periodEndsAt)}${myPlan.graceEndsAt ? `, dostęp do ${formatDate(myPlan.graceEndsAt)}` : ''}`
            : isTrial && myPlan.trialEndsAt
                ? `okres próbny do ${formatDate(myPlan.trialEndsAt)}${daysSuffix('zostało', myPlan.daysRemaining)}`
                : paidPeriodStartsAt
                    ? `opłacony od ${formatDate(paidPeriodStartsAt)} do ${formatDate(myPlan.periodEndsAt)}`
                    // Nie „odnowienie": nic nie pobiera się samo, data to koniec opłaconego okresu.
                    : `opłacony do ${formatDate(myPlan.periodEndsAt)}${daysSuffix('zostało', startedDaysUntil(myPlan.periodEndsAt, now))}`;

    // Kolejny okres kosztuje inaczej niż bieżący (czeka obniżenie planu albo moduł
    // się wyłączy) - mówimy to przy kwocie, żeby przycisk przedłużenia nie zaskoczył.
    const nextPeriodNote = !isTrial && !isExpired && myPlan.nextRenewalCostCents != null
        && myPlan.nextRenewalCostCents !== myPlan.monthlyCostCents
        ? `, kolejny okres ${formatCents(myPlan.nextRenewalCostCents)}`
        : '';

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
                    title={expiredTrialOnly ? 'Okres próbny się skończył' : 'Abonament wygasł'}
                    role="alert"
                    action={expiredTrialOnly
                        ? renewButton(renewalAmount ? `Opłać za ${renewalAmount}` : 'Opłać abonament')
                        : renewButton(renewalAmount ? `Odnów za ${renewalAmount}` : 'Odnów abonament')}
                >
                    {expiredTrialOnly ? 'Opłać plan' : 'Odnów plan'}, żeby wrócić do pełnego dostępu.
                    {coverage
                        ? <> Płatność przez Przelewy24{renewalAmount ? ` (${renewalAmount} brutto)` : ''} daje dostęp do {formatDate(coverage.endsAt)}.</>
                        : <> Płatność przez Przelewy24 obejmuje kolejne 30 dni{renewalAmount ? `, ${renewalAmount} brutto` : ''}.</>}
                    {coverage?.includesUsedGrace && (
                        <> Okres obejmuje dni karencji wykorzystane po {formatDate(myPlan.periodEndsAt)}, dlatego od dziś zostaje mniej niż 30 dni.</>
                    )}
                </Notice>
            )}

            {isPastDue && (
                <Notice
                    tone="warn"
                    title={`Opłacony okres minął ${formatDate(myPlan.periodEndsAt)}`}
                    action={renewButton(renewalAmount ? `Przedłuż za ${renewalAmount}` : 'Przedłuż abonament')}
                >
                    <span>
                        {myPlan.graceEndsAt
                            ? `Pełny dostęp działa jeszcze do ${formatDate(myPlan.graceEndsAt)}.`
                            : 'Pełny dostęp działa jeszcze przez kilka dni.'}
                        {' '}Opłać przedłużenie przez Przelewy24{renewalAmount ? ` (${renewalAmount} brutto)` : ''}, żeby go nie stracić.
                    </span>
                    <span>
                        Nowe 30 dni liczy się od {formatDate(myPlan.periodEndsAt)}, czyli od końca poprzedniego
                        okresu, a nie od dnia płatności.
                    </span>
                </Notice>
            )}

            {isTrial && myPlan.trialEndsAt && (
                <Notice tone="info" title="Okres próbny">
                    {myPlan.daysRemaining != null
                        ? `Zostało ${daysLabel(myPlan.daysRemaining)}, do ${formatDate(myPlan.trialEndsAt)}.`
                        : `Trwa do ${formatDate(myPlan.trialEndsAt)}.`}
                    {' '}Wybierz plan poniżej, żeby korzystać z systemu dalej.
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
                        details={`${periodDetails}${nextPeriodNote}`}
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
                                            {addOn.cancelAt && (addOn.resumable ? (
                                                // Przedłużenie opłacone bez modułu zamyka drogę powrotu -
                                                // przycisk przedłużenia w nagłówku o tym nie mówi, więc wiersz tak.
                                                <span>Przywrócisz go, dopóki nie opłacisz kolejnego okresu.</span>
                                            ) : (
                                                // Bez tego zdania wiersz wyglądałby jak błąd: plakietka
                                                // jest, a drogi powrotu nie ma.
                                                <span>
                                                    Kolejny okres opłacono już bez tego modułu, od {formatDate(addOn.cancelAt)} dokupisz go ponownie.
                                                </span>
                                            ))}
                                        </AddOnRowText>
                                        {addOn.cancelAt ? (
                                            // Wyłączenie zaplanowane: data jako plakietka obok, nie
                                            // doklejona kropką do ceny; cofnięcie bez wypełnienia.
                                            // „Przywróć" tylko, gdy backend je przyjmie: po opłaceniu
                                            // kolejnego okresu bez modułu kończyło się zawsze 409.
                                            <AddOnRowSide>
                                                <StatusPill $tone="warn">Wyłączy się {formatDate(addOn.cancelAt)}</StatusPill>
                                                {addOn.resumable && (
                                                    <Button
                                                        variant="tinted"
                                                        size="sm"
                                                        disabled={isExpired || resumeAddOn.isPending}
                                                        onClick={() => handleResumeAddOn(addOn.key, addOn.name)}
                                                    >
                                                        Przywróć
                                                    </Button>
                                                )}
                                            </AddOnRowSide>
                                        ) : (
                                            // Wyłączenie da się cofnąć do końca okresu, więc bez
                                            // czerwieni „nieodwracalne".
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={isExpired}
                                                onClick={() => handleDeactivateAddOn(addOn.key, addOn.name)}
                                            >
                                                Dezaktywuj
                                            </Button>
                                        )}
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
                                disabled={planDisabled(plan)}
                                onSelect={handleSelectPlan}
                            />
                        ))}
                    </PlansGrid>
                )}
                {isExpired
                    ? <Muted>Plan zmienisz po odnowieniu abonamentu.</Muted>
                    : !canPurchase && sortedPlans.some(isUpgrade) && (
                        <Muted>Najpierw opłać przedłużenie. Wyższy plan kupisz w trakcie opłaconego okresu.</Muted>
                    )}
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
                        <>
                            <AddOnsGrid>
                                {availableAddOns.map(addOn => (
                                    <AddOnCard
                                        key={addOn.key}
                                        addOn={addOn}
                                        isActive={false}
                                        disabled={!canPurchase}
                                        onActivate={() => handleActivateAddOn(addOn)}
                                    />
                                ))}
                            </AddOnsGrid>
                            {!canPurchase && (
                                <Muted>
                                    {isExpired
                                        ? 'Moduły dokupisz po odnowieniu abonamentu.'
                                        : 'Najpierw opłać przedłużenie. Moduły dokupisz w trakcie opłaconego okresu.'}
                                </Muted>
                            )}
                        </>
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
                    paidPeriodEndsAt={paidPeriodRunning ? myPlan.periodEndsAt : null}
                    onClose={() => setDialog(null)}
                />
            )}
        </PageWrap>
    );
}
