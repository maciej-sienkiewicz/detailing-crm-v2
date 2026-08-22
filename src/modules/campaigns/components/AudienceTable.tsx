// src/modules/campaigns/components/AudienceTable.tsx
// Lista odbiorców kampanii — tabela, w której da się kogoś wypisać.
//
// Wcześniej stała tu „próbka" bez żadnej kontroli: kolumna nazwisk i krzyżyk przy
// każdym wierszu. Krzyżyk to gest jednokierunkowy — po kliknięciu klient znikał
// z listy i nie było jak go przywrócić, więc pomyłka kosztowała cofnięcie całego
// filtra. Pole wyboru mówi wprost dwie rzeczy naraz: kto to dostanie i że da się
// to zmienić w obie strony. Domyślnie zaznaczeni są wszyscy — kampania z definicji
// idzie do całej grupy, a odznaczenie jest wyjątkiem, nie regułą.
//
// Wiersze, których wypisał system (brak zgody, brak numeru, STOP, limit częstości),
// nie mają aktywnego pola wyboru: to nie jest decyzja użytkownika i udawanie, że
// jest, byłoby obietnicą bez pokrycia. Zostają widoczne razem z powodem, bo
// „czemu wyszło mniej, niż się spodziewałem" to pierwsze pytanie po wysyłce.
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AUDIENCE_PAGE_SIZE, ELIGIBILITY_LABELS } from '../constants';
import type { AudienceEstimate, RecipientChannel } from '../types';
import { CheckBox, EmptyHint, MutedText, Panel, QuietLink } from './shared';

const Head = styled.h4`
    .spacer { flex: 1; }

    .count {
        text-transform: none;
        letter-spacing: 0;
        font-weight: ${p => p.theme.fontWeights.normal};
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
    }
    .count strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
`;

const Scroll = styled.div`
    overflow-x: auto;
    margin: 0 -4px;
    padding: 0 4px;
`;

const Table = styled.table`
    width: 100%;
    min-width: 640px;
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
        padding: 8px;
        border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.textSecondary};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }

    th.pick, td.pick { width: 28px; padding-left: 2px; padding-right: 2px; }
    td.who {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
    }
    td.contact { overflow-wrap: anywhere; }
    td.when { white-space: nowrap; font-variant-numeric: tabular-nums; }
`;

/**
 * Wiersz wypisany — przygaszony, nie przekreślony i nie czerwony. Brak zgody
 * marketingowej to normalny stan bazy klientów, a nie błąd, o którym trzeba krzyczeć;
 * czerwień w tym module znaczy „coś nie wyszło".
 */
const Row = styled.tr<{ $off?: boolean }>`
    opacity: ${p => (p.$off ? 0.55 : 1)};
    transition: opacity ${p => p.theme.transitions.fast};
`;

const Reason = styled.span<{ $manual?: boolean }>`
    font-size: 12px;
    color: ${({ $manual, theme }) => ($manual ? theme.colors.text : theme.colors.textMuted)};
    white-space: nowrap;
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
    awaitingTrigger,
}: Props) {
    const rows = estimate?.sample ?? [];
    const total = estimate?.matched ?? 0;
    const offset = estimate?.sampleOffset ?? page * AUDIENCE_PAGE_SIZE;
    const lastPage = Math.max(0, Math.ceil(total / AUDIENCE_PAGE_SIZE) - 1);
    const excludedSet = new Set(excluded);

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

    return (
        <Panel>
            <Head>
                Odbiorcy
                <span className="spacer" />
                {isEstimating ? (
                    <Working><Loader2 /> przeliczam…</Working>
                ) : total > 0 ? (
                    <span className="count">
                        <strong>{estimate?.eligible ?? 0}</strong> z {total} dostanie wiadomość
                    </span>
                ) : null}
            </Head>

            {awaitingTrigger ? (
                <EmptyHint>
                    Wybierz usługę w warunku wysyłki — dopiero ona wyznacza, kogo ta kampania
                    odezwie.
                </EmptyHint>
            ) : total === 0 ? (
                <EmptyHint>
                    {isEstimating ? 'Przeliczam listę…' : 'Żaden klient nie pasuje do tych kryteriów.'}
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
                                    <th>Pojazd</th>
                                    <th>Ostatnia wizyta</th>
                                    <th>Status</th>
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
                                            <td className="who">{fullName(r.firstName, r.lastName)}</td>
                                            <td className="contact">
                                                {(channel === 'SMS' ? r.phone : r.email) ?? '—'}
                                            </td>
                                            <td>
                                                {[r.vehicleBrand, r.vehicleModel].filter(Boolean).join(' ') || '—'}
                                            </td>
                                            <td className="when">{formatVisit(r.lastVisitDate)}</td>
                                            <td>
                                                <Reason $manual={manual}>
                                                    {ELIGIBILITY_LABELS[r.eligibility]}
                                                </Reason>
                                            </td>
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
                            <MutedText>Wszyscy zaznaczeni.</MutedText>
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
                                    {offset + 1}–{Math.min(offset + rows.length, total)} z {total}
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
