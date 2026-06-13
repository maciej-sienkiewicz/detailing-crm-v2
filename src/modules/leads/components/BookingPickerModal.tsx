// src/modules/leads/components/BookingPickerModal.tsx
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Search, X, Calendar, Wrench, Link2Off } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { operationApi } from '@/modules/operations/api/operationApi';
import type { Operation } from '@/modules/operations/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
`;

const Panel = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.18);
  width: 560px;
  max-width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px 20px 0;
  flex-shrink: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${st.text};
  margin: 0;
`;

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: #e2e8f0; }
  svg { width: 14px; height: 14px; }
`;

const SearchWrap = styled.div`
  position: relative;
  margin-bottom: 12px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: ${st.textMuted};
  display: flex;
  align-items: center;
  svg { width: 14px; height: 14px; }
`;

const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px 9px 34px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 10px;
  background: #f8fafc;
  color: ${st.text};
  outline: none;
  transition: border-color 150ms;
  &:focus { border-color: #0ea5e9; background: #fff; }
  &::placeholder { color: ${st.textMuted}; }
`;

const List = styled.div`
  overflow-y: auto;
  padding: 8px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Item = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid ${st.border};
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 150ms;
  &:hover { border-color: #0ea5e9; background: #f0f9ff; }
  svg { flex-shrink: 0; color: #64748b; width: 16px; height: 16px; }
`;

const ItemIcon = styled.div<{ $type: 'RESERVATION' | 'VISIT' }>`
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => p.$type === 'RESERVATION' ? '#eff6ff' : '#f0fdf4'};
  color: ${p => p.$type === 'RESERVATION' ? '#2563eb' : '#16a34a'};
  svg { width: 16px; height: 16px; }
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemMain = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemDate = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${st.textSecondary};
  white-space: nowrap;
  flex-shrink: 0;
`;

const EmptyMsg = styled.div`
  padding: 32px;
  text-align: center;
  color: ${st.textMuted};
  font-size: 13px;
`;

const UnlinkRow = styled.div`
  padding: 8px 12px 0;
  border-bottom: 1px solid ${st.border};
  margin-bottom: 4px;
`;

const UnlinkBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 150ms;
  &:hover { background: #fee2e2; }
  svg { width: 14px; height: 14px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })
      .format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type PickerMode = 'appointment' | 'visit';

interface BookingPickerModalProps {
  isOpen: boolean;
  mode: PickerMode;
  hasLinked: boolean;
  onClose: () => void;
  onSelect: (item: Operation) => void;
  onUnlink: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BookingPickerModal: React.FC<BookingPickerModalProps> = ({
  isOpen,
  mode,
  hasLinked,
  onClose,
  onSelect,
  onUnlink,
}) => {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['booking-picker', mode, search],
    queryFn: () => operationApi.getOperations({
      search,
      page: 1,
      limit: 50,
      type: mode === 'appointment' ? 'RESERVATION' : 'VISIT',
    }),
    enabled: isOpen,
    staleTime: 30_000,
  });

  const items: Operation[] = data?.data ?? [];

  const handleSelect = useCallback((item: Operation) => {
    onSelect(item);
    setSearch('');
  }, [onSelect]);

  const handleClose = useCallback(() => {
    onClose();
    setSearch('');
  }, [onClose]);

  if (!isOpen) return null;

  const title = mode === 'appointment' ? 'Przypisz rezerwację' : 'Przypisz wizytę';

  return (
    <Overlay onClick={handleClose}>
      <Panel onClick={e => e.stopPropagation()}>
        <Header>
          <TitleRow>
            <Title>{title}</Title>
            <CloseBtn onClick={handleClose}><X /></CloseBtn>
          </TitleRow>
          <SearchWrap>
            <SearchIcon><Search /></SearchIcon>
            <SearchInput
              autoFocus
              placeholder="Szukaj po kliencie, pojeździe…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </SearchWrap>
        </Header>

        <List>
          {hasLinked && (
            <UnlinkRow>
              <UnlinkBtn onClick={() => { onUnlink(); setSearch(''); }}>
                <Link2Off /> Odepnij przypisanie
              </UnlinkBtn>
            </UnlinkRow>
          )}

          {isLoading && <EmptyMsg>Ładowanie…</EmptyMsg>}
          {!isLoading && items.length === 0 && (
            <EmptyMsg>Brak wyników{search ? ` dla „${search}"` : ''}</EmptyMsg>
          )}
          {items.map(item => {
            const name = [item.customerFirstName, item.customerLastName].filter(Boolean).join(' ') || '—';
            const vehicle = item.vehicle
              ? `${item.vehicle.brand} ${item.vehicle.model}`.trim()
              : '—';
            return (
              <Item key={item.id} onClick={() => handleSelect(item)}>
                <ItemIcon $type={item.type}>
                  {item.type === 'RESERVATION' ? <Calendar /> : <Wrench />}
                </ItemIcon>
                <ItemInfo>
                  <ItemMain>{vehicle}</ItemMain>
                  <ItemSub>{name}{item.customerPhone ? ` · ${item.customerPhone}` : ''}</ItemSub>
                </ItemInfo>
                <ItemDate>{formatDate(item.startDateTime)}</ItemDate>
              </Item>
            );
          })}
        </List>
      </Panel>
    </Overlay>
  );
};
