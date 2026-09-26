// src/modules/settings/components/SmsCreditSection.tsx
//
// Kredyty SMS i AI: saldo, dokupienie pakietu, historia.
//
// Wcześniej sekcja powtarzała pod nagłówkiem ramy własny tytuł („Saldo kredytów
// SMS"), saldo stało w trzech jednakowych kafelkach z kolorowym paskiem, a „Kup
// wybrany pakiet" kupował OD RAZU - jedno kliknięcie w pełną szerokość karty
// obciążało kartę studia bez pytania o kwotę. Teraz:
//   - saldo jest nagłówkiem karty (SummaryStrip), rozpisanie zwykłym zdaniem;
//   - pakiety to radia z ceną brutto, a przycisk mówi, CO i ZA ILE kupisz;
//   - zakup przechodzi przez okno potwierdzenia z rozbiciem netto / VAT / brutto;
//   - wynik i błąd mówi toast, a nie bloki doklejane pod przyciskiem.

import { useState } from 'react';
import styled from 'styled-components';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import {
    Button, Card, FieldList, FieldRow, Notice, Panel, SectionTitle, StatusPill, SummaryStrip, ChoiceCard, ChoiceList,
    ui, type PillTone,
} from '@/common/components/ui';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { usePermissions } from '@/core/permissions';
import { useCapability } from '@/modules/subscription';
import { apiErrorMessage } from '@/modules/subscription/utils/apiErrors';
import {
    useSmsCreditBalance,
    useSmsCreditPackages,
    useSmsCreditTransactions,
    usePurchaseCredits,
} from '../hooks/useSmsCredits';
import type { SmsCreditPackage, SmsCreditTransactionType } from '../types';
import { creditsLabel, formatCreditCount, formatGrossCents, packagePrice, pricePerSmsLabel } from './smsCreditPricing';

// ─── Słowniki ────────────────────────────────────────────────────────────────

const TX_LABELS: Record<SmsCreditTransactionType, string> = {
    PURCHASE: 'Zakup',
    USAGE: 'Wysyłka',
    REFUND: 'Zwrot',
    BONUS: 'Bonus',
    EXPIRY: 'Wygaśnięcie',
};

const TX_TONES: Record<SmsCreditTransactionType, PillTone> = {
    PURCHASE: 'ok',
    USAGE: 'neutral',
    REFUND: 'ok',
    BONUS: 'info',
    EXPIRY: 'warn',
};

const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

// ─── Style ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
`;

const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 24px 24px;

    @media (max-width: 640px) { padding: 16px; gap: 16px; }
`;

const Block = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

