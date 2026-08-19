import { describe, expect, it } from 'vitest';
import { SessionActivityTracker, normalizeRoute } from './activityTracker';

/**
 * Każdy przypadek poniżej to scenariusz, który po cichu zawyżyłby albo zaniżyłby
 * najważniejszą liczbę tego modułu — czas realnie przepracowany w CRM. Zawyżenie jest
 * groźniejsze, bo wygląda jak sukces produktu i nikt go nie kwestionuje.
 */

const IDLE = 120_000;

/** Sterowalny zegar — bez fałszowania czasu globalnie, więc testy nie wpływają na siebie. */
const makeClock = (start = 1_000_000) => {
    let now = start;
    return {
        now: () => now,
        advance: (ms: number) => { now += ms; },
    };
};

const makeTracker = (clock: ReturnType<typeof makeClock>) =>
    new SessionActivityTracker({ now: clock.now, idleThresholdMs: IDLE, interactionThrottleMs: 1_000 });

describe('SessionActivityTracker', () => {
    it('świeżo otwarta aplikacja jest aktywna, zanim padnie pierwsze kliknięcie', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        // Wejście do systemu samo w sobie jest aktywnością — inaczej pierwsza minuta
        // po zalogowaniu przepadałaby u każdego użytkownika, każdego dnia.
        expect(tracker.collect().active).toBe(true);
    });

    it('cisza dłuższa niż próg bezczynności kończy raportowanie pracy', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        clock.advance(IDLE - 1);
        expect(tracker.collect().active).toBe(true);

        clock.advance(2);
        expect(tracker.collect().active).toBe(false);
        expect(tracker.isIdle()).toBe(true);
    });

    it('interakcja przedłuża okno aktywności', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        clock.advance(IDLE - 1_000);
        tracker.markInteraction();
        clock.advance(IDLE - 1_000);

        expect(tracker.collect().active).toBe(true);
    });

    it('ukryta karta nigdy nie liczy się jako praca', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.markInteraction();
        tracker.setVisible(false);

        // To jest scenariusz „zostawiłem CRM w tle i pracuję w mailu".
        expect(tracker.collect().active).toBe(false);
    });

    it('zablokowany ekran nigdy nie liczy się jako praca, nawet przy ruchu myszą', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.setLocked(true);
        tracker.markInteraction();

        // Panel przełączania użytkownika to jedyny moment, w którym wiemy na pewno,
        // że nikt nie pracuje.
        expect(tracker.collect().active).toBe(false);
    });

    it('odblokowanie przywraca pomiar', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.setLocked(true);
        expect(tracker.collect().active).toBe(false);

        tracker.setLocked(false);
        tracker.markInteraction();
        expect(tracker.collect().active).toBe(true);
    });

    it('powrót do karty liczy się jako interakcja', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.setVisible(false);
        clock.advance(IDLE * 3);
        tracker.setVisible(true);

        // Bez tego użytkownik wracający po godzinie musiałby jeszcze coś kliknąć,
        // zanim jego praca zaczęłaby się liczyć.
        const payload = tracker.collect();
        expect(payload.active).toBe(true);
        expect(payload.interactions).toBeGreaterThan(0);
    });

    it('ruch myszą nie podbija licznika interakcji', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        for (let i = 0; i < 50; i++) {
            clock.advance(10);
            tracker.markInteraction(false);
        }

        // Serwer używa `interaction_count > 0` do odsiania zapomnianych kart. Kursor
        // dryfujący po ekranie w trakcie rozmowy telefonicznej nie może uczynić sesji
        // znaczącą — inaczej cały filtr pustych sesji przestaje działać.
        expect(tracker.collect().interactions).toBe(0);
    });

    it('ruch myszą przedłuża jednak okno aktywności', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        clock.advance(IDLE - 1_000);
        tracker.markInteraction(false);
        clock.advance(IDLE - 1_000);

        // Czytanie długiej listy z przesuwaniem kursora to praca, choć nikt nie klika.
        expect(tracker.collect().active).toBe(true);
    });

    it('zdarzenia ciągłe są dławione, ale zawsze przesuwają znacznik przy pierwszym', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        clock.advance(IDLE - 500);
        // Setki mousemove w jednej sekundzie — tylko pierwszy zapisuje znacznik.
        for (let i = 0; i < 200; i++) tracker.markInteraction(false);
        clock.advance(IDLE - 500);

        expect(tracker.collect().active).toBe(true);
    });

    it('collect zeruje licznik, żeby dwa heartbeaty nie zgłosiły tych samych kliknięć', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.markInteraction();
        tracker.markInteraction();
        expect(tracker.collect().interactions).toBe(2);
        expect(tracker.collect().interactions).toBe(0);
    });

    it('licznik interakcji nie przekracza limitu walidacji serwera', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        for (let i = 0; i < 10_050; i++) tracker.markInteraction();

        // Powyżej 10 000 serwer odrzuciłby cały heartbeat — razem z informacją
        // o aktywności, którą ten heartbeat niósł.
        expect(tracker.collect().interactions).toBe(10_000);
    });

    it('zmiana trasy jest interakcją, powtórzenie tej samej już nie', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.setRoute('/wizyty');
        tracker.setRoute('/wizyty');
        tracker.setRoute('/klienci');

        const payload = tracker.collect();
        expect(payload.interactions).toBe(2);
        expect(payload.route).toBe('/klienci');
    });

    it('laptop zamknięty na noc: brak aktywności mimo widocznej karty', () => {
        const clock = makeClock();
        const tracker = makeTracker(clock);

        tracker.markInteraction();
        clock.advance(16 * 60 * 60 * 1000); // 16 godzin

        // Dokładnie ten scenariusz, dla którego cały mechanizm powstał. Klient odmawia
        // raportowania pracy; zacisk po stronie serwera jest drugą, niezależną barierą.
        expect(tracker.collect().active).toBe(false);
    });
});

describe('normalizeRoute', () => {
    it('maskuje identyfikatory UUID', () => {
        expect(normalizeRoute('/wizyty/8f3c1a2b-1111-2222-3333-444455556666/protokol'))
            .toBe('/wizyty/{id}/protokol');
    });

    it('maskuje identyfikatory liczbowe', () => {
        expect(normalizeRoute('/faktury/4211')).toBe('/faktury/{id}');
    });

    it('maskuje długie losowe tokeny', () => {
        // Token z linku do podpisu jest sekretem — zapisanie go w tabeli analitycznej
        // byłoby wyciekiem do miejsca, którego nikt o to nie podejrzewa.
        expect(normalizeRoute('/sign/aB3xK9mQ7pL2wR5tY8uZ')).toBe('/sign/{token}');
    });

    it('zostawia czytelne segmenty bez zmian', () => {
        expect(normalizeRoute('/kalendarz/tydzien')).toBe('/kalendarz/tydzien');
        expect(normalizeRoute('/')).toBe('/');
    });

    it('przycina ścieżkę do limitu kolumny', () => {
        const long = '/' + 'a'.repeat(500);
        expect(normalizeRoute(long).length).toBeLessThanOrEqual(200);
    });
});
