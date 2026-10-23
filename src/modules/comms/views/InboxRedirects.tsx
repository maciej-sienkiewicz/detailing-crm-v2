// src/modules/comms/views/InboxRedirects.tsx
// Stare adresy skrzynek → /inbox (sprawy) albo /mail (poczta). Osobny, lekki plik:
// router ładuje go od razu, a ciężki widok skrzynki dopiero po wejściu na nią.
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

/** /leads?lead=…&status=… → /inbox z tymi samymi parametrami. */
export function LegacyLeadsRedirect() {
    const location = useLocation();
    return <Navigate to={`/inbox${location.search}`} replace />;
}

/**
 * /communication?… → Poczta (/mail), folder Wysłane → zakładka Wysłane. Nowa wiadomość
 * do leada bez wątku (`compose=1&lead=…`) otwiera jego sprawę: tam stoi pierwsza wiadomość.
 */
export function LegacyMailRedirect() {
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get('lead');
    if (searchParams.get('compose') === '1' && leadId) {
        return <Navigate to={`/inbox?lead=${encodeURIComponent(leadId)}`} replace />;
    }
    const params = new URLSearchParams(searchParams);
    if (params.get('folder') === 'sent') {
        params.delete('folder');
        params.set('view', 'sent');
    }
    const query = params.toString();
    return <Navigate to={`/mail${query ? `?${query}` : ''}`} replace />;
}
