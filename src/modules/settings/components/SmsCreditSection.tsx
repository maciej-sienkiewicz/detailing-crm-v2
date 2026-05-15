import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/core/context/AuthContext';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';
import {
    useSmsCreditBalance,
    useSmsCreditPackages,
    useSmsCreditTransactions,
    usePurchaseCredits,
} from '../hooks/useSmsCredits';
import type { SmsCreditTransactionType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);

const TX_LABELS: Record<SmsCreditTransactionType, string> = {
    PURCHASE: 'Zakup',
    USAGE:    'Wysyłka SMS',
    REFUND:   'Zwrot',
    BONUS:    'Bonus',
    EXPIRY:   'Wygaśnięcie',
};

const TX_COLORS: Record<SmsCreditTransactionType, string> = {
    PURCHASE: '#10b981',
    USAGE:    '#f59e0b',
    REFUND:   '#10b981',
    BONUS:    '#8b5cf6',
    EXPIRY:   '#ef4444',
};

// ─── Styled components ────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 700ms linear infinite;
    margin: 60px auto;
`;

const Card = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px 28px;
`;

const CardTitle = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin: 0 0 20px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

// Balance card
const BalanceGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const StatBox = styled.div<{ $accent?: string }>`
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 18px;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: ${p => p.$accent ?? '#0ea5e9'};
        border-radius: 12px 12px 0 0;
    }
`;

const StatValue = styled.div`
    font-size: 28px;
    font-weight: 800;
    color: ${p => p.theme.colors.text};
    line-height: 1;
    margin-bottom: 4px;
    letter-spacing: -1px;
`;

const StatLabel = styled.div`
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
`;

const StatUpdated = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 6px;
`;

// Packages
const PackageGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
`;

const PackageCard = styled.button<{ $selected: boolean }>`
    background: ${p => p.$selected ? 'rgba(14,165,233,0.06)' : '#f8fafc'};
    border: 2px solid ${p => p.$selected ? '#0ea5e9' : '#e2e8f0'};
    border-radius: 12px;
    padding: 18px 16px;
    cursor: pointer;
    text-align: left;
    transition: all 160ms ease;
    font-family: inherit;

    &:hover {
        border-color: #0ea5e9;
        background: rgba(14,165,233,0.04);
    }
`;

const PkgCredits = styled.div`
    font-size: 22px;
    font-weight: 800;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.5px;
`;

const PkgCreditsLabel = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    margin-left: 4px;
`;

const PkgName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin: 6px 0 2px;
`;

const PkgPrice = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: #0ea5e9;
    margin-top: 8px;
`;

const PkgPricePerCredit = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
`;

const BuyButton = styled.button<{ $disabled?: boolean }>`
    margin-top: 18px;
    width: 100%;
    padding: 10px 0;
    background: ${p => p.$disabled ? '#e2e8f0' : 'linear-gradient(135deg, #0ea5e9, #0369a1)'};
    color: ${p => p.$disabled ? '#94a3b8' : 'white'};
    border: none;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 600;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    transition: opacity 160ms ease;
    font-family: inherit;

    &:hover:not([disabled]) { opacity: 0.9; }
`;

const SuccessToast = styled.div`
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    color: #166534;
    font-weight: 500;
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ErrorToast = styled.div`
    background: #fff1f2;
    border: 1px solid #fca5a5;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    color: #991b1b;
    font-weight: 500;
    margin-top: 16px;
`;

// Transactions
const TxTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
`;

const TxThead = styled.thead`
    th {
        padding: 8px 12px;
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
        border-bottom: 1px solid #f1f5f9;
    }
`;

const TxRow = styled.tr`
    &:hover td { background: #f8fafc; }
    td {
        padding: 11px 12px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
        vertical-align: middle;
    }
    &:last-child td { border-bottom: none; }
`;

const TxBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    background: ${p => p.$color}22;
    color: ${p => p.$color};
`;

const TxAmount = styled.span<{ $positive: boolean }>`
    font-weight: 700;
    color: ${p => p.$positive ? '#10b981' : '#f59e0b'};
`;

const PaginationRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    font-size: 13px;
    color: #64748b;
`;

const PaginationButtons = styled.div`
    display: flex;
    gap: 6px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    padding: 5px 10px;
    border-radius: 7px;
    border: 1px solid ${p => p.$active ? '#0ea5e9' : '#e2e8f0'};
    background: ${p => p.$active ? '#0ea5e9' : 'white'};
    color: ${p => p.$active ? 'white' : '#334155'};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 140ms ease;

    &:hover:not([disabled]) {
        border-color: #0ea5e9;
        color: #0ea5e9;
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 40px;
    color: #94a3b8;
    font-size: 13px;
`;

