import { useState, useEffect, useRef } from 'react';
import { Archive, Search, ChevronLeft, ChevronRight, Plus, CheckCircle2, Trash2 } from 'lucide-react';
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
import type { ArchivedTask } from '../types';

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
  margin-bottom: 14px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  align-items: center;
  svg { width: 14px; height: 14px; }
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

const Card = styled.div<{ $done: boolean }>`
  border: 1px solid #e2e8f0;
  border-left: 3px solid ${p => p.$done ? '#10b981' : '#cbd5e1'};
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
`;

const CardTop = styled.div`
  padding: 12px 14px 10px;
`;

const CardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 3px;
`;

const CardMeta = styled.div`
  font-size: 11px;
  color: #94a3b8;
`;

const Timeline = styled.div`
  display: flex;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
`;

const TimelineStep = styled.div<{ $active?: boolean; $accent?: string }>`
  flex: 1;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;

  & + & {
    border-left: 1px solid #f1f5f9;
  }
`;

const StepLabel = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: ${p => p.$color};
  text-transform: uppercase;
  letter-spacing: 0.4px;

  svg { width: 10px; height: 10px; flex-shrink: 0; }
`;

const StepDate = styled.div`
  font-size: 11px;
  color: #374151;
  font-weight: 500;
`;

const StepUser = styled.div`
  font-size: 11px;
  color: #64748b;
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
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  overflow: hidden;
`;

const SkeletonTop = styled.div`
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SkeletonBottom = styled.div`
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
  padding: 8px 14px;
  display: flex;
  gap: 20px;
`;

const Skeleton = styled.div<{ $w: string; $h?: string }>`
  width: ${p => p.$w};
  height: ${p => p.$h ?? '11px'};
  border-radius: 4px;
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
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  margin-top: 14px;
`;

const PaginationInfo = styled.span`
  font-size: 12px;
  color: #64748b;
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 4px;
`;

const PageBtn = styled.button`
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 120ms ease;

  &:hover:not(:disabled) { background: #f8fafc; }
  &:disabled { color: #cbd5e1; cursor: not-allowed; }
  svg { width: 14px; height: 14px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

// ─── Sub-component ────────────────────────────────────────────────────────────

const ArchiveCard = ({ item }: { item: ArchivedTask }) => (
  <Card $done={item.done}>
    <CardTop>
      <CardTitle>{item.title}</CardTitle>
      {item.meta && <CardMeta>{item.meta}</CardMeta>}
    </CardTop>

    <Timeline>
      <TimelineStep>
        <StepLabel $color="#64748b">
          <Plus />
          Dodane
        </StepLabel>
        <StepDate>{fmtDate(item.createdAt)}, {fmtTime(item.createdAt)}</StepDate>
      </TimelineStep>

      {item.done && item.completedAt ? (
        <TimelineStep>
          <StepLabel $color="#10b981">
            <CheckCircle2 />
            Wykonane
          </StepLabel>
          <StepDate>{fmtDate(item.completedAt)}, {fmtTime(item.completedAt)}</StepDate>
          {item.completedByUserName && <StepUser>{item.completedByUserName}</StepUser>}
        </TimelineStep>
      ) : (
        <TimelineStep>
          <StepLabel $color="#94a3b8">
            <CheckCircle2 />
            Niewykonane
          </StepLabel>
        </TimelineStep>
      )}

      <TimelineStep>
        <StepLabel $color="#f97316">
          <Trash2 />
          Usunięte
        </StepLabel>
        <StepDate>{fmtDate(item.deletedAt)}, {fmtTime(item.deletedAt)}</StepDate>
        <StepUser>{item.deletedByUserName}</StepUser>
      </TimelineStep>
    </Timeline>
  </Card>
);

// ─── Main component ───────────────────────────────────────────────────────────

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
          <ModalSubtitle>Historia usuniętych zadań z pełną ścieżką zdarzeń.</ModalSubtitle>
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
                <SkeletonTop>
                  <Skeleton $w={`${w}%`} $h="13px" />
                  <Skeleton $w="35%" />
                </SkeletonTop>
                <SkeletonBottom>
                  <Skeleton $w="25%" />
                  <Skeleton $w="25%" />
                  <Skeleton $w="25%" />
                </SkeletonBottom>
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
            {items.map(item => <ArchiveCard key={item.id} item={item} />)}
          </ArchiveList>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationInfo>
              {pagination.total} {pagination.total === 1 ? 'zadanie' : 'zadań'} · strona {pagination.page} z {pagination.totalPages}
            </PaginationInfo>
            <PaginationBtns>
              <PageBtn
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                aria-label="Poprzednia strona"
              >
                <ChevronLeft />
              </PageBtn>
              <PageBtn
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
