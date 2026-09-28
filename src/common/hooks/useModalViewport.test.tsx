/**
 * @vitest-environment jsdom
 */
// Test regresyjny zgłoszenia z produkcji: „strona się blokuje, nie reaguje
// na scroll, pomaga dopiero odświeżenie". Odtwarza dokładną sekwencję,
// która mroziła dokument: okno modalne z zagnieżdżonym oknem potwierdzenia
// (oba na useModalViewport), zamykane JEDNYM kliknięciem — React sprząta
// wtedy efekty od rodzica w dół, czyli w kolejności odwrotnej do otwierania.
// Przy migawkach stylów per-okno potwierdzenie przywracało `hidden`
// zapamiętane przy otwarciu nad modalem i blokada zostawała na zawsze.
import { useRef, type ReactNode } from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useModalViewport } from './useModalViewport';
import { releaseAllScrollLocks } from '@/common/utils/scrollLock';

const FakeModal = ({ children }: { children?: ReactNode }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    useModalViewport(true, overlayRef);
    return <div ref={overlayRef}>{children}</div>;
};

afterEach(() => {
    cleanup();
    releaseAllScrollLocks();
});

describe('useModalViewport – blokada scrolla tła', () => {
    it('otwarte okno blokuje <html> i <body>, zamknięte oddaje stan dziewiczy', () => {
        const { unmount } = render(<FakeModal />);

        expect(document.documentElement.style.overflow).toBe('hidden');
        expect(document.body.style.overflow).toBe('hidden');

        unmount();

        expect(document.documentElement.style.overflow).toBe('');
        expect(document.body.style.overflow).toBe('');
    });

    it('modal z potwierdzeniem zamknięte jednym kliknięciem nie mrożą strony', () => {
        const { unmount } = render(
            <FakeModal>
                <FakeModal />
            </FakeModal>,
        );

        expect(document.body.style.overflow).toBe('hidden');

        // jedno kliknięcie „tak, porzuć zmiany" odmontowuje oba okna naraz
        unmount();

        expect(document.documentElement.style.overflow).toBe('');
        expect(document.documentElement.style.overscrollBehavior).toBe('');
        expect(document.body.style.overflow).toBe('');
    });

    it('zamknięcie okna spodniego przed wierzchnim nie zdejmuje ani nie psuje blokady', () => {
        const { rerender, unmount } = render(
            <>
                <FakeModal />
                <FakeModal />
            </>,
        );

        // znika pierwsze (spodnie) okno, wierzchnie zostaje
        rerender(
            <>
                <FakeModal key="top" />
            </>,
        );
        expect(document.body.style.overflow).toBe('hidden');

        unmount();
        expect(document.body.style.overflow).toBe('');
        expect(document.documentElement.style.overflow).toBe('');
    });
});

describe('useModalViewport – Escape', () => {
    const Dialog = ({ onClose, children }: { onClose: () => void; children?: ReactNode }) => {
        const overlayRef = useRef<HTMLDivElement>(null);
        useModalViewport(true, overlayRef, onClose);
        return <div ref={overlayRef} role="dialog" aria-modal="true">{children}</div>;
    };

    it('okno otwarte nad innym zamyka się samo - to pod spodem zostaje', () => {
        const closed: string[] = [];
        // Portal nadrzędnego okna leży w DOM przed portalem okna nad nim - tak jak w aplikacji.
        render(
            <>
                <Dialog onClose={() => closed.push('stopka')} />
                <Dialog onClose={() => closed.push('kadr')} />
            </>,
        );

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(closed).toEqual(['kadr']);
    });

    it('pojedyncze okno zamyka się Escape\'em', () => {
        const closed: string[] = [];
        render(<Dialog onClose={() => closed.push('stopka')} />);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(closed).toEqual(['stopka']);
    });
});
