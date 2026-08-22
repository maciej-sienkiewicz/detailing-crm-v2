// src/modules/campaigns/components/AudienceTable.tsx
// Lista odbiorców kampanii — tabela, w której da się kogoś wypisać i kogoś znaleźć.
//
// Cztery kolumny, bo tyle wystarcza, żeby rozpoznać człowieka: kto, pod jaki numer,
// kiedy był ostatnio. Model auta i osobna kolumna „status" tylko rozpychały tabelę
// na całą szerokość ekranu — powód, dla którego ktoś nie dostanie wiadomości, stoi
// teraz drugą linijką pod nazwiskiem, czyli tam, gdzie i tak pada wzrok.
//
// Pole wyboru zamiast krzyżyka: krzyżyk to gest jednokierunkowy, po którym klient
// znikał z listy i nie było jak go przywrócić. Domyślnie zaznaczeni są wszyscy —
// kampania z definicji idzie do całej grupy, odznaczenie jest wyjątkiem.
//
// Wiersze wypisane przez system (brak zgody, brak numeru, STOP, limit częstości)
// mają pole nieaktywne: to nie jest decyzja użytkownika i udawanie, że jest, byłoby
// obietnicą bez pokrycia.
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { AUDIENCE_PAGE_SIZE, ELIGIBILITY_LABELS } from '../constants';
import type { AudienceEstimate, RecipientChannel } from '../types';
import { CheckBox, EmptyHint, MutedText, Panel, QuietLink } from './shared';

const Head = styled.h4`
    flex-wrap: wrap;
    gap: 10px;

    .spacer { flex: 1; }

    .count {
        text-transform: none;
        letter-spacing: 0;
        font-weight: ${p => p.theme.fontWeights.normal};
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .count strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
`;

/**
 * Pasek narzędzi listy: czym ją przeszukać i kogo w ogóle na niej pokazywać.
 * Osobny wiersz pod nagłówkiem, bo w samym nagłówku (tytuł, licznik, wyszukiwarka,
 * przełącznik) zrobił się tłok i nic nie było już pierwsze.
 */
const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

/**
 * Przełącznik zasięgu listy. Nie jest ozdobą widoku: klienci bez nazwiska wchodzą
 * albo nie wchodzą do kampanii, a decyzja zapisuje się razem z nią — więc etykieta
 * musi mówić o wysyłce, a nie o pokazywaniu.
 */
const ScopeToggle = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
`;

/** Wyszukiwarka w pasku narzędzi — ten sam kształt, co nad tabelą leadów. */
const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 5px 12px;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surface};
    flex: 0 1 280px;
    min-width: 180px;
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus-within { border-color: ${p => p.theme.colors.primary}; }

    svg { width: 14px; height: 14px; flex-shrink: 0; }

    input {
        border: none;
        outline: none;
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        background: transparent;
        color: ${p => p.theme.colors.text};
        font-family: inherit;
        text-transform: none;
        letter-spacing: 0;
        font-weight: ${p => p.theme.fontWeights.normal};

        &::placeholder { color: ${p => p.theme.colors.textMuted}; }
    }

    button {
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
        color: ${p => p.theme.colors.textMuted};
        display: inline-flex;

        &:hover { color: ${p => p.theme.colors.text}; }
    }
`;

const Scroll = styled.div`
    overflow-x: auto;
    margin: 0 -4px;
    padding: 0 4px;
`;

const Table = styled.table`
    width: 100%;
    min-width: 460px;
    border-collapse: collapse;
    font-size: 13px;

    th {
        text-align: left;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
        padding: 0 8px 7px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
        white-space: nowrap;
    }

    td {
        padding: 7px 8px;
        border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.textSecondary};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }

    th.pick, td.pick { width: 26px; padding-left: 2px; padding-right: 2px; }
    th.when, td.when { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.contact { white-space: nowrap; font-variant-numeric: tabular-nums; }
`;

/**
 * Nazwisko, a pod nim — tylko gdy jest o czym mówić — powód, dla którego ten
 * człowiek nie dostanie wiadomości. Osobna kolumna „status" byłaby pusta
 * w dziewięciu wierszach na dziesięć.
 */
