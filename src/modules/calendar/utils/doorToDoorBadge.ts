import type { DoorToDoorCalendarEntry } from '../types';

type Direction = DoorToDoorCalendarEntry['direction'];

/** Przyjęcie pojazdu od klienta (odbiór na początku rezerwacji). */
export const D2D_PICKUP_COLOR = '#0ea5e9';
/** Oddanie pojazdu klientowi (dostawa na koniec rezerwacji albo wizyty). */
export const D2D_DELIVERY_COLOR = '#ef4444';

export const D2D_DIRECTION_COLOR: Record<Direction, string> = {
    PICKUP: D2D_PICKUP_COLOR,
    DELIVERY: D2D_DELIVERY_COLOR,
};

export const D2D_DIRECTION_LABEL: Record<Direction, string> = {
    PICKUP: 'Przyjęcie',
    DELIVERY: 'Oddanie',
};

/** Ile przyjęć i ile oddań pojazdu wypada danego dnia - osobny samochodzik dla każdego. */
export function countByDirection(entries: DoorToDoorCalendarEntry[]): Record<Direction, number> {
    const counts: Record<Direction, number> = { PICKUP: 0, DELIVERY: 0 };
    entries.forEach(e => { counts[e.direction] += 1; });
    return counts;
}

/** Najpierw przyjęcia, potem oddania - w tej kolejności stoją samochodziki w rogu dnia. */
export function sortByDirection(entries: DoorToDoorCalendarEntry[]): DoorToDoorCalendarEntry[] {
    const rank = (e: DoorToDoorCalendarEntry) => (e.direction === 'PICKUP' ? 0 : 1);
    return [...entries].sort((a, b) => rank(a) - rank(b));
}

/** Opis znacznika dla czytnika ekranu, np. „Door to Door: przyjęcia 1, oddania 2". */
export function d2dBadgeLabel(counts: Record<Direction, number>): string {
    const parts = [
        counts.PICKUP > 0 ? `przyjęcia ${counts.PICKUP}` : null,
        counts.DELIVERY > 0 ? `oddania ${counts.DELIVERY}` : null,
    ].filter(Boolean);
    return `Door to Door: ${parts.join(', ')}`;
}

const CAR_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 ' +
    '1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 ' +
    '1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 ' +
    '13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 ' +
    '1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>' +
    '</svg>';

/**
 * Znacznik Door to Door w rogu dnia siatki miesiąca: dwa samochodziki, każdy z własną
 * liczbą - niebieski (przyjęcia) i czerwony (oddania). Kolory nadaje CSS kalendarza
 * (.fc-d2d-leg--pickup / --delivery); liczby i widoczność ustawia [updateD2DBadge].
 */
export function createD2DBadge(): HTMLElement {
    const badge = document.createElement('span');
    badge.className = 'fc-d2d-badge';
    badge.innerHTML = (['PICKUP', 'DELIVERY'] as const)
        .map(direction =>
            `<span class="fc-d2d-leg fc-d2d-leg--${direction.toLowerCase()}" data-direction="${direction}">` +
            `${CAR_ICON}<span class="fc-d2d-count"></span></span>`)
        .join('');
    return badge;
}

/** Liczby przy samochodzikach; kierunek bez wyjazdów tego dnia jest schowany. */
export function updateD2DBadge(badge: HTMLElement, entries: DoorToDoorCalendarEntry[]): void {
    const counts = countByDirection(entries);
    badge.setAttribute('aria-label', d2dBadgeLabel(counts));
    badge.querySelectorAll<HTMLElement>('.fc-d2d-leg').forEach(leg => {
        const n = counts[leg.dataset.direction as Direction] ?? 0;
        leg.style.display = n > 0 ? '' : 'none';
        const countEl = leg.querySelector<HTMLElement>('.fc-d2d-count');
        if (countEl) countEl.textContent = String(n);
    });
}

/**
 * Pozycja znacznika w rogu dnia: na lewo od ludzika urlopowego, jeśli jest. Gdy obok
 * numeru dnia brakuje miejsca (wąska komórka, do tego ludzik), samochodziki stają jeden
 * pod drugim zamiast zasłaniać numer.
 */
export function placeD2DBadge(frame: HTMLElement): void {
    const badge = frame.querySelector<HTMLElement>(':scope > .fc-d2d-badge');
    if (!badge) return;
    const leave = frame.querySelector<HTMLElement>(':scope > .fc-leave-badge');
    badge.style.right = leave ? `${leave.offsetWidth + 6}px` : '3px';
    badge.style.left = '';
    badge.classList.remove('fc-d2d-badge--stacked');
    const dayNumber = frame.querySelector<HTMLElement>('.fc-daygrid-day-number');
    if (dayNumber && badge.getBoundingClientRect().left < dayNumber.getBoundingClientRect().right) {
        badge.classList.add('fc-d2d-badge--stacked');
    }
}
