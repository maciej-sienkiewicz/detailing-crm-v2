import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/common/components/Toast';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { useChangePlan, useActivateAddOn } from '../api/subscriptionQueries';
import type { PlanChangePreview, AddOnPreview, AddOnKey, PlanKey } from '../types';
import { formatDate } from '../utils/formatters';
import {
    Overlay,
    Dialog,
    DialogHeader,
    DialogTitle,
    CloseBtn,
    DialogBody,
    LoadingRow,
    Spinner,
    InfoGrid,
    InfoRow,
    InfoLabel,
    InfoValue,
    Explanation,
    DowngradeBadge,
    DialogFooter,
    CancelBtn,
    ConfirmBtn,
    BtnSpinner,
} from './PlanChangeDialog.styles';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const XIcon = () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleConfirm = async () => {
        try {
            await changePlan.mutateAsync(newPlanKey);
            showSuccess('Plan zmieniony', `Twój plan został zmieniony na ${newPlanName}.`);
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Błąd zmiany planu', msg ?? 'Nie udało się zmienić planu. Spróbuj ponownie.');
        }
    };

    const isDowngrade = preview?.changeType === 'DOWNGRADE';

    return createPortal(
        <Overlay onClick={onClose}>
            <Dialog onClick={e => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>
                        {isDowngrade
                            ? `Obniżenie planu: ${currentPlanName} → ${newPlanName}`
                            : `Zmiana planu: ${currentPlanName} → ${newPlanName}`
                        }
                    </DialogTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij"><XIcon /></CloseBtn>
                </DialogHeader>

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
                                        {isDowngrade
                                            ? formatDate(preview.effectiveAt)
                                            : 'Natychmiast'}
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

                <DialogFooter>
                    <CancelBtn onClick={onClose} disabled={changePlan.isPending}>
                        Anuluj
                    </CancelBtn>
                    <ConfirmBtn
                        $variant={isDowngrade ? 'warning' : 'primary'}
                        onClick={handleConfirm}
                        disabled={changePlan.isPending || isLoadingPreview || !preview}
                    >
                        {changePlan.isPending && <BtnSpinner />}
                        {isDowngrade ? 'Zaplanuj zmianę' : 'Potwierdź i zapłać'}
                    </ConfirmBtn>
                </DialogFooter>
            </Dialog>
        </Overlay>,
        document.body
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
    const activateAddOn = useActivateAddOn();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleConfirm = async () => {
        try {
            await activateAddOn.mutateAsync(addOnKey);
            showSuccess('Moduł aktywowany', `Moduł ${addOnName} został pomyślnie aktywowany.`);
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Błąd aktywacji', msg ?? 'Nie udało się aktywować modułu. Spróbuj ponownie.');
        }
    };

    const isTrial = preview?.proratedAmountCents === null;

    return createPortal(
        <Overlay onClick={onClose}>
            <Dialog onClick={e => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Aktywacja modułu: {addOnName}</DialogTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij"><XIcon /></CloseBtn>
                </DialogHeader>

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

                <DialogFooter>
                    <CancelBtn onClick={onClose} disabled={activateAddOn.isPending}>
                        Anuluj
                    </CancelBtn>
                    <ConfirmBtn
                        $variant="primary"
                        onClick={handleConfirm}
                        disabled={activateAddOn.isPending || isLoadingPreview || !preview}
                    >
                        {activateAddOn.isPending && <BtnSpinner />}
                        {isTrial ? 'Aktywuj bezpłatnie' : 'Potwierdź i zapłać'}
                    </ConfirmBtn>
                </DialogFooter>
            </Dialog>
        </Overlay>,
        document.body
    );
}

// ─── Add-on deactivation dialog (no preview needed) ──────────────────────────

interface DeactivateDialogProps {
    addOnKey: AddOnKey;
    addOnName: string;
    onClose: () => void;
}

export function AddOnDeactivationDialog({ addOnKey, addOnName, onClose }: DeactivateDialogProps) {
    const { showSuccess, showError } = useToast();
    const deactivateAddOn = useDeactivateAddOnMutation();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

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

    return createPortal(
        <Overlay onClick={onClose}>
            <Dialog onClick={e => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Dezaktywacja modułu</DialogTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij"><XIcon /></CloseBtn>
                </DialogHeader>

                <DialogBody>
                    <DowngradeBadge>
                        <WarnIcon />
                        Stracisz dostęp do modułu <strong>{addOnName}</strong> natychmiast po potwierdzeniu. Kontynuować?
                    </DowngradeBadge>
                </DialogBody>

                <DialogFooter>
                    <CancelBtn onClick={onClose} disabled={deactivateAddOn.isPending}>
                        Anuluj
                    </CancelBtn>
                    <ConfirmBtn
                        $variant="warning"
                        onClick={handleConfirm}
                        disabled={deactivateAddOn.isPending}
                    >
                        {deactivateAddOn.isPending && <BtnSpinner />}
                        Dezaktywuj
                    </ConfirmBtn>
                </DialogFooter>
            </Dialog>
        </Overlay>,
        document.body
    );
}

// Local import to avoid circular dep
import { useDeactivateAddOn as useDeactivateAddOnMutation } from '../api/subscriptionQueries';
