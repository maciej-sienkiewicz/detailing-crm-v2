// @vitest-environment jsdom
//
// Okno szczegółów reklamy: kampania z kilkoma wariantami pozwala obejrzeć każdy z nich,
// a pod treścią nie ma już paska odnośnika ani podpisu nad treścią.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { AdDetail } from '../types';
import { instagramApi } from '../api/instagramApi';
import { AdDetailModal } from './AdDetailModal';

vi.mock('../api/instagramApi', () => ({
    instagramApi: { getAdDetail: vi.fn(), getAdCreative: vi.fn(async () => ({ status: 'EMPTY', media: [] })) },
}));

const variants = [
    { adId: '1628442148923264', start: '2026-09-28', stop: '2026-09-30', reach: 589 },
    { adId: '1361325359137842', start: '2026-09-29', stop: '2026-10-03', reach: 1080 },
];

const detail = (adId: string, body: string): AdDetail => ({
    adId, profileId: 'p', username: 'carslab_pl', title: 'Profesjonalny detailing CARSLAB',
    start: '2026-09-29', stop: '2026-10-03', days: 5, active: false, reach: 1080, platforms: ['FACEBOOK'],
    targetAges: null, targetGender: null, locations: [], payer: null, beneficiary: null, breakdown: [],
    outOfTargetAgeReach: 0, body, linkDescription: 'Odświeżenie i zabezpieczenie auta', linkCaption: 'carslab.pl',
    snapshotUrl: null, variants,
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const renderModal = (adId: string) => render(
    <ThemeProvider theme={theme}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <AdDetailModal adId={adId} onClose={() => {}} />
        </QueryClientProvider>
    </ThemeProvider>,
);

describe('AdDetailModal', () => {
    it('przełącza warianty kampanii i pokazuje treść wybranego', async () => {
        vi.mocked(instagramApi.getAdDetail).mockImplementation(async (id: string) =>
            detail(id, id === '1361325359137842' ? 'Treść wariantu z większym zasięgiem' : 'Treść pierwszego wariantu'));
        renderModal('1361325359137842');

        expect(await screen.findByText('Treść wariantu z większym zasięgiem')).toBeTruthy();
        expect(screen.getByText('2 warianty tej kampanii')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Wariant 1/ }));

        await waitFor(() => expect(instagramApi.getAdDetail).toHaveBeenCalledWith('1628442148923264'));
        expect(await screen.findByText('Treść pierwszego wariantu')).toBeTruthy();
    });

    it('bez paska odnośnika pod treścią i bez podpisu nad treścią', async () => {
        vi.mocked(instagramApi.getAdDetail).mockResolvedValue({ ...detail('1', 'Treść'), variants: [] });
        renderModal('1');

        await screen.findByText('Treść');
        expect(screen.queryByText('carslab.pl')).toBeNull();
        expect(screen.queryByText('Odświeżenie i zabezpieczenie auta')).toBeNull();
        expect(screen.queryByText(/treść reklamy tak, jak widzi ją odbiorca/)).toBeNull();
        expect(screen.queryByText(/wariant/)).toBeNull();
    });
});
