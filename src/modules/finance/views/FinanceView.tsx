import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { FinanceTab } from '../types';
import { DocumentStatus } from '../types';
import type { ExpenseSource, ExpensePaymentStatus } from '../types';
import { useFinanceDocuments } from '../hooks/useFinance';
import { useKsefExpenses } from '../hooks/useKsef';
import {
  FinanceSummaryCards,
  DocumentsTable,
  CreateDocumentModal,
  CashRegisterPanel,
  PaymentSummaryTab,
  KsefExpensesTable,
  KsefSyncWidget,
  AddExpenseModal,
} from '../components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.xl};
  padding: ${(p) => p.theme.spacing.lg};
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeUp} 300ms ease both;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    padding: ${(p) => p.theme.spacing.xl};
  }
`;

// ─── Hero — wyciągnięty do PageHeader w common/components ────────────────────

// ─── Section divider ──────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: -${(p) => p.theme.spacing.md};
`;

const SectionLabelText = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

const SectionLabelLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${(p) => p.theme.colors.border};
`;


// ─── Panel card (tabs + content) ──────────────────────────────────────────────

const PanelCard = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
  overflow: hidden;
  margin-top: ${(p) => p.theme.spacing.md};
`;

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const TabItem = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  padding: 14px 20px;
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? st.accentBlue : 'transparent')};
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  transition: color ${st.transition}, border-color ${st.transition}, background ${st.transition};

  &:hover {
    color: ${(p) => (p.$active ? st.accentBlue : st.text)};
    background: ${(p) => (p.$active ? 'transparent' : st.bg)};
  }
`;

// ─── Small inline add button (filters strip) ──────────────────────────────────

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${st.fontSm};
  font-weight: 600;
  background: ${st.accentBlue};
  color: white;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};

  &:hover { background: #2563eb; box-shadow: ${st.shadowSm}; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

// ─── Filters strip ────────────────────────────────────────────────────────────

const FiltersStrip = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const FilterSeparator = styled.div`
  flex: 1;
`;

// ─── Custom Select for filters ────────────────────────────────────────────────

const SelectTrigger = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: ${(p) => (p.$active ? st.accentBlueDim : p.theme.colors.surface)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}44` : p.theme.colors.border)};
  border-radius: ${st.radiusSm};
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: all ${st.transition};
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$active ? st.accentBlueDim : p.theme.colors.surfaceHover)};
    border-color: ${(p) => (p.$active ? `${st.accentBlue}55` : st.borderHover)};
    color: ${(p) => (p.$active ? st.accentBlue : st.text)};
  }
`;

const SelectBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

const SelectPanel = styled.div`
  position: fixed;
  min-width: 200px;
  background: ${(p) => p.theme.colors.surface};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowLg};
  z-index: 1000;
  overflow: hidden;
  border: 1px solid ${(p) => p.theme.colors.border};
`;

const SelectPanelBody = styled.div`
  padding: 6px;
`;

const SelectPanelOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}22` : 'transparent')};
  border-radius: ${st.radiusSm};
  background: ${(p) => (p.$active ? st.accentBlueDim : 'transparent')};
  color: ${(p) => (p.$active ? st.text : st.textSecondary)};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${(p) => (p.$active ? st.accentBlueDim : p.theme.colors.surfaceAlt)};
    color: ${st.text};
  }
