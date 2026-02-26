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
} from '../components';

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.lg};
  padding: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    padding: ${(p) => p.theme.spacing.lg};
  }
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.xs};
`;

const PageTitle = styled.h1`
  font-size: ${(p) => p.theme.fontSizes.xl};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  margin: 0;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    font-size: ${(p) => p.theme.fontSizes.xxl};
  }
`;

const PageSubtitle = styled.p`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.sm};
  flex-wrap: wrap;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.spacing.xs};
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.lg};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
  color: white;
  border: none;
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  box-shadow: ${(p) => p.theme.shadows.md};
  transition: all ${(p) => p.theme.transitions.fast};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${(p) => p.theme.shadows.lg};
  }

  &:active { transform: translateY(0); }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  transition: all ${(p) => p.theme.transitions.fast};

  &:hover {
    background: ${(p) => p.theme.colors.surfaceHover};
    color: ${(p) => p.theme.colors.text};
  }
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabsRow = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 2px solid ${(p) => p.theme.colors.border};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.lg};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => (p.$active ? p.theme.fontWeights.semibold : p.theme.fontWeights.normal)};
  color: ${(p) => (p.$active ? 'var(--brand-primary)' : p.theme.colors.textSecondary)};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--brand-primary)' : 'transparent')};
  margin-bottom: -2px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    color: ${(p) => (p.$active ? 'var(--brand-primary)' : p.theme.colors.text)};
  }
`;

// ─── Filters ──────────────────────────────────────────────────────────────────

const FiltersBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.sm};
  padding: ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }
`;

// ─── Custom Select Dropdown ───────────────────────────────────────────────────

const SelectTrigger = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.06)' : '#ffffff')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.3)' : '#e2e8f0')};
  border-radius: 10px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.1)' : '#f8fafc')};
    border-color: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.4)' : '#cbd5e1')};
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
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
`;


const SelectPanelBody = styled.div`
  padding: 8px;
`;

const SelectPanelOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.06)' : 'transparent')};
  color: ${(p) => (p.$active ? '#0f172a' : '#64748b')};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)')};
    color: #0f172a;
  }
`;

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  outline: none;

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const FilterSeparator = styled.div`
  flex: 1;
`;

const ClearFiltersBtn = styled.button`
  padding: 7px 14px;
  font-size: 13px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary};
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;

  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

// ─── Pagination ───────────────────────────────────────────────────────────────

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  flex-wrap: wrap;
  gap: ${(p) => p.theme.spacing.sm};
`;

const PaginationInfo = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.xs};
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$disabled ? p.theme.colors.textMuted : p.theme.colors.text)};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  transition: background 0.12s ease;

  &:hover:not(:disabled) { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const ErrorState = styled.div`
  padding: ${(p) => p.theme.spacing.xl};
  text-align: center;
  background: ${(p) => p.theme.colors.errorLight};
  border: 1px solid ${(p) => p.theme.colors.error};
  border-radius: ${(p) => p.theme.radii.lg};
  color: ${(p) => p.theme.colors.error};
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
      <FiltersBar>
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
      </FiltersBar>

      {isError ? (
        <ErrorState>
          <p>Nie udało się załadować dokumentów.</p>
          <button onClick={() => refetch()} style={{ marginTop: 8, cursor: 'pointer' }}>
            Spróbuj ponownie
          </button>
        </ErrorState>
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
          Dokumenty Przychodowe
        </Tab>
        <Tab $active={activeTab === 'expense'} onClick={() => setActiveTab('expense')}>
          Dokumenty Kosztowe
        </Tab>
        <Tab $active={activeTab === 'cash'} onClick={() => setActiveTab('cash')}>
          Kasa
        </Tab>
        <Tab $active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
          Podsumowanie
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
