// @vitest-environment jsdom
//
// Zakładka mruga, gdy pojawi się w niej coś nowego (np. lista obecności w Rozliczeniach).
// Każde kolejne zdarzenie ma zacząć mruganie od nowa, a nie doklejać się do trwającego.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabBar, type TabDefinition } from './TabBar';

type Key = 'a' | 'b';

const renderBar = (flashKey?: number) => {
    const tabs: TabDefinition<Key>[] = [
        { key: 'a', label: 'Pracownicy' },
        { key: 'b', label: 'Rozliczenia', flashKey },
    ];
    return render(<TabBar tabs={tabs} activeKey="a" onChange={vi.fn()} ariaLabel="Widok zespołu" />);
};

const tab = (name: string) => screen.getByRole('tab', { name });

describe('TabBar - mruganie zakładki', () => {
    it('bez zdarzenia żadna zakładka nie mruga', () => {
        renderBar(0);
        expect(tab('Rozliczenia').hasAttribute('data-flash')).toBe(false);
        expect(tab('Pracownicy').hasAttribute('data-flash')).toBe(false);
    });

    it('nowe zdarzenie odpala mruganie tylko na swojej zakładce', () => {
        renderBar(1);
        expect(tab('Rozliczenia').getAttribute('data-flash')).toBe('true');
        expect(tab('Pracownicy').hasAttribute('data-flash')).toBe(false);
    });

    it('kolejne zdarzenie zaczyna mruganie od nowa - przycisk montuje się ponownie', () => {
        const { rerender } = renderBar(1);
        const first = tab('Rozliczenia');

        rerender(
            <TabBar
                tabs={[{ key: 'a', label: 'Pracownicy' }, { key: 'b', label: 'Rozliczenia', flashKey: 2 }]}
                activeKey="a"
                onChange={vi.fn()}
                ariaLabel="Widok zespołu"
            />,
        );

        expect(tab('Rozliczenia')).not.toBe(first);
        expect(tab('Rozliczenia').getAttribute('data-flash')).toBe('true');
    });
});
