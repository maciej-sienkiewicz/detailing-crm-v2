// src/modules/visits/components/LinkCostDocumentModal.tsx
//
// Okno „Przypnij koszt do wizyty": wybór dokumentu z zakładki „Dokumenty kosztowe".
//
// Bez wyszukiwania okno podpowiada koszty z okresu wizyty (od miesiąca przed przyjęciem
// do miesiąca po wydaniu) - faktura za folię przychodzi przed wizytą, faktura
// lakiernika po niej. Wyszukiwanie przeszukuje wszystkie dokumenty tak samo jak
// zakładka w finansach: sprzedawca, NIP, numer, pozycje, kwota.
//
// Kliknięcie wiersza przypina od razu, a okno zostaje otwarte: wizyta ma często kilka
// kosztów (materiał i podwykonawca), a zamykanie i otwieranie okna przy każdym byłoby
// karą za porządek. Jedyne wypełnienie w oknie to „Gotowe" w stopce (CLAUDE.md §2).
//
// Koszt należy do jednej wizyty. Dokument przypięty gdzie indziej nie przeskakuje po
// cichu - okno pyta o przeniesienie i mówi, z której wizyty go zabierze.
//
// Przypiąć da się każdy dokument kosztowy - fakturę, paragon, rachunek i inny koszt.
// Kosztu, którego jeszcze nie ma w finansach (paragon za materiał z hurtowni), nie
// trzeba dodawać okrężną drogą: „Dodaj koszt" otwiera to samo okno co „Dodaj dokument
// kosztowy" w finansach, zapisuje dokument TAM (liczy się w kosztach studia) i od razu
// przypina go do tej wizyty.

import { useState } from 'react';
import styled from 'styled-components';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
import { useDebounce } from '@/common/hooks';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import {
    PickerSearch,
    PickerPane,
    PickerResults,
    PickerStatus,
    PickerSkeleton,
    PickerRow,
    PickerAvatar,
    PickerRowMain,
    PickerRowTitle,
    PickerRowSub,
    PickerEmpty,
} from '@/common/components/PickerList';
import { Button, Notice, StatusPill } from '@/common/components/ui';
import { AddExpenseModal } from '@/modules/finance/components';
import { formatDate } from '@/modules/finance/utils/formatters';
import type { KsefExpense } from '@/modules/finance/types';
import { visitCostsApi, type CostDocumentCandidate, type VisitCosts } from '../api/visitCostsApi';
import { apiErrorMessage, apiErrorStatus } from '../api/apiError';
import { visitCostCandidatesKey } from '../hooks/useVisitCosts';
import { documentAmount, documentTitle } from '../utils/visitCosts';

const CandidateRow = styled(PickerRow)`
    &:disabled {
        cursor: default;
        background: #ffffff;
        border-color: #e2e8f0;
    }
`;

/* Rodzaj z numerem, data i kwota to osobne fakty - osobne elementy z odstępem (CLAUDE.md §4). */
const RowFacts = styled(PickerRowSub)`
    display: flex;
    flex-wrap: wrap;
    column-gap: 12px;
`;

const RowAside = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    > :first-child { flex: 1; min-width: 0; }
    > button { flex-shrink: 0; }
