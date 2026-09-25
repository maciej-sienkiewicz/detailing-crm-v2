// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { MailSignature } from '../types';
import { SignatureSettingsModal } from './SignatureSettingsModal';

const save = vi.fn();
const copyLogo = vi.fn();
let signature: MailSignature;

vi.mock('../hooks/useComms', () => ({
    useMailSignature: () => ({ data: signature, isError: false }),
    useSaveMailSignature: () => ({ mutate: save, isPending: false }),
    useDeleteMailSignature: () => ({ mutate: vi.fn(), isPending: false }),
    useCopyCompanyLogoToSignature: () => ({ mutate: copyLogo, isPending: false }),
    useUploadSignatureImage: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

const ICONS_PATH = '/api/public/mail-signature/icons/v1';

const defaults: MailSignature['defaults'] = {
    fullName: 'Jan Nowak',
    email: 'jan@blask.pl',
    phone: '+48 600 100 200',
    company: 'Studio Blask',
    website: 'www.blask.pl',
    address: 'ul. Lśniąca 5, 00-001 Warszawa',
    hasCompanyLogo: true,
};

const renderModal = () =>
    render(
        <StyledThemeProvider theme={theme}>
            <SignatureSettingsModal isOpen onClose={vi.fn()} />
        </StyledThemeProvider>,
    );

const saveButton = () => screen.getByRole('button', { name: 'Zapisz stopkę' });

describe('SignatureSettingsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        signature = { bodyHtml: null, enabledByDefault: false, design: null, iconsPath: ICONS_PATH, defaults };
    });

    it('pierwsze uruchomienie: kreator z danymi z konta, zapis wysyła HTML motywu i projekt', async () => {
        renderModal();

        await userEvent.click(saveButton());

        expect(save).toHaveBeenCalledTimes(1);
        const [payload] = save.mock.calls[0];
        expect(payload.design).toMatchObject({ template: 'klasyczna', fullName: 'Jan Nowak', company: 'Studio Blask' });
        expect(payload.bodyHtml).toContain('Jan Nowak');
        expect(payload.bodyHtml).toContain('href="tel:+48600100200"');
        // Stopka zapisana po raz pierwszy startuje włączona w kompozytorze.
        expect(payload.enabledByDefault).toBe(true);
    });

    it('podgląd rysuje ten sam HTML, który idzie do zapisu', async () => {
        renderModal();

        await userEvent.click(screen.getByRole('button', { name: /Firmowa z logo/ }));
        await userEvent.click(saveButton());

        const preview = screen.getByLabelText('Podgląd wiadomości ze stopką');
        expect(preview.textContent).toContain('Studio Blask');
        expect(save.mock.calls[0][0].bodyHtml).toContain('Studio Blask');
        expect(save.mock.calls[0][0].design.template).toBe('firmowa');
    });

    it('podgląd pokazuje miejsce na zdjęcie, zapis go nie zawiera', async () => {
        renderModal();

        await userEvent.click(screen.getByRole('button', { name: /Ze zdjęciem/ }));
        const preview = screen.getByLabelText('Podgląd wiadomości ze stopką');
        expect(preview.querySelector('img[src^="data:image/svg+xml"]')).not.toBeNull();
        expect(screen.getByText(/Szare koło to miejsce na zdjęcie/)).toBeInTheDocument();

        await userEvent.click(saveButton());
        expect(save.mock.calls[0][0].bodyHtml).not.toContain('data:image');
    });

    it('ikony idą z domeny aplikacji, a nie z konfiguracji backendu', async () => {
        signature = {
            ...signature,
            bodyHtml: '<table></table>',
            design: { template: 'klasyczna', fullName: 'Jan Nowak', linkedin: 'linkedin.com/in/jan', color: '#123abc', font: 'arial', size: 'm', iconStyle: 'mono' },
        };
        renderModal();

        await userEvent.click(saveButton());
        expect(save.mock.calls[0][0].bodyHtml).toContain(`src="${window.location.origin}${ICONS_PATH}/mono/linkedin.png"`);
    });

    it('przełącznik trybu zamienia kreator na stopkę tekstową i z powrotem', async () => {
        renderModal();

        await userEvent.click(screen.getByRole('radio', { name: /Zwykły tekst/ }));
        expect(screen.getByRole('textbox', { name: 'Treść stopki' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('radio', { name: /Motyw graficzny/ }));
        expect(screen.getByRole('button', { name: /Dwa pasma/ })).toBeInTheDocument();
    });

    it('wybór motywu z logo raz podstawia logo studia z ustawień firmy', async () => {
        renderModal();

        await userEvent.click(screen.getByRole('button', { name: /Firmowa z logo/ }));
        await userEvent.click(screen.getByRole('button', { name: /Dwa pasma/ }));

        expect(copyLogo).toHaveBeenCalledTimes(1);
    });

    it('bez imienia i nazwiska nie zapisuje i przechodzi do kroku z danymi', async () => {
        signature = { ...signature, defaults: { ...defaults, fullName: null } };
        renderModal();

        await userEvent.click(saveButton());

        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('textbox', { name: /Imię i nazwisko/ })).toHaveAttribute('aria-invalid', 'true');
    });

    it('zapisana stopka tekstowa otwiera się jako tekst i tak zostaje zapisana', async () => {
        signature = { ...signature, bodyHtml: '<div>Jan Nowak<br>Studio Blask</div>', enabledByDefault: false };
        renderModal();

        const textarea = screen.getByRole('textbox', { name: 'Treść stopki' });
        expect(textarea).toHaveValue('Jan Nowak\nStudio Blask');
        await userEvent.click(saveButton());

        expect(save).toHaveBeenCalledWith(
            { bodyHtml: '<div>Jan Nowak<br>Studio Blask</div>', enabledByDefault: false, design: null },
            expect.anything(),
        );
    });

    it('zapisany projekt wraca do kreatora bez zmian', async () => {
        signature = {
            ...signature,
            bodyHtml: '<table></table>',
            enabledByDefault: true,
            design: { template: 'dwa-pasma', fullName: 'Ewa Lis', color: '#123abc', font: 'georgia', size: 'l', iconStyle: 'color' },
        };
        renderModal();

        await userEvent.click(saveButton());

        const [payload] = save.mock.calls[0];
        expect(payload.design).toMatchObject({ template: 'dwa-pasma', fullName: 'Ewa Lis', color: '#123abc', font: 'georgia', size: 'l' });
        expect(payload.bodyHtml).toContain('Ewa Lis');
        expect(payload.bodyHtml).toContain('bgcolor="#1c1c1e"');
    });
});
