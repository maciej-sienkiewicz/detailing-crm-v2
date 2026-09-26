// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SidebarBrand } from './SidebarBrand';

const LOGO = '/api/public/branding/studio/logo/abc123/app.png';

const renderBrand = (props: Partial<Parameters<typeof SidebarBrand>[0]> = {}) => render(
    <ThemeProvider theme={theme}>
        <SidebarBrand
            isCollapsed={false}
            companyName="Detal Studio"
            initials="DS"
            logoUrl={LOGO}
            logoNeedsPlate={false}
            isWideLogo
            onLogoError={() => {}}
            actions={<button type="button">Zwiń menu</button>}
            {...props}
        />
    </ThemeProvider>,
);

describe('SidebarBrand - logo studia w nagłówku menu', () => {
    it('logo stoi nad nazwą, a przycisk zwijania siedzi poza osią logo i nazwy', () => {
        renderBrand();
        const logo = screen.getAllByAltText('Detal Studio')[0];
        const caption = screen.getByText('Detal Studio');
        const button = screen.getByRole('button', { name: 'Zwiń menu' });

        expect(logo.getAttribute('src')).toBe(LOGO);
        expect(caption.parentElement).toBe(logo.parentElement);
        // W wierszu z nazwą obrysowany przycisk zabierał jej szerokość i nazwa z rejestru
        // kończyła się wielokropkiem - teraz stoi w rogu nagłówka.
        expect(logo.parentElement!.contains(button)).toBe(false);
    });

    it('sygnet idzie na środek tak samo jak poziomy logotyp, a w zwiniętym menu zostaje kafelkiem', () => {
        renderBrand({ isWideLogo: false });
        const images = screen.getAllByAltText('Detal Studio');
        expect(images.map(img => img.getAttribute('src'))).toEqual([LOGO, LOGO]);
        expect(screen.getByText('Detal Studio').parentElement).toBe(images[0].parentElement);
    });

    it('pełna nazwa z rejestru zostaje w podpowiedzi', () => {
        renderBrand({ legalName: 'DETAL STUDIO SP. Z O.O.' });
        expect(screen.getByText('Detal Studio')).toHaveAttribute('title', 'DETAL STUDIO SP. Z O.O.');
    });

    it('poziomy logotyp w zwiniętym menu ustępuje inicjałom', () => {
        renderBrand({ isWideLogo: true });
        expect(screen.getAllByAltText('Detal Studio')).toHaveLength(1);
        expect(screen.getByText('DS')).toBeTruthy();
    });

    it('bez logo zostaje dawny wiersz: inicjały, nazwa i przycisk', () => {
        renderBrand({ logoUrl: null });
        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByText('DS')).toBeTruthy();
        expect(screen.getByText('Detal Studio')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zwiń menu' })).toBeTruthy();
    });

    it('logo, które się nie wczytało, zgłasza błąd - nagłówek wraca do inicjałów', () => {
        const onLogoError = vi.fn();
        renderBrand({ isWideLogo: false, onLogoError });
        screen.getAllByAltText('Detal Studio').forEach(img => fireEvent.error(img));
        expect(onLogoError).toHaveBeenCalledTimes(2);
    });
});
