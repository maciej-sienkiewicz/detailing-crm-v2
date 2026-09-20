import { describe, expect, it } from 'vitest';
import {
    DEFAULT_STAGNATION,
    describeLeadUrgency,
    leadSegmentOf,
    leadUrgencyTone,
    type UrgencyInput,
} from './leadUrgency';

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Znacznik czasu sprzed `ms` milisekund - „czeka od tylu". */
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** Lead mailowy: ma wątek, więc backend zna [replyState] i [waitingSince]. */
const mailLead = (overrides: Partial<UrgencyInput> = {}): UrgencyInput => ({
    status: 'IN_PROGRESS',
    replyState: 'AWAITING_OUR_REPLY',
    waitingSince: ago(2 * HOUR),
    threadId: 'thread-1',
    firstResponseAt: null,
    createdAt: ago(3 * DAY),
    ...overrides,
});

/** Lead z telefonu: brak wątku, więc backend zawsze przysyła NO_CONVERSATION. */
const phoneLead = (overrides: Partial<UrgencyInput> = {}): UrgencyInput => ({
    status: 'NEW',
    replyState: 'NO_CONVERSATION',
    waitingSince: null,
    threadId: null,
    firstResponseAt: null,
    createdAt: ago(2 * HOUR),
    ...overrides,
});

describe('lead mailowy - ruch po naszej stronie', () => {
    it('świeże zapytanie klienta jest zadaniem, ale jeszcze nie zaległością', () => {
        const urgency = describeLeadUrgency(mailLead({ waitingSince: ago(2 * HOUR) }));

        expect(urgency.turn).toBe('OURS');
        expect(urgency.label).toBe('Bez odpowiedzi');
        expect(urgency.tone).toBe('due');
        // Wiek jeszcze nie przekroczył progu studia - nic się nie zapala.
        expect(urgency.overdue).toBe(false);
    });

    it('po przekroczeniu progu zapala się wyjątek, etykieta zostaje ta sama', () => {
        const urgency = describeLeadUrgency(mailLead({ waitingSince: ago(3 * DAY) }));

        // Etykieta nazywa STAN, a nie czas: czas stoi osobno, w kolumnie wieku,
        // i tylko on zmienia kolor po przekroczeniu progu.
        expect(urgency.label).toBe('Bez odpowiedzi');
        expect(urgency.overdue).toBe(true);
        expect(urgency.tone).toBe('due');
        expect(urgency.title).toBe('Klient czeka na odpowiedź od 3 dni');
    });
});

describe('lead mailowy - ruch po stronie klienta', () => {
    const waiting = (ms: number) =>
        mailLead({ replyState: 'AWAITING_CLIENT_REPLY', waitingSince: ago(ms) });

    it('normalny rytm rozmowy zostaje szary', () => {
        const urgency = describeLeadUrgency(waiting(2 * DAY));

        expect(urgency.turn).toBe('CLIENT');
        expect(urgency.label).toBe('U klienta');
        expect(urgency.tone).toBe('neutral');
        expect(urgency.overdue).toBe(false);
    });

    it('cisza dłuższa niż próg studia jest wyjątkiem, nie nowym rodzajem ruchu', () => {
        const urgency = describeLeadUrgency(waiting(6 * DAY));

        expect(urgency.label).toBe('Bez odzewu');
        expect(urgency.tone).toBe('stale');
        expect(urgency.overdue).toBe(true);
    });
});

/*
 * Zgłoszenie: „klikam »Kontakt poza pocztą«, dostaję komunikat, że lead zszedł
 * z kolejki, a on dalej wisi w »Czeka na nas«".
 *
 * Przyczyna jest po stronie danych, nie widoku: backend liczy `replyState`
 * wyłącznie z `comm_messages` (LeadConversationStateService), a odnotowany telefon
 * ląduje w `lead_callbacks` i tej wartości nie rusza. Jedynym śladem w DTO listy
 * jest `firstResponseAt` - stempel pierwszej reakcji, niezależny od kanału.
 */
describe('kontakt poza pocztą przesuwa ruch do klienta', () => {
    it('telefon PO ostatniej wiadomości klienta oddaje ruch klientowi', () => {
        // ago(HOUR) liczymy RAZ: dwa osobne wywołania mogą wypaść w różnych
        // milisekundach, a ISO-string z .toISOString() ma dokładność milisekundy -
        // wtedy toBe pada w wolniejszym przebiegu suity. To nie logika, to pomiar.
        const firstResponseAt = ago(HOUR);
        const urgency = describeLeadUrgency(mailLead({
            waitingSince: ago(3 * DAY),
            firstResponseAt,
        }));

        expect(urgency.turn).toBe('CLIENT');
        expect(urgency.waitingSince).toBe(firstResponseAt);
    });

    it('odpowiedź SPRZED ostatniej wiadomości klienta zostawia ruch u nas', () => {
        // Odpisaliśmy tydzień temu, klient napisał wczoraj - piłka wróciła.
        const waitingSince = ago(DAY);
        const urgency = describeLeadUrgency(mailLead({
            waitingSince,
            firstResponseAt: ago(7 * DAY),
        }));

        expect(urgency.turn).toBe('OURS');
        expect(urgency.waitingSince).toBe(waitingSince);
    });

    it('lead bez żadnej naszej reakcji zostaje w „Czeka na nas"', () => {
        expect(leadSegmentOf(mailLead({ firstResponseAt: null }))).toBe('OURS');
    });
});

