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
import { formatDate } from '../utils/formatters';
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

    const handleConfirm = async () => {
        if (!isDowngrade && !consent.require()) return;
        try {
            if (isDowngrade) {
                await changePlan.mutateAsync(newPlanKey);
                showSuccess('Zmiana zaplanowana', `Pakiet zmieni się na ${newPlanName} z końcem opłaconego okresu.`);
                onClose();
                return;
            }
            // Upgrade: paid operation, goes through Przelewy24.
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
                ) : (
                    <>
                        {isDowngrade && (
                            <Notice tone="warn">
                                Niższy pakiet zacznie działać po końcu opłaconego okresu.
                                Do tego czasu masz wszystko jak teraz.
                            </Notice>
                        )}

                        <FieldList>
                            <FieldRow label="Nowy pakiet"><strong>{preview.newPlanName}</strong></FieldRow>
                            <FieldRow label="Od kiedy">
                                {isDowngrade ? formatDate(preview.effectiveAt) : 'Od razu po opłaceniu'}
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
                        {!isDowngrade && <CheckoutConsent consent={consent} />}
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={isPending}>
                    {!isLoadingPreview && !preview ? 'Zamknij' : 'Anuluj'}
                </Button>
                {(isLoadingPreview || preview) && (
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={isPending || isLoadingPreview || !preview}
                    >
                        {isPending
                            ? (isDowngrade ? 'Planowanie…' : 'Przekierowywanie…')
                            : isDowngrade ? 'Zaplanuj zmianę' : 'Przejdź do płatności'}
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

    const handleConfirm = async () => {
        if (!consent.require()) return;
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

    const isTrial = preview?.proratedAmountCents === null;

    if (!guideDone) {
        return (
            <CommunicationModuleTour
                onClose={onClose}
                onFinish={() => setGuideDone(true)}
            />
        );
    }

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
                ) : (
                    <>
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
                        <CheckoutConsent consent={consent} />
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={checkout.isPending}>
                    {!isLoadingPreview && !preview ? 'Zamknij' : 'Anuluj'}
                </Button>
                {(isLoadingPreview || preview) && (
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={checkout.isPending || isLoadingPreview || !preview}
                    >
                        {checkout.isPending
                            ? 'Przekierowywanie…'
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
    onClose: () => void;
}

export function AddOnDeactivationDialog({ addOnKey, addOnName, onClose }: DeactivateDialogProps) {
    const { showSuccess, showError } = useToast();
    const deactivateAddOn = useDeactivateAddOnMutation();

    // Wyłączenie modułu odbiera dostęp od razu, więc idzie przez to samo okno
    // potwierdzenia co każde usunięcie w ustawieniach. Okno zamyka się po kliknięciu,
    // a wynik mówi toast - mutacja kończy się także po odmontowaniu okna.
    const handleConfirm = () => {
        deactivateAddOn.mutateAsync(addOnKey)
            .then(() => showSuccess('Moduł wyłączony', `Moduł ${addOnName} nie działa już w Twoim studiu.`))
            .catch((err: unknown) =>
                toastUnhandledError(showError, err, 'Nie udało się wyłączyć modułu', 'Spróbuj ponownie za chwilę.'));
    };

    return (
        <ConfirmationModal
            isOpen
            variant="danger"
            title={`Wyłączyć moduł ${addOnName}?`}
            message="Stracisz dostęp do modułu od razu po potwierdzeniu. Możesz go później włączyć ponownie."
            confirmText="Wyłącz"
            cancelText="Anuluj"
            onConfirm={handleConfirm}
            onCancel={onClose}
        />
    );
}

// ─── Renewal dialog ───────────────────────────────────────────────────────────

interface RenewDialogProps {
    planName: string;
    /** Sformatowana kwota brutto za 30 dni; null, gdy nie ma czego płacić. */
    amount: string | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** Przedłużenie o 30 dni: kwota i zgoda na regulamin przed przejściem do Przelewy24. */
export function RenewDialog({ planName, amount, isPending, onConfirm, onClose }: RenewDialogProps) {
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
                    <FieldRow label="Pakiet"><strong>{planName}</strong> z aktywnymi modułami</FieldRow>
                    <FieldRow label="Okres">30 dni od opłacenia</FieldRow>
                    <FieldRow label="Do zapłaty">
                        <Strong $highlight>{amount ? `${amount} brutto` : 'Bez opłaty'}</Strong>
                    </FieldRow>
                </FieldList>
                <Explanation>Płatność jednorazowa przez Przelewy24 - nie odnawia się automatycznie.</Explanation>
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
