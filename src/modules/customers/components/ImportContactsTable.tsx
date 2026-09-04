import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ImportPreviewRow, ImportRowStatus } from '../types';

/*
 * Tabela przeglądu importu.
 *
 * Dwie decyzje, które trzymają tę funkcję w ryzach:
 *
 * 1. Domyślnie zaznaczone są WYŁĄCZNIE kontakty nowe. Książka adresowa to szuflada ze
 *    śmieciami - rodzina, pizzeria, infolinia operatora - a stąd wychodzi baza, z której
 *    idą kampanie SMS. Gdyby wszystko było zaznaczone, jedno odruchowe „Zapisz"
 *    zamieniałoby kartotekę klientów w kopię książki adresowej.
 *
 * 2. Wiersze, których nie da się zaimportować (już istnieją, powtarzają się, nie mają
 *    ani numeru, ani e-maila), są widoczne, ale nieklikalne. Ukrycie ich byłoby wygodne
 *    i mylące: użytkownik liczyłby kontakty i nie rozumiał, czemu „zapisano 30 z 45".
 */

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

const Filters = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean }>`
    padding: 5px 12px;
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${({ $active }) => ($active ? st.accentBlue : st.border)};
    background: ${({ $active }) => ($active ? st.accentBlueDim : 'transparent')};
    color: ${({ $active }) => ($active ? st.accentBlue : st.textSecondary)};

    &:hover { border-color: ${st.borderHover}; }
`;

const BulkActions = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
`;

const LinkButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    text-decoration: underline;

    &:disabled { color: ${st.textSecondary}; cursor: not-allowed; text-decoration: none; }
`;

const Scroller = styled.div`
    flex: 1;
    min-height: 0;
    max-height: 46vh;
    overflow-y: auto;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
`;

const Th = styled.th`
    position: sticky;
    top: 0;
    z-index: 1;
    background: ${st.bgCard};
    text-align: left;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${st.textSecondary};
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

const Tr = styled.tr<{ $muted: boolean }>`
    border-bottom: 1px solid ${st.border};
    opacity: ${({ $muted }) => ($muted ? 0.55 : 1)};

    &:last-child { border-bottom: none; }
`;

const Td = styled.td`
    padding: 9px 12px;
    vertical-align: middle;
    color: ${st.text};
`;

const CheckboxCell = styled(Td)`
    width: 36px;
    padding-right: 0;
`;

const Name = styled.div`
    font-weight: 600;
`;

const Secondary = styled.div`
    font-size: 12px;
    color: ${st.textSecondary};
`;

const StatusPill = styled.span<{ $status: ImportRowStatus }>`
    display: inline-block;
    padding: 3px 9px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    background: ${({ $status }) =>
        $status === 'NEW' ? 'rgba(34, 197, 94, 0.12)'
        : $status === 'EXISTING' ? 'rgba(59, 130, 246, 0.12)'
        : $status === 'DUPLICATE_IN_FILE' ? 'rgba(234, 179, 8, 0.14)'
        : 'rgba(148, 163, 184, 0.14)'};
    color: ${({ $status }) =>
        $status === 'NEW' ? '#15803D'
        : $status === 'EXISTING' ? '#1D4ED8'
        : $status === 'DUPLICATE_IN_FILE' ? '#A16207'
        : '#475569'};
`;

const EmptyRow = styled.div`
    padding: 28px 16px;
    text-align: center;
    font-size: 13px;
    color: ${st.textSecondary};