describe('lead bez wątku - dziura, dla której powstała ta reguła', () => {
    it('telefon, na który nikt nie oddzwonił, stoi w kolejce jako NASZ ruch', () => {
        const urgency = describeLeadUrgency(phoneLead({ createdAt: ago(2 * HOUR) }));

        expect(urgency.turn).toBe('OURS');
        expect(urgency.tone).toBe('due');
        expect(urgency.label).toBe('Bez odpowiedzi');
    });

    it('czekanie liczy się od wpłynięcia zapytania, nie od korespondencji', () => {
        const createdAt = ago(4 * DAY);
        const urgency = describeLeadUrgency(phoneLead({ createdAt }));

        expect(urgency.waitingSince).toBe(createdAt);
        expect(urgency.overdue).toBe(true);
    });

    it('odnotowany kontakt przesuwa piłkę do klienta, ale NIE kasuje leada z kolejki', () => {
        const called = phoneLead({
            status: 'IN_PROGRESS',
            firstResponseAt: ago(1 * DAY),
            createdAt: ago(3 * DAY),
        });
        const urgency = describeLeadUrgency(called);

        expect(urgency.turn).toBe('CLIENT');
        expect(urgency.tone).toBe('neutral');
        // Dotąd ten lead miał ton neutralny z zupełnie innego powodu: bo w ogóle
        // nie istniał dla mechanizmu pilności. Teraz jest w segmencie „U klienta".
        expect(leadSegmentOf(called)).toBe('CLIENT');
    });

    it('cisza po odnotowanym kontakcie też stygnie', () => {
        const urgency = describeLeadUrgency(
            phoneLead({ status: 'IN_PROGRESS', firstResponseAt: ago(7 * DAY), createdAt: ago(9 * DAY) })
        );

        expect(urgency.tone).toBe('stale');
        expect(urgency.label).toBe('Bez odzewu');
    });
});

describe('sprawy zamknięte', () => {
    it.each(['COMPLETED', 'LOST', 'NO_SHOW'] as const)('%s nie ma czyjego ruchu', (status) => {
        const urgency = describeLeadUrgency(mailLead({ status, waitingSince: ago(9 * DAY) }));

        expect(urgency.turn).toBe('SETTLED');
        expect(urgency.tone).toBe('neutral');
        expect(urgency.waitingSince).toBeNull();
    });

    it('„dziękuję" od klienta w leadzie zrealizowanym nie jest zaległością', () => {
        expect(leadSegmentOf(mailLead({ status: 'COMPLETED', replyState: 'AWAITING_OUR_REPLY' })))
            .toBe('SETTLED');
    });
});

describe('progi z ustawień studia', () => {
    it('próg naszej zwłoki decyduje, kiedy wiek staje się wyjątkiem', () => {
        const lead = mailLead({ waitingSince: ago(30 * HOUR) });

        expect(describeLeadUrgency(lead, { ...DEFAULT_STAGNATION, ourReplyHours: 24 }).overdue)
            .toBe(true);
        expect(describeLeadUrgency(lead, { ...DEFAULT_STAGNATION, ourReplyHours: 48 }).overdue)
            .toBe(false);
    });

    it('próg ciszy klienta decyduje, kiedy rozmowa stygnie', () => {
        const lead = mailLead({ replyState: 'AWAITING_CLIENT_REPLY', waitingSince: ago(4 * DAY) });

        expect(describeLeadUrgency(lead, { ...DEFAULT_STAGNATION, clientSilenceHours: 72 }).tone)
            .toBe('stale');
        expect(describeLeadUrgency(lead, { ...DEFAULT_STAGNATION, clientSilenceHours: 120 }).tone)
            .toBe('neutral');
    });
});

describe('leadUrgencyTone', () => {
    it('daje ten sam ton co pełny opis - pasek karty i etykieta nie mogą się rozjechać', () => {
        const lead = mailLead({ waitingSince: ago(2 * HOUR) });
        expect(leadUrgencyTone(lead)).toBe(describeLeadUrgency(lead).tone);
    });
});
