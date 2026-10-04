// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDefaultChoice } from './useMessageDefaults';

describe('useDefaultChoice', () => {
    it('zanim ustawienia dotrą, obowiązuje dotychczasowy stan okna', () => {
        const { result } = renderHook(() => useDefaultChoice(undefined, false));
        expect(result.current[0]).toBe(false);
    });

    it('ustawienie „Domyślnie zaznacz" przejmuje pole, gdy dotrze z sieci po otwarciu okna', () => {
        const { result, rerender } = renderHook(({ def }) => useDefaultChoice(def, false), {
            initialProps: { def: undefined as boolean | undefined },
        });
        rerender({ def: true });
        expect(result.current[0]).toBe(true);
    });

    it('wybór pracownika nie jest nadpisywany przez spóźnione ustawienia, a reset do nich wraca', () => {
        const { result, rerender } = renderHook(({ def }) => useDefaultChoice(def, true), {
            initialProps: { def: undefined as boolean | undefined },
        });
        act(() => result.current[1](false));
        rerender({ def: true });
        expect(result.current[0]).toBe(false);

        act(() => result.current[2]());
        expect(result.current[0]).toBe(true);
    });
});
