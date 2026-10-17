// @vitest-environment jsdom
//
// Odpowiedź na wiadomość z Instagrama: w 24 godziny od wiadomości klienta z CRM,
// później już tylko w aplikacji. Pole odpowiedzi ma to powiedzieć PRZED pisaniem,
// a „Wyślij" ma wypełnienie wyłącznie wtedy, gdy odpowiedź jest krokiem następnym
// sprawy (jedno wypełnienie w oknie, CLAUDE.md §2).
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { InstagramDmConversation } from '../types';

const mutate = vi.fn();
vi.mock('../hooks/useInstagramDm', () => ({
    useInstagramReply: () => ({ mutate, isPending: false }),
}));

import { InstagramBubbles, InstagramReplyBox } from './InstagramConversation';

const conversation = (over: Partial<InstagramDmConversation> = {}, deadlineInMs = 5 * 3_600_000): InstagramDmConversation => ({
    thread: {
        id: 'thread-1',
        username: 'jan.k',
        displayName: 'Jan Kowalski',
        leadId: 'lead-1',
        leadStatus: 'NEW',
        lastMessageAt: new Date().toISOString(),
        lastSnippet: 'Ile za PPF?',
        awaitingReply: true,
        unreadCount: 1,
        replyDeadline: new Date(Date.now() + deadlineInMs).toISOString(),
    },
    messages: [
        { id: 'm1', direction: 'INBOUND', text: 'Ile za PPF na maskę?', attachments: [], sentAt: new Date().toISOString(), sentByName: null },
        { id: 'm2', direction: 'INBOUND', text: null, attachments: [{ type: 'image', url: null }], sentAt: new Date().toISOString(), sentByName: null },
    ],
    canReply: true,
    profileUrl: 'https://www.instagram.com/jan.k/',
    ...over,
});

const wrap = (node: ReactNode) => render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe('InstagramReplyBox', () => {
    beforeEach(() => mutate.mockReset());

    it('mówi, do kiedy można odpisać, i wysyła tekst do rozmowy', () => {
        wrap(<InstagramReplyBox leadId="lead-1" conversation={conversation()} emphasis="primary" phone={false} />);

        expect(screen.getByText(/^Z CRM odpiszesz do/)).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Odpowiedź do @jan.k'), { target: { value: '  Dzień dobry, 1800 zł  ' } });
        fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }));

        expect(mutate).toHaveBeenCalledWith({ threadId: 'thread-1', text: 'Dzień dobry, 1800 zł' }, expect.anything());
    });

    it('pusta odpowiedź i tekst ponad limit Instagrama nie wychodzą', () => {
        wrap(<InstagramReplyBox leadId="lead-1" conversation={conversation()} emphasis="tint" phone={false} />);

        const send = screen.getByRole('button', { name: /Wyślij/ }) as HTMLButtonElement;
        expect(send.disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Odpowiedź do @jan.k'), { target: { value: 'x'.repeat(1001) } });
        expect(send.disabled).toBe(true);
        expect(screen.getByText('1001 / 1000')).toBeTruthy();
    });

    it('po 24 godzinach odsyła do rozmowy w aplikacji zamiast udawać wysyłkę', () => {
        wrap(
            <InstagramReplyBox
                leadId="lead-1"
                conversation={conversation({ canReply: false }, -60_000)}
                emphasis="primary"
                phone={false}
            />
        );

        expect(screen.queryByRole('button', { name: /Wyślij/ })).toBeNull();
        expect(screen.getByText(/Minęły 24 godziny/)).toBeTruthy();
        const link = screen.getByRole('link', { name: /Odpisz w aplikacji Instagram/ });
        expect(link.getAttribute('href')).toBe('https://ig.me/m/jan.k');
    });
});

describe('InstagramBubbles', () => {
    it('pokazuje treść i opisuje wiadomość bez tekstu', () => {
        wrap(<InstagramBubbles conversation={conversation()} loading={false} phone={false} />);

        expect(screen.getByText('Ile za PPF na maskę?')).toBeTruthy();
        expect(screen.getByText('Zdjęcie')).toBeTruthy();
        expect(screen.getByText(/Rozmowa z @jan\.k na Instagramie/)).toBeTruthy();
    });
});
