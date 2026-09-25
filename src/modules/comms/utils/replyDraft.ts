// src/modules/comms/utils/replyDraft.ts
// Teksty wokół szkicu odpowiedzi - osobno od komponentów, żeby dało się je testować.
import { pluralPl } from '@/common/utils/plural';
import type { ReplyDraft } from '../types';

/** Ile materiału ma asystent do trybu „w moim stylu" - zdaniem, nie liczbą bez kontekstu. */
export const sentMaterialHint = (count: number): string =>
    count > 0
        ? `W skrzynce jest ${count} ${pluralPl(count, 'wysłana wiadomość', 'wysłane wiadomości', 'wysłanych wiadomości')}.`
        : 'Nie ma jeszcze wysłanych wiadomości. Do czasu pierwszych odpowiedzi asystent napisze własną propozycję.';

/** Skąd wziął się styl szkicu - jednym zdaniem, bez żargonu. */
export const draftOriginLabel = (draft: ReplyDraft): string => {
    if (draft.styleApplied) {
        const count = draft.examples.length;
        return `Szkic w Twoim stylu, na podstawie ${count} ${pluralPl(count, 'wysłanej odpowiedzi', 'wysłanych odpowiedzi', 'wysłanych odpowiedzi')} na podobne pytania.`;
    }
    return draft.notice ?? 'Propozycja asystenta.';
};

/**
 * Znaczniki szkicu, które wciąż stoją w treści. Liczone na żywo z bieżącego tekstu:
 * uzupełnienie ostatniego odblokowuje wysyłkę bez dodatkowego kliknięcia.
 */
export const pendingPlaceholders = (draft: ReplyDraft | null, bodyText: string): string[] =>
    draft ? draft.placeholders.filter((placeholder) => bodyText.includes(placeholder)) : [];