const OwnerOnlyNote = styled.div`
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    color: #92400e;
    display: flex;
    align-items: center;
    gap: 8px;
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function BalanceCard() {
    const { data, isLoading } = useSmsCreditBalance();

    if (isLoading) return <Spinner />;
    if (!data) return null;

    return (
        <Card>
            <CardTitle>
                <WalletSvg />
                Saldo kredytów SMS
            </CardTitle>
            <BalanceGrid>
                <StatBox $accent="#0ea5e9">
                    <StatValue>{data.availableCredits.toLocaleString('pl-PL')}</StatValue>
                    <StatLabel>Dostępne kredyty</StatLabel>
                    <StatUpdated>Zaktualizowano {formatDate(data.updatedAt)}</StatUpdated>
                </StatBox>
                <StatBox $accent="#10b981">
                    <StatValue>{data.totalPurchased.toLocaleString('pl-PL')}</StatValue>
                    <StatLabel>Łącznie zakupiono</StatLabel>
                </StatBox>
                <StatBox $accent="#f59e0b">
                    <StatValue>{data.totalUsed.toLocaleString('pl-PL')}</StatValue>
                    <StatLabel>Łącznie wykorzystano</StatLabel>
                </StatBox>
            </BalanceGrid>
        </Card>
    );
}

function PackagesCard({ isOwner }: { isOwner: boolean }) {
    const { data: packages, isLoading } = useSmsCreditPackages();
    const { mutate: purchase, isPending, isSuccess, isError, error } = usePurchaseCredits();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const errorMsg = isError
        ? ((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Wystąpił błąd podczas zakupu')
        : null;

    if (isLoading) return <Spinner />;

    return (
        <Card>
            <CardTitle>
                <ShopSvg />
                Pakiety kredytów
            </CardTitle>

            {!isOwner && (
                <OwnerOnlyNote>
                    <LockSvg />
                    Zakup kredytów jest dostępny wyłącznie dla właściciela studia.
                </OwnerOnlyNote>
            )}

            {isOwner && (
                <>
                    {!packages?.length ? (
                        <EmptyState>Brak dostępnych pakietów</EmptyState>
                    ) : (
                        <PackageGrid>
                            {packages.map(pkg => (
                                <PackageCard
                                    key={pkg.id}
                                    $selected={selectedId === pkg.id}
                                    onClick={() => setSelectedId(pkg.id)}
                                    type="button"
                                >
                                    <PkgCredits>
                                        {pkg.creditAmount.toLocaleString('pl-PL')}
                                        <PkgCreditsLabel>kredytów</PkgCreditsLabel>
                                    </PkgCredits>
                                    <PkgName>{pkg.name}</PkgName>
                                    <PkgPrice>{formatCurrency(pkg.priceGross, pkg.currency)}</PkgPrice>
                                    <PkgPricePerCredit>
                                        {formatCurrency(pkg.pricePerCredit, pkg.currency)} / kredyt
                                    </PkgPricePerCredit>
                                </PackageCard>
                            ))}
                        </PackageGrid>
                    )}

                    <BuyButton
                        type="button"
                        $disabled={!selectedId || isPending}
                        disabled={!selectedId || isPending}
                        onClick={() => selectedId && purchase(selectedId)}
                    >
                        {isPending ? 'Przetwarzanie…' : 'Kup wybrany pakiet'}
                    </BuyButton>

                    {isSuccess && (
                        <SuccessToast>
                            <CheckSvg />
                            Kredyty SMS zostały pomyślnie dodane do konta.
                        </SuccessToast>
                    )}
                    {isError && <ErrorToast>{errorMsg}</ErrorToast>}
                </>
            )}
        </Card>
    );
}

const PAGE_SIZE = 20;

function TransactionsCard() {
    const [page, setPage] = useState(0);
    const { data, isLoading } = useSmsCreditTransactions(page, PAGE_SIZE);

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    return (
        <Card>
            <CardTitle>
                <HistorySvg />
                Historia transakcji
            </CardTitle>

            {isLoading ? (
                <Spinner />
            ) : !data?.items.length ? (
                <EmptyState>Brak transakcji do wyświetlenia</EmptyState>
            ) : (
                <>
                    <TxTable>
                        <TxThead>
                            <tr>
                                <th>Typ</th>
                                <th>Opis</th>
                                <th style={{ textAlign: 'right' }}>Zmiana</th>
                                <th style={{ textAlign: 'right' }}>Saldo po</th>
                                <th style={{ textAlign: 'right' }}>Data</th>
                            </tr>
                        </TxThead>
                        <tbody>
                            {data.items.map(tx => {
                                const isPositive = tx.amount > 0;
                                const color = TX_COLORS[tx.type];
                                return (
                                    <TxRow key={tx.id}>
                                        <td>
                                            <TxBadge $color={color}>
                                                {TX_LABELS[tx.type]}
                                            </TxBadge>
                                        </td>
                                        <td style={{ color: '#64748b' }}>{tx.description}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <TxAmount $positive={isPositive}>
                                                {isPositive ? '+' : ''}{tx.amount.toLocaleString('pl-PL')}
                                            </TxAmount>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            {tx.balanceAfter.toLocaleString('pl-PL')}
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {formatDate(tx.createdAt)}
                                        </td>
                                    </TxRow>
                                );
                            })}
                        </tbody>
                    </TxTable>

                    {totalPages > 1 && (
                        <PaginationRow>
                            <span>
                                Strona {page + 1} z {totalPages} ({data.total} transakcji)
                            </span>
                            <PaginationButtons>
                                <PageBtn
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                >
                                    ‹ Wstecz
                                </PageBtn>
                                <PageBtn
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                >
                                    Dalej ›
                                </PageBtn>
                            </PaginationButtons>
                        </PaginationRow>
                    )}
                </>
            )}
        </Card>
    );
}

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

const WalletSvg = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M20 12h-6a2 2 0 0 0 0 4h6" />
    </svg>
);

const ShopSvg = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
);

const HistorySvg = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
    </svg>
);

const LockSvg = () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const CheckSvg = () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// ─── Main export ──────────────────────────────────────────────────────────────

export function SmsCreditSection() {
    const { user } = useAuth();
    const smsFeature = useFeature('SMS_EMAIL');
    const isOwner = user?.role?.toLowerCase() === 'owner';

    return (
        <LockedSection
            locked={!smsFeature.enabled}
            message="Twój abonament nie obsługuje powiadomień SMS."
        >
            <>
                <BalanceCard />
                <PackagesCard isOwner={isOwner} />
                <TransactionsCard />
            </>
        </LockedSection>
    );
}
