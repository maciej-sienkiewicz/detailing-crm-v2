// @vitest-environment jsdom
//
// W aplikacji ze sklepu kod modułów zostaje przeglądarkowy (window.open, <a download>,
// a.click()). Te testy pilnują, że każda z tych dróg trafia do systemu, a nie w próżnię:
// plik do „Udostępnij", obca strona do przeglądarki w aplikacji, „Wstecz" najpierw
// zamyka okno.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const share = vi.fn();
const writeFile = vi.fn();
const browserOpen = vi.fn();
const minimizeApp = vi.fn();
let backHandler: ((event: { canGoBack: boolean }) => void) | null = null;

vi.mock('./platform', () => ({ isNativeApp: () => true }));
vi.mock('@capacitor/share', () => ({ Share: { share: (...args: unknown[]) => share(...args) } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: (...args: unknown[]) => browserOpen(...args) } }));
vi.mock('@capacitor/filesystem', () => ({
    Directory: { Cache: 'CACHE' },
    Filesystem: { writeFile: (...args: unknown[]) => writeFile(...args) },
}));
vi.mock('@capacitor/app', () => ({
    App: {
        addListener: (_event: string, handler: (event: { canGoBack: boolean }) => void) => {
            backHandler = handler;
            return Promise.resolve({ remove: vi.fn() });
        },
        minimizeApp: () => minimizeApp(),
    },
}));

const flush = () => new Promise(resolve => setTimeout(resolve, 20));

beforeAll(async () => {
    // jsdom nie ma createObjectURL - dajemy prosty licznik, który moduł opakuje.
    let counter = 0;
    URL.createObjectURL = () => `blob:http://localhost/${++counter}`;
    URL.revokeObjectURL = () => {};
    const { installNativeShell } = await import('./installNativeShell');
    installNativeShell();
});

beforeEach(() => {
    vi.clearAllMocks();
    writeFile.mockResolvedValue({ uri: 'file:///cache/plik' });
    share.mockResolvedValue({});
});

describe('installNativeShell', () => {
    it('pobranie przez a.click() oddaje plik systemowi, nawet gdy adres od razu cofnięto', async () => {
        const url = URL.createObjectURL(new Blob(['%PDF'], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'protokół/wydania.pdf';
        link.click();
        URL.revokeObjectURL(url);
        await flush();

        expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({
            path: expect.stringMatching(/\/protokół-wydania\.pdf$/),
            directory: 'CACHE',
        }));
        expect(share).toHaveBeenCalledWith({ title: 'protokół-wydania.pdf', files: ['file:///cache/plik'] });
    });

    it('karta otwarta przed pobraniem dostaje plik po wpisaniu adresu', async () => {
        const tab = window.open('', '_blank');
        expect(tab).not.toBeNull();
        tab!.location.href = URL.createObjectURL(new Blob(['%PDF'], { type: 'application/pdf' }));
        await flush();

        expect(share).toHaveBeenCalledWith({ title: 'dokument.pdf', files: ['file:///cache/plik'] });
    });

    it('obca strona otwiera się w przeglądarce w aplikacji, nie zamiast aplikacji', async () => {
        window.open('https://maps.google.com/?q=Krak%C3%B3w', '_blank', 'noopener');
        await flush();
        expect(browserOpen).toHaveBeenCalledWith({ url: 'https://maps.google.com/?q=Krak%C3%B3w' });
    });

    it('zamknięcie arkusza udostępniania bez wyboru nie jest błędem', async () => {
        share.mockRejectedValue(new Error('Share canceled'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob(['a;b'], { type: 'text/csv' }));
        link.download = 'klienci.csv';
        link.click();
        await flush();

        expect(share).toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('zwykły link wewnątrz aplikacji działa jak dotąd', () => {
        const link = document.createElement('a');
        link.href = '#sekcja';
        link.click();
        expect(share).not.toHaveBeenCalled();
        expect(browserOpen).not.toHaveBeenCalled();
    });

    it('„Wstecz" najpierw zamyka okno na wierzchu, a na pierwszym ekranie chowa aplikację', () => {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        document.body.appendChild(dialog);
        const escape = vi.fn();
        document.addEventListener('keydown', event => { if (event.key === 'Escape') escape(); });

        backHandler!({ canGoBack: true });
        expect(escape).toHaveBeenCalledTimes(1);

        dialog.remove();
        backHandler!({ canGoBack: false });
        expect(minimizeApp).toHaveBeenCalled();
        expect(escape).toHaveBeenCalledTimes(1);
    });

    it('„Wstecz" przy rozwiniętym menu zamyka menu, zamiast cofać ekran', () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        const menu = document.createElement('div');
        menu.setAttribute('role', 'menu');
        menu.setAttribute('data-dismiss-on-back', '');
        document.body.appendChild(menu);
        const escape = vi.fn();
        document.addEventListener('keydown', event => { if (event.key === 'Escape') escape(); });

        backHandler!({ canGoBack: true });
        expect(escape).toHaveBeenCalledTimes(1);
        expect(back).not.toHaveBeenCalled();

        // Menu, które nie zgłosiło obsługi Wstecz (nie każde reaguje na Escape), nie blokuje cofania.
        menu.removeAttribute('data-dismiss-on-back');
        backHandler!({ canGoBack: true });
        expect(back).toHaveBeenCalledTimes(1);
        expect(escape).toHaveBeenCalledTimes(1);

        menu.remove();
        back.mockRestore();
    });
});
