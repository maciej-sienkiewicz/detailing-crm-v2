// src/modules/checkin/components/SubmitRecoveryNotice.tsx
//
// Stopka kreatora po błędzie zapisu, gdy samo „spróbuj ponownie" nie wystarcza.
//
// Zgłoszenie z lady: po „Wróć do formularza" zapis usług skończył się błędem serwera, okno
// dokumentów zniknęło, a jedynym przyciskiem był ten sam „Zapisz usługi i wróć do
// dokumentów", który znowu się wywracał. Sprzedawca nie wiedział, co zrobić, a klient
// czekał. Tu zawsze są wyjścia, które nie zależą od tego zapisu, i zdanie, że nic nie
// przepadło. Przyciski bez wypełnienia: wypełniony zostaje krok następny w stopce (CLAUDE.md §2).

import styled from 'styled-components';
import { Button, Notice } from '@/common/components/ui';

const Wrap = styled.div`
    flex: 1;
    min-width: 0;
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

interface RevisionFailedNoticeProps {
    /** Co się stało - z checkinErrorMessage. */
    message: string;
    onBackToDocuments: () => void;
    onAbandon: () => void;
    isAbandoning: boolean;
}

/** Poprawka usług szkicu się nie zapisała: szkic i jego dokumenty są nietknięte. */
export const RevisionFailedNotice = ({ message, onBackToDocuments, onAbandon, isAbandoning }: RevisionFailedNoticeProps) => (
    <Wrap>
        <Notice
            tone="danger"
            role="alert"
            title={message}
            action={(
                <Actions>
                    <Button size="sm" variant="outline" onClick={onBackToDocuments} disabled={isAbandoning}>
                        Wróć do dokumentów bez zmian
                    </Button>
                    <Button size="sm" variant="danger" onClick={onAbandon} disabled={isAbandoning}>
                        {isAbandoning ? 'Anulowanie…' : 'Przerwij przyjęcie'}
                    </Button>
                </Actions>
            )}
        >
            Przyjęcie jest zapisane razem ze zdjęciami, a usługi z formularza zostają na ekranie.
            Zapisz je jeszcze raz albo wróć do dokumentów: pokażą to, co zapisał serwer.
        </Notice>
    </Wrap>
);

interface DraftConflictNoticeProps {
    message: string;
    onGoToDrafts: () => void;
}

/**
 * 409 „trwa już nieukończone przyjęcie", ale szkicu nie dało się otworzyć stąd. Bez tego
 * stopka mówiła tylko, że przyjęcie trwa - i nie mówiła, gdzie je dokończyć.
 */
export const DraftConflictNotice = ({ message, onGoToDrafts }: DraftConflictNoticeProps) => (
    <Wrap>
        <Notice
            tone="warn"
            role="alert"
            title={message}
            action={(
                <Button size="sm" variant="outline" onClick={onGoToDrafts}>
                    Przejdź do nieukończonych przyjęć
                </Button>
            )}
        >
            To przyjęcie dokończysz albo anulujesz na liście nieukończonych przyjęć.
        </Notice>
    </Wrap>
);
