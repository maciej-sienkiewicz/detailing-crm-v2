// @vitest-environment jsdom
//
// Zgłoszenie biznesu: klient podał auto w temacie maila i odpisał „tak jak w tytule",
// a CRM tematu nigdzie nie pokazywał. Lead nosi nazwę auta albo osoby, więc temat
// musi stać osobno - w nagłówku rozmowy i przy wiadomości, która go zmieniła.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { CommMessage } from '../types';
import { ConversationHeader, MailThread } from './Conversation';

vi.mock('../components/MessageBody', () => ({
    MessageBody: ({ html }: { html: string }) => <div>{html}</div>,
}));

const message = (id: string, subject: string | null, sentAt: string, direction: 'INBOUND' | 'OUTBOUND' = 'INBOUND') =>
    ({
        id,
        threadId: 't-1',
        direction,
        fromEmail: 'klient@example.com',
        fromName: 'Klient',
        toEmails: [],
        ccEmails: [],
        subject,
        sentAt,
        bodyHtml: `<p>${id}</p>`,
        isRead: true,
        attachments: [],
        sendStatus: 'RECEIVED',
    }) as unknown as CommMessage;

const withTheme = (node: React.ReactNode) => render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe('Temat maila w rozmowie', () => {
    it('nagłówek leada pokazuje temat pod tytułem sprawy', () => {
        withTheme(<ConversationHeader title="Audi Q5" subtitle="Jan Kowalski, jan@wp.pl" topic="Oklejanie folią Audi Q5" phone={false} />);

        expect(screen.getByText('Oklejanie folią Audi Q5', { exact: false }).textContent).toBe('Temat: Oklejanie folią Audi Q5');
    });

    it('bez tematu nagłówek nie ma pustej linii „Temat:"', () => {
        withTheme(<ConversationHeader title="Audi Q5" topic={null} phone={false} />);

        expect(screen.queryByText(/Temat:/)).toBeNull();
    });

    it('wiadomość pokazuje temat tylko wtedy, gdy różni się od tematu wątku', () => {
        const { container } = withTheme(
            <MailThread
                messages={[
                    message('m-1', 'Oklejanie folią Audi Q5', '2026-11-03T09:00:00Z'),
                    message('m-2', 'Re: Oklejanie folią Audi Q5', '2026-11-03T10:00:00Z', 'OUTBOUND'),
                    message('m-3', 'Termin na piątek?', '2026-11-04T08:00:00Z'),
                ]}
                threadSubject="Oklejanie folią Audi Q5"
                phone={false}
                onDownload={vi.fn()}
                onOpenFull={vi.fn()}
            />
        );

        const topicOf = (id: string) => container.querySelector(`[data-message-id="${id}"] .topic`)?.textContent ?? null;
        expect(topicOf('m-1')).toBeNull();
        expect(topicOf('m-2')).toBeNull();
        expect(topicOf('m-3')).toBe('Temat: Termin na piątek?');
    });
});
