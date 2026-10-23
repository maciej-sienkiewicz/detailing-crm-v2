// @vitest-environment jsdom
//
// Zapytania: tablica jest domyślna (decyzja z 23.10.2026), adres zapisuje tylko listę.
// Poczta ma własną trasę z zakładkami Odebrane i Wysłane.
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useInboxNav } from './useInboxNav';
import type { InboxScope } from '../utils/inboxTabs';

const setup = (url: string, scope: InboxScope = 'cases') => {
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
    return renderHook(() => ({ nav: useInboxNav(scope), location: useLocation() }), { wrapper });
};

describe('useInboxNav - Zapytania', () => {
    it('bez parametrów sprawy są tablicą', () => {
        const { result } = setup('/inbox');
        expect(result.current.nav.location).toMatchObject({ tab: 'sprawy', board: true, archive: false });
    });

    it('link do sprawy z powiadomienia otwiera ją nad tablicą', () => {
        const { result } = setup('/inbox?lead=L1');
        expect(result.current.nav.location).toMatchObject({ board: true, leadId: 'L1' });
    });

    it('lista zostaje w adresie, a powrót do tablicy ją zdejmuje', () => {
        const { result } = setup('/inbox?lead=L1');
        act(() => result.current.nav.setBoard(false));
        expect(result.current.location.search).toBe('?layout=list&lead=L1');
        expect(result.current.nav.location.board).toBe(false);

        act(() => result.current.nav.setBoard(true));
        expect(result.current.location.search).toBe('?lead=L1');
        expect(result.current.nav.location.board).toBe(true);
    });

    it('zamknięte sprawy to tryb listy, a wyjście z nich wraca do listy', () => {
        const { result } = setup('/inbox?archive=1');
        expect(result.current.nav.location).toMatchObject({ archive: true, board: false });
        act(() => result.current.nav.setArchive(false));
        expect(result.current.location.search).toBe('?layout=list');
    });
});

describe('useInboxNav - Poczta', () => {
    it('domyślnie odebrane, bez tablicy', () => {
        const { result } = setup('/mail', 'mail');
        expect(result.current.nav.location).toMatchObject({ tab: 'poczta', board: false });
    });

    it('Wysłane mają `view=sent`, a powrót do odebranych zdejmuje parametr', () => {
        const { result } = setup('/mail?thread=t1', 'mail');
        act(() => { result.current.nav.setTab('wyslane'); });
        expect(result.current.location.search).toBe('?view=sent');
        act(() => { result.current.nav.setTab('poczta'); });
        expect(result.current.location.search).toBe('');
    });

    it('po wysłaniu nowej wiadomości jej wątek w Wysłanych', () => {
        const { result } = setup('/mail?compose=1', 'mail');
        act(() => result.current.nav.showSent('t9'));
        expect(result.current.location.search).toBe('?view=sent&thread=t9');
    });
});
