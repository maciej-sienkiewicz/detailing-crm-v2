// src/modules/batch-orders/views/BatchOrdersView.tsx
//
// Zlecenia zbiorcze: lista kontrahentów → wybrany kontrahent.
//
// Dawniej: stos kart, po jednej na kontrahenta, każda z własnym filtrem okresu
// i własną tabelą. Przy kilku kontrahentach ekran był długim przewijaniem bez
// odpowiedzi na podstawowe pytanie („komu ile zostało do rozliczenia"), a miesięczne
// rozliczenie wymagało przestawienia miesiąca osobno przy każdym z nich.
//
// Teraz okres jest jeden dla całego ekranu, lista po lewej pokazuje kwoty do
// rozliczenia, a po prawej jest jeden kontrahent. Na węższych ekranach lista
// chowa się w przycisk wyboru kontrahenta nad szczegółami.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown, Layers, ListChecks } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader/PageHeader';
import { MobilePageHeader, MobilePageHeaderIconButton, MobilePageHeaderCountValue } from '@/common/components/PageHeader';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, CloseBtn } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { useBreakpoint, useContainerWidth } from '@/common/hooks';
import {
    useContractorsOverview, useCreateContractor, useDeleteContractor, useUpdateContractor,
} from '../hooks/useBatchOrders';
import { ContractorFormModal } from '../components/ContractorFormModal';
import { ContractorDetail } from '../components/ContractorDetail';
import { ContractorList } from '../components/ContractorList';
import { BatchServicesModal } from '../components/BatchServicesModal';
import { PeriodPicker } from '../components/PeriodPicker';
import type { BatchContractor, ContractorRequest } from '../types';
import { apiErrorMessage, formatMoney } from '../utils/format';
import { currentMonthPeriod, periodPhrase, type Period } from '../utils/period';

const ViewContainer = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-x: clip;
    box-sizing: border-box;

    @media (max-width: 767px) { gap: 12px; }
`;

const Layout = styled.div`
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
`;

/* Lista przykleja się do góry: przy długiej tabeli wpisów wybór innego kontrahenta
   nie wymaga przewijania z powrotem na początek strony. */
const Aside = styled.aside`
    position: sticky;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: calc(100dvh - 32px);
    min-height: 0;
`;

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

/** Wybór kontrahenta na węższych ekranach - otwiera tę samą listę w oknie. */
const SwitcherBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 56px;
    padding: 8px 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    > span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    strong { font-size: 15px; font-weight: 700; color: ${p => p.theme.colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    small { font-size: 12.5px; color: #64748b; }
    svg { width: 18px; height: 18px; flex-shrink: 0; color: ${p => p.theme.colors.textSecondary}; }
`;

