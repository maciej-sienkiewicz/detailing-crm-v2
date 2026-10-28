// @vitest-environment jsdom
//
// Zgłoszenie: po otwarciu leada rozmowa stała w połowie wątku, a ostatnia wiadomość
// klienta była ucięta. Rozmowa ma się otwierać na ostatniej wiadomości - od jej początku.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { CommMessage } from '../types';
import { MailThread } from './Conversation';
import { latestMessageScrollTop } from './latestMessageScroll';

// Treść maila to ramka z własnym pomiarem wysokości - tu wystarczy zwykły tekst.
vi.mock('../components/MessageBody', () => ({
    MessageBody: ({ html }: { html: string }) => <div>{html}</div>,
}));

const message = (id: string, sentAt: string, direction: 'INBOUND' | 'OUTBOUND' = 'INBOUND') =>
    ({
        id,
        threadId: 't-1',
        direction,
        fromEmail: 'klient@example.com',
        fromName: 'Klient',
        toEmails: [],
        ccEmails: [],
        subject: 'Folia',
        sentAt,
        bodyHtml: `<p>${id}</p>`,
        isRead: true,
        attachments: [],
        sendStatus: 'RECEIVED',
    }) as unknown as CommMessage;

describe('MailThread - otwarcie na ostatniej wiadomości', () => {
    afterEach(() => vi.restoreAllMocks());

    it('długa ostatnia wiadomość staje początkiem u góry widoku, z odstępem', () => {
        // Widok zaczyna się 100 px od góry strony; ostatnia wiadomość - 1800 px niżej.
        expect(latestMessageScrollTop(100, 0, 1900)).toBe(1784);
        // Po przewinięciu liczy od bieżącej pozycji, nie od zera.
        expect(latestMessageScrollTop(100, 500, 1400)).toBe(1784);
        // Wiadomość już u góry - nie przewija powyżej początku.
        expect(latestMessageScrollTop(100, 0, 100)).toBe(0);
    });

    it('przewija do górnej krawędzi ostatniej wiadomości, a nie na sam dół wątku', () => {
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            const top = this.dataset.messageId === 'm-3' ? 1500 : 0;
            return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
        });

        const { container } = render(
            <ThemeProvider theme={theme}>
                <MailThread
                    messages={[
                        message('m-1', '2026-10-23T18:14:13Z'),
                        message('m-2', '2026-10-27T15:28:45Z', 'OUTBOUND'),
                        message('m-3', '2026-10-27T22:20:04Z'),
                    ]}
                    phone={false}
                    onDownload={vi.fn()}
                    onOpenFull={vi.fn()}
                />
            </ThemeProvider>
        );

        const scroller = container.querySelector('[data-message-id="m-3"]')!.parentElement as HTMLDivElement;
        expect(scroller.scrollTop).toBe(1484);
    });

    /**
     * Przyczyna zgłoszenia: treść maila dorysowuje się PO otwarciu (ramka dostaje wysokość
     * po wczytaniu), więc jedno przewinięcie trafiało w położenie sprzed dorysowania.
     */
    it('poprawia położenie, gdy maile nad ostatnią wiadomością urosną po otwarciu', () => {
        let lastTop = 1500;
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            const top = this.dataset.messageId === 'm-3' ? lastTop : 0;
            return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
        });
        const callbacks: ResizeObserverCallback[] = [];
        vi.stubGlobal('ResizeObserver', class {
            constructor(callback: ResizeObserverCallback) { callbacks.push(callback); }
            observe() {}
            disconnect() {}
        });

        const { container } = render(
            <ThemeProvider theme={theme}>
                <MailThread
                    messages={[message('m-1', '2026-10-23T18:14:13Z'), message('m-3', '2026-10-27T22:20:04Z')]}
                    phone={false}
                    onDownload={vi.fn()}
                    onOpenFull={vi.fn()}
                />
            </ThemeProvider>
        );
        const scroller = container.querySelector('[data-message-id="m-3"]')!.parentElement as HTMLDivElement;
        expect(scroller.scrollTop).toBe(1484);

        // Pierwszy mail dorysował się o 600 px wyżej - ostatnia wiadomość zjechała w dół.
        lastTop = 600;
        callbacks.forEach((callback) => callback([], {} as ResizeObserver));
        expect(scroller.scrollTop).toBe(1484 + 600 - 16);

        // Użytkownik przewinął sam - od tej chwili rozmowa zostaje tam, gdzie ją zostawił.
        scroller.dispatchEvent(new Event('wheel'));
        scroller.scrollTop = 100;
        lastTop = 900;
        callbacks.forEach((callback) => callback([], {} as ResizeObserver));
        expect(scroller.scrollTop).toBe(100);

        vi.unstubAllGlobals();
    });
});
