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
import { Button, FieldList, FieldRow, Notice } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useChangePlan, useCheckout, useDeactivateAddOn as useDeactivateAddOnMutation } from '../api/subscriptionQueries';
import type { PlanChangePreview, AddOnPreview, AddOnKey, PlanKey } from '../types';
import { CommunicationModuleTour } from './CommunicationModuleTour';
import { daysLabel, formatDate } from '../utils/formatters';
import { toastUnhandledError } from '../utils/apiErrors';
import { toastCheckoutProblem, useCheckoutHandoff } from '../hooks/useCheckoutHandoff';
import { LoadingRow, Spinner, Explanation, Strong } from './PlanChangeDialog.styles';
import { CheckoutConsent } from './CheckoutConsent';
import { useCheckoutConsent } from '../hooks/useCheckoutConsent';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Wycena się nie wczytała. Wcześniej okno kręciło spinnerem w nieskończoność
 * („Ładowanie szczegółów…" przy `preview === null`), bo brak wyceny i jej ładowanie
 * wyglądały tak samo - a jedyną drogą wyjścia był krzyżyk.
 */
const PreviewFailed = () => (
    <Notice tone="danger" title="Nie udało się pobrać wyceny" role="alert">
        Zamknij okno i spróbuj ponownie za chwilę. Nic nie zostało zmienione ani pobrane.
    </Notice>
);

/**
 * Serwer odmówił zakupu w tej chwili (`allowed: false`: opłacony okres minął, moduł
 * w przygotowaniu). Wcześniej okno nie czytało tego pola: brak kwoty brało za okres próbny
 * i pokazywało „Bezpłatnie w ramach okresu próbnego" z przyciskiem, który kończył się błędem.
 */
const NotAllowed = ({ explanation }: { explanation: string }) => (
    <Notice tone="warn" title="Teraz tego nie kupisz" role="alert">
        {explanation}
    </Notice>
);

/** „Za okres do 22 grudnia 2026 (60 dni)" - dopłata obejmuje cały opłacony czas, nie „resztę okresu". */
const paidUntil = (periodEndsAt: string | null, days: number | null) =>
    periodEndsAt ? `${formatDate(periodEndsAt)}${days != null ? ` (${daysLabel(days)})` : ''}` : null;

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
    const { showSuccess, showError, showWarning } = useToast();
    const changePlan = useChangePlan();
    const checkout = useCheckout();
    const handoff = useCheckoutHandoff();
    const consent = useCheckoutConsent();

    const isDowngrade = preview?.changeType === 'DOWNGRADE';
    const notAllowed = preview?.allowed === false;
    // Bez trwającego opłaconego okresu (trial, karencja) serwer zmienia pakiet od razu.
    // Okno mówiło wtedy naraz „zacznie działać po końcu opłaconego okresu" i „od razu".
    const immediateDowngrade = isDowngrade && !preview?.periodEndsAt;
    // Wyższy pakiet bez kwoty i bez odmowy = okres próbny: zmiana bez opłat, od razu.
    const trialUpgrade = !!preview && !isDowngrade && !notAllowed && preview.proratedAmountCents == null;

    const handleConfirm = async () => {
        if (!preview || notAllowed) return;
        if (!isDowngrade && !consent.require()) return;
        try {
            if (isDowngrade) {
                await changePlan.mutateAsync(newPlanKey);
                if (immediateDowngrade) showSuccess('Pakiet zmieniony', `Od teraz masz pakiet ${newPlanName}.`);
                else showSuccess('Zmiana zaplanowana', `Od ${formatDate(preview.effectiveAt)} pakiet zmieni się na ${newPlanName}.`);
                onClose();
                return;
            }
            // Wyższy pakiet przechodzi przez zamówienie (Przelewy24; w trialu bez kwoty).
            // Brak adresu płatności to NIE sukces (zamówienie bez płatności mogło zostać anulowane
            // albo wciąż się włącza) - rozstrzyga stan zamówienia (useCheckoutHandoff).
            const step = handoff(await checkout.mutateAsync({ type: 'PLAN_UPGRADE', planKey: newPlanKey, acceptTerms: true }));
            if (step.kind === 'redirect' || step.kind === 'track') return;
            if (step.kind === 'done') showSuccess('Pakiet zmieniony', `Od teraz masz pakiet ${newPlanName}.`);
            else toastCheckoutProblem({ showError, showWarning }, step);
            onClose();
        } catch (err: unknown) {
            toastUnhandledError(showError, err, 'Nie udało się zmienić pakietu', 'Spróbuj ponownie za chwilę.');
        }
    };

    const isPending = changePlan.isPending || checkout.isPending;
    const canConfirm = isLoadingPreview || (!!preview && !notAllowed);

    const confirmLabel = isPending
        ? (isDowngrade ? 'Zapisywanie…' : trialUpgrade ? 'Włączanie…' : 'Przekierowywanie…')
        : isDowngrade
            ? (immediateDowngrade ? 'Zmień pakiet' : 'Zaplanuj zmianę')
            : trialUpgrade ? `Przejdź na ${newPlanName}` : 'Przejdź do płatności';

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>
                        {isDowngrade
                            ? `Niższy pakiet: ${currentPlanName} → ${newPlanName}`
                            : `Zmiana pakietu: ${currentPlanName} → ${newPlanName}`
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
                ) : notAllowed ? (
                    <NotAllowed explanation={preview.explanation} />
                ) : (
                    <>
                        {isDowngrade && (
                            <Notice tone="warn">
                                {immediateDowngrade
                                    ? `Pakiet zmieni się od razu. Zostaną funkcje pakietu ${newPlanName}, a moduły dokupisz potem osobno.`
                                    : `Do ${formatDate(preview.effectiveAt)} masz wszystko jak teraz. Potem zostaną funkcje pakietu ${newPlanName}, a moduły dokupisz osobno.`}
                            </Notice>
                        )}

                        <FieldList>
                            <FieldRow label="Nowy pakiet"><strong>{preview.newPlanName}</strong></FieldRow>
                            <FieldRow label="Od kiedy">
                                {isDowngrade
                                    ? (immediateDowngrade ? 'Od razu' : formatDate(preview.effectiveAt))
                                    : trialUpgrade ? 'Od razu' : 'Od razu po opłaceniu'}
                            </FieldRow>
                            <FieldRow label="Do zapłaty">
                                <Strong $highlight={!isDowngrade && !trialUpgrade}>
                                    {isDowngrade
                                        ? 'Bez opłaty'
                                        : trialUpgrade
                                            ? 'Bez opłat do końca okresu próbnego'
                                            : `${preview.proratedAmountFormatted} brutto`}
                                </Strong>
                            </FieldRow>
                            {!isDowngrade && !trialUpgrade && paidUntil(preview.periodEndsAt, preview.daysRemaining) && (
                                <FieldRow label="Za okres do">{paidUntil(preview.periodEndsAt, preview.daysRemaining)}</FieldRow>
                            )}
                        </FieldList>

                        <Explanation>{preview.explanation}</Explanation>
                        {!isDowngrade && <CheckoutConsent consent={consent} />}
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={isPending}>
                    {canConfirm ? 'Anuluj' : 'Zamknij'}
                </Button>
                {canConfirm && (
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
    onClose,
}: AddOnDialogProps) {
    const { showSuccess, showError, showWarning } = useToast();
    const checkout = useCheckout();
    const handoff = useCheckoutHandoff();
    const consent = useCheckoutConsent();

    // The communication module is the one add-on whose price is not the whole
    // commitment: it needs message texts and it needs credits. Explaining that here
    // covers every entry point at once: module gate, paywall, settings, the visit.
    const [guideDone, setGuideDone] = useState(!ADD_ONS_WITH_GUIDE.has(addOnKey));

    const notAllowed = preview?.allowed === false;
    const isTrial = !!preview && !notAllowed && preview.proratedAmountCents === null;

    const handleConfirm = async () => {
        if (!preview || notAllowed || !consent.require()) return;
        try {
            const step = handoff(await checkout.mutateAsync({ type: 'ADD_ON_PURCHASE', addOnKeys: [addOnKey], acceptTerms: true }));
            if (step.kind === 'redirect' || step.kind === 'track') return;
            if (step.kind === 'done') showSuccess('Moduł włączony', `Moduł ${addOnName} już działa.`);
            else toastCheckoutProblem({ showError, showWarning }, step);
            onClose();
        } catch (err: unknown) {
            toastUnhandledError(showError, err, 'Nie udało się włączyć modułu', 'Spróbuj ponownie za chwilę.');
        }
    };

    if (!guideDone) {
        return (
            <CommunicationModuleTour
                onClose={onClose}
                onFinish={() => setGuideDone(true)}
            />
        );
    }

    const canConfirm = isLoadingPreview || (!!preview && !notAllowed);

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Włącz moduł {addOnName}</ModalTitle>
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
                ) : notAllowed ? (
                    <NotAllowed explanation={preview.explanation} />
                ) : (
                    <>
                        <FieldList>
                            <FieldRow label="Moduł"><strong>{preview.addOnName}</strong></FieldRow>
                            <FieldRow label="Do zapłaty">
                                <Strong $highlight={!isTrial}>
                                    {isTrial
                                        ? 'Bez opłat do końca okresu próbnego'
                                        : `${preview.proratedAmountFormatted} brutto`}
                                </Strong>
                            </FieldRow>
                            {!isTrial && paidUntil(preview.periodEndsAt, preview.daysRemaining) && (
                                <FieldRow label="Za okres do">{paidUntil(preview.periodEndsAt, preview.daysRemaining)}</FieldRow>
                            )}
                        </FieldList>

                        <Explanation>{preview.explanation}</Explanation>
                        <CheckoutConsent consent={consent} />
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={checkout.isPending}>
                    {canConfirm ? 'Anuluj' : 'Zamknij'}
                </Button>
                {canConfirm && (
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={checkout.isPending || isLoadingPreview || !preview}
                    >
                        {checkout.isPending
                            ? (isTrial ? 'Włączanie…' : 'Przekierowywanie…')
                            : isTrial ? 'Włącz bezpłatnie' : 'Przejdź do płatności'}
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
     * Koniec trwającego opłaconego okresu: do tej chwili moduł działa, potem się wyłącza.
     * Null - nie ma opłaconego okresu do dokończenia (trial, karencja), wyłącza się od razu.
     * Dawniej okno zawsze mówiło „stracisz dostęp od razu", a serwer zostawiał moduł do końca okresu.
     */
    endsAt: string | null;
    onClose: () => void;
}

export function AddOnDeactivationDialog({ addOnKey, addOnName, endsAt, onClose }: DeactivateDialogProps) {
    const { showSuccess, showError } = useToast();
    const deactivateAddOn = useDeactivateAddOnMutation();

    // Okno zamyka się po kliknięciu, a wynik mówi toast - mutacja kończy się także po
    // odmontowaniu okna.
    const handleConfirm = () => {
        deactivateAddOn.mutateAsync(addOnKey)
            .then(() => endsAt
                ? showSuccess('Wyłączenie zaplanowane', `Moduł ${addOnName} działa do ${formatDate(endsAt)}.`)
                : showSuccess('Moduł wyłączony', `Moduł ${addOnName} nie działa już w Twoim studiu.`))
            .catch((err: unknown) =>
                toastUnhandledError(showError, err, 'Nie udało się wyłączyć modułu', 'Spróbuj ponownie za chwilę.'));
    };

    return (
        <ConfirmationModal
            isOpen
            variant="danger"
            title={`Wyłączyć moduł ${addOnName}?`}
            message={endsAt
                ? `Moduł działa do ${formatDate(endsAt)}, bo ten czas jest już opłacony. Nie wejdzie do ceny kolejnego okresu. Do tego dnia możesz cofnąć wyłączenie, jeśli nie opłacisz wcześniej przedłużenia.`
                : 'Moduł przestanie działać od razu. Możesz go później włączyć ponownie.'}
            confirmText={endsAt ? 'Wyłącz z końcem okresu' : 'Wyłącz'}
            cancelText="Anuluj"
            onConfirm={handleConfirm}
            onCancel={onClose}
        />
    );
}

// ─── Renewal dialog ───────────────────────────────────────────────────────────

interface RenewDialogProps {
    /** Pakiet kolejnego okresu (po zaplanowanym zejściu - już niższy). */
    planName: string;
    /** Moduły, które przedłużają się razem z pakietem (bez wyłączanych). */
    addOnNames: string[];
    /** Sformatowana kwota brutto za kolejny okres; null, gdy nie ma czego płacić. */
    amount: string | null;
    /** Do kiedy sięgnie okres po tej płatności. */
    periodEndsAt: string | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** Przedłużenie o 30 dni: kwota i zgoda na regulamin przed przejściem do Przelewy24. */
export function RenewDialog({ planName, addOnNames, amount, periodEndsAt, isPending, onConfirm, onClose }: RenewDialogProps) {
    const consent = useCheckoutConsent();

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Przedłuż pakiet</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <FieldList>
                    <FieldRow label="Pakiet"><strong>{planName}</strong></FieldRow>
                    {addOnNames.length > 0 && <FieldRow label="Moduły">{addOnNames.join(', ')}</FieldRow>}
                    {/* Okres liczy się od końca obecnego, nie od dnia płatności - dawniej okno mówiło „od opłacenia". */}
                    <FieldRow label="Okres">{periodEndsAt ? `30 dni, do ${formatDate(periodEndsAt)}` : '30 dni'}</FieldRow>
                    <FieldRow label="Do zapłaty">
                        <Strong $highlight>{amount ? `${amount} brutto` : 'Bez opłaty'}</Strong>
                    </FieldRow>
                </FieldList>
                <Explanation>Płatność jednorazowa przez Przelewy24, nie odnawia się automatycznie.</Explanation>
                <CheckoutConsent consent={consent} />
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={isPending}>Anuluj</Button>
                <Button
                    variant="primary"
                    onClick={() => consent.require() && onConfirm()}
                    disabled={isPending}
                >
                    {isPending ? 'Przekierowywanie…' : 'Przejdź do płatności'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
