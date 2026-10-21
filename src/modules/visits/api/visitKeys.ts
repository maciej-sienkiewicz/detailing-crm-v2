// src/modules/visits/api/visitKeys.ts
// Bez zależności: importują go też moduły ładujące wizyty leniwie (lista operacji, przyjęcie).

/**
 * Klucze zapytań jednej wizyty. Szczegóły mają własny człon `'detail'`: dawniej leżały pod
 * gołym `['visit', id]`, który jest prefiksem wszystkich zakładek, więc zmiana tytułu czy
 * terminu odświeżała też dokumenty, zdjęcia, komentarze i komunikację - około 6 GET zamiast 1.
 * `scope` zostaje dla zdarzeń, po których zmienia się wszystko: wydanie, konflikt stanu,
 * korekta rozliczenia, usunięcie wizyty.
 */
export const visitKeys = {
    scope: (visitId: string) => ['visit', visitId],
    detail: (visitId: string) => ['visit', visitId, 'detail'],
    documents: (visitId: string) => ['visit', visitId, 'documents'],
    photos: (visitId: string) => ['visit', visitId, 'photos'],
    comments: (visitId: string) => ['visit', visitId, 'comments'],
    communication: (visitId: string) => ['visit', visitId, 'communication'],
    technicalNoteHistory: (visitId: string) => ['visit', visitId, 'technical-note-history'],
    damageMap: (visitId: string) => ['visit', visitId, 'damage-map'],
    smsReminder: (visitId: string) => ['visit', visitId, 'sms-reminder'],
};
