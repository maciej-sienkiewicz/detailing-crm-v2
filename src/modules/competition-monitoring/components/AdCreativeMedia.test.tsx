// @vitest-environment jsdom
//
// Kreacja reklamy osadzona z serwerów Meta: film z klatką startową, grafika, a plik,
// który się nie wczyta (adres wygasł, reklama zdjęta), znika zamiast zostawić pustą ramkę.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdCreativeMediaView } from './AdCreativeMedia';

afterEach(cleanup);

const VIDEO = 'https://scontent-ber1-1.xx.fbcdn.net/o1/v/a.mp4?oe=6ADB07FF';
const POSTER = 'https://scontent-ber1-1.xx.fbcdn.net/v/p.jpg?oe=6ADAED30';
const IMAGE = 'https://scontent-ber1-1.xx.fbcdn.net/v/i.jpg?oe=6ADAED30';

describe('AdCreativeMediaView', () => {
    it('film z klatką startową i odtwarzaczem', () => {
        const { container } = render(
            <AdCreativeMediaView creative={{ status: 'OK', media: [{ kind: 'VIDEO', url: VIDEO, posterUrl: POSTER }] }} loading={false} />,
        );
        const video = container.querySelector('video')!;
        expect(video.getAttribute('src')).toBe(VIDEO);
        expect(video.getAttribute('poster')).toBe(POSTER);
        expect(video.hasAttribute('controls')).toBe(true);
    });

    it('grafika, która się nie wczyta, znika', () => {
        render(<AdCreativeMediaView creative={{ status: 'OK', media: [{ kind: 'IMAGE', url: IMAGE, posterUrl: null }] }} loading={false} />);
        const img = screen.getByRole('img', { name: 'Grafika reklamy' });
        expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');

        fireEvent.error(img);
        expect(screen.queryByRole('img')).toBeNull();
    });

    it('w trakcie odczytu - komunikat, bez kreacji nic', () => {
        const { rerender, container } = render(<AdCreativeMediaView creative={undefined} loading />);
        expect(screen.getByRole('status').textContent).toBe('Wczytuję grafikę reklamy…');

        rerender(<AdCreativeMediaView creative={{ status: 'EMPTY', media: [] }} loading={false} />);
        expect(container.innerHTML).toBe('');
    });

    it('BUSY po wyczerpaniu ponowień to koniec czekania, nie wieczne „wczytuję"', () => {
        // Hak czeka na zajęty serwer sam (useAds.test.tsx). BUSY, które tu dociera, znaczy,
        // że limit minął - okno mówi wtedy, że grafiki nie udało się wczytać.
        const { container } = render(<AdCreativeMediaView creative={{ status: 'BUSY', media: [] }} loading={false} />);
        expect(screen.queryByRole('status')).toBeNull();
        expect(container.innerHTML).toBe('');
    });
});
