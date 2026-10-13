// src/modules/visits/components/ServiceChangeSmsModal.test.tsx
// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServiceChangeSmsModal } from './ServiceChangeSmsModal';
import { CONSENT_CALL_TO_ACTION, toAscii } from '../utils/serviceChangeSms';
import { pluralPl } from '@/common/utils/plural';

const previewServiceChangeSms = vi.fn();
vi.mock('../api/visitApi', () => ({
    visitApi: { previewServiceChangeSms: (...args: unknown[]) => previewServiceChangeSms(...args) },
}));

const charsLabel = (n: number) => `${n} ${pluralPl(n, 'znak', 'znaki', 'znaków')}`;

const summary = {
    addedNames: ['Pranie tapicerki'],
    removedNames: ['Naprawa wgniecenia'],
    priceChangedNames: ['Polerowanie'],
    totalGrossAfter: 283018,
};

/** Treść, którą serwer złożył z szablonu studia. */
const TEMPLATE_MESSAGE = 'Dzień dobry Jan. Usunięto: Naprawa wgniecenia. Razem 2 830,18 zł.';

const renderModal = async (overrides: Partial<Parameters<typeof ServiceChangeSmsModal>[0]> = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ServiceChangeSmsModal
                visitId="v1"
                summary={summary}
                totalGrossBefore={250000}
                requireConfirmation
                isSaving={false}
                onCancel={onCancel}
                onConfirm={onConfirm}
                {...overrides}
            />
        </QueryClientProvider>
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // Okno ponawia nieudane zapytanie raz (z sekundą przerwy) - stąd dłuższe czekanie.
    await waitFor(() => expect(textarea.disabled).toBe(false), { timeout: 4000 });
    return {
        onConfirm,
        onCancel,
        textarea,
        toggle: screen.getByRole('checkbox') as HTMLInputElement,
    };
};

beforeEach(() => {
    previewServiceChangeSms.mockReset();
    previewServiceChangeSms.mockResolvedValue(TEMPLATE_MESSAGE);
});

