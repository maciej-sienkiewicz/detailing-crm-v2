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
    phoneDone: false,
    start: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
    ...over,
});

const renderModal = (s: VisitFilesMobileSession, isOpen = true, onClose = vi.fn()) =>
    render(
        <ThemeProvider theme={theme}>
            <VisitFilesQrModal isOpen={isOpen} onClose={onClose} session={s} />
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

    it('„Wygeneruj nowy kod" unieważnia poprzedni', async () => {
        const s = session();
        renderModal(s);
        await userEvent.click(screen.getByRole('button', { name: 'Wygeneruj nowy kod (unieważnia poprzedni)' }));
        expect(s.start).toHaveBeenCalledWith(true);
    });

    it('„Gotowe" kończy sesję także na telefonie i zamyka okno', async () => {
        const s = session();
        const onClose = vi.fn();
        renderModal(s, true, onClose);
        await userEvent.click(screen.getByRole('button', { name: 'Gotowe' }));
        expect(s.end).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('pokazuje, że telefon kliknął „Gotowe"', () => {
        renderModal(session({ phoneDone: true, received: 2 }));
        expect(screen.getByRole('status')).toHaveTextContent('Telefon zakończył, odebrano 2 zdjęcia');
    });
});
