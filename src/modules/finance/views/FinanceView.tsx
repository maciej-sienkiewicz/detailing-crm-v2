import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import type { FinanceTab } from '../types';
import { DocumentDirection, DocumentStatus } from '../types';
import { useFinanceDocuments } from '../hooks/useFinance';
import {
  FinanceSummaryCards,
  DocumentsTable,
  CreateDocumentModal,
  CashRegisterPanel,
  FinanceSummaryReport,
  InvoicingCredentialsPanel,
} from '../components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: ${(p) => p.theme.spacing.lg};
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    padding: ${(p) => p.theme.spacing.xl};
  }

  @media (min-width: ${(p) => p.theme.breakpoints.xl}) {
    padding: ${(p) => p.theme.spacing.xxl};
  }
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: ${st.text};
  margin: 0;
  letter-spacing: -0.5px;
`;

const PageSubtitle = styled.p`
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: ${st.fontSm};
  font-weight: 600;
  background: ${st.accentBlue};
  color: white;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};

  &:hover {
    background: #2563EB;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: ${st.bgCard};
  color: ${st.textSecondary};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};

  &:hover {
    background: ${st.bg};
    color: ${st.text};
    border-color: ${st.borderHover};
  }
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabsRow = styled.div`
  display: flex;
  gap: 0;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: ${st.shadowXs};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 20px;
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  background: ${(p) => (p.$active ? st.accentBlueDim : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}33` : 'transparent')};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    color: ${(p) => (p.$active ? st.accentBlue : st.text)};
    background: ${(p) => (p.$active ? st.accentBlueDim : st.bg)};
  }
`;

// ─── Filters ──────────────────────────────────────────────────────────────────

const FiltersPanel = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowXs};
`;

// ─── Custom Select Dropdown ───────────────────────────────────────────────────

const SelectTrigger = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: ${(p) => (p.$active ? st.accentBlueDim : st.bgCard)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}44` : st.border)};
  border-radius: ${st.radiusSm};
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: all ${st.transition};
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$active ? st.accentBlueDim : st.bg)};
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
  min-width: 220px;
  background: ${st.bgCard};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowLg};
  z-index: 1000;
  overflow: hidden;
  border: 1px solid ${st.border};
`;

const SelectPanelBody = styled.div`
  padding: 6px;
`;

const SelectPanelOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 9px 12px;
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
    background: ${(p) => (p.$active ? st.accentBlueDim : st.bg)};
    color: ${st.text};
  }
`;

const ChevronDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface SelectOptionItem { value: string; label: string; }
interface FinanceSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOptionItem[];
  placeholder: string;
}

const FinanceFilterSelect: React.FC<FinanceSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      let left = rect.left;
      if (left + 220 > vw - 8) left = vw - 228;
      setPanelPos({ top: rect.bottom + 4, left });
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: string) => { onChange(val); setIsOpen(false); };

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
            <SelectPanelOption $active={value === ''} onClick={() => handleSelect('')}>
              {placeholder}
            </SelectPanelOption>
            {options.map((opt) => (
              <SelectPanelOption key={opt.value} $active={value === opt.value} onClick={() => handleSelect(opt.value)}>
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

const DateInput = styled.input`
  padding: 7px 10px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const FilterSeparator = styled.div`
  flex: 1;
`;

const ClearFiltersBtn = styled.button`
  padding: 6px 12px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: 1px solid ${st.border};
  background: transparent;
  color: ${st.textSecondary};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${st.bg};
    color: ${st.text};
    border-color: ${st.borderHover};
  }
`;

// ─── Pagination ───────────────────────────────────────────────────────────────

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  flex-wrap: wrap;
  gap: 8px;
  box-shadow: ${st.shadowXs};
`;

const PaginationInfo = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 6px;
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  padding: 7px 14px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${(p) => (p.$disabled ? st.textMuted : st.text)};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  transition: all ${st.transition};
  box-shadow: ${st.shadowXs};

  &:hover:not(:disabled) {
    background: ${st.bg};
    border-color: ${st.borderHover};
  }
`;

const ErrorBox = styled.div`
  padding: 32px;
  text-align: center;
  background: ${st.accentRedDim};
  border: 1px solid ${st.accentRed}33;
  border-radius: ${st.radius};
  color: ${st.accentRed};
  font-size: ${st.fontSm};
  font-weight: 500;
`;

// ─── Filters state ────────────────────────────────────────────────────────────

interface Filters {
  status: string;
  dateFrom: string;
  dateTo: string;
  documentType: string;
  page: number;
}

const PAGE_SIZE = 20;

// ─── Tab content for documents (income / expense) ─────────────────────────────