`;

/** Etykieta statusu razem z powodem - sam status bez „dlaczego" rodzi telefon do wsparcia. */
const describeStatus = (row: ImportPreviewRow): { label: string; hint: string | null } => {
    switch (row.status) {
        case 'NEW':
            return { label: 'Nowy', hint: null };
        case 'EXISTING':
            return {
                label: 'Już w bazie',
                hint: row.matchedCustomerName
                    ? `${row.matchedCustomerName} - ${row.matchedBy === 'email' ? 'ten sam e-mail' : 'ten sam numer'}`
                    : 'Klient o tych danych już istnieje',
            };
        case 'DUPLICATE_IN_FILE':
            return { label: 'Powtórka', hint: 'Ten sam kontakt jest wyżej na liście' };
        case 'NOT_IMPORTABLE':
            return { label: 'Brak danych', hint: 'Bez numeru i e-maila nie ma czego zapisać' };
    }
};

type StatusFilter = 'ALL' | ImportRowStatus;

const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Wszystkie' },
    { key: 'NEW', label: 'Nowe' },
    { key: 'EXISTING', label: 'Już w bazie' },
    { key: 'DUPLICATE_IN_FILE', label: 'Powtórki' },
    { key: 'NOT_IMPORTABLE', label: 'Bez danych' },
];

interface ImportContactsTableProps {
    rows: ImportPreviewRow[];
    selected: Set<number>;
    onChange: (selected: Set<number>) => void;
}

export const ImportContactsTable = ({ rows, selected, onChange }: ImportContactsTableProps) => {
    const [filter, setFilter] = useState<StatusFilter>('ALL');

    const visible = useMemo(
        () => (filter === 'ALL' ? rows : rows.filter(row => row.status === filter)),
        [rows, filter],
    );

    const selectableVisible = useMemo(
        () => visible.filter(row => row.status === 'NEW'),
        [visible],
    );

    const toggle = (index: number) => {
        const next = new Set(selected);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        onChange(next);
    };

    const selectAllVisible = () => {
        const next = new Set(selected);
        selectableVisible.forEach(row => next.add(row.index));
        onChange(next);
    };

    const clearVisible = () => {
        const next = new Set(selected);
        selectableVisible.forEach(row => next.delete(row.index));
        onChange(next);
    };

    const countFor = (key: StatusFilter) =>
        key === 'ALL' ? rows.length : rows.filter(row => row.status === key).length;

    return (
        <Wrapper>
            <Toolbar>
                <Filters>
                    {FILTERS.map(({ key, label }) => {
                        const count = countFor(key);
                        if (count === 0 && key !== 'ALL') return null;
                        return (
                            <FilterChip
                                key={key}
                                $active={filter === key}
                                onClick={() => setFilter(key)}
                                type="button"
                            >
                                {label} ({count})
                            </FilterChip>
                        );
                    })}
                </Filters>

                <BulkActions>
                    <LinkButton
                        type="button"
                        onClick={selectAllVisible}
                        disabled={selectableVisible.length === 0}
                    >
                        Zaznacz nowe
                    </LinkButton>
                    <LinkButton
                        type="button"
                        onClick={clearVisible}
                        disabled={selectableVisible.length === 0}
                    >
                        Odznacz wszystkie
                    </LinkButton>
                </BulkActions>
            </Toolbar>

            <Scroller>
                {visible.length === 0 ? (
                    <EmptyRow>Brak kontaktów w tym filtrze.</EmptyRow>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th aria-label="Zaznaczenie" />
                                <Th>Kontakt</Th>
                                <Th>Telefon</Th>
                                <Th>E-mail</Th>
                                <Th>Status</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(row => {
                                const selectable = row.status === 'NEW';
                                const status = describeStatus(row);
                                const name = [row.firstName, row.lastName]
                                    .filter(Boolean)
                                    .join(' ')
                                    || row.displayName
                                    || '(bez nazwy)';

                                return (
                                    <Tr key={row.index} $muted={!selectable}>
                                        <CheckboxCell>
                                            <input
                                                type="checkbox"
                                                checked={selected.has(row.index)}
                                                onChange={() => toggle(row.index)}
                                                disabled={!selectable}
                                                aria-label={`Zaimportuj ${name}`}
                                            />
                                        </CheckboxCell>
                                        <Td>
                                            <Name>{name}</Name>
                                            {row.companyName && <Secondary>{row.companyName}</Secondary>}
                                        </Td>
                                        <Td>{row.phone ?? '-'}</Td>
                                        <Td>{row.email ?? '-'}</Td>
                                        <Td>
                                            <StatusPill $status={row.status}>{status.label}</StatusPill>
                                            {status.hint && <Secondary>{status.hint}</Secondary>}
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Scroller>
        </Wrapper>
    );
};
