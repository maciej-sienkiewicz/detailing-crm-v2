import { useState } from 'react';
import { usePaymentHistory } from '../api/subscriptionQueries';
import type { PaymentEventType } from '../types';
import { formatDateTime } from '../utils/formatters';
import {
    Wrap,
    TableHeader,
    TableTitle,
    Table,
    THead,
    Th,
    TBody,
    Tr,
    Td,
    EventBadge,
    AmountCell,
    TransactionId,
    EmptyState,
    EmptyIcon,
    EmptyText,
    Pagination,
    PaginationInfo,
    PaginationBtns,
    PageBtn,
} from './PaymentHistoryTable.styles';

const PAGE_SIZE = 20;

function EventIcon({ type }: { type: PaymentEventType }) {
    const color = (() => {
        switch (type) {
            case 'PLAN_UPGRADE':
            case 'SUBSCRIPTION_PURCHASE': return '#0284c7';
            case 'PLAN_DOWNGRADE': return '#d97706';
            case 'ADD_ON_ACTIVATION': return '#16a34a';
            case 'ADD_ON_DEACTIVATION': return '#dc2626';
            default: return '#64748b';
        }
    })();

    const d = (() => {
        switch (type) {
            case 'SUBSCRIPTION_PURCHASE': return 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2';
            case 'PLAN_UPGRADE': return 'M12 19V5M5 12l7-7 7 7';
            case 'PLAN_DOWNGRADE': return 'M12 5v14M19 12l-7 7-7-7';
            case 'ADD_ON_ACTIVATION': return 'M12 5v14M5 12h14';
            case 'ADD_ON_DEACTIVATION': return 'M5 12h14';
            default: return 'M12 2a10 10 0 1 0 0 20';
        }
    })();

    return (
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
        </svg>
    );
}

const ReceiptIcon = () => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1"
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1-2-1V2zM8 10h8M8 14h4" />
    </svg>
);

export function PaymentHistoryTable() {
    const [page, setPage] = useState(0);
    const { data, isLoading, isError } = usePaymentHistory(page);

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
    const from = page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0);

    return (
        <Wrap>
            <TableHeader>
                <TableTitle>Historia płatności</TableTitle>
            </TableHeader>

            {isLoading && (
                <EmptyState>
                    <EmptyText>Ładowanie historii…</EmptyText>
                </EmptyState>
            )}

            {isError && (
                <EmptyState>
                    <EmptyText>Nie udało się załadować historii płatności.</EmptyText>
                </EmptyState>
            )}

            {!isLoading && !isError && data?.entries.length === 0 && (
                <EmptyState>
                    <EmptyIcon><ReceiptIcon /></EmptyIcon>
                    <EmptyText>Brak wpisów w historii płatności.</EmptyText>
                </EmptyState>
            )}

            {!isLoading && !isError && (data?.entries.length ?? 0) > 0 && (
                <>
                    <Table>
                        <THead>
                            <tr>
                                <Th>Data</Th>
                                <Th>Zdarzenie</Th>
                                <Th>Plan</Th>
                                <Th>Moduł</Th>
                                <Th>Kwota</Th>
                                <Th>ID transakcji</Th>
                            </tr>
                        </THead>
                        <TBody>
                            {data!.entries.map(entry => (
                                <Tr key={entry.id}>
                                    <Td style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>
                                        {formatDateTime(entry.date)}
                                    </Td>
                                    <Td>
                                        <EventBadge $type={entry.eventType}>
                                            <EventIcon type={entry.eventType} />
                                            {entry.eventTypeDisplayName}
                                        </EventBadge>
                                    </Td>
                                    <Td>{entry.plan?.name ?? '—'}</Td>
                                    <Td>{entry.addOn?.name ?? '—'}</Td>
                                    <AmountCell $zero={entry.amountCents === 0}>
                                        {entry.amountCents === 0 ? '—' : entry.amountFormatted}
                                    </AmountCell>
                                    <Td>
                                        {entry.transactionId
                                            ? <TransactionId>{entry.transactionId}</TransactionId>
                                            : '—'}
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>

                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationInfo>
                                {from}–{to} z {data!.total} wpisów
                            </PaginationInfo>
                            <PaginationBtns>
                                <PageBtn
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Poprzednia
                                </PageBtn>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <PageBtn
                                        key={i}
                                        $active={i === page}
                                        onClick={() => setPage(i)}
                                    >
                                        {i + 1}
                                    </PageBtn>
                                ))}
                                <PageBtn
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Następna
                                </PageBtn>
                            </PaginationBtns>
                        </Pagination>
                    )}
                </>
            )}
        </Wrap>
    );
}