const Who = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    .name {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .reason {
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        white-space: nowrap;
    }
`;

const Row = styled.tr<{ $off?: boolean }>`
    opacity: ${p => (p.$off ? 0.55 : 1)};
    transition: opacity ${p => p.theme.transitions.fast};
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 4px;
`;

const Pager = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;

    span {
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
        padding: 0 6px;
        white-space: nowrap;
    }
`;

const PageButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    padding: 0;
    transition: all ${p => p.theme.transitions.fast};

    svg { width: 14px; height: 14px; }
    &:hover:not(:disabled) { border-color: ${p => p.theme.colors.textMuted}; }
    &:disabled { opacity: 0.35; cursor: default; }
`;

const Working = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    text-transform: none;
    letter-spacing: 0;
    font-weight: ${p => p.theme.fontWeights.normal};

    svg {
        width: 13px;
        height: 13px;
        animation: spin 900ms linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const fullName = (first: string | null, last: string | null): string =>
    [first, last].filter(Boolean).join(' ') || 'Klient';

const formatVisit = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

interface Props {
    estimate: AudienceEstimate | undefined;
    isEstimating: boolean;
    channel: RecipientChannel;
    /** Identyfikatory odznaczone ręcznie — `excludeCustomerIds` z kryteriów odbiorców. */
    excluded: string[];
    onExcludedChange: (next: string[]) => void;
    page: number;
    onPageChange: (page: number) => void;
    search: string;
    onSearchChange: (next: string) => void;
    /** Czy kampania obejmuje klientów bez imienia i nazwiska. */
    includeUnnamed: boolean;
    onIncludeUnnamedChange: (next: boolean) => void;
    /** Warunek kampanii automatycznej nie wskazuje jeszcze żadnej usługi. */
    awaitingTrigger?: boolean;
}

export function AudienceTable({
    estimate,
    isEstimating,
    channel,
    excluded,
    onExcludedChange,
    page,
    onPageChange,
    search,
    onSearchChange,
    includeUnnamed,
    onIncludeUnnamedChange,
    awaitingTrigger,
}: Props) {
    /*
     * Wpisywanie idzie do lokalnego stanu, a dopiero po chwili ciszy do zapytania:
     * inaczej każda litera kasowałaby wynik poprzedniej i lista migałaby przy pisaniu.
     *
     * Pole jest tu jedynym źródłem frazy — nadrzędny [search] wraca wyłącznie stąd,
     * więc nie ma czego z nim synchronizować w drugą stronę.
     */
    const [draft, setDraft] = useState(search);
    useEffect(() => {
        if (draft === search) return;
        const timer = setTimeout(() => onSearchChange(draft), 300);
        return () => clearTimeout(timer);
    }, [draft, search, onSearchChange]);

    const rows = estimate?.sample ?? [];
    const listTotal = estimate?.sampleTotal ?? 0;
    const offset = estimate?.sampleOffset ?? page * AUDIENCE_PAGE_SIZE;
    const lastPage = Math.max(0, Math.ceil(listTotal / AUDIENCE_PAGE_SIZE) - 1);
    const excludedSet = new Set(excluded);
    const searching = search.trim().length > 0;

    /** Wiersze, o których decyduje użytkownik — reszta jest poza jego zasięgiem. */
    const decidable = rows.filter(
        (r) => r.eligibility === 'ELIGIBLE' || r.eligibility === 'EXCLUDED_MANUALLY'
    );
    const checkedOnPage = decidable.filter((r) => !excludedSet.has(r.customerId));
    const allChecked = decidable.length > 0 && checkedOnPage.length === decidable.length;
    const someChecked = checkedOnPage.length > 0 && !allChecked;

    const setChecked = (customerId: string, checked: boolean) => {
        onExcludedChange(
            checked ? excluded.filter((id) => id !== customerId) : [...excluded, customerId]
        );
    };

    const setPageChecked = (checked: boolean) => {
        const ids = decidable.map((r) => r.customerId);
        onExcludedChange(
            checked
                ? excluded.filter((id) => !ids.includes(id))
                : [...excluded.filter((id) => !ids.includes(id)), ...ids]
        );
    };

    const empty = !awaitingTrigger && listTotal === 0;

    return (
        <Panel>
            <Head>
                Odbiorcy
                <span className="spacer" />
                {isEstimating ? (
                    <Working><Loader2 /> przeliczam…</Working>
                ) : estimate && estimate.matched > 0 ? (
                    <span className="count">
                        <strong>{estimate.eligible}</strong> z {estimate.matched} dostanie wiadomość
                    </span>
                ) : null}
            </Head>

            {!awaitingTrigger && (
                <Toolbar>
                    <SearchBox>
                        <Search />
                        <input
                            value={draft}
                            placeholder="Szukaj po nazwisku lub numerze…"
                            aria-label="Szukaj wśród odbiorców"
                            onChange={(e) => setDraft(e.target.value)}
                        />
                        {draft && (
                            <button type="button" aria-label="Wyczyść wyszukiwanie" onClick={() => setDraft('')}>
                                <X size={13} />
                            </button>
                        )}
                    </SearchBox>

                    <ScopeToggle title="Kartoteki założone tylko na numer telefonu. Wiadomość z pustym miejscem zamiast imienia wygląda jak błąd, dlatego domyślnie ich nie zapraszamy.">
                        <CheckBox
                            checked={includeUnnamed}
                            onChange={(e) => onIncludeUnnamedChange(e.target.checked)}
                        />
                        Pokaż klientów bez nazwiska
                    </ScopeToggle>
                </Toolbar>
            )}

            {awaitingTrigger ? (
                <EmptyHint>
                    Wybierz usługę w warunku wysyłki — dopiero ona wyznacza, kogo ta kampania
                    odezwie.
                </EmptyHint>
            ) : empty ? (
                <EmptyHint>
                    {isEstimating
                        ? 'Przeliczam listę…'
                        : searching
                            ? `Nikt na liście nie pasuje do „${search.trim()}".`
                            : includeUnnamed
                                ? 'Żaden klient nie pasuje do tych kryteriów.'
                                /* Najczęstszy powód pustej listy w studiu, które
                                   zakłada kartoteki na numer telefonu — mówimy o nim
                                   wprost, zamiast zostawiać zagadkę. */
                                : 'Żaden klient z uzupełnionym nazwiskiem nie pasuje do tych kryteriów. Klienci bez nazwiska są ukryci — pokaż ich przełącznikiem powyżej.'}
                </EmptyHint>
            ) : (
                <>
                    <Scroll>
                        <Table>
                            <thead>
                                <tr>
                                    <th className="pick">
                                        <CheckBox
                                            checked={allChecked}
                                            ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                            disabled={decidable.length === 0}
                                            onChange={(e) => setPageChecked(e.target.checked)}
                                            aria-label="Zaznacz wszystkich na tej stronie"
                                            title="Zaznacz wszystkich na tej stronie"
                                        />
                                    </th>
                                    <th>Klient</th>
                                    <th>{channel === 'SMS' ? 'Telefon' : 'E-mail'}</th>
                                    <th className="when">Ostatnia wizyta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const manual = r.eligibility === 'EXCLUDED_MANUALLY';
                                    const decidableRow = r.eligibility === 'ELIGIBLE' || manual;
                                    const checked = decidableRow && !excludedSet.has(r.customerId);
                                    return (
                                        <Row key={r.customerId} $off={!checked}>
                                            <td className="pick">
                                                <CheckBox
                                                    checked={checked}
                                                    disabled={!decidableRow}
                                                    onChange={(e) => setChecked(r.customerId, e.target.checked)}
                                                    aria-label={`Wyślij do: ${fullName(r.firstName, r.lastName)}`}
                                                    title={
                                                        decidableRow
                                                            ? 'Odznacz, żeby pominąć tego klienta'
                                                            : ELIGIBILITY_LABELS[r.eligibility]
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <Who>
                                                    <span className="name">{fullName(r.firstName, r.lastName)}</span>
                                                    {r.eligibility !== 'ELIGIBLE' && (
                                                        <span className="reason">
                                                            {ELIGIBILITY_LABELS[r.eligibility]}
                                                        </span>
                                                    )}
                                                </Who>
                                            </td>
                                            <td className="contact">
                                                {(channel === 'SMS' ? r.phone : r.email) ?? '—'}
                                            </td>
                                            <td className="when">{formatVisit(r.lastVisitDate)}</td>
                                        </Row>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Scroll>

                    <Footer>
                        {excluded.length > 0 ? (
                            <MutedText>
                                Odznaczonych ręcznie: {excluded.length}.{' '}
                                <QuietLink type="button" onClick={() => onExcludedChange([])}>
                                    Zaznacz wszystkich
                                </QuietLink>
                            </MutedText>
                        ) : (
                            <MutedText>{searching ? `Znaleziono ${listTotal}.` : 'Wszyscy zaznaczeni.'}</MutedText>
                        )}

                        {lastPage > 0 && (
                            <Pager>
                                <PageButton
                                    type="button"
                                    aria-label="Poprzednia strona"
                                    disabled={page === 0}
                                    onClick={() => onPageChange(page - 1)}
                                >
                                    <ChevronLeft />
                                </PageButton>
                                <span>
                                    {offset + 1}–{Math.min(offset + rows.length, listTotal)} z {listTotal}
                                </span>
                                <PageButton
                                    type="button"
                                    aria-label="Następna strona"
                                    disabled={page >= lastPage}
                                    onClick={() => onPageChange(page + 1)}
                                >
                                    <ChevronRight />
                                </PageButton>
                            </Pager>
                        )}
                    </Footer>
                </>
            )}
        </Panel>
    );
}