const DocumentsTabContent: React.FC<{
  direction: DocumentDirection;
  onAdd?: () => void;
}> = ({ direction }) => {
  const [filters, setFilters] = useState<Filters>({
    status: '',
    dateFrom: '',
    dateTo: '',
    documentType: '',
    page: 1,
  });

  const { documents, total, isLoading, isError, refetch } = useFinanceDocuments({
    direction,
    status: filters.status || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    documentType: filters.documentType || undefined,
    page: filters.page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.status || filters.dateFrom || filters.dateTo || filters.documentType);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const clearFilters = () =>
    setFilters({ status: '', dateFrom: '', dateTo: '', documentType: '', page: 1 });

  return (
    <>
      <FiltersPanel>
        <FinanceFilterSelect
          value={filters.documentType}
          onChange={(val) => setFilter('documentType', val)}
          options={[
            { value: 'INVOICE', label: 'Faktura' },
            { value: 'RECEIPT', label: 'Paragon' },
            { value: 'OTHER', label: 'Inny' },
          ]}
          placeholder="Wszystkie typy"
        />

        <FinanceFilterSelect
          value={filters.status}
          onChange={(val) => setFilter('status', val)}
          options={[
            { value: DocumentStatus.PAID, label: 'Opłacona' },
            { value: DocumentStatus.PENDING, label: 'Oczekująca' },
            { value: DocumentStatus.OVERDUE, label: 'Przeterminowana' },
          ]}
          placeholder="Wszystkie statusy"
        />

        <DateInput
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
          title="Data od"
        />
        <DateInput
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
          title="Data do"
        />

        <FilterSeparator />

        {hasFilters && (
          <ClearFiltersBtn onClick={clearFilters}>Wyczyść filtry</ClearFiltersBtn>
        )}

        <RefreshButton onClick={() => refetch()} title="Odśwież">
          <RefreshIcon />
        </RefreshButton>
      </FiltersPanel>

      {isError ? (
        <ErrorBox>
          Nie udało się załadować dokumentów.{' '}
          <button onClick={() => refetch()} style={{ cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', font: 'inherit' }}>
            Spróbuj ponownie
          </button>
        </ErrorBox>
      ) : (
        <DocumentsTable documents={documents} isLoading={isLoading} />
      )}

      {totalPages > 1 && (
        <PaginationBar>
          <PaginationInfo>
            {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} z {total}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn
              $disabled={filters.page === 1}
              disabled={filters.page === 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              Poprzednia
            </PageBtn>
            <PageBtn
              $disabled={filters.page >= totalPages}
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Następna
            </PageBtn>
          </PaginationBtns>
        </PaginationBar>
      )}
    </>
  );
};


// ─── Main View ────────────────────────────────────────────────────────────────

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('income');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddDoc = useCallback(() => setIsModalOpen(true), []);
  const handleModalClose = useCallback(() => setIsModalOpen(false), []);

  const showAddButton = activeTab === 'income' || activeTab === 'expense';

  return (
    <PageContainer>
      <PageHeader>
        <TitleSection>
          <PageTitle>Finanse</PageTitle>
          <PageSubtitle>Dokumenty finansowe, kasa i raporty</PageSubtitle>
        </TitleSection>

        <HeaderActions>
          {showAddButton && (
            <AddButton onClick={handleAddDoc}>
              <PlusIcon />
              Dodaj dokument
            </AddButton>
          )}
        </HeaderActions>
      </PageHeader>

      <FinanceSummaryCards />

      <TabsRow>
        <Tab $active={activeTab === 'income'} onClick={() => setActiveTab('income')}>
          Dokumenty przychodowe
        </Tab>
        <Tab $active={activeTab === 'expense'} onClick={() => setActiveTab('expense')}>
          Dokumenty kosztowe
        </Tab>
        <Tab $active={activeTab === 'cash'} onClick={() => setActiveTab('cash')}>
          Kasa
        </Tab>
        <Tab $active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
          Podsumowanie
        </Tab>
        <Tab $active={activeTab === 'invoicing'} onClick={() => setActiveTab('invoicing')}>
          Faktury zewnętrzne
        </Tab>
      </TabsRow>

      {activeTab === 'income' && (
        <DocumentsTabContent direction={DocumentDirection.INCOME} onAdd={handleAddDoc} />
      )}

      {activeTab === 'expense' && (
        <DocumentsTabContent direction={DocumentDirection.EXPENSE} onAdd={handleAddDoc} />
      )}

      {activeTab === 'cash' && <CashRegisterPanel />}

      {activeTab === 'summary' && <FinanceSummaryReport />}

      {activeTab === 'invoicing' && <InvoicingCredentialsPanel />}

      <CreateDocumentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        defaultDirection={
          activeTab === 'expense' ? DocumentDirection.EXPENSE : DocumentDirection.INCOME
        }
      />
    </PageContainer>
  );
};