`;

const NoticeActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    visitId: string;
    onLink: (costDocumentId: string, reassign: boolean) => Promise<VisitCosts>;
}

export function LinkCostDocumentModal({ isOpen, onClose, visitId, onLink }: Props) {
    const [search, setSearch] = useState('');
    const [pendingMove, setPendingMove] = useState<CostDocumentCandidate | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    // Przypięte w tym oknie - wiersz zmienia stan od razu, zanim lista się odświeży.
    const [linkedHere, setLinkedHere] = useState<ReadonlySet<string>>(new Set());
    const [addOpen, setAddOpen] = useState(false);
    // Dodany tu dokument może mieć datę spoza okresu wizyty i nie wejść na listę -
    // dlatego potwierdzenie mówi wprost, co się z nim stało.
    const [added, setAdded] = useState<string | null>(null);

    const debounced = useDebounce(search, 300).trim();
    const searching = debounced.length > 0;

    const { data, isLoading, isFetching, isPlaceholderData, refetch } = useQuery({
        queryKey: visitCostCandidatesKey(visitId, debounced),
        queryFn: () => visitCostsApi.candidates(visitId, debounced),
        enabled: isOpen,
        // Poprzednie wyniki zostają widoczne, póki nie przyjdą nowe - lista nie miga przy pisaniu.
        placeholderData: keepPreviousData,
    });

    // Każda droga zamknięcia (Gotowe, krzyżyk, Escape, tło) czyści okno na następny raz.
    const handleClose = () => {
        setSearch('');
        setPendingMove(null);
        setError(null);
        setLinkedHere(new Set());
        setAdded(null);
        onClose();
    };

    const link = async (candidate: CostDocumentCandidate, reassign: boolean) => {
        const id = candidate.document.id;
        setBusyId(id);
        setError(null);
        try {
            await onLink(id, reassign);
            setLinkedHere(prev => new Set(prev).add(id));
            setPendingMove(null);
        } catch (e) {
            // 409: ktoś w międzyczasie przypiął dokument gdzie indziej - lista ma to pokazać.
            if (apiErrorStatus(e) === 409) refetch();
            setError(apiErrorMessage(e, 'Nie udało się przypiąć dokumentu. Spróbuj jeszcze raz.'));
        } finally {
            setBusyId(null);
        }
    };

    const linkCreated = async (expense: KsefExpense) => {
        const title = documentTitle({
            documentKind: expense.documentKind ?? 'INVOICE', documentNumber: expense.documentNumber, isCorrection: false,
        });
        setError(null);
        try {
            await onLink(expense.id, false);
            setLinkedHere(prev => new Set(prev).add(expense.id));
            setAdded(`${title} jest w finansach i w kosztach tej wizyty.`);
            refetch();
        } catch (e) {
            setAdded(null);
            setError(apiErrorMessage(e, `${title} zapisano w finansach, ale nie udało się przypiąć go do wizyty. Wyszukaj go na liście i kliknij.`));
            throw e;
        }
    };

    const pick = (candidate: CostDocumentCandidate) => {
        if (candidate.linkedVisit && !candidate.linkedVisit.current) {
            setPendingMove(candidate);
            setError(null);
            return;
        }
        link(candidate, false);
    };

    const candidates = data?.candidates ?? [];
    const isStale = isPlaceholderData;
    const total = data?.total ?? 0;

    const statusText = isLoading
        ? 'Wczytywanie…'
        : isStale
            ? 'Wyszukiwanie…'
            : searching
                ? total === 0
                    ? 'Nie znaleziono dokumentów'
                    : total > candidates.length
                        ? `Pokazano ${candidates.length} z ${total}, zawęź wyszukiwanie`
                        : `Znaleziono: ${total}`
                : data?.periodFrom && data.periodTo
                    ? `Koszty z okresu ${formatDate(data.periodFrom)}–${formatDate(data.periodTo)}`
                    : '';

    const renderRow = (candidate: CostDocumentCandidate) => {
        const { document: doc, linkedVisit } = candidate;
        const isHere = linkedVisit?.current === true || linkedHere.has(doc.id);
        const isCancelled = doc.status === 'CANCELLED';
        const gross = documentAmount(doc.grossAmount, doc.currency);
        const elsewhere = !isHere && linkedVisit && !linkedVisit.current ? linkedVisit : null;

        return (
            <CandidateRow
                key={doc.id}
                type="button"
                $selected={isHere || pendingMove?.document.id === doc.id}
                disabled={isHere || isCancelled || busyId !== null}
                onClick={() => pick(candidate)}
                aria-label={`${isHere ? 'Przypięty: ' : 'Przypnij: '}${documentTitle(doc)}, ${doc.sellerName ?? 'bez sprzedawcy'}`}
            >
                <PickerAvatar><FileText aria-hidden="true" /></PickerAvatar>
                <PickerRowMain>
                    <PickerRowTitle>{doc.sellerName ?? 'Bez sprzedawcy'}</PickerRowTitle>
                    <RowFacts>
                        <span>{documentTitle(doc)}</span>
                        <span>{formatDate(doc.saleDate)}</span>
                    </RowFacts>
                    {elsewhere && (
                        <PickerRowSub>
                            {elsewhere.deleted ? 'Należy do usuniętej wizyty' : 'Należy do wizyty'} #{elsewhere.visitNumber}, {elsewhere.label}
                        </PickerRowSub>
                    )}
                </PickerRowMain>
                <RowAside>
                    <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{gross ?? 'Bez kwoty'}</strong>
                    {isHere && <StatusPill $tone="ok">Przypięty</StatusPill>}
                    {!isHere && isCancelled && <StatusPill>Anulowany</StatusPill>}
                    {!isHere && !isCancelled && elsewhere && <StatusPill $tone="warn">Inna wizyta</StatusPill>}
                    {busyId === doc.id && <StatusPill $tone="info">Przypinanie…</StatusPill>}
                </RowAside>
            </CandidateRow>
        );
    };

    const renderResults = () => {
        if (isLoading) return <PickerSkeleton />;
        if (candidates.length === 0) {
            return searching ? (
                <PickerEmpty
                    title="Nie znaleziono dokumentów"
                    description="Szukamy po sprzedawcy, NIP-ie, numerze dokumentu, nazwach pozycji i kwocie."
                />
            ) : (
                <PickerEmpty
                    title="Brak kosztów z okresu wizyty"
                    description="Wyszukaj dokument po sprzedawcy, NIP-ie, numerze albo kwocie. Kosztu, którego nie ma jeszcze w finansach, dodasz przyciskiem „Dodaj koszt”."
                />
            );
        }
        return candidates.map(renderRow);
    };

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg" stableHeight labelledBy="link-cost-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="link-cost-title">Przypnij koszt do wizyty</ModalTitle>
                    <ModalSubtitle>Faktury, paragony, rachunki i inne koszty z zakładki „Dokumenty kosztowe". Kliknij, żeby przypiąć.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                <SearchRow>
                    <PickerSearch
                        value={search}
                        onChange={setSearch}
                        placeholder="Szukaj po sprzedawcy, NIP-ie, numerze albo kwocie…"
                        autoFocus
                        loading={isFetching && !isLoading}
                    />
                    <Button variant="tinted" onClick={() => { setAdded(null); setAddOpen(true); }}>
                        <Plus />Dodaj koszt
                    </Button>
                </SearchRow>

                {added && <Notice tone="ok" role="status" title="Dodano i przypięto">{added}</Notice>}

                {pendingMove?.linkedVisit && (
                    <Notice
                        tone="warn"
                        title={`${documentTitle(pendingMove.document)} należy do wizyty #${pendingMove.linkedVisit.visitNumber}`}
                        action={
                            <NoticeActions>
                                <Button size="sm" variant="ghost" onClick={() => setPendingMove(null)}>Anuluj</Button>
                                <Button
                                    size="sm"
                                    variant="tinted"
                                    disabled={busyId !== null}
                                    onClick={() => link(pendingMove, true)}
                                >
                                    Przenieś do tej wizyty
                                </Button>
                            </NoticeActions>
                        }
                    >
                        Koszt należy tylko do jednej wizyty. Po przeniesieniu zniknie z rachunku
                        wizyty „{pendingMove.linkedVisit.label}".
                    </Notice>
                )}

                {error && <Notice tone="danger" role="alert">{error}</Notice>}

                <PickerPane>
                    <PickerStatus>{statusText}</PickerStatus>
                    <PickerResults aria-busy={isFetching} $stale={isStale}>
                        {renderResults()}
                    </PickerResults>
                </PickerPane>
            </ModalContent>

            <ModalFooter>
                <Button variant="primary" onClick={handleClose}>Gotowe</Button>
            </ModalFooter>

            <AddExpenseModal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onCreated={linkCreated}
                subtitle="Zapiszemy go w finansach i przypniemy do tej wizyty"
            />
        </ModalShell>
    );
}