const Money = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;

    strong {
        font-size: 14px;
        font-weight: 700;
        color: ${ui.ink};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    span {
        font-size: 12px;
        color: ${ui.textMuted};
    }
`;

const BuyRow = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;

    @media (max-width: 640px) { > button { width: 100%; } }
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const HistoryPanel = styled(Panel)`
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

// Strona ma overflow-x: clip, więc tabela szersza od kolumny byłaby po prostu
// ucięta. Przewija się w swoim pudełku, a nie razem ze stroną.
const TableScroll = styled.div`
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -4px;
    padding: 0 4px;
`;

const Table = styled.table`
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
    font-size: 13px;

    th {
        padding: 8px 10px;
        text-align: left;
        font-size: 12.5px;
        font-weight: 600;
        color: ${ui.textMuted};
        border-bottom: 1px solid ${ui.line};
        white-space: nowrap;
    }

    td {
        padding: 10px;
        border-bottom: 1px solid ${ui.lineFaint};
        color: ${ui.inkSoft};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .desc { color: ${ui.textMuted}; }
    .date { color: ${ui.textMuted}; white-space: nowrap; }
`;

const Change = styled.span<{ $positive: boolean }>`
    font-weight: 700;
    color: ${p => p.$positive ? ui.okInk : ui.inkSoft};
`;

const Pager = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const PagerButtons = styled.div`
    display: flex;
    gap: 6px;
`;

const Total = styled.strong`
    font-size: 17px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

// ─── Potwierdzenie zakupu ────────────────────────────────────────────────────

interface ConfirmProps {
    pkg: SmsCreditPackage;
    currentBalance: number | undefined;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * Okno powtarza cenę brutto z rozbiciem. Brutto to kwota z cennika - tę samą
 * pobierze bramka płatności - więc nie jest tu liczone; liczone jest wyłącznie
 * netto (grossToNet), a VAT to różnica pokazanych kwot (CLAUDE.md §1).
 */
export function PurchaseConfirmModal({ pkg, currentBalance, isPending, onConfirm, onClose }: ConfirmProps) {
    const price = packagePrice(pkg);
    const gross = formatGrossCents(price.grossCents, pkg.currency);

    return (
        <ModalShell isOpen onClose={isPending ? () => {} : onClose} size="sm" dismissible={!isPending}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Kupić {formatCreditCount(pkg.creditAmount)} {creditsLabel(pkg.creditAmount)} SMS?</ModalTitle>
                    <ModalSubtitle>Zakup jest płatny i nie da się go cofnąć.</ModalSubtitle>
                </ModalTitleGroup>
                {!isPending && <CloseBtn onClick={onClose} />}
            </ModalHeader>
            <ModalContent>
                <FieldList>
                    <FieldRow label="Pakiet">
                        <strong>{pkg.name}, {formatCreditCount(pkg.creditAmount)} {creditsLabel(pkg.creditAmount)}</strong>
                    </FieldRow>
                    <FieldRow label="Netto">{formatGrossCents(price.netCents, pkg.currency)}</FieldRow>
                    <FieldRow label={`VAT ${price.vatRate}%`}>{formatGrossCents(price.vatCents, pkg.currency)}</FieldRow>
                    <FieldRow label="Do zapłaty"><Total>{gross} brutto</Total></FieldRow>
                </FieldList>
                {currentBalance !== undefined && (
                    <Notice tone="info">
                        Po zakupie na koncie będzie {formatCreditCount(currentBalance + pkg.creditAmount)}{' '}
                        {creditsLabel(currentBalance + pkg.creditAmount)}.
                    </Notice>
                )}
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose} disabled={isPending}>Anuluj</Button>
                <Button variant="primary" onClick={onConfirm} disabled={isPending}>
                    {isPending ? 'Płatność w toku…' : `Kupuję za ${gross}`}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}

// ─── Karta: saldo i dokupienie ───────────────────────────────────────────────

function CreditsCard({ isOwner }: { isOwner: boolean }) {
    const { showSuccess, showError } = useToast();
    const balance = useSmsCreditBalance();
    const packages = useSmsCreditPackages({ enabled: isOwner });
    const purchase = usePurchaseCredits();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);

    const selected = packages.data?.find(p => p.id === selectedId) ?? null;

    const handleConfirm = () => {
        if (!selected) return;
        purchase.mutate(selected.id, {
            onSuccess: res => {
                setConfirming(false);
                setSelectedId(null);
                showSuccess(
                    'Kredyty dodane',
                    `Na koncie jest teraz ${formatCreditCount(res.availableCredits)} ${creditsLabel(res.availableCredits)}.`,
                );
            },
            // Okno zostaje otwarte: odrzucona płatność to moment na „spróbuj ponownie"
            // albo „anuluj", a nie na szukanie od nowa, który pakiet był wybrany.
            onError: err => showError('Zakup się nie udał', apiErrorMessage(err) ?? 'Nie udało się kupić kredytów. Spróbuj ponownie.'),
        });
    };

    const data = balance.data;

    return (
        <Card>
            <CardBody>
                {balance.isError ? (
                    <Notice
                        tone="danger"
                        title="Nie udało się wczytać salda"
                        action={<Button variant="ghost" size="sm" onClick={() => balance.refetch()}>Spróbuj ponownie</Button>}
                    />
                ) : (
                    <SummaryStrip
                        label="Na koncie"
                        loading={balance.isLoading}
                        amount={data ? `${formatCreditCount(data.availableCredits)} ${creditsLabel(data.availableCredits)}` : '-'}
                        details={data
                            ? `kupiono ${formatCreditCount(data.totalPurchased)}, zużyto ${formatCreditCount(data.totalUsed)}`
                            : undefined}
                    />
                )}

                {isOwner && (
                    <Block>
                        <SectionTitle as="h3">Dokup kredyty</SectionTitle>
                        {packages.isLoading ? (
                            <Muted>Wczytywanie pakietów…</Muted>
                        ) : packages.isError ? (
                            <Notice
                                tone="danger"
                                title="Nie udało się wczytać pakietów"
                                action={<Button variant="ghost" size="sm" onClick={() => packages.refetch()}>Spróbuj ponownie</Button>}
                            />
                        ) : !packages.data?.length ? (
                            <Muted>Nie ma teraz pakietów do kupienia.</Muted>
                        ) : (
                            <>
                                <ChoiceList role="radiogroup" aria-label="Pakiet kredytów">
                                    {packages.data.map(pkg => {
                                        const price = packagePrice(pkg);
                                        return (
                                            <ChoiceCard
                                                key={pkg.id}
                                                type="radio"
                                                name="sms-credit-package"
                                                checked={selectedId === pkg.id}
                                                onChange={() => setSelectedId(pkg.id)}
                                                title={`${pkg.name}, ${formatCreditCount(pkg.creditAmount)} ${creditsLabel(pkg.creditAmount)}`}
                                                detail={pricePerSmsLabel(pkg)}
                                                trailing={(
                                                    <Money>
                                                        <strong>{formatGrossCents(price.grossCents, pkg.currency)}</strong>
                                                        <span>brutto</span>
                                                    </Money>
                                                )}
                                            />
                                        );
                                    })}
                                </ChoiceList>
                                <BuyRow>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        disabled={!selected}
                                        onClick={() => setConfirming(true)}
                                    >
                                        {selected
                                            ? `Kup ${formatCreditCount(selected.creditAmount)} ${creditsLabel(selected.creditAmount)} za ${formatGrossCents(packagePrice(selected).grossCents, selected.currency)}`
                                            : 'Wybierz pakiet'}
                                    </Button>
                                </BuyRow>
                            </>
                        )}
                    </Block>
                )}
            </CardBody>

            {confirming && selected && (
                <PurchaseConfirmModal
                    pkg={selected}
                    currentBalance={data?.availableCredits}
                    isPending={purchase.isPending}
                    onConfirm={handleConfirm}
                    onClose={() => setConfirming(false)}
                />
            )}
        </Card>
    );
}

// ─── Historia ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function TransactionsPanel() {
    const [page, setPage] = useState(0);
    const { data, isLoading, isError, refetch } = useSmsCreditTransactions(page, PAGE_SIZE);

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <HistoryPanel>
            <SectionTitle as="h3" count={total > 0 ? total : undefined}>Historia</SectionTitle>

            {isLoading ? (
                <Muted>Wczytywanie historii…</Muted>
            ) : isError ? (
                <Notice
                    tone="danger"
                    title="Nie udało się wczytać historii"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                />
            ) : items.length === 0 ? (
                <Muted>Nie ma jeszcze żadnych zakupów ani wysyłek.</Muted>
            ) : (
                <>
                    <TableScroll>
                        <Table>
                            <thead>
                                <tr>
                                    <th>Rodzaj</th>
                                    <th>Opis</th>
                                    <th className="num">Zmiana</th>
                                    <th className="num">Saldo po</th>
                                    <th className="num">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(tx => (
                                    <tr key={tx.id}>
                                        <td><StatusPill $tone={TX_TONES[tx.type]}>{TX_LABELS[tx.type]}</StatusPill></td>
                                        <td className="desc">{tx.description}</td>
                                        <td className="num">
                                            <Change $positive={tx.amount > 0}>
                                                {tx.amount > 0 ? '+' : ''}{formatCreditCount(tx.amount)}
                                            </Change>
                                        </td>
                                        <td className="num">{formatCreditCount(tx.balanceAfter)}</td>
                                        <td className="num date">{formatDateTime(tx.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableScroll>

                    {totalPages > 1 && (
                        <Pager>
                            <span>Strona {page + 1} z {totalPages}</span>
                            <PagerButtons>
                                <Button size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Wstecz</Button>
                                <Button size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Dalej</Button>
                            </PagerButtons>
                        </Pager>
                    )}
                </>
            )}
        </HistoryPanel>
    );
}

// ─── Sekcja ──────────────────────────────────────────────────────────────────

export function SmsCreditSection() {
    // Kredyty SMS to wspólna infrastruktura każdego modułu wysyłającego SMS-y
    // (komunikacja, kampanie, podpisy); backend rozstrzyga to jako COMM_SMS_CREDITS.
    const credits = useCapability('COMM_SMS_CREDITS');
    // Rama wpuszcza tu tylko właściciela (OWNER_ONLY), ale pakiety, zakup i historia
    // są na backendzie @RequiresOwner - sprawdzamy tym samym źródłem co rama, żeby
    // sekcja osadzona gdzie indziej nie strzelała zapytaniami kończącymi się 403.
    const { isOwner } = usePermissions();

    return (
        <LockedSection
            locked={!credits.enabled}
            message="Kredyty SMS wymagają modułu wysyłającego SMS-y (komunikacja, kampanie lub podpisy)."
        >
            <Wrap>
                <CreditsCard isOwner={isOwner} />
                {isOwner && <TransactionsPanel />}
            </Wrap>
        </LockedSection>
    );
}
