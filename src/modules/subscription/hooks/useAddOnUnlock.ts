import { useState } from 'react';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { AddOnKey, AddOnPreview } from '../types';

/**
 * Shared state machine for the "unlock this module" flow:
 * pick an add-on → fetch the prorated-price preview → open the
 * AddOnActivationDialog (which hands off to Przelewy24 checkout).
 */
export function useAddOnUnlock() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [preview, setPreview] = useState<AddOnPreview | null>(null);
    const [pendingKey, setPendingKey] = useState<AddOnKey | null>(null);
    const [pendingName, setPendingName] = useState('');

    const openUnlockDialog = async (addOnKey: AddOnKey, addOnName: string) => {
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
