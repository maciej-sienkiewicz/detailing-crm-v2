// src/modules/comms/views/InboxRedirects.tsx
// Stare adresy skrzynek → /inbox. Osobny, lekki plik: router ładuje go od razu,
// a ciężki widok skrzynki dopiero po wejściu na nią.
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

/** /leads?lead=…&status=… → /inbox z tymi samymi parametrami. */
export function LegacyLeadsRedirect() {
    const location = useLocation();
    return <Navigate to={`/inbox${location.search}`} replace />;
}

/**
 * /communication?… → zakładka Poczta albo Wysłane. Nowa wiadomość do leada bez
 * wątku (`compose=1&lead=…`) otwiera jego sprawę: tam stoi pierwsza wiadomość.
 */
export function LegacyMailRedirect() {
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get('lead');
    if (searchParams.get('compose') === '1' && leadId) {
        return <Navigate to={`/inbox?lead=${encodeURIComponent(leadId)}`} replace />;
    }
    const params = new URLSearchParams(searchParams);
    const folder = params.get('folder');
    params.set('view', folder === 'sent' ? 'sent' : 'mail');
    if (folder === 'sent') params.delete('folder');
    return <Navigate to={`/inbox?${params.toString()}`} replace />;
}