describe('ServiceChangeSmsModal - treść z szablonu studia', () => {
    it('pyta serwer o treść z nazwami zmienionych usług i obiema kwotami', async () => {
        await renderModal();

        expect(previewServiceChangeSms).toHaveBeenCalledWith('v1', {
            requireConfirmation: true,
            addedNames: ['Pranie tapicerki'],
            removedNames: ['Naprawa wgniecenia'],
            priceChangedNames: ['Polerowanie'],
            totalGrossBefore: 250000,
            totalGrossAfter: 283018,
        });
    });

    it('do czasu odpowiedzi pole czeka, a wysyłka jest zablokowana', () => {
        previewServiceChangeSms.mockReturnValue(new Promise(() => {}));
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ServiceChangeSmsModal
                    visitId="v1" summary={summary} totalGrossBefore={250000} requireConfirmation
                    isSaving={false} onCancel={vi.fn()} onConfirm={vi.fn()}
                />
            </QueryClientProvider>
        );

        expect((screen.getByRole('textbox') as HTMLTextAreaElement).placeholder).toBe('Przygotowuję treść z szablonu…');
        expect((screen.getByRole('button', { name: 'Zapisz i wyślij' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('gdy szablonu nie udało się złożyć, pracownik wpisuje treść sam', async () => {
        previewServiceChangeSms.mockRejectedValue(new Error('500'));
        const user = userEvent.setup();
        const { textarea, onConfirm } = await renderModal();

        await waitFor(() => expect(textarea.placeholder).toContain('Wpisz ją ręcznie'));
        await user.type(textarea, 'Zmiana zakresu prac');
        await user.click(screen.getByRole('button', { name: 'Zapisz i wyślij' }));

        expect(onConfirm).toHaveBeenCalledWith('Zmiana zakresu prac', false);
    });
});

describe('ServiceChangeSmsModal - polskie znaki', () => {
    it('domyślnie są wyłączone, a treść jest transliterowana', async () => {
        const { textarea, toggle } = await renderModal();

        expect(toggle.checked).toBe(false);
        expect(textarea.value).toBe(toAscii(TEMPLATE_MESSAGE));
        expect(textarea.value).toContain('Usunieto');
    });

    it('włączenie przełącznika podmienia treść na wersję z ogonkami', async () => {
        const user = userEvent.setup();
        const { textarea, toggle } = await renderModal();

        await user.click(toggle);

        expect(textarea.value).toBe(TEMPLATE_MESSAGE);
        expect(textarea.value).toContain('Usunięto');
    });

    it('ponowne wyłączenie wraca do wersji bez ogonków', async () => {
        const user = userEvent.setup();
        const { textarea, toggle } = await renderModal();

        await user.click(toggle);
        await user.click(toggle);

        expect(toggle.checked).toBe(false);
        expect(textarea.value).toBe(toAscii(TEMPLATE_MESSAGE));
    });

    it('wpisanie polskiego znaku przy wyłączonym przełączniku włącza go', async () => {
        const user = userEvent.setup();
        const { textarea, toggle } = await renderModal();

        await user.clear(textarea);
        await user.type(textarea, 'Zmieniono zakres usług');

        expect(toggle.checked).toBe(true);
        expect(textarea.value).toBe('Zmieniono zakres usług');
    });

    it('wysyła treść i stan przełącznika', async () => {
        const user = userEvent.setup();
        const { onConfirm, toggle } = await renderModal();

        await user.click(toggle);
        await user.click(screen.getByRole('button', { name: 'Zapisz i wyślij' }));

        expect(onConfirm).toHaveBeenCalledWith(TEMPLATE_MESSAGE, true);
    });

    it('przy wyłączonych ogonkach wysyła transliterację', async () => {
        const user = userEvent.setup();
        const { onConfirm } = await renderModal();

        await user.click(screen.getByRole('button', { name: 'Zapisz i wyślij' }));

        expect(onConfirm).toHaveBeenCalledWith(toAscii(TEMPLATE_MESSAGE), false);
    });
});

describe('ServiceChangeSmsModal - fraza o potwierdzeniu', () => {
    it('jest widoczna, gdy klient ma potwierdzić zmiany', async () => {
        await renderModal({ requireConfirmation: true });

        expect(screen.getByText(toAscii('Odpisz TAK, aby zaakceptować.'))).toBeInTheDocument();
    });

    it('znika, gdy nie wymagamy potwierdzenia - SMS jest tylko informacyjny', async () => {
        await renderModal({ requireConfirmation: false });

        expect(screen.queryByText(/Odpisz TAK/)).not.toBeInTheDocument();
    });

    it('nie jest wliczana do długości SMS-a, gdy nie ma potwierdzenia', async () => {
        await renderModal({ requireConfirmation: false });

        const messageOnly = toAscii(TEMPLATE_MESSAGE).trim();
        expect(screen.getByText(charsLabel(messageOnly.length))).toBeInTheDocument();
    });

    // Frazę dokleja backend (SmsConsentService.CONSENT_CALL_TO_ACTION) - licznik musi
    // liczyć dokładnie to, co pójdzie do klienta, łącznie z przecinkiem przed „aby".
    it('wlicza frazę z przecinkiem do długości SMS-a, gdy klient ma potwierdzić', async () => {
        await renderModal({ requireConfirmation: true });

        expect(CONSENT_CALL_TO_ACTION).toBe('Odpisz TAK, aby zaakceptować.');
        const messageOnly = toAscii(TEMPLATE_MESSAGE).trim();
        const full = messageOnly.length + 1 + toAscii(CONSENT_CALL_TO_ACTION).length;
        expect(screen.getByText(charsLabel(full))).toBeInTheDocument();
    });

    it('nie wysyła frazy w treści, gdy nie wymagamy potwierdzenia', async () => {
        const user = userEvent.setup();
        const { onConfirm } = await renderModal({ requireConfirmation: false });

        await user.click(screen.getByRole('button', { name: 'Zapisz i wyślij' }));

        const [sentMessage] = onConfirm.mock.calls[0];
        expect(sentMessage).not.toMatch(/Odpisz TAK/);
    });
});
