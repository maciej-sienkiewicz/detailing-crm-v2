// @vitest-environment jsdom
//
// Prosta korespondencja renderuje się wprost w stronie CRM. Mail od obcego nadawcy nie
// może przez to przykryć aplikacji (fałszywe „Sesja wygasła, zaloguj się") ani dać
// otwartej stronie window.opener do karty CRM.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Schowana stopka mówi o sobie wprost. Samo „•••" pod odpowiedzią urwaną na
// „Pozdrawiam," wyglądało jak wiadomość wysłana bez podpisu (prośba z 25.10.2026).
describe('MessageBody - schowana stopka', () => {
    const reply = '<p>Dzień dobry, sobota 9:00 jest wolna.</p><p>Pozdrawiam,</p>'
        + '<div data-crm-signature="1" style="margin-top:16px"><div>--</div>Zespół Studia<br>tel. 22 100 20 30</div>';

    it('w miejscu cięcia stoi „Stopka schowana", a kliknięcie ją pokazuje', async () => {
        const { container } = renderMail(reply);
        expect(container.textContent).not.toContain('22 100 20 30');

        const toggle = screen.getByRole('button', { name: /Stopka schowana/ });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(toggle);

        expect(container.textContent).toContain('22 100 20 30');
        expect(screen.getByRole('button', { name: /Ukryj stopkę/ })).toHaveAttribute('aria-expanded', 'true');
    });

    it('stopka razem z historią mówi o obu', () => {
        renderMail(`${reply}<div class="gmail_quote"><blockquote>Wcześniejsza rozmowa o terminie wizyty i cenniku detailingu.</blockquote></div>`);
        expect(screen.getByRole('button', { name: /Stopka i historia schowane/ })).toBeInTheDocument();
    });

    it('sama historia bez stopki zostaje pod „•••"', () => {
        renderMail('<div>Pasuje, potwierdzam termin.</div><div class="gmail_quote"><blockquote>Wcześniejsza rozmowa o terminie wizyty i cenniku detailingu.</blockquote></div>');
        expect(screen.getByRole('button', { name: '•••' })).toBeInTheDocument();
        expect(screen.queryByText(/schowan/)).toBeNull();
    });
});
