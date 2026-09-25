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
    useUploadConsentAttachment: () => ({ mutateAsync: vi.fn() }),
}));

const { CustomerConsentsSection } = await import('./CustomerConsentsSection');

const renderIt = () => render(<ThemeProvider theme={theme}><CustomerConsentsSection customerId="cust-1" /></ThemeProvider>);

describe('CustomerConsentsSection', () => {
    beforeEach(() => { sign.mockClear(); revoke.mockClear(); });

    it('liczy aktualne zgody i opisuje podpis zdaniem, bez kropki', () => {
        renderIt();
        expect(screen.getByText('aktualne 1 z 2')).toBeInTheDocument();
        expect(screen.getByText(/Podpisana .*, wersja 2\./)).toBeInTheDocument();
        expect(document.body.textContent).not.toContain('·');
    });

    it('„Udziel zgody" podpisuje aktualny szablon', () => {
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Udziel zgody' }));
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
});
