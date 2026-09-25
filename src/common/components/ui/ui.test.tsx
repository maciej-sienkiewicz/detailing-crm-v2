// src/common/components/ui/ui.test.tsx
// @vitest-environment jsdom
//
// Wspólne klocki wizyty i zleceń zbiorczych. Testy pilnują zachowań, na których
// stały zgłoszenia z produkcji: menu akcji, które zamykało się przed wykonaniem
// pozycji, i cena, której nie dało się kliknąć.

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActionMenu, Button, IconButton, MenuItem, PriceButton, Segmented, SummaryStrip, useActionMenu } from '.';

function MenuHarness({ onEdit }: { onEdit: (id: string) => void }) {
    const { menu, toggle, close } = useActionMenu<string>();
    return (
        <>
            <button type="button" onClick={e => toggle(e, 'row-1', 'row-1')}>Więcej akcji</button>
            <p>Tło</p>
            <ActionMenu anchor={menu?.anchor ?? null} onClose={close} label="Akcje usługi">
                <MenuItem onClick={() => onEdit(menu!.item)}>Zmień cenę</MenuItem>
            </ActionMenu>
        </>
    );
}

describe('ui', () => {
    it('Button nie wysyła formularza domyślnie', () => {
        render(<Button>Anuluj</Button>);
        expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveAttribute('type', 'button');
    });

    it('IconButton zawsze ma etykietę dla czytnika i dymek', () => {
        render(<IconButton label="Więcej akcji: Audi A6"><svg /></IconButton>);
        const btn = screen.getByRole('button', { name: 'Więcej akcji: Audi A6' });
        expect(btn).toHaveAttribute('title', 'Więcej akcji: Audi A6');
    });

    it('menu wykonuje pozycję i dopiero wtedy się zamyka', () => {
        const onEdit = vi.fn();
        render(<MenuHarness onEdit={onEdit} />);
        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Zmień cenę' }));
        expect(onEdit).toHaveBeenCalledWith('row-1');
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('menu zamyka kliknięcie obok i Escape; ten sam przycisk je przełącza', () => {
        render(<MenuHarness onEdit={vi.fn()} />);
        const trigger = screen.getByRole('button', { name: 'Więcej akcji' });
        fireEvent.click(trigger);
        expect(screen.getByRole('menu', { name: 'Akcje usługi' })).toBeInTheDocument();
        fireEvent.click(screen.getByText('Tło'));
        expect(screen.queryByRole('menu')).toBeNull();

        fireEvent.click(trigger);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();

        fireEvent.click(trigger);
        fireEvent.click(trigger);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('cena jest przyciskiem z ołówkiem; tylko do odczytu - bez przycisku', () => {
        const onClick = vi.fn();
        const { rerender } = render(
            <PriceButton gross="1 900,00 zł" net="1 544,72" aria-label="Zmień cenę: 1 900,00 zł" onClick={onClick} />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Zmień cenę: 1 900,00 zł' }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.getByText('1 544,72 netto')).toBeInTheDocument();

        rerender(<PriceButton gross="1 900,00 zł" net="1 544,72" readOnly />);
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('1 900,00 zł')).toBeInTheDocument();
    });

    it('pasek podsumowania nie pokazuje „…" w miejscu kwoty podczas wczytywania', () => {
        render(<SummaryStrip label="Do zapłaty" amount="6 918,40 zł" details="netto 5 624,72 zł" loading />);
        expect(screen.queryByText('6 918,40 zł')).toBeNull();
        expect(screen.queryByText(/…|\.\.\./)).toBeNull();
        expect(screen.getByLabelText('Wczytywanie kwoty')).toBeInTheDocument();
    });

    it('przełącznik oznacza wybraną opcję', () => {
        function Harness() {
            const [v, setV] = useState<'INTERNAL' | 'FOR_CUSTOMER'>('INTERNAL');
            return (
                <Segmented
                    label="Rodzaj komentarza"
                    value={v}
                    onChange={setV}
                    options={[{ value: 'INTERNAL', label: 'Wewnętrzny' }, { value: 'FOR_CUSTOMER', label: 'Dla klienta' }]}
                />
            );
        }
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Dla klienta' }));
        expect(screen.getByRole('button', { name: 'Dla klienta' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Wewnętrzny' })).toHaveAttribute('aria-pressed', 'false');
    });
});
