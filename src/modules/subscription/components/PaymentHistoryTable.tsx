// src/modules/subscription/components/PaymentHistoryTable.tsx
//
// Historia płatności abonamentu. Płaski panel (jedyną wyniesioną kartą sekcji jest
// „Twój plan"); tabela przewija się w swoim pudełku, bo strona ma overflow-x: clip
// i sześć kolumn na telefonie było po prostu uciętych razem z kwotą.

import { useState } from 'react';
import { Button, Notice, SectionTitle, StatusPill, type PillTone } from '@/common/components/ui';
import { usePaymentHistory } from '../api/subscriptionQueries';
import type { PaymentEventType } from '../types';
import { formatDateTime } from '../utils/formatters';
import { pageWindow } from '../utils/pagination';
import {
    Wrap,
    Head,
    TableScroll,
    Table,
    TransactionId,
    Muted,
    Pagination,
    PaginationInfo,
    PaginationBtns,
    PageBtn,
    Gap,
} from './PaymentHistoryTable.styles';

const PAGE_SIZE = 20;

function eventTone(type: PaymentEventType): PillTone {
    switch (type) {
        case 'PLAN_UPGRADE':
        case 'SUBSCRIPTION_PURCHASE': return 'info';
        case 'PLAN_DOWNGRADE': return 'warn';
        case 'ADD_ON_ACTIVATION': return 'ok';
        case 'ADD_ON_DEACTIVATION': return 'neutral';
        default: return 'neutral';
    }
}

export function PaymentHistoryTable() {
    const [page, setPage] = useState(0);
    const { data, isLoading, isError, refetch } = usePaymentHistory(page);

    const entries = data?.entries ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const from = page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);

    return (
        <Wrap>
            <Head>
                <SectionTitle as="h3" count={total > 0 ? total : undefined}>Historia płatności</SectionTitle>
            </Head>

            {isLoading ? (
                <Muted>Wczytywanie historii…</Muted>
            ) : isError ? (
                <Notice
                    tone="danger"
                    title="Nie udało się wczytać historii płatności"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                />
            ) : entries.length === 0 ? (
                <Muted>Nie ma jeszcze żadnych płatności.</Muted>
            ) : (
                <>
                    <TableScroll>
                        <Table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Zdarzenie</th>
                                    <th>Plan</th>
                                    <th>Moduł</th>
                                    <th className="num">Kwota brutto</th>
                                    <th>Numer transakcji</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id}>
                                        <td className="date">{formatDateTime(entry.date)}</td>
                                        <td>
                                            <StatusPill $tone={eventTone(entry.eventType)}>
                                                {entry.eventTypeDisplayName}
                                            </StatusPill>
                                        </td>
                                        <td>{entry.plan?.name ?? '-'}</td>
                                        <td>{entry.addOn?.name ?? '-'}</td>
                                        <td className={entry.amountCents === 0 ? 'num zero' : 'num amount'}>
                                            {entry.amountCents === 0 ? '-' : entry.amountFormatted}
                                        </td>
                                        <td>
                                            {entry.transactionId
                                                ? <TransactionId>{entry.transactionId}</TransactionId>
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableScroll>

                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationInfo>
                                {from}-{to} z {total}
                            </PaginationInfo>
                            <PaginationBtns aria-label="Strony historii płatności">
                                <Button
                                    size="sm"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Poprzednia
                                </Button>
                                {pageWindow(page, totalPages).map((item, i) =>
                                    item === 'gap' ? (
                                        <Gap key={`gap-${i}`} aria-hidden="true">…</Gap>
                                    ) : (
                                        <PageBtn
                                            key={item}
                                            type="button"
                                            $active={item === page}
                                            aria-current={item === page ? 'page' : undefined}
                                            aria-label={`Strona ${item + 1}`}
                                            onClick={() => setPage(item)}
                                        >
                                            {item + 1}
                                        </PageBtn>
                                    ),
                                )}
                                <Button
                                    size="sm"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Następna
                                </Button>
                            </PaginationBtns>
                        </Pagination>
                    )}
                </>
            )}
        </Wrap>
    );
}
