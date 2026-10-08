// src/modules/comms/inbox/ListHeader.tsx
// Głowa kolumny listy: „Zapytania", szukanie, koło zębate i trzy zakładki.
//
// Rzeczy rzadkie (stopka, skrzynki, podsumowanie, zamknięte sprawy, nowa wiadomość,
// odrzucone) mieszkają pod kołem zębatym - nie zniknęły, przestały konkurować
// z codzienną pracą o miejsce na ekranie.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { Search, Settings, X } from 'lucide-react';
import { ActionMenu, useActionMenu } from '@/common/components/ui';
import { useNewLeadsCount } from '../hooks/useLeads';
import { useUnreadMailCount } from '../hooks/useComms';
import type { InboxTab } from '../utils/inboxTabs';
import { IconBtn, Tabs } from './primitives';
import { ix } from './tokens';

const Head = styled.div<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: ${p => (p.$phone ? 'calc(20px + env(safe-area-inset-top, 0px)) 12px 4px 20px' : '18px 16px 10px 20px')};

    h1 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: ${p => (p.$phone ? 24 : 20)}px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: ${ix.ink};
    }
`;

/** Na telefonie ikony bez obwódki, 44 px pod kciuk - jak w makiecie. */
const PhoneIcon = styled.button.attrs({ type: 'button' })`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: ${ix.inkSoft};
    cursor: pointer;

    svg { width: 20px; height: 20px; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

const SearchRow = styled.div<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: ${p => (p.$phone ? '4px 16px 4px' : '0 16px 8px')};
    padding: 0 6px 0 14px;
    height: ${p => (p.$phone ? 44 : 38)}px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;

    svg { flex: none; width: 16px; height: 16px; color: ${ix.muted}; }
    input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: ${p => (p.$phone ? 16 : 14)}px;
        color: ${ix.ink};
        &::placeholder { color: ${ix.muted}; opacity: 1; }
    }
    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 999px;
        background: transparent;
        color: ${ix.muted};
        cursor: pointer;
        &:hover { background: ${ix.surfaceAlt}; color: ${ix.ink}; }
    }
`;

interface ListHeaderProps {
    tab: InboxTab;
    onTab: (tab: InboxTab) => void;
    phone: boolean;
    query: string;
    onQuery: (query: string) => void;
    searchPlaceholder: string;
    /** Pozycje menu koła zębatego (MenuItem z ui). */
    menu: (close: () => void) => ReactNode;
    /** Pasek pod zakładkami (np. „← Sprawy otwarte" w archiwum). */
    below?: ReactNode;
}

export function ListHeader({ tab, onTab, phone, query, onQuery, searchPlaceholder, menu, below }: ListHeaderProps) {
    const casesWaiting = useNewLeadsCount();
    const unreadMail = useUnreadMailCount();
    const settings = useActionMenu();
    const [searchOpen, setSearchOpen] = useState(query !== '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (searchOpen) inputRef.current?.focus();
    }, [searchOpen]);

    const closeSearch = () => {
        onQuery('');
        setSearchOpen(false);
    };

    const Icon = phone ? PhoneIcon : IconBtn;

    return (
        <>
            <Head $phone={phone}>
                <h1>Zapytania</h1>
                <Icon
                    aria-label={searchOpen ? 'Zamknij szukanie' : 'Szukaj'}
                    aria-expanded={searchOpen}
                    onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                >
                    <Search />
                </Icon>
                <Icon
                    aria-label="Ustawienia skrzynki"
                    aria-haspopup="menu"
                    aria-expanded={settings.isOpen()}
                    onClick={(event) => settings.toggle(event, null)}
                >
                    <Settings />
                </Icon>
            </Head>
            {searchOpen && (
                <SearchRow $phone={phone} role="search">
                    <Search aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        onChange={(event) => onQuery(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Escape') closeSearch(); }}
                    />
                    <button type="button" aria-label="Wyczyść i zamknij szukanie" onClick={closeSearch}>
                        <X size={14} />
                    </button>
                </SearchRow>
            )}
            <Tabs<InboxTab>
                label="Widok skrzynki"
                phone={phone}
                value={tab}
                onChange={onTab}
                options={[
                    { value: 'sprawy', label: 'Sprawy', count: casesWaiting, countAccent: true },
                    { value: 'poczta', label: 'Poczta', count: unreadMail },
                    { value: 'wyslane', label: 'Wysłane' },
                ]}
            />
            {below}
            <ActionMenu anchor={settings.menu?.anchor ?? null} onClose={settings.close} label="Ustawienia skrzynki">
                {menu(settings.close)}
            </ActionMenu>
        </>
    );
}
