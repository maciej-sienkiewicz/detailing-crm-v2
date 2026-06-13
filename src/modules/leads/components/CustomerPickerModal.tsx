// src/modules/leads/components/CustomerPickerModal.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Search, X, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '@/modules/customers/api/customerApi';
import { AddCustomerModal } from '@/modules/customers/components/AddCustomerModal';
import type { Customer } from '@/modules/customers/types';
import type { CreateCustomerFormData } from '@/modules/customers/utils/customerValidation';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isPhone = (s: string) => /^[\d\s+\-().]{6,}$/.test(s.trim());

export interface CustomerPickerPrefill {
  contactIdentifier: string;
  customerName?: string | null;
}

function buildInitialValues(p: CustomerPickerPrefill): Partial<Pick<CreateCustomerFormData, 'firstName' | 'lastName' | 'email' | 'phone'>> {
  const result: Partial<Pick<CreateCustomerFormData, 'firstName' | 'lastName' | 'email' | 'phone'>> = {};
  const id = p.contactIdentifier.trim();

  if (isEmail(id))       result.email = id;
  else if (isPhone(id))  result.phone = id;

  if (p.customerName) {
    const parts = p.customerName.trim().split(/\s+/);
    result.firstName = parts[0] ?? '';
    result.lastName  = parts.slice(1).join(' ') || '';
  }
  return result;
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const PickerBox = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
`;

const PickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${st.border};
`;

const PickerTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
`;

const PickerCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${st.textMuted};
  cursor: pointer;
  transition: all 180ms ease;
  &:hover { background: #f1f5f9; color: ${st.text}; }
  svg { width: 15px; height: 15px; }
`;

const PickerSearchWrap = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${st.border};
  position: relative;
`;

const PickerSearchIcon = styled.div`
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: ${st.textMuted};
  pointer-events: none;
  display: flex;
  svg { width: 14px; height: 14px; }
`;

const PickerSearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  font-size: 13px;
  font-family: inherit;
  background: #f8fafc;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  color: ${st.text};
  outline: none;
  transition: all 180ms ease;
  box-sizing: border-box;

  &:focus { border-color: #0ea5e9; background: #fff; box-shadow: 0 0 0 3px rgba(14,165,233,0.12); }
  &::placeholder { color: ${st.textMuted}; }
`;

const AddNewRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  background: #f0f9ff;
  border: none;
  border-bottom: 1px solid ${st.border};
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 180ms ease;
  &:hover { background: #e0f2fe; }
`;

const AddNewLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #0369a1;
`;

const AddNewSub = styled.div`
  font-size: 11px;
  color: #7dd3fc;
  margin-top: 1px;
`;

const AddNewIcon = styled.div`
  width: 34px; height: 34px;
  border-radius: 50%;
  background: #bae6fd;
  color: #0369a1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 16px; height: 16px; }
`;

const PickerList = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const PickerRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 180ms ease;

  &:last-child { border-bottom: none; }
  &:hover { background: #f0f9ff; }
`;

const PickerAvatar = styled.div`
  width: 34px; height: 34px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
`;

const PickerName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
`;

const PickerSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 1px;
`;

const PickerEmpty = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: ${st.textMuted};
`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  prefill?: CustomerPickerPrefill;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  prefill,
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) { setSearch(''); setDebouncedSearch(''); }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-picker', debouncedSearch],
    queryFn: () => customerApi.getCustomers({ search: debouncedSearch, page: 1, limit: 15 }),
    enabled: isOpen,
  });

  const customers = data?.data ?? [];
  const initialValues = prefill ? buildInitialValues(prefill) : undefined;

  if (!isOpen) return null;

  return (
    <>
      <PickerOverlay onClick={onClose}>
        <PickerBox onClick={e => e.stopPropagation()}>
          <PickerHeader>
            <PickerTitle>Przypisz klienta z bazy</PickerTitle>
            <PickerCloseBtn onClick={onClose}><X /></PickerCloseBtn>
          </PickerHeader>

          <PickerSearchWrap>
            <PickerSearchIcon><Search /></PickerSearchIcon>
            <PickerSearchInput
              autoFocus
              placeholder="Szukaj po nazwisku, emailu, telefonie…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </PickerSearchWrap>

          <PickerList>
            <AddNewRow onClick={() => setIsAddOpen(true)}>
              <AddNewIcon><UserPlus /></AddNewIcon>
              <div>
                <AddNewLabel>Dodaj nowego klienta</AddNewLabel>
                {prefill && (
                  <AddNewSub>Dane z leada zostaną wstępnie uzupełnione</AddNewSub>
                )}
              </div>
            </AddNewRow>

            {isLoading ? (
              <PickerEmpty>Ładowanie…</PickerEmpty>
            ) : customers.length === 0 ? (
              <PickerEmpty>
                {debouncedSearch ? 'Brak wyników dla podanej frazy' : 'Brak klientów w bazie'}
              </PickerEmpty>
            ) : customers.map(customer => {
              const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';
              const initials = [customer.firstName?.[0], customer.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
              const contact = customer.contact?.phone || customer.contact?.email || '';
              return (
                <PickerRow key={customer.id} onClick={() => { onSelect(customer); onClose(); }}>
                  <PickerAvatar>{initials}</PickerAvatar>
                  <div>
                    <PickerName>{fullName}</PickerName>
                    {contact && <PickerSub>{contact}</PickerSub>}
                  </div>
                </PickerRow>
              );
            })}
          </PickerList>
        </PickerBox>
      </PickerOverlay>

      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={customer => {
          setIsAddOpen(false);
          onSelect(customer);
          onClose();
        }}
        initialValues={initialValues}
      />
    </>
  );
};