`;

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface SelectOptionItem { value: string; label: string; }
interface FilterSelectProps {
  value:       string;
  onChange:    (value: string) => void;
  options:     SelectOptionItem[];
  placeholder: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      let left = rect.left;
      if (left + 200 > vw - 8) left = vw - 208;
      setPanelPos({ top: rect.bottom + 4, left });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {isOpen && <SelectBackdrop onClick={() => setIsOpen(false)} />}
      <SelectTrigger ref={triggerRef} $active={!!value} onClick={handleToggle}>
        {selectedLabel}
        <ChevronDownIcon />
      </SelectTrigger>
      {isOpen && panelPos && createPortal(
        <SelectPanel style={{ top: panelPos.top, left: panelPos.left }}>
          <SelectPanelBody>
            <SelectPanelOption $active={value === ''} onClick={() => { onChange(''); setIsOpen(false); }}>
              {placeholder}
            </SelectPanelOption>
            {options.map((opt) => (
              <SelectPanelOption
                key={opt.value}
                $active={value === opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
              >
                {opt.label}
              </SelectPanelOption>
            ))}
          </SelectPanelBody>
        </SelectPanel>,
        document.body
      )}
    </>
  );
};

const StyledDateInput = styled.input`
  padding: 5px 10px;
  font-size: ${st.fontSm};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  background: ${(p) => p.theme.colors.surface};
  color: ${st.text};
  outline: none;
  cursor: pointer;
  transition: border-color ${st.transition}, box-shadow ${st.transition};
  &:focus { border-color: ${st.accentBlue}; box-shadow: ${st.shadowBlue}; }
`;

const DateInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title?: string;
}> = ({ value, onChange, title }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <StyledDateInput
      ref={ref}
      type="date"
      value={value}
      onChange={onChange}
      title={title}
      onClick={() => (ref.current as any)?.showPicker?.()}
    />
  );
};

// ─── Toggle switch ────────────────────────────────────────────────────────────

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  position: relative;
  display: inline-block;
  width: 30px; height: 17px;
  border-radius: 999px;
  background: ${(p) => (p.$on ? st.accentBlue : p.theme.colors.border)};
  transition: background 0.18s ease;
  flex-shrink: 0;
  &::after {
    content: '';
    position: absolute;
    top: 2px; left: ${(p) => (p.$on ? '15px' : '2px')};
    width: 13px; height: 13px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.18);
    transition: left 0.18s ease;
  }
`;

const ToggleText = styled.span`
  font-size: ${st.fontSm};
  font-weight: 500;
  color: ${st.textSecondary};
  white-space: nowrap;
`;

// ─── Other filter elements ────────────────────────────────────────────────────

const ClearFiltersBtn = styled.button`
  padding: 5px 11px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: transparent;
  color: ${st.textSecondary};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; color: ${st.text}; border-color: ${st.borderHover}; }
`;

const RefreshBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  transition: all ${st.transition};
  flex-shrink: 0;
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; color: ${st.text}; border-color: ${st.borderHover}; }
`;

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Error / Pagination ───────────────────────────────────────────────────────

const InlineError = styled.div`
  padding: 40px 24px;
  text-align: center;
  background: ${st.accentRedDim};
  color: ${st.accentRed};
  font-size: ${st.fontSm};
  font-weight: 500;

  button {
    margin-top: 8px;
    cursor: pointer;
    text-decoration: underline;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    padding: 0;
  }
`;

const PaginationFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};
  flex-wrap: wrap;
  gap: 8px;
`;

const PaginationInfo = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 1px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  overflow: hidden;
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: none;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$disabled ? st.textMuted : st.text)};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  transition: background ${st.transition};
  &:last-child { border-right: none; }
  &:hover:not(:disabled) { background: ${(p) => p.theme.colors.surfaceAlt}; }
