import { useState } from 'react';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { AddOnKey, AddOnPreview } from '../types';
import { apiErrorMessage } from '../utils/apiErrors';

/**
 * Shared state machine for the "unlock this module" flow:
 * pick an add-on → fetch the prorated-price preview → open the
 * AddOnActivationDialog (which hands off to Przelewy24 checkout).
 *
 * Nieudana wycena idzie do okna jako `previewError` (np. „najpierw opłać
 * przedłużenie" po końcu okresu) - wcześniej okno mówiło tylko „nie udało się
 * pobrać wyceny", a powód wisiał obok w gołym toaście interceptora.
 */
export function useAddOnUnlock() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [preview, setPreview] = useState<AddOnPreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [pendingKey, setPendingKey] = useState<AddOnKey | null>(null);
    const [pendingName, setPendingName] = useState('');

    const openUnlockDialog = async (addOnKey: AddOnKey, addOnName: string) => {
        setPendingKey(addOnKey);
        setPendingName(addOnName);
        setPreviewError(null);
        setLoadingPreview(true);
        setDialogOpen(true);

        try {
            setPreview(await newSubscriptionApi.previewAddOn(addOnKey, { skipErrorToast: true }));
        } catch (err) {
            setPreview(null);
            setPreviewError(apiErrorMessage(err) ?? null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setPreview(null);
        setPreviewError(null);
        setPendingKey(null);
    };

    return { dialogOpen, loadingPreview, preview, previewError, pendingKey, pendingName, openUnlockDialog, closeDialog };
}
