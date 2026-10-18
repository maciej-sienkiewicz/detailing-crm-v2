// @vitest-environment jsdom
//
// Podgląd posta: pojedyncze zdjęcie bez oznak karuzeli, karuzela z licznikiem „1/3"
// i kropkami, podpis z nazwą konta, hashtagi jako linki, przykładowe liczby w skali konta.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InstagramPostPreview } from './InstagramPostPreview';

afterEach(cleanup);

const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, url: `https://cdn/p${i}.jpg` }));

describe('InstagramPostPreview', () => {
    it('pojedyncze zdjęcie: bez licznika i strzałek', () => {
        render(<InstagramPostPreview username="myjbruk.pl" photos={photos(1)} caption="Nowe BMW #detailing" likes={128} />);

        expect(screen.getByRole('img', { name: 'Zdjęcie posta' })).toBeTruthy();
        expect(screen.queryByText('1/1')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Następne zdjęcie' })).toBeNull();
        expect(screen.getByText('Liczba polubień: 128')).toBeTruthy();
        expect(screen.getByText('#detailing')).toBeTruthy();
        expect(screen.getByTestId('preview-caption').textContent).toMatch(/^myjbruk\.pl Nowe BMW/);
    });

    it('karuzela: licznik, strzałka dalej, kolejność zdjęć jak w publikacji', () => {
        render(<InstagramPostPreview username="myjbruk.pl" photos={photos(3)} caption="Karuzela" likes={40} />);

        expect(screen.getByText('1/3')).toBeTruthy();
        expect(screen.getAllByRole('img').map(img => img.getAttribute('src')))
            .toEqual(['https://cdn/p0.jpg', 'https://cdn/p1.jpg', 'https://cdn/p2.jpg']);
        expect(screen.queryByRole('button', { name: 'Poprzednie zdjęcie' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));

        expect(screen.getByText('2/3')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Poprzednie zdjęcie' })).toBeTruthy();
    });

    it('bez zdjęć mówi wprost, że Instagram takiego posta nie przyjmie', () => {
        render(<InstagramPostPreview username="studio" photos={[]} caption="Sam tekst" likes={10} />);

        expect(screen.getByText(/nie opublikuje posta bez zdjęcia/)).toBeTruthy();
    });
});
