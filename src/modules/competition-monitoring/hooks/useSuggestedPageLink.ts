import { useState } from 'react';
import { useToast } from '@/common/components/Toast';
import type { UnlinkedProfile } from '../types';
import { useLinkFacebookPage } from './useAds';

/**
 * „Połącz ze stroną z «W okolicy»" - jedno kliknięcie zamiast szukania strony.
 *
 * Profile obserwowane, zanim „Obserwuj" zaczęło przenosić stronę na Facebooku, stały
 * w zakładce „Reklamy" jako „nie jest połączony ze stroną", choć tabela „W okolicy"
 * pokazywała je właśnie PO stronie. Serwer podaje tę stronę jako podpowiedź; zapis
 * idzie zwykłą drogą wskazania strony (to samo żądanie co w oknie „Wskaż stronę FB"),
 * więc reklamy pobierają się od razu.
 */
export const useSuggestedPageLink = () => {
    const link = useLinkFacebookPage();
    const { showSuccess, showError } = useToast();
    const [pendingId, setPendingId] = useState<string | null>(null);

    const connect = (profile: UnlinkedProfile) => {
        const page = profile.suggestedPage;
        if (!page || pendingId) return;
        setPendingId(profile.profileId);
        link.mutate(
            { profileId: profile.profileId, pageId: page.pageId, pageName: page.pageName },
            {
                onSuccess: result => {
                    if (result.status === 'LINKED') {
                        showSuccess(`@${profile.username} połączony z: ${result.pageName || page.pageName}`, `Pobrano reklam: ${result.adsFound}`);
                    } else {
                        showSuccess('Zgłoszono zmianę strony', 'Profil ma już inną stronę - zmianę zatwierdzi administrator.');
                    }
                },
                onError: () => showError('Nie udało się połączyć strony', 'Spróbuj ponownie albo wskaż stronę ręcznie.'),
                onSettled: () => setPendingId(null),
            },
        );
    };

    return { connect, pendingId };
};