const StateBox = styled.div<{ $error?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 24px;
    text-align: center;
    border-radius: 16px;
    font-size: 14px;
    color: ${p => p.$error ? '#991b1b' : p.theme.colors.textSecondary};
    background: ${p => p.$error ? '#fef2f2' : p.theme.colors.surface};
    border: 1px ${p => p.$error ? 'solid #fecaca' : `dashed ${p.theme.colors.border}`};

    strong { font-size: 17px; color: ${p => p.theme.colors.text}; }
    p { margin: 0; max-width: 420px; line-height: 1.5; }
`;

/** Lista kontrahentów (340) + odstęp (24) + szczegóły szerokie na tabelę (~700). */
const WIDE_LAYOUT_MIN_WIDTH = 1060;

export function BatchOrdersView() {
    const { showSuccess, showError } = useToast();
    const isDesktop = useBreakpoint('md');
    const isLargeScreen = useBreakpoint('xl');
    // Lista obok szczegółów tylko wtedy, gdy obok listy (340px) zostaje miejsce na
    // tabelę wpisów. Liczymy miejsce widoku, nie okna: rozwinięty pasek boczny
    // zabiera ~250px, a przy oknie 1024px szczegóły dostałyby niecałe 350px.
    const [viewRef, viewWidth] = useContainerWidth<HTMLElement>();
    const isWide = viewWidth === null ? isLargeScreen : viewWidth >= WIDE_LAYOUT_MIN_WIDTH;
    const [searchParams, setSearchParams] = useSearchParams();
    const [period, setPeriod] = useState<Period>(() => currentMonthPeriod());

    const { data: overview, isLoading, isError, refetch } = useContractorsOverview(period.from, period.to);
    const createContractor = useCreateContractor();
    const updateContractor = useUpdateContractor();
    const deleteContractor = useDeleteContractor();

    const [showCreate, setShowCreate] = useState(false);
    const [editContractor, setEditContractor] = useState<BatchContractor | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<BatchContractor | null>(null);
    const [showServices, setShowServices] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const items = overview ?? [];
    const requestedId = searchParams.get('kontrahent');
    // Kontrahent z adresu, a gdy go nie ma (albo został usunięty) - ten, który ma
    // najwięcej do rozliczenia. Lista przychodzi posortowana po tej kwocie.
    const selected = items.find(o => o.contractor.id === requestedId) ?? items[0] ?? null;

    function select(contractorId: string) {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('kontrahent', contractorId);
            return next;
        }, { replace: true });
        setShowPicker(false);
    }

    // Adres wskazuje kontrahenta, którego już nie ma - poprawiamy go, żeby link
    // skopiowany teraz prowadził tam, gdzie patrzy użytkownik.
    useEffect(() => {
        if (selected && requestedId && requestedId !== selected.contractor.id) select(selected.contractor.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.contractor.id, requestedId]);

    async function handleCreate(data: ContractorRequest) {
        const created = await createContractor.mutateAsync(data);
        showSuccess('Kontrahent dodany', created.name);
        select(created.id);
    }

    async function handleUpdate(data: ContractorRequest) {
        if (!editContractor) return;
        await updateContractor.mutateAsync({ contractorId: editContractor.id, data });
        showSuccess('Zapisano dane kontrahenta');
    }

    async function handleDelete(contractor: BatchContractor) {
        try {
            await deleteContractor.mutateAsync(contractor.id);
            showSuccess('Kontrahent usunięty z listy', contractor.name);
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.delete('kontrahent');
                return next;
            }, { replace: true });
        } catch (e) {
            showError('Nie udało się usunąć kontrahenta', apiErrorMessage(e, 'Spróbuj ponownie.'));
        }
    }

    const phrase = periodPhrase(period);
    const list = (
        <ContractorList
            items={items}
            selectedId={selected?.contractor.id ?? null}
            onSelect={select}
            onCreate={() => { setShowPicker(false); setShowCreate(true); }}
            periodPhrase={phrase}
        />
    );

    let content: React.ReactNode;
    if (isLoading && !overview) {
        content = <StateBox>Wczytywanie kontrahentów…</StateBox>;
    } else if (isError && !overview) {
        content = (
            <StateBox $error>
                <strong>Nie udało się wczytać kontrahentów</strong>
                <SharedButton $variant="secondary" type="button" onClick={() => refetch()}>Spróbuj ponownie</SharedButton>
            </StateBox>
        );
    } else if (items.length === 0) {
        content = (
            <StateBox>
                <strong>Nie masz jeszcze kontrahentów B2B</strong>
                <p>
                    Kontrahent to firma, dla której robisz wiele aut i rozliczasz je zbiorczo - np. salon,
                    flota albo leasing. Dodaj go, a potem wpisuj kolejne auta i rozliczaj je raz na okres.
                </p>
                <SharedButton $variant="primary" type="button" onClick={() => setShowCreate(true)}>Dodaj kontrahenta</SharedButton>
            </StateBox>
        );
    } else if (selected) {
        const detail = (
            <ContractorDetail
                key={selected.contractor.id}
                contractor={selected.contractor}
                period={period}
                isDesktop={isDesktop}
                onEditContractor={() => setEditContractor(selected.contractor)}
                onDeleteContractor={() => setConfirmDelete(selected.contractor)}
            />
        );
        content = isWide ? (
            <Layout>
                <Aside>
                    <PeriodPicker value={period} onChange={setPeriod} />
                    {list}
                </Aside>
                {detail}
            </Layout>
        ) : (
            <Stack>
                <SwitcherBtn type="button" onClick={() => setShowPicker(true)} aria-haspopup="dialog">
                    <span>
                        <strong>{selected.contractor.name}</strong>
                        <small>
                            {items.length > 1 ? `1 z ${items.length} kontrahentów · zmień` : 'Kontrahent · zmień lub dodaj'}
                        </small>
                    </span>
                    <ChevronDown />
                </SwitcherBtn>
                <PeriodPicker value={period} onChange={setPeriod} />
                {detail}
            </Stack>
        );
    }

    const totalOpen = items.reduce((sum, o) => sum + o.openGrossCents, 0);

    return (
        <ViewContainer ref={viewRef}>
            {isDesktop ? (
                <PageHeader
                    title="Zlecenia zbiorcze"
                    subtitle="Kontrahenci B2B, ich wpisy i rozliczenia"
                    actions={
                        <PageHeaderGhostButton onClick={() => setShowServices(true)} title="Cennik usług zleceń zbiorczych">
                            Cennik usług
                        </PageHeaderGhostButton>
                    }
                />
            ) : (
                <MobilePageHeader
                    icon={<Layers />}
                    title="Zlecenia zbiorcze"
                    subtitle={overview
                        ? <><MobilePageHeaderCountValue>{formatMoney(totalOpen)}</MobilePageHeaderCountValue> do rozliczenia</>
                        : 'Wczytywanie…'}
                    actions={
                        <MobilePageHeaderIconButton onClick={() => setShowServices(true)} title="Cennik usług" aria-label="Cennik usług">
                            <ListChecks />
                        </MobilePageHeaderIconButton>
                    }
                />
            )}

            {content}

            {showPicker && (
                <ModalShell isOpen onClose={() => setShowPicker(false)} size="sm">
                    <ModalHeader>
                        <ModalTitleGroup><ModalTitle>Wybierz kontrahenta</ModalTitle></ModalTitleGroup>
                        <CloseBtn onClick={() => setShowPicker(false)} />
                    </ModalHeader>
                    <ModalContent>{list}</ModalContent>
                </ModalShell>
            )}

            {showServices && <BatchServicesModal onClose={() => setShowServices(false)} />}

            {showCreate && (
                <ContractorFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
            )}

            {editContractor && (
                <ContractorFormModal
                    initial={editContractor}
                    onSave={handleUpdate}
                    onClose={() => setEditContractor(null)}
                />
            )}

            {/* Usunięcie jest miękkie: kontrahent znika z listy, a jego wpisy i historia
                rozliczeń zostają w bazie. Dawny komunikat („nieodwracalne, usunie wszystkie
                wpisy") straszył czymś, co się nie działo. */}
            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Usunąć kontrahenta z listy?"
                message={`„${confirmDelete?.name ?? ''}" zniknie z listy zleceń zbiorczych. Jego wpisy i historia rozliczeń zostaną zachowane w systemie.`}
                variant="danger"
                confirmText="Usuń z listy"
                cancelText="Anuluj"
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
                onCancel={() => setConfirmDelete(null)}
            />
        </ViewContainer>
    );
}
