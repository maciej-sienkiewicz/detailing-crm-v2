// @vitest-environment jsdom
//
// Adresy z API idą do window.open i window.location bez ochrony, którą React daje
// atrybutom w JSX. Te testy pilnują, że schemat wykonywalny nie przejdzie żadną drogą.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignSafeUrl, openInNewTab, toSafeUrl } from './safeUrl';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('toSafeUrl', () => {
    it.each([
        'https://detailboost-crm.s3.eu-central-1.amazonaws.com/plik.pdf?X-Amz-Signature=abc',
        'http://localhost:3000/api/v1/plik',
        '/api/v1/visits/1/protocol.pdf',
        'mailto:biuro@example.com',
        'tel:+48600100200',
        'sms:+48600100200',
    ])('przepuszcza %s', (href) => {
        expect(toSafeUrl(href)).not.toBeNull();
    });

    it.each([
        'javascript:alert(1)',
        ' JavaScript:alert(1)',
        'java\tscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'blob:https://obca-strona.example/123',
        'file:///etc/passwd',
    ])('odrzuca %s', (href) => {
        expect(toSafeUrl(href)).toBeNull();
    });

    it('przepuszcza własny blob: (plik złożony na tej stronie)', () => {
        expect(toSafeUrl(`blob:${window.location.origin}/123`)).not.toBeNull();
    });
});

describe('openInNewTab', () => {
    it('otwiera kartę bez openera', () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        openInNewTab('https://example.com/plik.pdf');
        expect(open).toHaveBeenCalledWith('https://example.com/plik.pdf', '_blank', 'noopener,noreferrer');
    });

    it('nie otwiera niczego dla javascript:', () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        openInNewTab('javascript:alert(1)');
        expect(open).not.toHaveBeenCalled();
    });
});

describe('assignSafeUrl', () => {
    it('odrzuca javascript: i zostawia stronę w spokoju', () => {
        const before = window.location.href;
        expect(assignSafeUrl('javascript:alert(1)')).toBe(false);
        expect(window.location.href).toBe(before);
    });
});
