// @vitest-environment jsdom
//
// Prosta korespondencja renderuje się wprost w stronie CRM. Mail od obcego nadawcy nie
// może przez to przykryć aplikacji (fałszywe „Sesja wygasła, zaloguj się") ani dać
// otwartej stronie window.opener do karty CRM.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import { MessageBody } from './MessageBody';

afterEach(cleanup);

const renderMail = (html: string) =>
    render(
        <ThemeProvider theme={theme}>
            <MessageBody html={html} />
        </ThemeProvider>,
    );

describe('MessageBody - zwykła korespondencja', () => {
    it('zdejmuje position i z-index - mail nie przykryje aplikacji', () => {
        const { container } = renderMail(
            '<div style="position:fixed;inset:0;z-index:2147483647;background:#fff;color:red">'
            + 'Sesja wygasła <a href="https://evil.example/login">zaloguj się</a></div>',
        );
        const styled = Array.from(container.querySelectorAll<HTMLElement>('[style]'));
        expect(styled.length).toBeGreaterThan(0);
        for (const element of styled) {
            expect(element.style.position).toBe('');
            expect(element.style.zIndex).toBe('');
        }
        // Reszta wyglądu zostaje - tniemy tylko wyjście z przepływu.
        expect(styled.some(element => element.style.color === 'red')).toBe(true);
    });

    it('link otwierany w nowej karcie dostaje noopener noreferrer, także gdy nadawca podał rel="opener"', () => {
        const { container } = renderMail('<p><a href="https://example.com" target="_blank" rel="opener">oferta</a></p>');
        const link = container.querySelector('a')!;
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('wycina skrypty i obsługę zdarzeń', () => {
        const { container } = renderMail('<p>Dzień dobry<img src="x" onerror="alert(1)"><script>alert(2)</script></p>');
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
    });
});
