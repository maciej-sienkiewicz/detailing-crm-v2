// @vitest-environment jsdom
//
// Zbiorcze „Przegrany": to samo pytanie o powód co przy jednej sprawie, ale zmianę
// robi wywołujący (zaznaczenie w kolejce) - okno nie może samo ruszać żadnej sprawy.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const mutate = vi.fn();
vi.mock('../hooks/useLeads', () => ({
    useLeadDictionaries: () => ({
        data: { lostReasons: [{ code: 'OUT_OF_SCOPE', label: 'Poza ofertą' }, { code: 'PRICE', label: 'Za drogo' }] },
    }),
    useChangeLeadStatus: () => ({ mutate, isPending: false }),
}));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

import { LeadLostReasonDialog } from './LeadLostReasonDialog';

describe('LeadLostReasonDialog - tryb zbiorczy', () => {
    it('zbiera powód i notatkę dla zaznaczenia, nie zmieniając żadnej sprawy samo', async () => {
        const onSubmit = vi.fn();
        render(
            <ThemeProvider theme={theme}>
                <LeadLostReasonDialog bulk={{ count: 5, pending: false, onSubmit }} onClose={vi.fn()} />
            </ThemeProvider>
        );

        expect(screen.getByText('Dlaczego przegraliśmy te zapytania (5)?')).toBeInTheDocument();
        const confirm = screen.getByRole('button', { name: 'Zamknij jako przegrany' });
        expect(confirm).toBeDisabled();

        await userEvent.click(screen.getByRole('button', { name: 'Poza ofertą' }));
        await userEvent.type(screen.getByPlaceholderText('Notatka (opcjonalnie)'), 'nie robimy folii');
        await userEvent.click(confirm);

        expect(onSubmit).toHaveBeenCalledWith('OUT_OF_SCOPE', 'nie robimy folii');
        expect(mutate).not.toHaveBeenCalled();
    });
});
