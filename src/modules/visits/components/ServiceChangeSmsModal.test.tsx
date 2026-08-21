// src/modules/visits/components/ServiceChangeSmsModal.test.tsx
// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceChangeSmsModal } from './ServiceChangeSmsModal';
import { buildServiceChangeSmsMessage, formatSmsAmount, toAscii } from '../utils/serviceChangeSms';

const summary = {
    addedNames: ['Pranie tapicerki'],
    removedNames: ['Naprawa wgniecenia'],
    priceChangedNames: ['Polerowanie'],
    totalGrossAfter: 283018,
};

const renderModal = (overrides: Partial<Parameters<typeof ServiceChangeSmsModal>[0]> = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
        <ServiceChangeSmsModal
            summary={summary}
            totalGrossBefore={250000}
            requireConfirmation
            isSaving={false}
            onCancel={onCancel}
            onConfirm={onConfirm}
            {...overrides}
        />
    );
    return {
        onConfirm,
        onCancel,
        textarea: screen.getByRole('textbox') as HTMLTextAreaElement,
        toggle: screen.getByRole('checkbox') as HTMLInputElement,
    };
};

describe('buildServiceChangeSmsMessage', () => {
    it('wymienia dodane, usunięte i przecenione usługi oraz cenę końcową', () => {
        expect(buildServiceChangeSmsMessage(summary)).toBe(
            'Dodano: Pranie tapicerki. Usunięto: Naprawa wgniecenia. Zmieniono cenę: Polerowanie. Razem 2 830,18 zł.'
        );
    });

    it('pomija puste sekcje', () => {
        const message = buildServiceChangeSmsMessage({
            addedNames: ['Woskowanie'],
            removedNames: [],
            priceChangedNames: [],
            totalGrossAfter: 12000,
        });
        expect(message).toBe('Dodano: Woskowanie. Razem 120,00 zł.');
    });

    it('zwija długie listy do "i inne"', () => {
        const message = buildServiceChangeSmsMessage({
            addedNames: ['A', 'B', 'C', 'D'],
            removedNames: [],
            priceChangedNames: [],
            totalGrossAfter: 0,
        });
        expect(message).toContain('Dodano: A, B, C i inne.');
    });

    it('formatuje kwoty zwykłą spacją, nie twardą (GSM-7)', () => {
        const formatted = formatSmsAmount(283018);
        expect(formatted).toBe('2 830,18 zł');
        expect(formatted).not.toContain(' ');
    });
});

describe('ServiceChangeSmsModal — polskie znaki', () => {
    it('domyślnie są wyłączone, a treść jest transliterowana', () => {
        const { textarea, toggle } = renderModal();

        expect(toggle.checked).toBe(false);
        expect(textarea.value).toBe(toAscii(buildServiceChangeSmsMessage(summary)));
        expect(textarea.value).toContain('Usunieto');
    });

    it('włączenie przełącznika podmienia treść na wersję z ogonkami', async () => {
        const user = userEvent.setup();
        const { textarea, toggle } = renderModal();

        await user.click(toggle);

        expect(textarea.value).toBe(buildServiceChangeSmsMessage(summary));
        expect(textarea.value).toContain('Usunięto');
    });

    it('ponowne wyłączenie wraca do wersji bez ogonków', async () => {
        const user = userEvent.setup();
        const { textarea, toggle } = renderModal();

        await user.click(toggle);
        await user.click(toggle);

        expect(toggle.checked).toBe(false);
        expect(textarea.value).toBe(toAscii(buildServiceChangeSmsMessage(summary)));
    });

    it('wpisanie polskiego znaku przy wyłączonym przełączniku włącza go', async () => {
        const user = userEvent.setup();
        const { textarea, toggle } = renderModal();

        await user.clear(textarea);
        await user.type(textarea, 'Zmieniono zakres usług');

        expect(toggle.checked).toBe(true);
        expect(textarea.value).toBe('Zmieniono zakres usług');
    });

    it('wysyła treść i stan przełącznika', async () => {
        const user = userEvent.setup();
        const { onConfirm, toggle } = renderModal();

        await user.click(toggle);
        await user.click(screen.getByRole('button', { name: 'Wyślij i zapisz' }));

        expect(onConfirm).toHaveBeenCalledWith(buildServiceChangeSmsMessage(summary), true);
    });

    it('przy wyłączonych ogonkach wysyła transliterację', async () => {
        const user = userEvent.setup();
        const { onConfirm } = renderModal();

        await user.click(screen.getByRole('button', { name: 'Wyślij i zapisz' }));

        expect(onConfirm).toHaveBeenCalledWith(toAscii(buildServiceChangeSmsMessage(summary)), false);
    });
});
