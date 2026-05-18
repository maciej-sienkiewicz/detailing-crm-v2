import { useState, useEffect, useRef } from 'react';
import { Archive, Search, ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react';
import styled from 'styled-components';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalSubtitle,
  ModalContent,
  CloseBtn,
} from '@/common/components/ModalKit';
import { useTaskArchive } from '../hooks/useTaskArchive';

// ─── Styled ───────────────────────────────────────────────────────────────────

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #64748b;
  svg { width: 20px; height: 20px; }
`;

const SearchRow = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  align-items: center;
  svg { width: 15px; height: 15px; }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 9px 14px 9px 36px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.15);
  }

  &::placeholder { color: #94a3b8; }
`;

const ArchiveList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ArchiveItem = styled.div`
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fafafa;
`;

const ItemTitle = styled.div<{ $done: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.$done ? '#94a3b8' : '#0f172a'};
  text-decoration: ${p => p.$done ? 'line-through' : 'none'};
  margin-bottom: 4px;
`;

const ItemMeta = styled.div`
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 8px;
`;

const ItemTimestamps = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Stamp = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;

  svg { width: 11px; height: 11px; flex-shrink: 0; }
`;

const DoneBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #10b981;
  background: #ecfdf5;
  border-radius: 5px;
  padding: 2px 6px;
  margin-left: 6px;
  vertical-align: middle;
  svg { width: 10px; height: 10px; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 24px;
  color: #94a3b8;
  text-align: center;
  font-size: 13px;
`;

const SkeletonItem = styled.div`
  border-radius: 10px;
  padding: 12px 14px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Skeleton = styled.div<{ $w: string; $h?: string }>`
  width: ${p => p.$w};
  height: ${p => p.$h ?? '12px'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  margin-top: 16px;
`;

const PaginationInfo = styled.span`
  font-size: 12px;
  color: #64748b;
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 4px;
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  color: ${p => p.$disabled ? '#cbd5e1' : '#374151'};
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 120ms ease;

  &:hover:not([disabled]) { background: #f8fafc; }
  svg { width: 14px; height: 14px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskArchiveModal = ({ isOpen, onClose }: Props) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { items, pagination, isLoading } = useTaskArchive(page, debouncedSearch);

  useEffect(() => {
    if (!isOpen) {
      setPage(1);
      setSearch('');
      setDebouncedSearch('');
    }
  }, [isOpen]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <IconWrap>
          <Archive />
        </IconWrap>
        <ModalTitleGroup>
          <ModalTitle>Archiwum zadań</ModalTitle>
          <ModalSubtitle>Historia usuniętych zadań z datami i autorem usunięcia.</ModalSubtitle>
        </ModalTitleGroup>
        <CloseBtn onClick={onClose} aria-label="Zamknij" />
      </ModalHeader>

      <ModalContent>
        <SearchRow>
          <SearchIcon><Search /></SearchIcon>
          <SearchInput
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Szukaj po tytule…"
          />
        </SearchRow>

        {isLoading ? (
          <ArchiveList>
            {[75, 55, 65].map(w => (
              <SkeletonItem key={w}>
                <Skeleton $w={`${w}%`} $h="13px" />
                <Skeleton $w="40%" />
                <Skeleton $w="60%" />
              </SkeletonItem>
            ))}
          </ArchiveList>
        ) : items.length === 0 ? (
          <EmptyState>
            <Archive size={32} strokeWidth={1.5} />
            {debouncedSearch ? 'Brak wyników dla podanej frazy.' : 'Archiwum jest puste.'}
          </EmptyState>
        ) : (
          <ArchiveList>
            {items.map(item => (
              <ArchiveItem key={item.id}>
                <ItemTitle $done={item.done}>
                  {item.title}
                  {item.done && (
                    <DoneBadge><Check />Wykonane</DoneBadge>
                  )}
                </ItemTitle>
                {item.meta && <ItemMeta>{item.meta}</ItemMeta>}
                <ItemTimestamps>
                  <Stamp>
                    <Clock />
                    Dodano: {fmt(item.createdAt)}
                  </Stamp>
                  {item.completedAt && (
                    <Stamp>
                      <Check />
                      Wykonano: {fmt(item.completedAt)}
                    </Stamp>
                  )}
                  <Stamp>
                    <Archive size={11} />
                    Usunięto: {fmt(item.deletedAt)} przez {item.deletedByUserName}
                  </Stamp>
                </ItemTimestamps>
              </ArchiveItem>
            ))}
          </ArchiveList>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationInfo>
              {pagination.total} {pagination.total === 1 ? 'zadanie' : 'zadań'} · strona {pagination.page} z {pagination.totalPages}
            </PaginationInfo>
            <PaginationBtns>
              <PageBtn
                $disabled={page === 1}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                aria-label="Poprzednia strona"
              >
                <ChevronLeft />
              </PageBtn>
              <PageBtn
                $disabled={page >= pagination.totalPages}
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                aria-label="Następna strona"
              >
                <ChevronRight />
              </PageBtn>
            </PaginationBtns>
          </Pagination>
        )}
      </ModalContent>
    </ModalShell>
  );
};
