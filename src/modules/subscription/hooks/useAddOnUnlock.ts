import { useState } from 'react';
import { canPurchaseHere } from '@/core/native/platform';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { AddOnKey, AddOnPreview } from '../types';

/**
 * Shared state machine for the "unlock this module" flow:
 * pick an add-on → fetch the prorated-price preview → open the
 * AddOnActivationDialog (which hands off to Przelewy24 checkout).
 *
 * W aplikacji ze sklepu okno zakupu nigdy się nie otwiera (App Store 3.1.1,
 * Google Play): to wspólne wejście wszystkich „Odblokuj moduł", więc jedna blokada
 * tutaj zamyka każde z nich, także takie, które ktoś kiedyś doda.
 */
export function useAddOnUnlock() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [preview, setPreview] = useState<AddOnPreview | null>(null);
    const [pendingKey, setPendingKey] = useState<AddOnKey | null>(null);
    const [pendingName, setPendingName] = useState('');

    const openUnlockDialog = async (addOnKey: AddOnKey, addOnName: string) => {
        if (!canPurchaseHere()) return;
        setPendingKey(addOnKey);
        setPendingName(addOnName);
        setLoadingPreview(true);
        setDialogOpen(true);

        try {
            setPreview(await newSubscriptionApi.previewAddOn(addOnKey));
        } catch {
            setPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setPreview(null);
        setPendingKey(null);
    };

    return { dialogOpen, loadingPreview, preview, pendingKey, pendingName, openUnlockDialog, closeDialog };
}
