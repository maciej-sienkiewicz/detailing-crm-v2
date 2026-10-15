// src/modules/customers/components/CustomerConsentsSection.test.tsx
// @vitest-environment jsdom
//
// Zgody klienta. Wcześniej ten sam przełącznik znaczył „udziel" i „wycofaj",
// a wycofanie pytało własną nakładką. Testy pilnują, że udzielenie to osobny
// przycisk, a wycofanie przechodzi przez okno potwierdzenia.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { CustomerConsentStatusItem } from '../types';

const sign = vi.fn().mockResolvedValue({});
const revoke = vi.fn().mockResolvedValue(undefined);
const upload = vi.fn().mockResolvedValue(undefined);
const showError = vi.fn();

const item = (over: Partial<CustomerConsentStatusItem>): CustomerConsentStatusItem => ({
    consentId: null, definitionId: 'd', definitionSlug: 's', definitionName: 'Zgoda', isDefinitionActive: true,
    stage: null, isMandatory: false, displayOrder: 1, status: 'REQUIRED', currentTemplateId: 't', currentVersion: 1,
    signedTemplateId: null, signedVersion: null, signedAt: null, downloadUrl: null, attachmentUrl: null, ...over,
});

vi.mock('../hooks/useCustomerConsents', () => ({
    useCustomerConsentsStatus: () => ({
        data: { consents: [
            item({ definitionId: 'rodo', definitionName: 'RODO', status: 'VALID', consentId: 'c1', signedAt: '2024-03-01T10:00:00Z', signedVersion: 2, attachmentUrl: 'https://x/scan.pdf' }),
            item({ definitionId: 'photo', definitionName: 'Publikacja zdjęć', currentTemplateId: 'tpl-photo' }),
        ] },
        isLoading: false,
        isError: false,
    }),
    useSignCustomerConsent: () => ({ mutateAsync: sign }),
    useRevokeCustomerConsent: () => ({ mutateAsync: revoke, isPending: false }),
    useUploadConsentAttachment: () => ({ mutateAsync: upload }),
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError, showSuccess: vi.fn() }),
}));

const { CustomerConsentsSection } = await import('./CustomerConsentsSection');

const renderIt = () => render(<ThemeProvider theme={theme}><CustomerConsentsSection customerId="cust-1" /></ThemeProvider>);

describe('CustomerConsentsSection', () => {
    beforeEach(() => { sign.mockClear(); revoke.mockClear(); upload.mockReset(); showError.mockClear(); });

    it('liczy aktualne zgody i opisuje podpis zdaniem, bez kropki', () => {
        renderIt();
        expect(screen.getByText('aktualne 1 z 2')).toBeInTheDocument();
        expect(screen.getByText(/Podpisana .*, wersja 2\./)).toBeInTheDocument();
        expect(document.body.textContent).not.toContain('·');
    });

    it('„Zapisz zgodę" podpisuje aktualny szablon', () => {
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zgodę' }));
        expect(sign).toHaveBeenCalledWith({ templateId: 'tpl-photo' });
    });

    it('wycofanie idzie przez okno potwierdzenia', async () => {
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji: RODO' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Wycofaj zgodę' }));
        expect(revoke).not.toHaveBeenCalled();
        expect(await screen.findByText('Wycofać zgodę?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Wycofaj zgodę' }));
        expect(revoke).toHaveBeenCalledWith('c1');
    });

    it('skan-zdjęcie idzie z własnym rodzajem pliku, tym samym przy podpisie i przy wysyłce', async () => {
        sign.mockResolvedValueOnce({ attachmentUploadUrl: 'https://s3/put' });
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji: Publikacja zdjęć' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Dołącz skan podpisu' }));
        const file = new File(['x'], 'skan.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByTestId('consent-scan-input'), { target: { files: [file] } });

        await vi.waitFor(() => expect(upload).toHaveBeenCalled());
        expect(sign).toHaveBeenCalledWith({
            templateId: 'tpl-photo',
            payload: { requestAttachmentUpload: true, attachmentContentType: 'image/jpeg' },
        });
        expect(upload).toHaveBeenCalledWith({ uploadUrl: 'https://s3/put', file, contentType: 'image/jpeg' });
    });

    it('odrzucona wysyłka skanu nie przechodzi po cichu', async () => {
        const { PresignedUploadError } = await import('@/common/utils/presignedUpload');
        sign.mockResolvedValueOnce({ attachmentUploadUrl: 'https://s3/put' });
        upload.mockRejectedValueOnce(new PresignedUploadError('odrzucone', 403));
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji: Publikacja zdjęć' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Dołącz skan podpisu' }));
        fireEvent.change(screen.getByTestId('consent-scan-input'), {
            target: { files: [new File(['%PDF'], 'skan.pdf', { type: 'application/pdf' })] },
        });

        await vi.waitFor(() => expect(showError).toHaveBeenCalled());
        expect(showError.mock.calls[0][0]).toBe('Nie udało się dołączyć skanu');
    });
});
