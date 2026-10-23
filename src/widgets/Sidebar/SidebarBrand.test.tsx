// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SidebarBrand } from './SidebarBrand';

const renderBrand = (props: Partial<Parameters<typeof SidebarBrand>[0]> = {}) => render(
    <ThemeProvider theme={theme}>
        <SidebarBrand
            isCollapsed={false}
            companyName="Detal Studio"
            actions={<button type="button">Zwiń menu</button>}
            {...props}
        />
    </ThemeProvider>,
);

describe('SidebarBrand - logo DetailBoost w nagłówku menu', () => {
    it('logo DetailBoost stoi nad nazwą studia, a przycisk zwijania poza osią logo i nazwy', () => {
        renderBrand();
        const [wordmark] = screen.getAllByAltText('DetailBoost');
        const caption = screen.getByText('Detal Studio');
        const button = screen.getByRole('button', { name: 'Zwiń menu' });

        expect(wordmark.getAttribute('src')).toBe('/brand/detailboost-horizontal-white.svg?v=3');
        expect(caption.parentElement).toBe(wordmark.parentElement);
        // W wierszu z nazwą obrysowany przycisk zabierał jej szerokość i nazwa z rejestru
        // kończyła się wielokropkiem - teraz stoi w rogu nagłówka.
        expect(wordmark.parentElement!.contains(button)).toBe(false);
    });

    it('w zwiniętym menu zostaje sam sygnet', () => {
        renderBrand({ isCollapsed: true });
        const sources = screen.getAllByAltText('DetailBoost').map(img => img.getAttribute('src'));
        expect(sources).toContain('/brand/detailboost-mark-white.svg?v=3');
    });

    it('pełna nazwa z rejestru zostaje w podpowiedzi', () => {
        renderBrand({ legalName: 'DETAL STUDIO SP. Z O.O.' });
        expect(screen.getByText('Detal Studio')).toHaveAttribute('title', 'DETAL STUDIO SP. Z O.O.');
    });

    it('zanim nazwa studia dojdzie, pod logo nie ma podpisu', () => {
        const { container } = renderBrand({ companyName: null });
        expect(screen.getAllByAltText('DetailBoost')).toHaveLength(2);
        expect(container.textContent).toBe('Zwiń menu');
    });
});
