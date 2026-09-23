// @vitest-environment jsdom
//
// Tryb 'lift': niski arkusz przy dolnej krawędzi (pole + „Anuluj / Zapisz") ma stać
// tuż nad klawiaturą. iOS nie skraca layout viewportu, więc bez korekty arkusz
// chowa się pod klawiaturą razem z przyciskami. Górnej krawędzi nie wolno ruszać -
// `top` rozciągnąłby taki arkusz na cały ekran.
import { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisualViewportSheet } from './useVisualViewportSheet';

class FakeVisualViewport extends EventTarget {
    height = 800;
    offsetTop = 0;
}

let vv: FakeVisualViewport;

beforeEach(() => {
    vv = new FakeVisualViewport();
    vi.stubGlobal('visualViewport', vv);
    vi.stubGlobal('innerHeight', 800);
    // Przeliczenie po zdarzeniu idzie przez requestAnimationFrame - w teście od razu.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const Sheet = ({ active, keyboard }: { active: boolean; keyboard?: 'pad' | 'resize' | 'lift' }) => {
    const ref = useRef<HTMLDivElement>(null);
    useVisualViewportSheet(active, ref, keyboard ? { keyboard } : undefined);
    return <div ref={ref} data-testid="sheet" />;
};

const keyboard = (height: number, offsetTop = 0) => {
    vv.height = height;
    vv.offsetTop = offsetTop;
    vv.dispatchEvent(new Event('resize'));
};

describe("useVisualViewportSheet - tryb 'lift'", () => {
    it('arkusz otwarty przy wysuniętej klawiaturze stoi nad nią, a jego góra zostaje w spokoju', () => {
        vv.height = 500;
        const { getByTestId } = render(<Sheet active keyboard="lift" />);

        const sheet = getByTestId('sheet');
        expect(sheet.style.bottom).toBe('300px');
        expect(sheet.style.top).toBe('');
    });

    it('idzie za klawiaturą: wysunięcie, przewinięcie widoku przez iOS i schowanie', () => {
        const { getByTestId } = render(<Sheet active keyboard="lift" />);
        const sheet = getByTestId('sheet');
        expect(sheet.style.bottom).toBe('0px');

        keyboard(500);
        expect(sheet.style.bottom).toBe('300px');

        // iOS przewija visual viewport w dół - dolna krawędź widoku jest wyżej o offsetTop mniej
        keyboard(500, 120);
        expect(sheet.style.bottom).toBe('180px');

        keyboard(800);
        expect(sheet.style.bottom).toBe('0px');
        expect(sheet.style.top).toBe('');
    });

    it('zamknięty arkusz nie zostawia po sobie przesunięcia', () => {
        vv.height = 500;
        const { getByTestId, rerender } = render(<Sheet active keyboard="lift" />);
        expect(getByTestId('sheet').style.bottom).toBe('300px');

        rerender(<Sheet active={false} keyboard="lift" />);
        expect(getByTestId('sheet').style.bottom).toBe('');
    });

    it('pozostałe tryby dalej przypinają górę arkusza do widocznego obszaru', () => {
        vv.height = 500;
        vv.offsetTop = 40;
        const { getByTestId } = render(<Sheet active />);

        const sheet = getByTestId('sheet');
        expect(sheet.style.top).toBe('40px');
        expect(sheet.style.getPropertyValue('--kb-inset')).toBe('260px');
    });
});
