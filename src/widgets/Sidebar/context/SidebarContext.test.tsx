// @vitest-environment jsdom
//
// Menu boczne na tablecie (768-1023 px) startuje zwinięte do paska ikon. Rozwinięte
// (248 px) zostawiało treści na iPadzie w pionie ok. 500 px - mniej niż telefon
// w poziomie - i widoki ucinały kafelki, nagłówki i tabele (audyt RWD 07.11.2026).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { SidebarProvider, useSidebar } from './SidebarContext';

/** jsdom nie ma matchMedia - odpowiadamy tak, jak przeglądarka o zadanej szerokości. */
function mockViewport(width: number) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const min = /min-width:\s*([\d.]+)px/.exec(query);
        const max = /max-width:\s*([\d.]+)px/.exec(query);
        const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
        return {
            matches, media: query, onchange: null,
            addEventListener: vi.fn(), removeEventListener: vi.fn(),
            addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
        };
    });
}

function Probe() {
    const { isCollapsed, toggleCollapse } = useSidebar();
    return (
        <button type="button" onClick={toggleCollapse}>
            {isCollapsed ? 'zwinięte' : 'rozwinięte'}
        </button>
    );
}

const renderSidebar = () => render(<SidebarProvider><Probe /></SidebarProvider>);

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('SidebarProvider - szerokość tabletu', () => {
    it('na 768 i 1023 px menu startuje zwinięte, choć zapamiętany wybór to rozwinięte', () => {
        for (const width of [768, 1023]) {
            mockViewport(width);
            renderSidebar();
            expect(screen.getByRole('button').textContent).toBe('zwinięte');
            expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
            cleanup();
        }
    });

    it('na komputerze (1024 px) zostaje zapamiętany wybór', () => {
        mockViewport(1024);
        renderSidebar();
        expect(screen.getByRole('button').textContent).toBe('rozwinięte');
    });

    it('ręczne rozwinięcie na tablecie wygrywa z zawężeniem', () => {
        mockViewport(820);
        renderSidebar();
        const button = screen.getByRole('button');
        expect(button.textContent).toBe('zwinięte');

        act(() => button.click());
        expect(button.textContent).toBe('rozwinięte');
    });
});