`;

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ─── Income documents tab ─────────────────────────────────────────────────────

const PAGE_SIZE = 20;

interface IncomeFilters {
  status:       string;
  dateFrom:     string;
  dateTo:       string;
  documentType: string;
  page:         number;
}

const IncomeTabContent: React.FC = () => {
  const [filters, setFilters] = useState<IncomeFilters>({
    status: '', dateFrom: '', dateTo: '', documentType: '', page: 1,
  });
  const [showDeleted, setShowDeleted] = useState(false);

  const { documents, total, isLoading, isError, refetch } = useFinanceDocuments({
    direction:      'INCOME',
    status:         filters.status        || undefined,
    dateFrom:       filters.dateFrom      || undefined,
    dateTo:         filters.dateTo        || undefined,
    documentType:   filters.documentType  || undefined,
    includeDeleted: showDeleted           || undefined,
    page:           filters.page,
    pageSize:       PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.status || filters.dateFrom || filters.dateTo || filters.documentType);
  const setFilter  = <K extends keyof IncomeFilters>(key: K, value: IncomeFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <>
      <FiltersStrip>
        <FilterSelect
          value={filters.documentType}
          onChange={(val) => setFilter('documentType', val)}
          options={[
            { value: 'INVOICE', label: 'Faktura' },
            { value: 'RECEIPT', label: 'Paragon' },
            { value: 'OTHER',   label: 'Inny' },
          ]}
          placeholder="Wszystkie typy"
        />
        <FilterSelect
          value={filters.status}
          onChange={(val) => setFilter('status', val)}
          options={[
            { value: DocumentStatus.PAID,    label: 'Opłacona' },
            { value: DocumentStatus.PENDING, label: 'Oczekująca' },
            { value: DocumentStatus.OVERDUE, label: 'Przeterminowana' },
          ]}
          placeholder="Wszystkie statusy"
        />
        <DateInput
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
          title="Data wystawienia od"
        />
        <DateInput
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
          title="Data wystawienia do"
        />
        <FilterSeparator />
        {hasFilters && (
          <ClearFiltersBtn
            onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '', documentType: '', page: 1 })}
          >
            Wyczyść filtry
          </ClearFiltersBtn>
        )}
        <ToggleLabel>
          <ToggleTrack $on={showDeleted} />
          <ToggleText>Wyświetl usunięte</ToggleText>
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </ToggleLabel>
        <RefreshBtn onClick={() => refetch()} title="Odśwież">
          <RefreshIcon />
        </RefreshBtn>
      </FiltersStrip>

      {isError ? (
        <InlineError>
          Nie udało się załadować dokumentów.
          <br />
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </InlineError>
      ) : (
        <DocumentsTable documents={documents} isLoading={isLoading} />
      )}

      {totalPages > 1 && (
        <PaginationFooter>
          <PaginationInfo>
            Wyświetlanie {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} z {total}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn
              $disabled={filters.page === 1}
              disabled={filters.page === 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft /> Poprzednia
            </PageBtn>
            <PageBtn
              $disabled={filters.page >= totalPages}
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Następna <ChevronRight />
            </PageBtn>
          </PaginationBtns>
        </PaginationFooter>
      )}
    </>
  );
};

// ─── Expenses (KSeF) tab ──────────────────────────────────────────────────────

interface ExpenseFilters {
  source:        string;
  paymentStatus: string;
  dateFrom:      string;
  dateTo:        string;
  page:          number;
}

const ExpensesTabContent: React.FC<{ onAddExpense: () => void }> = ({ onAddExpense }) => {
  const [filters, setFilters] = useState<ExpenseFilters>({
    source: '', paymentStatus: '', dateFrom: '', dateTo: '', page: 1,
  });
  const [showExcluded, setShowExcluded] = useState(false);

  const { expenses, total, isLoading, isError, refetch } = useKsefExpenses({
    source:          (filters.source        as ExpenseSource)        || undefined,
    paymentStatus:   (filters.paymentStatus as ExpensePaymentStatus) || undefined,
    dateFrom:        filters.dateFrom  || undefined,
    dateTo:          filters.dateTo    || undefined,
    includeExcluded: showExcluded      || undefined,
    page:            filters.page,
    pageSize:        PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.source || filters.paymentStatus || filters.dateFrom || filters.dateTo);
  const setFilter  = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <>
      <KsefSyncWidget />

      <FiltersStrip>
        <FilterSelect
          value={filters.source}
          onChange={(val) => setFilter('source', val)}
          options={[
            { value: 'KSEF',   label: 'Z KSeF' },
            { value: 'MANUAL', label: 'Ręczna' },
          ]}
          placeholder="Wszystkie źródła"
        />
        <FilterSelect
          value={filters.paymentStatus}
          onChange={(val) => setFilter('paymentStatus', val)}
          options={[
            { value: 'PAID',    label: 'Opłacone' },
            { value: 'PENDING', label: 'Oczekujące' },
          ]}
          placeholder="Wszystkie statusy"
        />
        <DateInput
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
          title="Data sprzedaży od"
        />
        <DateInput
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
          title="Data sprzedaży do"
        />
        <FilterSeparator />
        {hasFilters && (
          <ClearFiltersBtn
            onClick={() => setFilters({ source: '', paymentStatus: '', dateFrom: '', dateTo: '', page: 1 })}
          >
            Wyczyść filtry
          </ClearFiltersBtn>
        )}
        <ToggleLabel>
          <ToggleTrack $on={showExcluded} />
          <ToggleText>Pokaż ukryte</ToggleText>
          <input
            type="checkbox"
            checked={showExcluded}
            onChange={(e) => setShowExcluded(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </ToggleLabel>
        <RefreshBtn onClick={() => refetch()} title="Odśwież">
          <RefreshIcon />
        </RefreshBtn>
        <AddButton onClick={onAddExpense} style={{ padding: '5px 14px', fontSize: '12px' }}>
          <PlusIcon />
          Dodaj fakturę ręcznie
        </AddButton>
      </FiltersStrip>

      {isError ? (
        <InlineError>
          Nie udało się załadować faktur kosztowych.
          <br />
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </InlineError>
      ) : (
        <KsefExpensesTable expenses={expenses} isLoading={isLoading} />
      )}

      {totalPages > 1 && (
        <PaginationFooter>
          <PaginationInfo>
            Wyświetlanie {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} z {total}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn
              $disabled={filters.page === 1}
              disabled={filters.page === 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft /> Poprzednia
            </PageBtn>
            <PageBtn
              $disabled={filters.page >= totalPages}
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Następna <ChevronRight />
            </PageBtn>
          </PaginationBtns>
        </PaginationFooter>
      )}
    </>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab]         = useState<FinanceTab>('income');
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);

  const openIncomeModal  = useCallback(() => setIncomeModalOpen(true),  []);
  const closeIncomeModal = useCallback(() => setIncomeModalOpen(false), []);
  const openExpenseModal  = useCallback(() => setExpenseModalOpen(true),  []);
  const closeExpenseModal = useCallback(() => setExpenseModalOpen(false), []);

  return (
    <ViewContainer>
      <PageHeader
        title="Finanse"
        subtitle="Dokumenty przychodowe, koszty KSeF i raporty"
        actions={
          activeTab === 'income' ? (
            <PageHeaderPrimaryButton onClick={openIncomeModal}>
              <PlusIcon />
              Dodaj dokument przychodowy
            </PageHeaderPrimaryButton>
          ) : undefined
        }
      />

      <div>
        <SectionLabel>
          <SectionLabelText>Podsumowanie finansowe</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        <FinanceSummaryCards />
      </div>

      <div>
        <SectionLabel>
          <SectionLabelText>Dokumenty i raporty</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>

        <PanelCard>
          <TabBar>
            <TabItem $active={activeTab === 'income'} onClick={() => setActiveTab('income')}>
              Dokumenty przychodowe
            </TabItem>
            <TabItem $active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')}>
              Dokumenty kosztowe
            </TabItem>
            <TabItem $active={activeTab === 'cash'} onClick={() => setActiveTab('cash')}>
              Kasa
            </TabItem>
            <TabItem $active={activeTab === 'payment-summary'} onClick={() => setActiveTab('payment-summary')}>
              Podsumowanie płatności
            </TabItem>
          </TabBar>

          {activeTab === 'income' && (
            <IncomeTabContent />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTabContent onAddExpense={openExpenseModal} />
          )}
          {activeTab === 'cash' && <CashRegisterPanel />}
          {activeTab === 'payment-summary' && <PaymentSummaryTab />}
        </PanelCard>
      </div>

      <CreateDocumentModal isOpen={isIncomeModalOpen} onClose={closeIncomeModal} />
      <AddExpenseModal     isOpen={isExpenseModalOpen} onClose={closeExpenseModal} />
    </ViewContainer>
  );
};
