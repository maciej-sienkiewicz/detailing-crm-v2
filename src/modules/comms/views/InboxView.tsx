// src/modules/comms/views/InboxView.tsx
// Trasa /inbox - „Zapytania": same sprawy (dawne Leady), domyślnie jako tablica.
// Widok mieszka w ../inbox; ten plik zostaje punktem wejścia leniwego importu w routerze.
//
// Poczta ma od 23.10.2026 własną trasę (/mail, osobna pozycja panelu bocznego). Adresy
// z dawnych zakładek (`/inbox?view=mail`, `?view=sent`) żyją w powiadomieniach,
// zakładkach przeglądarki i polskich linkach z pushy (LegacyUrlRedirect tłumaczy
// „widok=poczta" na `view=mail`) - przechodzą do Poczty z resztą parametrów.
import { Navigate, useSearchParams } from 'react-router-dom';
import InboxPage from '../inbox/InboxPage';

export default function InboxView() {
    const [params] = useSearchParams();
    const view = params.get('view');
    if (view === 'mail' || view === 'sent') {
        const mail = new URLSearchParams(params);
        if (view === 'mail') mail.delete('view');
        const query = mail.toString();
        return <Navigate to={`/mail${query ? `?${query}` : ''}`} replace />;
    }
    return <InboxPage scope="cases" />;
}
