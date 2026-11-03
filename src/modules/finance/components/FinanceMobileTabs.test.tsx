// @vitest-environment jsdom
//
// Zakładki Finansów na telefonie: wszystkie widać naraz (dawniej lista <select> „Kasa ⌄"
// chowała pozostałe), a po przewinięciu przełącznik przypina się do góry ekranu. Zmiana
// z przypiętego paska wraca na początek treści nowej zakładki.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { FinanceTab } from '../types';
import { FinanceMobileTabs } from './FinanceMobileTabs';

const TABS = [
    { value: 'income' as const, label: 'Przychody' },
    { value: 'expenses' as const, label: 'Koszty' },
    { value: 'cash' as const, label: 'Kasa' },
    { value: 'payment-summary' as const, label: 'Płatności' },
];

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let report: ObserverCallback = () => {};

class FakeIntersectionObserver {
    constructor(cb: ObserverCallback) { report = cb; }
    observe() {}
    disconnect() {}
}

/** Przełącznik w treści jest powyżej ekranu: ktoś przewinął w dół. */
const scrollPast = () => act(() => report([{ isIntersecting: false, boundingClientRect: { top: -120 } as DOMRect }]));

const renderTabs = (value: FinanceTab = 'cash', onChange = vi.fn(), tabs = TABS) => {
    const content = document.createElement('div');
    content.getBoundingClientRect = () => ({ top: 900 } as DOMRect);
    const contentRef = { current: content };
    render(
        <ThemeProvider theme={theme}>
            <FinanceMobileTabs tabs={tabs} value={value} onChange={onChange} contentRef={contentRef} />
        </ThemeProvider>,
    );
    return onChange;
};

describe('FinanceMobileTabs', () => {
    beforeEach(() => {
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
        vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        Object.defineProperty(window, 'scrollY', { value: 1500, configurable: true });
    });
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('pokazuje wszystkie zakładki naraz, z zaznaczoną bieżącą', () => {
        renderTabs('cash');

        for (const name of ['Przychody', 'Koszty', 'Kasa', 'Płatności']) {
            expect(screen.getByRole('button', { name })).toBeInTheDocument();
        }
        expect(screen.getByRole('button', { name: 'Kasa' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('zmienia zakładkę jednym dotknięciem', async () => {
        const onChange = renderTabs('cash');
        await userEvent.click(screen.getByRole('button', { name: 'Koszty' }));
        expect(onChange).toHaveBeenCalledWith('expenses');
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('po przewinięciu przypina przełącznik do góry, a po powrocie zdejmuje', () => {
        renderTabs();
        expect(screen.queryByTestId('finance-tabs-pinned')).toBeNull();

        scrollPast();
        expect(screen.getByTestId('finance-tabs-pinned')).toBeInTheDocument();

        act(() => report([{ isIntersecting: true, boundingClientRect: { top: 200 } as DOMRect }]));
        expect(screen.queryByTestId('finance-tabs-pinned')).toBeNull();
    });

    it('przełącznik poniżej ekranu nie przypina się - nikt jeszcze nie przewinął', () => {
        renderTabs();
        act(() => report([{ isIntersecting: false, boundingClientRect: { top: 1200 } as DOMRect }]));
        expect(screen.queryByTestId('finance-tabs-pinned')).toBeNull();
    });

    it('zmiana z przypiętego paska wraca na początek treści nowej zakładki', async () => {
        const onChange = renderTabs('cash');
        scrollPast();

        await userEvent.click(within(screen.getByTestId('finance-tabs-pinned')).getByRole('button', { name: 'Przychody' }));

        expect(onChange).toHaveBeenCalledWith('income');
        // 900 (treść względem ekranu) + 1500 (przewinięcie) - 56 (pasek) - 8 (odstęp)
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 2336 });
    });

    it('przy jednej dostępnej zakładce nie ma czego przełączać', () => {
        renderTabs('cash', vi.fn(), [TABS[2]]);
        expect(screen.queryByRole('button', { name: 'Kasa' })).toBeNull();
    });
});
