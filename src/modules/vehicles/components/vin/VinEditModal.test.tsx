// @vitest-environment jsdom
//
// Okno VIN z karty pojazdu i z „Przyjęcia pojazdu": numer zapisany tak, jak zapisze
// go serwer, pusty - usunięcie, bez zmian - bez zapisu.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { VinEditModal } from './VinEditModal';

const renderModal = (vin: string | null) => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <VinEditModal vin={vin} onSave={onSave} onClose={onClose} />
        </ThemeProvider>,
    );
    return { onSave, onClose, input: screen.getByLabelText('VIN') as HTMLInputElement };
};

describe('VinEditModal', () => {
    it('wpisany numer: wielkie litery, bez spacji i myślników', async () => {
        const { onSave, input } = renderModal(null);
        await userEvent.type(input, 'wba 3a5g59-dnp26082');
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        expect(onSave).toHaveBeenCalledWith('WBA3A5G59DNP26082');
    });

    it('wyczyszczone pole usuwa VIN', async () => {
        const { onSave, input } = renderModal('WBA3A5G59DNP26082');
        await userEvent.clear(input);
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        expect(onSave).toHaveBeenCalledWith('');
    });

    it('bez zmian - tylko zamyka, bez zapisu', async () => {
        const { onSave, onClose } = renderModal('WBA3A5G59DNP26082');
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        expect(onSave).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
});
