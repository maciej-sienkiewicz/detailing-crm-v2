import { describe, expect, it } from 'vitest';
import { wizardStage, wizardTrail, wizardTrailIndex } from './wizardStage';

describe('wizardStage', () => {
    it('iPhone w Safari zaczyna od ekranu początkowego - zanim cokolwiek zapyta o zgodę', () => {
        expect(wizardStage({
            platform: { kind: 'ios-install', device: 'iphone', browser: 'safari' },
            support: 'unsupported',
            isSubscribedHere: false,
        })).toBe('install');
    });

    it('aplikacja z ikony na iPhonie wie, że pierwszy krok jest za nią', () => {
        const platform = { kind: 'ios-app' } as const;
        const stage = wizardStage({ platform, support: 'supported', isSubscribedHere: false });
        expect(stage).toBe('ask');
        expect(wizardTrail(platform)).toHaveLength(3);
        expect(wizardTrailIndex(stage, platform)).toBe(1);
    });

    it('odmowa zgody prowadzi do instrukcji odblokowania, a nie do przycisku, który nic nie zrobi', () => {
        expect(wizardStage({ platform: { kind: 'android', installed: false }, support: 'denied', isSubscribedHere: false }))
            .toBe('blocked');
    });

    it('nie pokazuje „włącz", dopóki nie wiadomo, czy już jest włączone', () => {
        expect(wizardStage({ platform: { kind: 'android', installed: false }, support: 'supported', isSubscribedHere: null }))
            .toBe('checking');
    });

    it('sparowane urządzenie jest na ostatnim kroku ścieżki', () => {
        const platform = { kind: 'android', installed: true } as const;
        const stage = wizardStage({ platform, support: 'supported', isSubscribedHere: true });
        expect(stage).toBe('ready');
        expect(wizardTrailIndex(stage, platform)).toBe(wizardTrail(platform).length - 1);
    });

    it('stary iOS i przeglądarka wbudowana wychodzą poza ścieżkę', () => {
        expect(wizardStage({ platform: { kind: 'ios-update' }, support: 'unsupported', isSubscribedHere: false }))
            .toBe('update-os');
        expect(wizardTrailIndex('update-os', { kind: 'ios-update' })).toBeNull();
        expect(wizardStage({ platform: { kind: 'open-in-browser', os: 'ios' }, support: 'unsupported', isSubscribedHere: false }))
            .toBe('open-in-browser');
    });
});
