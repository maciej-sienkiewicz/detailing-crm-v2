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
import { LoadingRow, Spinner, Explanation, Strong } from './PlanChangeDialog.styles';

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
    const { showSuccess, showError } = useToast();
    const changePlan = useChangePlan();
    const checkout = useCheckout();

    const isDowngrade = preview?.changeType === 'DOWNGRADE';

    const handleConfirm = async () => {
        try {
            if (isDowngrade) {
                await changePlan.mutateAsync(newPlanKey);
                showSuccess('Zmiana zaplanowana', `Plan zostanie zmieniony na ${newPlanName} na koniec okresu rozliczeniowego.`);
                onClose();
                return;
            }
            // Upgrade: paid operation, goes through Przelewy24.
            const order = await checkout.mutateAsync({ type: 'PLAN_UPGRADE', planKey: newPlanKey });
            if (order.paymentUrl) {
                window.location.assign(order.paymentUrl);
                return;
            }
            showSuccess('Plan zmieniony', `Twój plan został zmieniony na ${newPlanName}.`);
            onClose();
        } catch (err: unknown) {
            toastUnhandledError(showError, err, 'Nie udało się zmienić planu', 'Spróbuj ponownie za chwilę.');
        }
    };

    const isPending = changePlan.isPending || checkout.isPending;

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
                ) : (
                    <>
                        {isDowngrade && (
                            <Notice tone="warn">
                                Obniżenie planu wejdzie w życie po zakończeniu bieżącego okresu rozliczeniowego.
                                Do tego czasu zachowujesz pełny dostęp.
                            </Notice>
                        )}

                        <FieldList>
                            <FieldRow label="Nowy plan"><strong>{preview.newPlanName}</strong></FieldRow>
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
    const { showSuccess, showError } = useToast();
    const checkout = useCheckout();

    // The communication module is the one add-on whose price is not the whole
    // commitment: it needs message texts and it needs credits. Explaining that here
    // covers every entry point at once: module gate, paywall, settings, the visit.
    const [guideDone, setGuideDone] = useState(!ADD_ONS_WITH_GUIDE.has(addOnKey));

    const handleConfirm = async () => {
        try {
            const order = await checkout.mutateAsync({ type: 'ADD_ON_PURCHASE', addOnKeys: [addOnKey] });
            if (order.paymentUrl) {
                window.location.assign(order.paymentUrl);
                return;
            }
            showSuccess('Moduł aktywowany', `Moduł ${addOnName} został pomyślnie aktywowany.`);
            onClose();
        } catch (err: unknown) {
            toastUnhandledError(showError, err, 'Nie udało się aktywować modułu', 'Spróbuj ponownie za chwilę.');
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
                    <ModalTitle>Aktywacja modułu: {addOnName}</ModalTitle>
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
                            : isTrial ? 'Aktywuj bezpłatnie' : 'Przejdź do płatności'}
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
            .then(() => showSuccess('Moduł wyłączony', `Moduł ${addOnName} nie jest już aktywny.`))
            .catch((err: unknown) =>
                toastUnhandledError(showError, err, 'Nie udało się wyłączyć modułu', 'Spróbuj ponownie za chwilę.'));
    };

    return (
        <ConfirmationModal
            isOpen
            variant="danger"
            title={`Dezaktywować moduł ${addOnName}?`}
            message="Stracisz dostęp do modułu od razu po potwierdzeniu. Możesz go później włączyć ponownie."
            confirmText="Dezaktywuj"
            cancelText="Anuluj"
            onConfirm={handleConfirm}
            onCancel={onClose}
        />
    );
}
