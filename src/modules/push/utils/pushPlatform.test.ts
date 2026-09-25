import { describe, expect, it } from 'vitest';
import { canAskForPermission, detectPushPlatform, iosVersion, type PlatformEnv } from './pushPlatform';

// Prawdziwe User-Agenty - rozpoznanie ma działać na tym, co wysyłają telefony, a nie
// na uproszczonych napisach.
const UA = {
    iphoneSafari17:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    iphoneSafari16_3:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1',
    iphoneChrome:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
    iphoneFirefox:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
    iphoneFacebook:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.35.108;FBBV/600000000]',
    ipadDesktopMode:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    androidChrome:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    androidWebView:
        'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36',
    macChrome:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

const env = (userAgent: string, over: Partial<PlatformEnv> = {}): PlatformEnv => ({
    userAgent, maxTouchPoints: 0, standalone: false, hasPushApis: false, ...over,
});

describe('detectPushPlatform - iOS', () => {
    it('iPhone w Safari: najpierw dodanie do ekranu początkowego', () => {
        expect(detectPushPlatform(env(UA.iphoneSafari17, { maxTouchPoints: 5 })))
            .toEqual({ kind: 'ios-install', device: 'iphone', browser: 'safari' });
    });

    it('ta sama aplikacja otwarta z ikony może już pytać o zgodę', () => {
        const platform = detectPushPlatform(env(UA.iphoneSafari17, { standalone: true, hasPushApis: true }));
        expect(platform).toEqual({ kind: 'ios-app' });
        expect(canAskForPermission(platform)).toBe(true);
    });

    it('iOS 16.3 nie ma Web Push - kreator nie odsyła do instalacji, tylko do aktualizacji', () => {
        expect(detectPushPlatform(env(UA.iphoneSafari16_3))).toEqual({ kind: 'ios-update' });
        expect(detectPushPlatform(env(UA.iphoneSafari16_3, { standalone: true }))).toEqual({ kind: 'ios-update' });
    });

    it('obecne API wygrywa z wersją z User-Agenta - ta bywa zamrożona albo podrobiona', () => {
        expect(detectPushPlatform(env(UA.iphoneSafari16_3, { hasPushApis: true }))).toEqual({ kind: 'ios-app' });
    });

    it('Chrome na iPhonie też potrafi dodać do ekranu - instrukcja pod Chrome', () => {
        expect(detectPushPlatform(env(UA.iphoneChrome)))
            .toEqual({ kind: 'ios-install', device: 'iphone', browser: 'chrome' });
    });

    it('Firefox i przeglądarki wbudowane odsyłają do Safari', () => {
        expect(detectPushPlatform(env(UA.iphoneFirefox))).toEqual({ kind: 'open-in-browser', os: 'ios' });
        expect(detectPushPlatform(env(UA.iphoneFacebook))).toEqual({ kind: 'open-in-browser', os: 'ios' });
    });

    it('iPad w trybie „komputer" (User-Agent Maca) to iPad, a nie iOS 10.15', () => {
        expect(iosVersion(UA.ipadDesktopMode)).toBeNull();
        expect(detectPushPlatform(env(UA.ipadDesktopMode, { maxTouchPoints: 5 })))
            .toEqual({ kind: 'ios-install', device: 'ipad', browser: 'safari' });
    });
});

describe('detectPushPlatform - Android i komputer', () => {
    it('Chrome na Androidzie: zgoda od razu, instalacja nie jest warunkiem', () => {
        expect(detectPushPlatform(env(UA.androidChrome, { hasPushApis: true })))
            .toEqual({ kind: 'android', installed: false });
        expect(detectPushPlatform(env(UA.androidChrome, { hasPushApis: true, standalone: true })))
            .toEqual({ kind: 'android', installed: true });
    });

    it('WebView na Androidzie odsyła do Chrome zamiast mówić „nieobsługiwane"', () => {
        expect(detectPushPlatform(env(UA.androidWebView))).toEqual({ kind: 'open-in-browser', os: 'android' });
    });

    it('Mac bez ekranu dotykowego to komputer, nie iPad', () => {
        expect(detectPushPlatform(env(UA.macChrome, { hasPushApis: true }))).toEqual({ kind: 'desktop' });
        expect(detectPushPlatform(env(UA.macChrome))).toEqual({ kind: 'unsupported' });
    });

    it('obecność API wygrywa z User-Agentem, który nic nie mówi', () => {
        expect(detectPushPlatform(env('Mozilla/5.0 (X11; Linux x86_64)', { hasPushApis: true })))
            .toEqual({ kind: 'desktop' });
    });
});
