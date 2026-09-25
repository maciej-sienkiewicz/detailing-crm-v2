// @vitest-environment jsdom
//
// Kreator powiadomień: każda platforma dostaje instrukcję dla SIEBIE, a prośba
// o zgodę pada w tym samym kliknięciu, bez żadnego await przed nią.
//
// To drugie jest warunkiem działania na iPhonie: Safari pokazuje systemowy monit
// wyłącznie w obsłudze gestu. Wcześniej requestPermission() stało wewnątrz funkcji
// mutacji, wywoływanej dopiero po kilku wewnętrznych await biblioteki - monit
// potrafił się nie pojawić, a użytkownik widział „zablokowane", choć nikt go nie pytał.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PushNotificationWizard } from './PushNotificationWizard';
import { usePushDevice, type PushDeviceState } from '../hooks/usePushDevice';

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock('../api/pushApi', () => ({
    pushApi: { listDevices: vi.fn(async () => []), getVapidPublicKey: vi.fn(), registerDevice: vi.fn(), sendTestPush: vi.fn() },
}));

const pushState = (over: Partial<PushDeviceState>): PushDeviceState => ({
    platform: { kind: 'android', installed: false },
    support: 'supported',
    isSubscribedHere: false,
    appLikelyOnHomeScreen: false,
    devices: [],
    isLoadingDevices: false,
    serviceWorkerVersion: null,
    enable: vi.fn(() => Promise.resolve()) as never,
    isEnabling: false,
    disable: vi.fn() as never,
    isDisabling: false,
    sendTest: vi.fn() as never,
    isSendingTest: false,
    revokeDevice: vi.fn() as never,
    ...over,
});

afterEach(cleanup);

describe('PushNotificationWizard', () => {
    it('iPhone w Safari: instrukcja dodania do ekranu, bez przycisku, który nie może zadziałać', () => {
        render(<PushNotificationWizard push={pushState({
            platform: { kind: 'ios-install', device: 'iphone', browser: 'safari' },
            support: 'unsupported',
        })} />);

        expect(screen.getByText('Dodaj do ekranu początkowego')).toBeTruthy();
        // Logowanie w aplikacji z ikony zaskakiwało ludzi - kreator mówi o nim z góry.
        expect(screen.getByText(/zaloguj się jeszcze raz/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Włącz powiadomienia/ })).toBeNull();
    });

    it('iPhone w Safari przypomina, że ikona już może być - Safari jej nie widzi', () => {
        render(<PushNotificationWizard push={pushState({
            platform: { kind: 'ios-install', device: 'iphone', browser: 'safari' },
            support: 'unsupported',
        })} />);
        expect(screen.getByText(/Masz już CRM na ekranie początkowym\? Otwórz go z ikony/)).toBeTruthy();
    });

    it('konto z aplikacją na iPhonie: „otwórz z ikony" zamiast drugiej instalacji, instrukcja o dotknięcie dalej', () => {
        render(<PushNotificationWizard push={pushState({
            platform: { kind: 'ios-install', device: 'iphone', browser: 'safari' },
            support: 'unsupported',
            appLikelyOnHomeScreen: true,
        })} />);

        expect(screen.getByText('Otwórz CRM z ikony na ekranie początkowym')).toBeTruthy();
        expect(screen.queryByText('Dodaj do ekranu początkowego')).toBeNull();

        // Podpowiedź z konta bywa chybiona (inny iPhone) - droga do instalacji zostaje.
        fireEvent.click(screen.getByRole('button', { name: 'Pokaż, jak ją dodać' }));
        expect(screen.getByText('Dodaj do ekranu początkowego')).toBeTruthy();
    });

    it('przed monitem systemowym tłumaczy, co będzie przychodzić', () => {
        render(<PushNotificationWizard push={pushState({})} />);
        expect(screen.getByText('Dzwonisz jednym dotknięciem')).toBeTruthy();
        expect(screen.getByText('Nie przegapisz zapytania')).toBeTruthy();
    });

    it('kliknięcie „Włącz" woła enable() synchronicznie, w obsłudze gestu', () => {
        const push = pushState({});
        render(<PushNotificationWizard push={push} />);

        fireEvent.click(screen.getByRole('button', { name: /Włącz powiadomienia/ }));

        // Bez czekania na cokolwiek: jeszcze w tym samym zadaniu co kliknięcie.
        expect(push.enable).toHaveBeenCalledTimes(1);
    });

    it('zablokowane na Androidzie: droga odblokowania zamiast przycisku bez efektu', () => {
        render(<PushNotificationWizard push={pushState({ support: 'denied' })} />);
        expect(screen.getByText('Powiadomienia są zablokowane')).toBeTruthy();
        expect(screen.getByText(/Uprawnienia/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Włącz powiadomienia/ })).toBeNull();
    });

    it('sparowane urządzenie proponuje powiadomienie próbne i mówi uczciwie o dźwięku', () => {
        render(<PushNotificationWizard push={pushState({ isSubscribedHere: true, serviceWorkerVersion: '2026-09-25.1' })} />);
        expect(screen.getByRole('button', { name: /Wyślij powiadomienie próbne/ })).toBeTruthy();
        expect(screen.getByText('Własny dźwięk powiadomień')).toBeTruthy();
        expect(screen.getByText(/2026-09-25\.1/)).toBeTruthy();
    });
});

describe('usePushDevice.enable', () => {
    let requestPermission: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        requestPermission = vi.fn(() => Promise.resolve('denied'));
        Object.defineProperty(window, 'Notification', {
            configurable: true,
            value: Object.assign(function Notification() {}, { permission: 'default', requestPermission }),
        });
    });

    afterEach(() => {
        delete (window as { Notification?: unknown }).Notification;
    });

    it('pyta o zgodę synchronicznie, zanim mutacja zacznie cokolwiek czekać', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => usePushDevice({ withDevices: false }), { wrapper });

        let pending: Promise<unknown> | undefined;
        act(() => {
            pending = result.current.enable();
        });
        // Zgoda została poproszona w tym samym wywołaniu - przed pierwszym await.
        expect(requestPermission).toHaveBeenCalledTimes(1);

        await act(async () => {
            await expect(pending).rejects.toThrow('permission-denied');
        });
    });
});
