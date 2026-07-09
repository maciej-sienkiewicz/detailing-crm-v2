import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { useChangePlan, useCheckout, useDeactivateAddOn as useDeactivateAddOnMutation } from '../api/subscriptionQueries';
import type { PlanChangePreview, AddOnPreview, AddOnKey, PlanKey } from '../types';
import { formatDate } from '../utils/formatters';
import {
    DialogBody,
    LoadingRow,
    Spinner,
    InfoGrid,
    InfoRow,
    InfoLabel,
    InfoValue,
    Explanation,
    DowngradeBadge,
    BtnSpinner,
} from './PlanChangeDialog.styles';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const WarnIcon = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d97706"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4M12 17h.01" />
    </svg>
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
            // Upgrade — paid operation, goes through Przelewy24.
            const order = await checkout.mutateAsync({ type: 'PLAN_UPGRADE', planKey: newPlanKey });
            if (order.paymentUrl) {
                window.location.assign(order.paymentUrl);
                return;
            }
            showSuccess('Plan zmieniony', `Twój plan został zmieniony na ${newPlanName}.`);
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Błąd zmiany planu', msg ?? 'Nie udało się zmienić planu. Spróbuj ponownie.');
        }
    };

    const isPending = changePlan.isPending || checkout.isPending;

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="480px">
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

            <DialogBody>
                {isLoadingPreview || !preview ? (
                    <LoadingRow>
                        <Spinner />
                        Ładowanie szczegółów…
                    </LoadingRow>
                ) : (
                    <>
                        {isDowngrade && (
                            <DowngradeBadge>
                                <WarnIcon />
                                Obniżenie planu wejdzie w życie po zakończeniu bieżącego okresu rozliczeniowego.
                                Do tego czasu zachowujesz pełny dostęp.
                            </DowngradeBadge>
                        )}

                        <InfoGrid>
                            <InfoRow>
                                <InfoLabel>Nowy plan</InfoLabel>
                                <InfoValue>{preview.newPlanName}</InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Termin wejścia w życie</InfoLabel>
                                <InfoValue>
                                    {isDowngrade ? formatDate(preview.effectiveAt) : 'Natychmiast'}
                                </InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Kwota</InfoLabel>
                                <InfoValue $highlight={!isDowngrade}>
                                    {isDowngrade
                                        ? 'Bez opłaty'
                                        : (preview.proratedAmountFormatted ?? 'Bezpłatnie w ramach trialu')}
                                </InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Dni pozostałych w okresie</InfoLabel>
                                <InfoValue>{preview.daysRemaining}</InfoValue>
                            </InfoRow>
                        </InfoGrid>

                        <Explanation>{preview.explanation}</Explanation>
                    </>
                )}
            </DialogBody>

            <ModalFooter>
                <SharedButton $variant="secondary" $size="sm" onClick={onClose} disabled={isPending}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    $variant={isDowngrade ? 'ghost' : 'primary'}
                    $size="sm"
                    onClick={handleConfirm}
                    disabled={isPending || isLoadingPreview || !preview}
                    style={isDowngrade ? { background: '#f59e0b', color: 'white' } : undefined}
                >
                    {isPending && <BtnSpinner />}
                    {isDowngrade ? 'Zaplanuj zmianę' : 'Przejdź do płatności'}
                </SharedButton>
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

export function AddOnActivationDialog({
    addOnKey,
    addOnName,
    preview,
    isLoadingPreview,
    onClose,
}: AddOnDialogProps) {
    const { showSuccess, showError } = useToast();
    const checkout = useCheckout();

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
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Błąd aktywacji', msg ?? 'Nie udało się aktywować modułu. Spróbuj ponownie.');
        }
    };

    const isTrial = preview?.proratedAmountCents === null;

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Aktywacja modułu: {addOnName}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <DialogBody>
                {isLoadingPreview || !preview ? (
                    <LoadingRow>
                        <Spinner />
                        Ładowanie szczegółów…
                    </LoadingRow>
                ) : (
                    <>
                        <InfoGrid>
                            <InfoRow>
                                <InfoLabel>Moduł</InfoLabel>
                                <InfoValue>{preview.addOnName}</InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Kwota (proporcjonalnie)</InfoLabel>
                                <InfoValue $highlight={!isTrial}>
                                    {isTrial
                                        ? 'Bezpłatnie w ramach trialu'
                                        : (preview.proratedAmountFormatted ?? '—')}
                                </InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Dni pozostałych w okresie</InfoLabel>
                                <InfoValue>{preview.daysRemaining}</InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Koniec okresu</InfoLabel>
                                <InfoValue>{formatDate(preview.periodEndsAt)}</InfoValue>
                            </InfoRow>
                        </InfoGrid>

                        <Explanation>{preview.explanation}</Explanation>
                    </>
                )}
            </DialogBody>

            <ModalFooter>
                <SharedButton $variant="secondary" $size="sm" onClick={onClose} disabled={checkout.isPending}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    $variant="primary"
                    $size="sm"
                    onClick={handleConfirm}
                    disabled={checkout.isPending || isLoadingPreview || !preview}
                >
                    {checkout.isPending && <BtnSpinner />}
                    {isTrial ? 'Aktywuj bezpłatnie' : 'Przejdź do płatności'}
                </SharedButton>
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

    const handleConfirm = async () => {
        try {
            await deactivateAddOn.mutateAsync(addOnKey);
            showSuccess('Moduł dezaktywowany', `Moduł ${addOnName} został dezaktywowany.`);
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Błąd dezaktywacji', msg ?? 'Nie udało się dezaktywować modułu.');
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dezaktywacja modułu</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <DialogBody>
                <DowngradeBadge>
                    <WarnIcon />
                    Stracisz dostęp do modułu <strong>{addOnName}</strong> natychmiast po potwierdzeniu. Kontynuować?
                </DowngradeBadge>
            </DialogBody>

            <ModalFooter>
                <SharedButton $variant="secondary" $size="sm" onClick={onClose} disabled={deactivateAddOn.isPending}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    $variant="danger"
                    $size="sm"
                    onClick={handleConfirm}
                    disabled={deactivateAddOn.isPending}
                >
                    {deactivateAddOn.isPending && <BtnSpinner />}
                    Dezaktywuj
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
