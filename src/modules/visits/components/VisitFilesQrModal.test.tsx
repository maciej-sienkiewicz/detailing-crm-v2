// @vitest-environment jsdom
//
// „Z telefonu" na otwartej wizycie: kod zamawiany przy pierwszym otwarciu okna (bez
// unieważniania poprzedniego), licznik odebranych zdjęć, nowy kod na żądanie.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { VisitFilesQrModal } from './VisitFilesQrModal';
import type { VisitFilesMobileSession } from '../hooks/useVisitFilesMobileSession';

const session = (over: Partial<VisitFilesMobileSession> = {}): VisitFilesMobileSession => ({
    qrUrl: 'https://detailboost.pl/m/upload?t=abc',
    secondsLeft: 3 * 3600,
    isExpired: false,
    isStarting: false,
    error: null,
    received: 0,
    start: vi.fn().mockResolvedValue(undefined),
    ...over,
});

const renderModal = (s: VisitFilesMobileSession, isOpen = true) =>
    render(
        <ThemeProvider theme={theme}>
            <VisitFilesQrModal isOpen={isOpen} onClose={vi.fn()} session={s} />
        </ThemeProvider>
    );

describe('VisitFilesQrModal', () => {
    it('przy pierwszym otwarciu zamawia kod bez unieważniania poprzedniego', () => {
        const s = session({ qrUrl: null });
        renderModal(s);
        expect(s.start).toHaveBeenCalledWith(false);
    });

    it('zamknięte okno nie zamawia kodu', () => {
        const s = session({ qrUrl: null });
        renderModal(s, false);
        expect(s.start).not.toHaveBeenCalled();
    });

    it('pokazuje, ile zdjęć przyszło z telefonu', () => {
        renderModal(session({ received: 3 }));
        expect(screen.getByRole('status')).toHaveTextContent('Odebrano 3 zdjęcia');
    });

    it('„Nowy kod" unieważnia poprzedni', async () => {
        const s = session();
        renderModal(s);
        await userEvent.click(screen.getByRole('button', { name: 'Nowy kod (unieważnia poprzedni)' }));
        expect(s.start).toHaveBeenCalledWith(true);
    });
});
