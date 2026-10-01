import { useState } from 'react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { Button, ButtonLink, FieldList, FieldRow, Notice } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useSubscriptionStatus } from '@/modules/settings/hooks/useSubscription';
import { useChangePlan, useCheckout, useDeactivateAddOn as useDeactivateAddOnMutation } from '../api/subscriptionQueries';
import type { PlanChangePreview, AddOnPreview, AddOnKey, PlanKey, CheckoutRequest } from '../types';
import { CommunicationModuleTour } from './CommunicationModuleTour';
import { formatCents, formatDate } from '../utils/formatters';
import { toastUnhandledError } from '../utils/apiErrors';
import {
    checkoutOutcome,
    describeCheckoutError,
    UNEXPECTED_CHECKOUT,
    type CheckoutErrorCopy,
} from '../utils/checkout';
import { PLAN_SETTINGS_PATH } from '../utils/subscriptionLock';
import { LoadingRow, Spinner, Explanation, Strong } from './PlanChangeDialog.styles';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Wycena się nie wczytała. Wcześniej okno kręciło spinnerem w nieskończoność
 * („Ładowanie szczegółów…" przy `preview === null`), bo brak wyceny i jej ładowanie
 * wyglądały tak samo - a jedyną drogą wyjścia był krzyżyk.
 */
const PreviewFailed = ({ reason }: { reason?: string | null }) => (
    <Notice tone="danger" title="Nie udało się pobrać wyceny" role="alert">
        {reason && <span>{reason}</span>}
        <span>Zamknij okno i spróbuj ponownie za chwilę. Nic nie zostało zmienione ani pobrane.</span>
    </Notice>
);

/**
 * Czy trwa opłacony okres, w którym wolno dopłacić za resztę okresu.
 *
 * Okna zakupu otwiera też paywall i upsell - ekrany, które o abonamencie nic nie
 * wiedzą. Po końcu opłaconego okresu (karencja, wygaśnięcie) backend odrzuca
 * zakup modułu i wyższego planu, więc „Przejdź do płatności" kończyło się błędem.
 * Status jest w pamięci podręcznej od bramki abonamentu - nie kosztuje zapytania.
 */
function useBillingPeriod() {
    const { status } = useSubscriptionStatus();
    const value = status?.status;
    const periodEnded = value === 'PAST_DUE' || value === 'EXPIRED' || status?.inGrace === true;
    return {
        /** Zakup w trakcie okresu niemożliwy - najpierw przedłużenie. */
        renewalRequired: periodEnded,
        /** Brak trwającego opłaconego okresu: obniżenie planu wchodzi od razu. */
        noPaidPeriod: periodEnded || value === 'TRIALING',
    };
}

const RenewFirstNotice = () => (
    <Notice tone="warn" title="Najpierw opłać przedłużenie">
        Opłacony okres abonamentu minął. Moduły i wyższy plan dokupisz po przedłużeniu
        abonamentu w Ustawieniach, w zakładce Abonament.
    </Notice>
);

/** Krok następny, gdy zakup czeka na przedłużenie: zwykły odnośnik, bo okno bywa poza routerem (paywall). */
const GoToPlanSettings = () => (
    <ButtonLink href={PLAN_SETTINGS_PATH} $variant="primary" $size="md" data-variant="primary">
        Przejdź do abonamentu
    </ButtonLink>
);

/** Płatność gotowa, ale na inną kwotę niż z wyceny - nie przekierowujemy po cichu. */
interface AmountChanged {
    url: string;
    amountCents: number;
    previewCents: number;
}

const AmountChangedNotice = ({ change }: { change: AmountChanged }) => (
    <Notice tone="warn" title="Kwota do zapłaty się zmieniła" role="alert">
        Do zapłaty jest {formatCents(change.amountCents)} brutto, a wycena pokazywała {formatCents(change.previewCents)}.
        To kwota płatności za ten zakup rozpoczętej już wcześniej. Sprawdź ją przed przejściem do Przelewy24.
    </Notice>
);

/**
 * Zamówienie z oknem zakupu: błąd zostaje W OKNIE (dawniej goły toast interceptora,
 * a okno dalej stało na „Przejdź do płatności"), sukces tylko przy FULFILLED,
 * a inna kwota niż w wycenie czeka na potwierdzenie.
 *
 * Backend może zwrócić istniejące, otwarte zamówienie na ten sam zakup - z kwotą
 * policzoną wcześniej. Przekierowanie bez słowa kazałoby zapłacić inną kwotę niż ta,
 * którą użytkownik właśnie przeczytał.
 */
function useDialogCheckout(previewCents: number | null | undefined, onFulfilled: () => void) {
    const checkout = useCheckout();
    const [error, setError] = useState<CheckoutErrorCopy | null>(null);
    const [amountChanged, setAmountChanged] = useState<AmountChanged | null>(null);

    const start = async (body: CheckoutRequest, errorTitle: string) => {
        setError(null);
        try {
            const order = await checkout.mutateAsync(body);
            const outcome = checkoutOutcome(order);
            if (outcome.kind === 'redirect') {
                const expected = previewCents ?? 0;
                if (order.amountCents !== expected) {
                    setAmountChanged({ url: outcome.url, amountCents: order.amountCents, previewCents: expected });
                    return;
                }
                window.location.assign(outcome.url);
                return;
            }
            if (outcome.kind === 'fulfilled') {
                onFulfilled();
                return;
            }
            setError(UNEXPECTED_CHECKOUT);
        } catch (err: unknown) {
            setError(describeCheckoutError(err, errorTitle));
        }
    };

    const confirmChangedAmount = () => {
        if (amountChanged) window.location.assign(amountChanged.url);
    };

    return { start, error, amountChanged, confirmChangedAmount, isPending: checkout.isPending };
}

const CheckoutErrorNotice = ({ error }: { error: CheckoutErrorCopy }) => (
    <Notice tone="warn" title={error.title} role="alert">{error.message}</Notice>
);

// ─── Plan change dialog ────────────────────────────────────────────────────────

interface PlanDialogProps {
    newPlanKey: PlanKey;
    newPlanName: string;
    currentPlanName: string;
    preview: PlanChangePreview | null;
    isLoadingPreview: boolean;
    onClose: () => void;
}

export function PlanChangeDialog({
    newPlanKey,
    newPlanName,
    currentPlanName,
    preview,
    isLoadingPreview,
    onClose,
}: PlanDialogProps) {
    const { showSuccess, showError } = useToast();
    const changePlan = useChangePlan();
    const { renewalRequired, noPaidPeriod } = useBillingPeriod();
    const purchase = useDialogCheckout(preview?.proratedAmountCents, () => {
        showSuccess('Plan zmieniony', `Twój plan został zmieniony na ${newPlanName}.`);
        onClose();
    });

    const isDowngrade = preview?.changeType === 'DOWNGRADE';
    // Obniżenie bez trwającego opłaconego okresu (próba, karencja) backend wprowadza
    // od razu - zapowiedź „na koniec okresu" byłaby nieprawdą.
    const downgradeNow = isDowngrade && noPaidPeriod;
    const upgradeBlocked = !!preview && !isDowngrade && renewalRequired;

    const handleConfirm = async () => {
        if (isDowngrade) {
            try {
                await changePlan.mutateAsync(newPlanKey);
                if (downgradeNow) {
                    showSuccess('Plan zmieniony', `Twój plan to teraz ${newPlanName}.`);
                } else {
                    showSuccess('Zmiana zaplanowana', `Plan zostanie zmieniony na ${newPlanName} na koniec okresu rozliczeniowego.`);
                }
                onClose();
            } catch (err: unknown) {
                toastUnhandledError(showError, err, 'Nie udało się zmienić planu', 'Spróbuj ponownie za chwilę.');
            }
            return;
        }
        if (purchase.amountChanged) {
            purchase.confirmChangedAmount();
            return;
        }
        // Upgrade: paid operation, goes through Przelewy24.
        await purchase.start({ type: 'PLAN_UPGRADE', planKey: newPlanKey }, 'Nie udało się zmienić planu');
    };

    const isPending = changePlan.isPending || purchase.isPending;

    const confirmLabel = isPending
        ? (isDowngrade ? 'Zapisywanie…' : 'Przekierowywanie…')
        : isDowngrade
            ? (downgradeNow ? 'Zmień plan' : 'Zaplanuj zmianę')
            : purchase.amountChanged
                ? `Zapłać ${formatCents(purchase.amountChanged.amountCents)}`
                : 'Przejdź do płatności';

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>
                        {isDowngrade
                            ? `Obniżenie planu: ${currentPlanName} → ${newPlanName}`
                            : `Zmiana planu: ${currentPlanName} → ${newPlanName}`
                        }
                    </ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {isLoadingPreview ? (
                    <LoadingRow>
                        <Spinner />
                        Wczytywanie wyceny…
                    </LoadingRow>
                ) : !preview ? (
                    <PreviewFailed />
                ) : upgradeBlocked ? (
                    <RenewFirstNotice />
                ) : (
                    <>
                        {isDowngrade && (
                            <Notice tone="warn">
                                {downgradeNow
                                    ? 'Nie trwa opłacony okres, więc niższy plan wejdzie w życie od razu po potwierdzeniu.'
                                    : 'Obniżenie planu wejdzie w życie po zakończeniu bieżącego okresu rozliczeniowego. Do tego czasu zachowujesz pełny dostęp.'}
                            </Notice>
                        )}

                        {purchase.error && <CheckoutErrorNotice error={purchase.error} />}
                        {purchase.amountChanged && <AmountChangedNotice change={purchase.amountChanged} />}

                        <FieldList>
                            <FieldRow label="Nowy plan"><strong>{preview.newPlanName}</strong></FieldRow>
                            <FieldRow label="Od kiedy">
                                {isDowngrade
                                    ? (downgradeNow ? 'Od razu' : formatDate(preview.effectiveAt))
                                    : 'Od razu po opłaceniu'}
                            </FieldRow>
                            <FieldRow label="Do zapłaty">
                                <Strong $highlight={!isDowngrade}>
                                    {isDowngrade
                                        ? 'Bez opłaty'
                                        : preview.proratedAmountFormatted
                                            ? `${preview.proratedAmountFormatted} brutto`
                                            : 'Bezpłatnie w ramach okresu próbnego'}
                                </Strong>
                            </FieldRow>
                            <FieldRow label="Dni do końca okresu">{preview.daysRemaining}</FieldRow>
                        </FieldList>

                        <Explanation>{preview.explanation}</Explanation>
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={isPending}>
                    {!isLoadingPreview && !preview ? 'Zamknij' : 'Anuluj'}
                </Button>
                {upgradeBlocked ? (
                    <GoToPlanSettings />
                ) : (isLoadingPreview || preview) && (
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={isPending || isLoadingPreview || !preview}
                    >
                        {confirmLabel}
                    </Button>
                )}
            </ModalFooter>
        </ModalShell>
    );
}

// ─── Add-on activation dialog ─────────────────────────────────────────────────

interface AddOnDialogProps {
    addOnKey: AddOnKey;
    addOnName: string;
    preview: AddOnPreview | null;
    isLoadingPreview: boolean;
    /** Powód nieudanej wyceny z backendu, jeśli go podał. */
    previewError?: string | null;
    onClose: () => void;
}

/**
 * Add-ons that explain themselves before taking money. Only the communication
 * module needs it today: it is the one whose price is not the whole commitment.
 */
const ADD_ONS_WITH_GUIDE = new Set<AddOnKey>(['CLIENT_COMMUNICATION']);

export function AddOnActivationDialog({
    addOnKey,
    addOnName,
    preview,
    isLoadingPreview,
    previewError,
    onClose,
}: AddOnDialogProps) {
    const { showSuccess } = useToast();
    const { renewalRequired } = useBillingPeriod();
    const purchase = useDialogCheckout(preview?.proratedAmountCents, () => {
        showSuccess('Moduł aktywowany', `Moduł ${addOnName} został pomyślnie aktywowany.`);
        onClose();
    });

    // The communication module is the one add-on whose price is not the whole
    // commitment: it needs message texts and it needs credits. Explaining that here
    // covers every entry point at once: module gate, paywall, settings, the visit.
    // Po końcu opłaconego okresu przewodnik nie ma sensu - zakupu i tak nie będzie.
    const [guideDone, setGuideDone] = useState(!ADD_ONS_WITH_GUIDE.has(addOnKey));

    const handleConfirm = async () => {
        if (purchase.amountChanged) {
            purchase.confirmChangedAmount();
            return;
        }
        await purchase.start({ type: 'ADD_ON_PURCHASE', addOnKeys: [addOnKey] }, 'Nie udało się aktywować modułu');
    };

    const isTrial = preview?.proratedAmountCents === null;

    if (!guideDone && !renewalRequired) {
        return (
            <CommunicationModuleTour
                onClose={onClose}
                onFinish={() => setGuideDone(true)}
            />
        );
    }

    const confirmLabel = purchase.isPending
        ? 'Przekierowywanie…'
        : purchase.amountChanged
            ? `Zapłać ${formatCents(purchase.amountChanged.amountCents)}`
            : isTrial ? 'Aktywuj bezpłatnie' : 'Przejdź do płatności';

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Aktywacja modułu: {addOnName}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {renewalRequired ? (
                    <RenewFirstNotice />
                ) : isLoadingPreview ? (
                    <LoadingRow>
                        <Spinner />
                        Wczytywanie wyceny…
                    </LoadingRow>
                ) : !preview ? (
                    <PreviewFailed reason={previewError} />
                ) : (
                    <>
                        {purchase.error && <CheckoutErrorNotice error={purchase.error} />}
                        {purchase.amountChanged && <AmountChangedNotice change={purchase.amountChanged} />}

                        <FieldList>
                            <FieldRow label="Moduł"><strong>{preview.addOnName}</strong></FieldRow>
                            <FieldRow label="Do zapłaty za resztę okresu">
                                <Strong $highlight={!isTrial}>
                                    {isTrial
                                        ? 'Bezpłatnie w ramach okresu próbnego'
                                        : preview.proratedAmountFormatted
                                            ? `${preview.proratedAmountFormatted} brutto`
                                            : '-'}
                                </Strong>
                            </FieldRow>
                            <FieldRow label="Dni do końca okresu">{preview.daysRemaining}</FieldRow>
                            <FieldRow label="Koniec okresu">{formatDate(preview.periodEndsAt)}</FieldRow>
                        </FieldList>

                        <Explanation>{preview.explanation}</Explanation>
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={purchase.isPending}>
                    {renewalRequired || (!isLoadingPreview && !preview) ? 'Zamknij' : 'Anuluj'}
                </Button>
                {renewalRequired ? (
                    <GoToPlanSettings />
                ) : (isLoadingPreview || preview) && (
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={purchase.isPending || isLoadingPreview || !preview}
                    >
                        {confirmLabel}
                    </Button>
                )}
            </ModalFooter>
        </ModalShell>
    );
}

// ─── Add-on deactivation dialog ───────────────────────────────────────────────

interface DeactivateDialogProps {
    addOnKey: AddOnKey;
    addOnName: string;
    /**
     * Koniec trwającego OPŁACONEGO okresu - do tego dnia moduł działa. Null, gdy
     * opłacony okres nie trwa (okres próbny, karencja): wtedy moduł znika od razu.
     */
    paidPeriodEndsAt: string | null;
    onClose: () => void;
}

export function AddOnDeactivationDialog({ addOnKey, addOnName, paidPeriodEndsAt, onClose }: DeactivateDialogProps) {
    const { showSuccess, showError } = useToast();
    const deactivateAddOn = useDeactivateAddOnMutation();

    // Wyłączenie nie odbiera już dostępu od razu: za opłacony okres moduł działa do
    // jego końca, potem znika i nie wchodzi do ceny przedłużenia - a do tego dnia da
    // się je cofnąć („Przywróć"). Stąd bursztyn, nie czerwień: to nie jest
    // nieodwracalne. Bez trwającego opłaconego okresu nie ma czego „dożyć", więc
    // moduł znika od razu - i okno mówi to wprost.
    // Okno zamyka się po kliknięciu, a wynik mówi toast - mutacja kończy się także
    // po odmontowaniu okna.
    const atPeriodEnd = paidPeriodEndsAt !== null;
    const endDate = formatDate(paidPeriodEndsAt);

    const handleConfirm = () => {
        deactivateAddOn.mutateAsync(addOnKey)
            .then(() => {
                if (atPeriodEnd) {
                    showSuccess(`Moduł wyłączy się ${endDate}`, `Do tego dnia ${addOnName} działa bez zmian. Możesz to cofnąć przyciskiem „Przywróć".`);
                } else {
                    showSuccess('Moduł wyłączony', `Moduł ${addOnName} nie jest już aktywny.`);
                }
            })
            .catch((err: unknown) =>
                toastUnhandledError(showError, err, 'Nie udało się wyłączyć modułu', 'Spróbuj ponownie za chwilę.'));
    };

    return (
        <ConfirmationModal
            isOpen
            variant="warning"
            title={atPeriodEnd ? `Wyłączyć moduł ${addOnName} z końcem okresu?` : `Wyłączyć moduł ${addOnName}?`}
            message={atPeriodEnd
                ? `Moduł działa do końca opłaconego okresu, do ${endDate}, a potem się wyłączy i nie wejdzie do kolejnej płatności. Do tego dnia możesz to cofnąć.`
                : 'Nie trwa opłacony okres (na przykład okres próbny), więc moduł wyłączy się od razu. Możesz go później włączyć ponownie.'}
            confirmText={atPeriodEnd ? 'Wyłącz z końcem okresu' : 'Wyłącz moduł'}
            cancelText="Anuluj"
            onConfirm={handleConfirm}
            onCancel={onClose}
        />
    );
}
