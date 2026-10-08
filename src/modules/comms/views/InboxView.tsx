// src/modules/comms/views/InboxView.tsx
// Skrzynka „Zapytania" (/zapytania) - dawne „Leady" i „Poczta" w jednym miejscu.
//
// Zakładka mieszka w adresie (`?view=poczta|wyslane`, Sprawy bez parametru), żeby
// odświeżenie strony i link z powiadomienia trafiały w ten sam widok. Każda zakładka
// to dotychczasowy widok w trybie skrzynki: kolejka spraw (LeadsView, z rozmową
// i panelem sprawy obok) albo poczta (MailView, z folderem ustalonym przez zakładkę).
// Oba widoki mają dopracowane układy na telefon, tablet i komputer - skrzynka
// dokłada im wspólny nagłówek, a nie trzeci zestaw progów.
//
// Stare adresy (/leads, /communication) przekierowują tutaj z zachowaniem
// parametrów (InboxRedirects.tsx) - linki w powiadomieniach i zakładkach
// przeglądarki dalej działają.
import { useSearchParams } from 'react-router-dom';
import { InboxNav } from '../components/InboxNav';
import { inboxTabFromParam } from '../utils/inboxTabs';
import LeadsView from './LeadsView';
import MailView from './MailView';

export default function InboxView() {
    const [searchParams] = useSearchParams();
    const tab = inboxTabFromParam(searchParams.get('view'));

    if (tab === 'sprawy') {
        return (
            <LeadsView
                caseMode
                renderInboxNav={({ onOpenArchive }) => <InboxNav active="sprawy" onOpenArchive={onOpenArchive} />}
            />
        );
    }
    return (
        <MailView
            // Osobne instancje: wyszukiwanie i strona listy należą do folderu.
            key={tab}
            lockedFolder={tab === 'wyslane' ? 'SENT' : 'INBOX'}
            renderInboxNav={() => <InboxNav active={tab} />}
        />
    );
}
