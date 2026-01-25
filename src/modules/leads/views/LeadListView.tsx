// src/modules/leads/views/LeadListView.tsx
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { LeadTable, LeadForm, LeadStatsBar } from '../components';
import { useLeads, useLeadSocket } from '../hooks';
import { LeadStatus } from '../types';
import type { Lead, LeadListFilters } from '../types';

// Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

// Styled Components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    padding: ${props => props.theme.spacing.lg};
  }
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes.xxl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const PageSubtitle = styled.p`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semibold};
  background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
  color: white;
  border: none;
  border-radius: ${props => props.theme.radii.md};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast};
  box-shadow: ${props => props.theme.shadows.md};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }

  &:active {
    transform: translateY(0);
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.textSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text};
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
  width: 100%;
  min-width: 0;
  overflow: hidden;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const FiltersBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  padding-left: 40px;
  font-size: ${props => props.theme.fontSizes.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  background: ${props => props.theme.colors.surfaceAlt};
  color: ${props => props.theme.colors.text};
  outline: none;
  transition: all ${props => props.theme.transitions.fast};

  &:focus {
    border-color: var(--brand-primary);
    background: ${props => props.theme.colors.surface};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.textMuted};
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.textMuted};
  pointer-events: none;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xs};
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $isActive: boolean }>`
  padding: 6px 12px;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radii.full};
  border: 1px solid ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.border};
  background: ${props => props.$isActive ? 'var(--brand-primary)' : 'transparent'};
  color: ${props => props.$isActive ? 'white' : props.theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast};

  &:hover {
    border-color: var(--brand-primary);
    color: ${props => props.$isActive ? 'white' : 'var(--brand-primary)'};
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background: ${props => props.theme.colors.border};
  display: none;

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    display: block;
  }
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};
`;

const PaginationInfo = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textSecondary};
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xs};
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.$disabled ? props.theme.colors.textMuted : props.theme.colors.text};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all ${props => props.theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${props => !props.$disabled && props.theme.colors.surfaceHover};
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xxl};
  background: ${props => props.theme.colors.errorLight};
  border: 1px solid ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.radii.lg};
  color: ${props => props.theme.colors.error};
`;

const statusOptions: { value: LeadStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Wszystkie' },
  { value: LeadStatus.PENDING, label: 'Nowe' },
  { value: LeadStatus.IN_PROGRESS, label: 'W kontakcie' },
  { value: LeadStatus.CONVERTED, label: 'Zrealizowane' },
  { value: LeadStatus.ABANDONED, label: 'Odpuszczone' },
];

/**
 * Main Lead List View
 * Displays the lead inbox with filtering, pagination, and WebSocket integration
 */
export const LeadListView: React.FC = () => {
  // WebSocket integration for real-time updates
  useLeadSocket();

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | undefined>(undefined);

  // Filters state
  const [filters, setFilters] = useState<LeadListFilters>({
    search: '',
    status: [],
    source: [],
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const [activeStatusFilter, setActiveStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');

  // Fetch leads
  const { leads, pagination, isLoading, isError, refetch } = useLeads(filters);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
      page: 1, // Reset to first page on search
    }));
  }, []);

  // Handle status filter change
  const handleStatusFilter = useCallback((status: LeadStatus | 'ALL') => {
    setActiveStatusFilter(status);
    setFilters((prev) => ({
      ...prev,
      status: status === 'ALL' ? [] : [status],
      page: 1,
    }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  // Handle lead click
  const handleLeadClick = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  }, []);

  // Handle add new lead
  const handleAddLead = useCallback(() => {
    setEditingLead(undefined);
    setIsFormOpen(true);
  }, []);

  // Handle form close
  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingLead(undefined);
  }, []);

  return (
    <PageContainer>
      <PageHeader>
        <TitleSection>
          <PageTitle>Leady</PageTitle>
          <PageSubtitle>Zarządzaj zapytaniami i potencjalnymi klientami</PageSubtitle>
        </TitleSection>

        <HeaderActions>
          <RefreshButton onClick={() => refetch()} title="Odśwież">
            <RefreshIcon />
          </RefreshButton>
          <AddButton onClick={handleAddLead}>
            <PlusIcon />
            {t.leads?.actions?.add || 'Dodaj lead'}
          </AddButton>
        </HeaderActions>
      </PageHeader>

      <LeadStatsBar />

      <MainContent>
        <FiltersBar>
          <SearchInputWrapper>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <SearchInput
              type="text"
              placeholder="Szukaj po kontakcie, nazwie..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </SearchInputWrapper>

          <Divider />

          <FilterGroup>
            {statusOptions.map((option) => (
              <FilterChip
                key={option.value}
                $isActive={activeStatusFilter === option.value}
                onClick={() => handleStatusFilter(option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </FilterGroup>
        </FiltersBar>

        {isError ? (
          <ErrorState>
            <p>Nie udało się załadować leadów</p>
            <button onClick={() => refetch()}>Spróbuj ponownie</button>
          </ErrorState>
        ) : (
          <TableWrapper>
            <LeadTable
              leads={leads}
              isLoading={isLoading}
              onRowClick={handleLeadClick}
            />
          </TableWrapper>
        )}

        {pagination && pagination.totalPages > 1 && (
          <PaginationBar>
            <PaginationInfo>
              {t.common.showing} {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} -{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}{' '}
              {t.common.of} {pagination.totalItems}
            </PaginationInfo>
            <PaginationButtons>
              <PaginationButton
                $disabled={pagination.currentPage === 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                {t.common.previous}
              </PaginationButton>
              <PaginationButton
                $disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                {t.common.next}
              </PaginationButton>
            </PaginationButtons>
          </PaginationBar>
        )}
      </MainContent>

      <LeadForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        editLead={editingLead}
      />
    </PageContainer>
  );
};
