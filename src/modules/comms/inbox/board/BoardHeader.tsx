// src/modules/comms/inbox/board/BoardHeader.tsx
// Głowa tablicy spraw: nazwa, przełącznik „Lista / Tablica" i szukanie.
//
// Przełącznik jest tym samym klawiszem co w innych miejscach aplikacji (Segmented) -
// wybrany układ to stan, a nie krok następny, więc nic tu nie jest wypełnione.
import styled from 'styled-components';
import { List, Search, SquareKanban, X } from 'lucide-react';
import { Segmented } from '@/common/components/ui';
import { caseCount } from '../../utils/leadWorklist';
import { ix } from '../tokens';

const Head = styled.header<{ $phone: boolean }>`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
    padding: ${p => (p.$phone ? 'calc(18px + env(safe-area-inset-top, 0px)) 16px 12px' : '20px 24px 16px')};

    .titles { flex: 1 1 auto; min-width: 0; }
    h1 {
        margin: 0;
        font-size: ${p => (p.$phone ? 24 : 22)}px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: ${ix.ink};
    }
    .sub { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; margin: 2px 0 0; font-size: 13px; color: ${ix.muted}; }
    .sub button {
        padding: 0;
        border: none;
        background: none;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: ${ix.accentInk};
        cursor: pointer;
        &:hover { text-decoration: underline; }
        &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; border-radius: 4px; }
    }
    svg { width: 14px; height: 14px; }
`;

const SearchPill = styled.label<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: ${p => (p.$phone ? '1 1 100%' : '0 1 280px')};
    order: ${p => (p.$phone ? 3 : 0)};
    height: ${p => (p.$phone ? 44 : 36)}px;
    padding: 0 6px 0 14px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    transition: border-color 160ms ease, box-shadow 160ms ease;

    &:focus-within { border-color: ${ix.accentLine}; box-shadow: 0 0 0 3px ${ix.accentTint}; }
    > svg { flex: none; width: 16px; height: 16px; color: ${ix.muted}; }
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
        width: 26px;
        height: 26px;
        border: none;
        border-radius: 999px;
        background: transparent;
        color: ${ix.muted};
        cursor: pointer;
        &:hover { background: ${ix.surfaceAlt}; color: ${ix.ink}; }
    }
`;

interface BoardHeaderProps {
    phone: boolean;
    total: number;
    /**
     * Ile spraw stoi na tablicy. Sprawy z rezerwacją i te po 20 dniach ciszy schodzą
     * z tablicy, ale zostają otwarte na liście - nagłówek mówi o tym wprost, zamiast
     * pokazywać „Otwarte: 18" nad kolumnami, które sumują się do 17.
     */
    onBoard: number;
    query: string;
    onQuery: (query: string) => void;
    onList: () => void;
}

export function BoardHeader({ phone, total, onBoard, query, onQuery, onList }: BoardHeaderProps) {
    return (
        <Head $phone={phone}>
            <div className="titles">
                <h1>Zapytania</h1>
                <p className="sub">
                    {total === 0 ? 'Tablica spraw' : onBoard >= total ? `Otwarte: ${caseCount(total)}` : (
                        <>
                            <span>Na tablicy {onBoard} z {caseCount(total)}</span>
                            <button type="button" onClick={onList}>Pozostałe na liście</button>
                        </>
                    )}
                </p>
            </div>
            <SearchPill $phone={phone} role="search">
                <Search aria-hidden="true" />
                <input
                    value={query}
                    placeholder="Szukaj: auto, osoba, adres"
                    aria-label="Szukaj na tablicy"
                    onChange={(event) => onQuery(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Escape' && query) { event.stopPropagation(); onQuery(''); } }}
                />
                {query && (
                    <button type="button" aria-label="Wyczyść szukanie" onClick={() => onQuery('')}>
                        <X size={14} />
                    </button>
                )}
            </SearchPill>
            <Segmented
                label="Układ spraw"
                size="sm"
                value="board"
                onChange={(value) => { if (value === 'list') onList(); }}
                options={[
                    { value: 'list', label: <><List aria-hidden="true" />Lista</> },
                    { value: 'board', label: <><SquareKanban aria-hidden="true" />Tablica</> },
                ]}
            />
        </Head>
    );
}
