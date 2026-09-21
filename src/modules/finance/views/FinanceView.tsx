import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import type { FinanceTab, IncomeDocument, IncomeDocumentType } from '../types';

/** Kolejność zakładek = kolejność skrótów 1-4; whitelist dla wartości z adresu. */
const FINANCE_TABS: FinanceTab[] = ['income', 'expenses', 'cash', 'payment-summary'];
import type { ExpenseSource, ExpensePaymentStatus } from '../types';
import { useFinanceDocument } from '../hooks/useFinance';
import { useKsefExpenses, useBulkUpdateExpensesPaymentStatus } from '../hooks/useKsef';
import { useIncomeDocuments, useBulkUpdateIncomePaymentStatus } from '../hooks/useIncomeDocuments';
import {
  FinanceSummaryCards,
  CreateDocumentModal,
  EditDocumentModal,
  CashRegisterPanel,
  PaymentSummaryTab,
  KsefExpensesTable,
  KsefSyncWidget,
  AddExpenseModal,
  IncomeDocumentsTable,
  IssueInvoiceModal,
  RevenueInvoiceDetailModal,
  BulkPaymentStatusBar,
} from '../components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { monthHint, resolveDateRange, type DatePreset } from '../utils/dateRange';
import { PageHeader, PageHeaderPrimaryButton, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { PageContainer } from '@/common/components/PageContainer';
import { useDebounce, useRowSelection } from '@/common/hooks';
import { useToast } from '@/common/components/Toast';
import { incomeRowKey } from '../components/IncomeDocumentsTable';
import { describeBulkPaymentStatus } from '../utils/bulkPaymentStatus';
import type { BulkPaymentStatusResult, BulkPaymentStatusTarget, IncomeDocumentRef } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled(PageContainer)`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.xl};
  animation: ${fadeUp} 300ms ease both;
`;

// ─── Hero: wyciągnięty do PageHeader w common/components ─────────────────────

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

  @media (max-width: 639px) {
    display: none;
  }
`;

const TabSelect = styled.select`
  display: none;

  @media (max-width: 639px) {
    display: block;
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    color: ${(p) => p.theme.colors.text};
    background: ${(p) => p.theme.colors.surface};
    border: none;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
    padding-right: 40px;
    cursor: pointer;
  }
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

  @media (max-width: 639px) {
    padding: 10px 14px;
    font-size: 12px;
  }
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

/**
 * Resztka wolnego miejsca po tym, jak wypełni się pole wyszukiwania - dzięki niej
 * przełączniki trzymają się prawej krawędzi. Rośnie wolniej niż pole (grow 1 kontra 6),
 * więc na typowym ekranie miejsce dostaje najpierw wyszukiwarka, a separator dopiero
 * to, czego nie zdążyła wziąć przed swoim limitem szerokości.
 */
const FilterSeparator = styled.div`
  flex: 1 1 0;
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

/* Telefon: pasek narzędzi ma zmieścić dwa filtry i nic więcej. Przełączniki
   („Tylko podejrzane duplikaty", „Pokaż ukryte"), czyszczenie filtrów
   i odświeżanie chowają się pod trzema kropkami. */
/**
 * Przełączniki „Tylko podejrzane duplikaty" i „Pokaż ukryte" zjadają w pasku ~370 px.
 * Na wąskim laptopie zostawiały wyszukiwarce niecałe 290 px - pole podstawowe przegrywało
 * miejscem z dwoma rzadko używanymi wyjątkami. Poniżej 1200 px składają się więc do menu
 * „więcej" (tam, gdzie od zawsze idą na telefonie), a wyszukiwarka dostaje ich miejsce.
 * Żadna funkcja nie znika: kebab niesie te same przełączniki, odświeżanie i czyszczenie filtrów.
 */
const DesktopOnlyControls = styled.div`
  display: contents;

  @media (max-width: 1199px) {
    display: none;
  }
`;

const KebabWrap = styled.div`
  display: none;
  margin-left: auto;

  @media (max-width: 1199px) {
    display: block;
  }
`;

const KebabBtn = styled.button<{ $dot?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    right: 3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${st.accentBlue};
    display: ${(p) => (p.$dot ? 'block' : 'none')};
  }
`;

const KebabMenuRow = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: ${st.radiusSm};
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 500;
  color: ${st.textSecondary};
  text-align: left;
  cursor: pointer;

  &:hover { background: ${(p) => p.theme.colors.surfaceAlt}; color: ${st.text}; }
  svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const KebabIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
  </svg>
);

type ToolbarMenuItem =
  | { kind: 'toggle'; key: string; label: string; on: boolean; onSelect: () => void }
  | { kind: 'action'; key: string; label: string; icon?: React.ReactNode; onSelect: () => void };

/** Menu „trzy kropki" paska narzędzi tabeli - widoczne tylko na telefonie. */
const ToolbarKebab: React.FC<{ items: ToolbarMenuItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hasActiveToggle = items.some((i) => i.kind === 'toggle' && i.on);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setOpen((p) => !p);
  };

  return (
    <KebabWrap>
      {open && <SelectBackdrop onClick={() => setOpen(false)} />}
      <KebabBtn ref={btnRef} onClick={toggleOpen} $dot={hasActiveToggle} title="Więcej opcji" aria-label="Więcej opcji">
        <KebabIcon />
      </KebabBtn>
      {open && pos && createPortal(
        <SelectPanel style={{ top: pos.top, right: pos.right, minWidth: 230 }}>
          <SelectPanelBody>
            {items.map((item) => (
              <KebabMenuRow
                key={item.key}
                onClick={() => {
                  item.onSelect();
                  if (item.kind === 'action') setOpen(false);
                }}
              >
                {item.kind === 'toggle'
                  ? <ToggleTrack $on={item.on} />
                  : item.icon}
                {item.label}
              </KebabMenuRow>
            ))}
          </SelectPanelBody>
        </SelectPanel>,
        document.body
      )}
    </KebabWrap>
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

// ─── Search field ─────────────────────────────────────────────────────────────

/**
 * Dokument znajduje się po tym, co akurat ma się pod ręką: numerze z papieru, NIP-ie
 * z przelewu, nazwie kontrahenta, nazwie usługi z pozycji, numerze KSeF albo samej
 * kwocie. Dlatego jedno pole, a nie pięć osobnych filtrów - dopasowaniem zajmuje się
 * backend, więc szukanie obejmuje wszystkie dokumenty studia, nie tylko bieżącą stronę.
 *
 * Pole rośnie (`flex: 1`) i zabiera wolne miejsce, które wcześniej było pustym
 * odstępem między filtrami a przełącznikami. To nie kosmetyka: przy stałych 300 px
 * placeholder wypadał poza krawędź („Szukaj: nazwa, NIP, numer, pozycja, kwot…"),
 * czyli jedyna podpowiedź, po czym wolno szukać, była ucięta w połowie. Górny limit
 * trzyma pole w proporcji na szerokich ekranach, a [searchPlaceholder] dobiera
 * długość tekstu do tego, ile miejsca realnie zostaje.
 */
const SearchField = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 6 1 240px;
  min-width: 180px;
  max-width: 520px;

  /* Telefon: wyszukiwarka jest głównym narzędziem listy, więc bierze całą szerokość. */
  @media (max-width: 639px) {
    flex: 1 1 100%;
    max-width: none;
  }
`;

const SearchIconWrap = styled.span`
  position: absolute;
  left: 10px;
  display: flex;
  align-items: center;
  color: ${st.textMuted};
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 30px 6px 31px;
  font-family: inherit;
  font-size: ${st.fontSm};
  color: ${st.text};
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  transition: all ${st.transition};
  text-overflow: ellipsis;

  &::placeholder { color: ${st.textMuted}; }

  &:hover { border-color: ${st.borderHover}; }

  &:focus {
    outline: none;
    border-color: ${st.accentBlue}88;
    box-shadow: 0 0 0 3px ${st.accentBlueDim};
  }

  /* Natywny krzyżyk Safari/Chrome dublowałby własny przycisk czyszczenia. */
  &::-webkit-search-cancel-button { display: none; }

  /* iOS zoomuje widok przy focusie na polu mniejszym niż 16px. */
  @media (max-width: 639px) {
    font-size: 16px;
    padding: 9px 34px 9px 34px;
  }
`;

const SearchClearBtn = styled.button`
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: ${st.radiusFull};
  background: transparent;
  color: ${st.textMuted};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; color: ${st.text}; }

  @media (max-width: 639px) {
    right: 10px;
    width: 22px;
    height: 22px;
  }
`;

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ClearIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Pełna lista przeszukiwanych pól - jako tooltip i jako tekst pustego wyniku. */
const SEARCH_HINT = 'Szukaj po nazwie i NIP-ie kontrahenta, nazwach pozycji, numerze dokumentu, numerze KSeF i kwocie';

/**
 * Placeholder wymienia pola tylko wtedy, gdy cała lista naprawdę się mieści.
 *
 * Decyduje zmierzona szerokość pola, nie szerokość okna: to samo okno daje polu raz
 * 390 px, raz 290 px - zależnie od zwiniętego menu bocznego i od tego, ile miejsca
 * zabrały filtry. Pierwsza wersja zgadywała z media query i przy 1280 px dalej ucinała
 * tekst w połowie słowa („…numer, kw…"), co jest gorsze niż krótkie wezwanie: obiecuje
 * listę pól, a nie pokazuje żadnego. Progi mają zapas na wersaliki i szerszy font.
 */
const placeholderFor = (width: number): string => {
  if (width >= 400) return 'Szukaj: nazwa, NIP, numer, pozycja, kwota';
  if (width >= 330) return 'Szukaj: nazwa, NIP, numer, kwota';
  if (width >= 240) return 'Szukaj faktury lub kontrahenta';
  return 'Szukaj';
};

/** Aktualna szerokość elementu w px; 0 do pierwszego pomiaru. */
const useMeasuredWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

interface FilterSearchProps {
  value:    string;
  onChange: (value: string) => void;
  label:    string;
}

const FilterSearch: React.FC<FilterSearchProps> = ({ value, onChange, label }) => {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  return (
    <SearchField ref={ref}>
      <SearchIconWrap><SearchIcon /></SearchIconWrap>
      <SearchInput
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderFor(width)}
        title={SEARCH_HINT}
        aria-label={`${label}. ${SEARCH_HINT}`}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <SearchClearBtn onClick={() => onChange('')} title="Wyczyść wyszukiwanie" aria-label="Wyczyść wyszukiwanie">
          <ClearIcon />
        </SearchClearBtn>
      )}
    </SearchField>
  );
};

// ─── Pasek kontekstu wyszukiwania ─────────────────────────────────────────────

/**
 * Pojawia się wyłącznie przy aktywnej frazie i odpowiada na pytanie, które zadaje
 * sobie każdy szukający: „czy to już wszystko?". Bez niego lista po wpisaniu frazy
 * wygląda jak lista skrócona bez powodu - licznik u dołu pokazuje się dopiero przy
 * wielu stronach. Przy okazji daje wyjście jednym kliknięciem, bez celowania
 * w krzyżyk w polu.
 */
const SearchSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: ${st.accentBlueDim};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-size: ${st.fontSm};
  color: ${st.textSecondary};

  strong { color: ${st.text}; font-weight: 600; }

  @media (max-width: 639px) {
    padding: 8px 14px;
  }
`;

const SearchSummaryClear = styled.button`
  margin-left: auto;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: ${st.accentBlue};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover { text-decoration: underline; }
`;

const documentsCountLabel = (count: number): string => {
  if (count === 1) return '1 dokument';
  const rest = count % 10;
  const teens = count % 100;
  const few = rest >= 2 && rest <= 4 && !(teens >= 12 && teens <= 14);
  return `${count} ${few ? 'dokumenty' : 'dokumentów'}`;
};

interface SearchSummaryBarProps {
  term:    string;
  count:   number;
  onClear: () => void;
}

const SearchSummaryBar: React.FC<SearchSummaryBarProps> = ({ term, count, onClear }) => (
  <SearchSummary>
    <span>
      {count === 0 ? 'Brak wyników dla ' : `${documentsCountLabel(count)} dla `}
      <strong>„{term}"</strong>
    </span>
    <SearchSummaryClear onClick={onClear}>Wyczyść wyszukiwanie</SearchSummaryClear>
  </SearchSummary>
);

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

// ─── Header date picker (dark, portal-based) ──────────────────────────────────

const FinHdrActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  /* Telefon: trzy pełnowymiarowe przyciski zajmowały pół ekranu powitalnego.
     Zostaje jeden rząd - zakres dat i skrócone akcje. */
  @media (max-width: 639px) {
    width: 100%;
    gap: 6px;
    flex-wrap: nowrap;

    > button {
      padding: 7px 12px;
      font-size: 12.5px;
      gap: 5px;
      flex: 0 1 auto;
      min-width: 0;
    }
  }
`;

/** Pełna nazwa akcji na dużym ekranie, skrót na telefonie - bez dwóch drzewek JSX. */
const FullLabel = styled.span`
  @media (max-width: 639px) { display: none; }
`;

const ShortLabel = styled.span`
  display: none;
  @media (max-width: 639px) { display: inline; }
`;

const HdrPickerWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const HdrPickerTrigger = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  background: ${p => p.$active ? 'rgba(14, 165, 233, 0.22)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${p => p.$active ? '#7dd3fc' : '#e2e8f0'};
  border: 1px solid ${p => p.$active ? 'rgba(125, 211, 252, 0.45)' : 'rgba(255, 255, 255, 0.14)'};
  border-radius: 9999px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.3)' : 'rgba(255, 255, 255, 0.14)'};
    color: #fff;
  }
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

/* Pozycję (top/bottom/left/maxHeight) i widoczność nadaje positionPanel wprost na
   elemencie, po zmierzeniu go. Szerokość ograniczona do widoku, żeby na telefonie
   panel nie wyszedł poza ekran; nadmiar treści przewija się w środku. */
const HdrPickerPanel = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9000;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radius};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  width: 280px;
  max-width: calc(100vw - 16px);
  padding: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  visibility: hidden;
`;

interface FinHeaderDatePickerProps {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onChange: (preset: DatePreset, from: string, to: string) => void;
}

const FinHeaderDatePicker: React.FC<FinHeaderDatePickerProps> = ({ preset, customFrom, customTo, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Pozycję liczymy po zamontowaniu, z realnego rozmiaru panelu, i przycinamy do
  // widoku. Wcześniej brano zakodowane 240 px sprzed renderu: gdy natywne pola
  // type="date" rozpychały panel szerzej (telefon), lewa połowa uciekała za ekran.
  const positionPanel = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const MARGIN = 8;
    const panelW = panel.offsetWidth;
    // Prawa krawędź panelu przy prawej krawędzi triggera, ale obie krawędzie w widoku.
    const left = Math.max(MARGIN, Math.min(rect.right - panelW, vw - panelW - MARGIN));
    const panelH = panel.offsetHeight;
    const spaceBelow = vh - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    const openBelow = spaceBelow >= panelH || spaceBelow >= spaceAbove;
    const avail = openBelow ? spaceBelow : spaceAbove;
    panel.style.maxHeight = `${Math.max(200, Math.min(avail, 460))}px`;
    if (openBelow) {
      panel.style.top = `${rect.bottom + 6}px`;
      panel.style.bottom = 'auto';
    } else {
      panel.style.top = 'auto';
      panel.style.bottom = `${vh - rect.top + 6}px`;
    }
    panel.style.left = `${left}px`;
    panel.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    positionPanel();
    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('scroll', positionPanel);
    return () => {
      window.removeEventListener('scroll', positionPanel, true);
      window.removeEventListener('resize', positionPanel);
      window.visualViewport?.removeEventListener('resize', positionPanel);
      window.visualViewport?.removeEventListener('scroll', positionPanel);
    };
  }, [open, positionPanel]);

  const handleToggle = () => {
    if (!open) {
      setPendingFrom(customFrom);
      setPendingTo(customTo);
    }
    setOpen(p => !p);
  };

  const selectPreset = (p: Exclude<DatePreset, 'custom'>) => {
    onChange(p, '', '');
    setOpen(false);
  };

  const applyCustom = () => {
    onChange('custom', pendingFrom, pendingTo);
    setOpen(false);
  };

  const from = preset === 'custom' ? customFrom : undefined;
  const to   = preset === 'custom' ? customTo   : undefined;
  const label = formatPresetLabel(preset, from, to);
  const shortLabel = formatPresetLabelShort(preset, from, to);

  return (
    <HdrPickerWrap>
      <HdrPickerTrigger ref={triggerRef} $active={preset !== 'all'} onClick={handleToggle} title={label}>
        <CalendarIcon />
        <FullLabel>{label}</FullLabel>
        <ShortLabel>{shortLabel}</ShortLabel>
        <SmallChevron />
      </HdrPickerTrigger>

      {open && createPortal(
        <HdrPickerPanel ref={panelRef}>
          <DPPresetGroup>
            {([
              ['currentMonth', 'Bieżący miesiąc', monthHint()] as const,
              ['previousMonth', 'Poprzedni miesiąc', monthHint(-1)] as const,
              ['all',     'Cały czas',       ''] as const,
              ['week',    'Ostatni tydzień',  '7 dni'] as const,
              ['month',   'Ostatni miesiąc',  '30 dni'] as const,
              ['quarter', 'Ostatni kwartał',  '90 dni'] as const,
            ]).map(([id, lbl, hint]) => (
              <DPPresetBtn key={id} $active={preset === id} onClick={() => selectPreset(id)}>
                {lbl}
                {hint && <span className="hint">{hint}</span>}
                {preset === id && <SmallCheck />}
              </DPPresetBtn>
            ))}
          </DPPresetGroup>

          <DPDivider />
          <DPLabel>Niestandardowy zakres</DPLabel>

          <DPRangeRow>
            <DPDateInput type="date" value={pendingFrom} max={pendingTo || undefined} onChange={e => setPendingFrom(e.target.value)} />
            <DPSep>-</DPSep>
            <DPDateInput type="date" value={pendingTo} min={pendingFrom || undefined} onChange={e => setPendingTo(e.target.value)} />
          </DPRangeRow>

          <DPApplyBtn disabled={!pendingFrom && !pendingTo} onClick={applyCustom}>
            Zastosuj zakres
          </DPApplyBtn>
        </HdrPickerPanel>,
        document.body
      )}
    </HdrPickerWrap>
  );
};

// ─── Date range picker (filter strip, light) ──────────────────────────────────


const formatPresetLabel = (preset: DatePreset, customFrom?: string, customTo?: string): string => {
  if (preset === 'currentMonth') return 'Bieżący miesiąc';
  if (preset === 'previousMonth') return 'Poprzedni miesiąc';
  if (preset === 'all') return 'Cały czas';
  if (preset === 'week') return 'Ostatni tydzień';
  if (preset === 'month') return 'Ostatni miesiąc';
  if (preset === 'quarter') return 'Ostatni kwartał';
  if (customFrom && customTo) return `${customFrom} - ${customTo}`;
  if (customFrom) return `Od ${customFrom}`;
  if (customTo) return `Do ${customTo}`;
  return 'Zakres dat';
};

/** Telefon: w pigułce zakresu mieści się kilkanaście znaków, nie „Ostatni kwartał". */
const formatPresetLabelShort = (preset: DatePreset, customFrom?: string, customTo?: string): string => {
  if (preset === 'currentMonth') {
    const month = new Date().toLocaleDateString('pl-PL', { month: 'long' });
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
  if (preset === 'previousMonth') {
    const month = monthHint(-1).split(' ')[0];
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
  if (preset === 'all') return 'Cały czas';
  if (preset === 'week') return '7 dni';
  if (preset === 'month') return '30 dni';
  if (preset === 'quarter') return '90 dni';
  if (customFrom || customTo) return 'Zakres';
  return 'Zakres dat';
};

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SmallChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SmallCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DPPresetGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DPPresetBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 10px;
  background: ${(p) => p.$active ? '#eff6ff' : 'transparent'};
  color: ${(p) => p.$active ? st.accentBlue : st.text};
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: ${(p) => p.$active ? '600' : '500'};
  text-align: left;
  cursor: pointer;
  transition: background ${st.transition}, color ${st.transition};

  &:hover { background: ${(p) => p.$active ? '#dbeafe' : p.theme.colors.surfaceHover}; }

  span.hint { font-size: 11px; color: ${(p) => p.$active ? '#7dd3fc' : st.textMuted}; font-weight: 400; }
`;

const DPDivider = styled.div`
  height: 1px;
  background: ${(p) => p.theme.colors.border};
  margin: 6px 0;
`;

const DPLabel = styled.div`
  padding: 2px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DPRangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 2px;
`;

const DPDateInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  color: ${st.text};
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color ${st.transition};
  &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

const DPApplyBtn = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 7px 10px;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  transition: background ${st.transition};
  &:hover { background: #2563eb; }
  &:disabled { background: #94a3b8; cursor: not-allowed; }
`;

const DPSep = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
  flex-shrink: 0;
`;

// ─── Dokumenty przychodowe (KSeF + moduł finansowy) ──────────────────────────

const PAGE_SIZE = 20;

interface IncomeFilters {
  documentType:  string;
  paymentStatus: string;
  duplicates:    boolean;
  search:        string;
  page:          number;
}

const EMPTY_INCOME_FILTERS: IncomeFilters = {
  documentType: '', paymentStatus: '', duplicates: false, search: '', page: 1,
};

/** Pisanie we frazie nie może wysyłać zapytania na każdą literę. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Wspólna obsługa wyniku operacji grupowej. Ten sam komunikat na obu zakładkach,
 * bo z punktu widzenia użytkownika to ta sama czynność - tylko lista inna.
 *
 * Zaznaczenie czyścimy wyłącznie wtedy, gdy coś faktycznie się zmieniło: gdy nic
 * nie przeszło (np. same opłacone dokumenty przy cofaniu), zostawiamy zaznaczenie,
 * żeby dało się od razu kliknąć drugą akcję zamiast zaznaczać wszystko od nowa.
 */
const useBulkPaymentStatusFeedback = (clearSelection: () => void) => {
  const { showSuccess, showInfo } = useToast();

  return useCallback(
    (result: BulkPaymentStatusResult, target: BulkPaymentStatusTarget) => {
      const message = describeBulkPaymentStatus(result, target);
      if (message.nothingChanged) {
        showInfo(message.title, message.detail);
        return;
      }
      showSuccess(message.title, message.detail);
      clearSelection();
    },
    [clearSelection, showInfo, showSuccess]
  );
};

interface IncomeTabContentProps {
  activeDateRange: { dateFrom?: string; dateTo?: string };
  onSelect: (document: IncomeDocument) => void;
}

/**
 * Jedna lista wszystkich dokumentów przychodowych: faktury i korekty z ledgera
 * KSeF (wystawione w CRM oraz pobrane z KSeF) razem z paragonami i dokumentami
 * „inne" z modułu finansowego.
 */
const IncomeTabContent: React.FC<IncomeTabContentProps> = ({ activeDateRange, onSelect }) => {
  const [filters, setFilters] = useState<IncomeFilters>(EMPTY_INCOME_FILTERS);
  const [showExcluded, setShowExcluded] = useState(false);
  const searchTerm = useDebounce(filters.search.trim(), SEARCH_DEBOUNCE_MS);

  const { documents, total, isLoading, isError, refetch } = useIncomeDocuments({
    documentType:  (filters.documentType  as IncomeDocumentType) || undefined,
    paymentStatus: (filters.paymentStatus as 'PAID' | 'PENDING' | 'OVERDUE') || undefined,
    dateFrom:        activeDateRange.dateFrom,
    dateTo:          activeDateRange.dateTo,
    includeExcluded: showExcluded || undefined,
    search:          searchTerm || undefined,
    page:            filters.page,
    pageSize:        PAGE_SIZE,
  });

  // Podejrzane duplikaty dotyczą wyłącznie faktur z ledgera KSeF, filtr działa
  // po stronie klienta, bo to zawężenie widoku, nie osobne zapytanie
  const visibleDocuments = useMemo(
    () => (filters.duplicates ? documents.filter((doc) => doc.duplicateStatus === 'SUSPECTED') : documents),
    [documents, filters.duplicates]
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.documentType || filters.paymentStatus || filters.duplicates || filters.search);
  const setFilter  = <K extends keyof IncomeFilters>(key: K, value: IncomeFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  // Zaznaczenie zawsze dotyczy wierszy widocznych TERAZ - zmiana filtra albo strony
  // wyrzuca z niego to, czego użytkownik już nie widzi (useRowSelection).
  const selection = useRowSelection(useMemo(() => visibleDocuments.map(incomeRowKey), [visibleDocuments]));
  const bulkStatus = useBulkUpdateIncomePaymentStatus();
  const reportBulkResult = useBulkPaymentStatusFeedback(selection.clear);

  const applyBulkStatus = (paymentStatus: BulkPaymentStatusTarget) => {
    const documents: IncomeDocumentRef[] = selection.selected.map((key) => {
      const [sourceKind, id] = key.split(':');
      return { sourceKind: sourceKind as IncomeDocumentRef['sourceKind'], id };
    });
    bulkStatus.mutate(
      { documents, paymentStatus },
      { onSuccess: (result) => reportBulkResult(result, paymentStatus) }
    );
  };

  return (
    <>
      <KsefSyncWidget />

      <FiltersStrip>
        <FilterSearch
          value={filters.search}
          onChange={(val) => setFilter('search', val)}
          label="Szukaj dokumentu przychodowego"
        />
        <FilterSelect
          value={filters.documentType}
          onChange={(val) => setFilter('documentType', val)}
          options={[
            { value: 'INVOICE',    label: 'Faktury' },
            { value: 'CORRECTION', label: 'Korekty' },
            { value: 'RECEIPT',    label: 'Paragony' },
            { value: 'OTHER',      label: 'Inne dokumenty' },
          ]}
          placeholder="Wszystkie typy"
        />
        <FilterSelect
          value={filters.paymentStatus}
          onChange={(val) => setFilter('paymentStatus', val)}
          options={[
            { value: 'PAID',    label: 'Opłacone' },
            { value: 'PENDING', label: 'Oczekujące' },
            { value: 'OVERDUE', label: 'Przeterminowane' },
          ]}
          placeholder="Wszystkie statusy"
        />
        <DesktopOnlyControls>
          <FilterSeparator />
          {hasFilters && (
            <ClearFiltersBtn onClick={() => setFilters(EMPTY_INCOME_FILTERS)}>
              Wyczyść filtry
            </ClearFiltersBtn>
          )}
          <ToggleLabel>
            <ToggleTrack $on={filters.duplicates} />
            <ToggleText>Tylko podejrzane duplikaty</ToggleText>
            <input
              type="checkbox"
              checked={filters.duplicates}
              onChange={(e) => setFilter('duplicates', e.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
          </ToggleLabel>
          <ToggleLabel>
            <ToggleTrack $on={showExcluded} />
            <ToggleText>Pokaż ukryte</ToggleText>
            <input
              type="checkbox"
              checked={showExcluded}
              onChange={(e) => { setShowExcluded(e.target.checked); setFilters((p) => ({ ...p, page: 1 })); }}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
          </ToggleLabel>
          <RefreshBtn onClick={() => refetch()} title="Odśwież">
            <RefreshIcon />
          </RefreshBtn>
        </DesktopOnlyControls>

        <ToolbarKebab
          items={[
            { kind: 'toggle', key: 'dup', label: 'Tylko podejrzane duplikaty', on: filters.duplicates,
              onSelect: () => setFilter('duplicates', !filters.duplicates) },
            { kind: 'toggle', key: 'excluded', label: 'Pokaż ukryte', on: showExcluded,
              onSelect: () => { setShowExcluded(!showExcluded); setFilters((p) => ({ ...p, page: 1 })); } },
            ...(hasFilters ? [{ kind: 'action' as const, key: 'clear', label: 'Wyczyść filtry',
              onSelect: () => setFilters(EMPTY_INCOME_FILTERS) }] : []),
            { kind: 'action', key: 'refresh', label: 'Odśwież', icon: <RefreshIcon />, onSelect: () => refetch() },
          ]}
        />
      </FiltersStrip>

      {searchTerm && !isLoading && !isError && (
        <SearchSummaryBar
          term={searchTerm}
          count={visibleDocuments.length}
          onClear={() => setFilter('search', '')}
        />
      )}

      <BulkPaymentStatusBar
        count={selection.count}
        busy={bulkStatus.isPending}
        onApply={applyBulkStatus}
        onClear={selection.clear}
      />

      {isError ? (
        <InlineError>
          Nie udało się załadować dokumentów przychodowych.
          <br />
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </InlineError>
      ) : (
        <IncomeDocumentsTable
          documents={visibleDocuments}
          isLoading={isLoading}
          onSelect={onSelect}
          searchTerm={searchTerm}
          selection={selection}
        />
      )}

      {totalPages > 1 && (
        <PaginationFooter>
          <PaginationInfo>
            Wyświetlanie {(filters.page - 1) * PAGE_SIZE + 1}-{Math.min(filters.page * PAGE_SIZE, total)} z {total}
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
  search:        string;
  page:          number;
}

const EMPTY_EXPENSE_FILTERS: ExpenseFilters = {
  source: '', paymentStatus: '', search: '', page: 1,
};

interface ExpensesTabContentProps {
  activeDateRange: { dateFrom?: string; dateTo?: string };
}

const ExpensesTabContent: React.FC<ExpensesTabContentProps> = ({ activeDateRange }) => {
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_EXPENSE_FILTERS);
  const [showExcluded, setShowExcluded] = useState(false);
  const searchTerm = useDebounce(filters.search.trim(), SEARCH_DEBOUNCE_MS);

  const { expenses, total, isLoading, isError, refetch } = useKsefExpenses({
    source:          (filters.source        as ExpenseSource)        || undefined,
    paymentStatus:   (filters.paymentStatus as ExpensePaymentStatus) || undefined,
    dateFrom:        activeDateRange.dateFrom,
    dateTo:          activeDateRange.dateTo,
    includeExcluded: showExcluded      || undefined,
    search:          searchTerm || undefined,
    page:            filters.page,
    pageSize:        PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.source || filters.paymentStatus || filters.search);
  const setFilter  = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const selection = useRowSelection(useMemo(() => expenses.map((exp) => exp.id), [expenses]));
  const bulkStatus = useBulkUpdateExpensesPaymentStatus();
  const reportBulkResult = useBulkPaymentStatusFeedback(selection.clear);

  const applyBulkStatus = (paymentStatus: BulkPaymentStatusTarget) => {
    bulkStatus.mutate(
      { ids: selection.selected, paymentStatus },
      { onSuccess: (result) => reportBulkResult(result, paymentStatus) }
    );
  };

  return (
    <>
      <KsefSyncWidget />

      <FiltersStrip>
        <FilterSearch
          value={filters.search}
          onChange={(val) => setFilter('search', val)}
          label="Szukaj dokumentu kosztowego"
        />
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
        <DesktopOnlyControls>
          <FilterSeparator />
          {hasFilters && (
            <ClearFiltersBtn onClick={() => setFilters(EMPTY_EXPENSE_FILTERS)}>
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
        </DesktopOnlyControls>

        <ToolbarKebab
          items={[
            { kind: 'toggle', key: 'excluded', label: 'Pokaż ukryte', on: showExcluded,
              onSelect: () => setShowExcluded(!showExcluded) },
            ...(hasFilters ? [{ kind: 'action' as const, key: 'clear', label: 'Wyczyść filtry',
              onSelect: () => setFilters(EMPTY_EXPENSE_FILTERS) }] : []),
            { kind: 'action', key: 'refresh', label: 'Odśwież', icon: <RefreshIcon />, onSelect: () => refetch() },
          ]}
        />
      </FiltersStrip>

      {searchTerm && !isLoading && !isError && (
        <SearchSummaryBar
          term={searchTerm}
          count={total}
          onClear={() => setFilter('search', '')}
        />
      )}

      <BulkPaymentStatusBar
        count={selection.count}
        busy={bulkStatus.isPending}
        onApply={applyBulkStatus}
        onClear={selection.clear}
      />

      {isError ? (
        <InlineError>
          Nie udało się załadować faktur kosztowych.
          <br />
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </InlineError>
      ) : (
        <KsefExpensesTable
          expenses={expenses}
          isLoading={isLoading}
          searchTerm={searchTerm}
          selection={selection}
        />
      )}

      {totalPages > 1 && (
        <PaginationFooter>
          <PaginationInfo>
            Wyświetlanie {(filters.page - 1) * PAGE_SIZE + 1}-{Math.min(filters.page * PAGE_SIZE, total)} z {total}
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
  /**
   * Zakładka mieszka w adresie (?tab=...), nie w stanie komponentu. Dzięki temu da
   * się do niej podlinkować, przeżywa odświeżenie i przycisk Wstecz, a skróty
   * klawiszowe 1-4 po prostu nawigują, zamiast sięgać do cudzego stanu.
   * Nieznana albo brakująca wartość spada na „income" - adres z literówką pokazuje
   * pierwszą zakładkę zamiast pustego panelu.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as FinanceTab | null;
  const activeTab: FinanceTab = tabParam && FINANCE_TABS.includes(tabParam) ? tabParam : 'income';
  const setActiveTab = useCallback((tab: FinanceTab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isIssueInvoiceModalOpen, setIssueInvoiceModalOpen] = useState(false);
  const [selectedRevenueInvoiceId, setSelectedRevenueInvoiceId] = useState<string | null>(null);
  // Dokument z modułu finansowego (paragon / inny) wybrany do podglądu i edycji;
  // pełne dane dociągamy po id, bo lista zwraca tylko wspólny podzbiór pól
  const [selectedFinanceDocumentId, setSelectedFinanceDocumentId] = useState<string | null>(null);
  const { document: selectedFinanceDocument } = useFinanceDocument(selectedFinanceDocumentId ?? undefined);
  // Domyślnie bieżący miesiąc: rozliczenia prowadzi się miesiącami, a widok „cały czas"
  // kazał przy każdym wejściu przewijać dokumenty sprzed lat, żeby dojść do tych aktualnych.
  const [datePreset, setDatePreset]       = useState<DatePreset>('currentMonth');
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');

  const activeDateRange = resolveDateRange(datePreset, customFrom, customTo);

  const openIncomeModal  = useCallback(() => setIncomeModalOpen(true),  []);
  const closeIncomeModal = useCallback(() => setIncomeModalOpen(false), []);
  /** Szczegóły zależą od źródła: faktura KSeF ma własny widok, dokument finansowy - edycję. */
  const handleSelectDocument = useCallback((doc: IncomeDocument) => {
    if (doc.sourceKind === 'KSEF') setSelectedRevenueInvoiceId(doc.id);
    else setSelectedFinanceDocumentId(doc.id);
  }, []);
  const closeEditModal = useCallback(() => setSelectedFinanceDocumentId(null), []);
  const openExpenseModal  = useCallback(() => setExpenseModalOpen(true),  []);
  const closeExpenseModal = useCallback(() => setExpenseModalOpen(false), []);

  const handleDateChange = (preset: DatePreset, from: string, to: string) => {
    setDatePreset(preset);
    setCustomFrom(from);
    setCustomTo(to);
  };

  return (
    <ViewContainer>
      <PageHeader
        title="Finanse"
        subtitle="Dokumenty przychodowe, koszty KSeF i raporty"
        actions={
          <FinHdrActions>
            {/*
              * Zakładka „Podsumowanie płatności" ma własny wybór zakresu w pasku
              * nad tabelą i steruje tym samym stanem co ten wybierak. Dwa widoczne
              * naraz pokazywały ten sam zakres w dwóch miejscach i kazały zgadywać,
              * który z nich rządzi - zostaje ten bliżej danych.
              */}
            {activeTab !== 'payment-summary' && (
              <FinHeaderDatePicker
                preset={datePreset}
                customFrom={customFrom}
                customTo={customTo}
                onChange={handleDateChange}
              />
            )}
            {activeTab === 'income' && (
              <>
                <PageHeaderGhostButton onClick={openIncomeModal} title="Dodaj paragon">
                  <PlusIcon />
                  <FullLabel>Dodaj paragon</FullLabel>
                  <ShortLabel>Paragon</ShortLabel>
                </PageHeaderGhostButton>
                <PageHeaderPrimaryButton onClick={() => setIssueInvoiceModalOpen(true)} title="Wystaw fakturę (KSeF)">
                  <PlusIcon />
                  <FullLabel>Wystaw fakturę (KSeF)</FullLabel>
                  <ShortLabel>Faktura</ShortLabel>
                </PageHeaderPrimaryButton>
              </>
            )}
            {activeTab === 'expenses' && (
              <PageHeaderPrimaryButton onClick={openExpenseModal} title="Dodaj fakturę ręcznie">
                <PlusIcon />
                <FullLabel>Dodaj fakturę ręcznie</FullLabel>
                <ShortLabel>Koszt</ShortLabel>
              </PageHeaderPrimaryButton>
            )}
          </FinHdrActions>
        }
      />

      <div>
        <SectionLabel>
          <SectionLabelText>Podsumowanie finansowe</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        {/* Kafle pokazują ten sam zakres co zakładka pod nimi - inaczej „Przychody"
            nad tabelą filtrowaną do jednego miesiąca dotyczyły czegoś innego niż tabela. */}
        <FinanceSummaryCards dateFrom={activeDateRange.dateFrom} dateTo={activeDateRange.dateTo} />
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
          <TabSelect value={activeTab} onChange={e => setActiveTab(e.target.value as FinanceTab)}>
            <option value="income">Dokumenty przychodowe</option>
            <option value="expenses">Dokumenty kosztowe</option>
            <option value="cash">Kasa</option>
            <option value="payment-summary">Podsumowanie płatności</option>
          </TabSelect>

          {activeTab === 'income' && (
            <IncomeTabContent activeDateRange={activeDateRange} onSelect={handleSelectDocument} />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTabContent activeDateRange={activeDateRange} />
          )}
          {activeTab === 'cash' && (
            <CashRegisterPanel
              dateFrom={activeDateRange.dateFrom}
              dateTo={activeDateRange.dateTo}
            />
          )}
          {activeTab === 'payment-summary' && (
            <PaymentSummaryTab
              preset={datePreset}
              customFrom={customFrom}
              customTo={customTo}
              onDateChange={handleDateChange}
            />
          )}
        </PanelCard>
      </div>

      <CreateDocumentModal isOpen={isIncomeModalOpen} onClose={closeIncomeModal} />
      <AddExpenseModal     isOpen={isExpenseModalOpen} onClose={closeExpenseModal} />
      <EditDocumentModal   document={selectedFinanceDocument ?? null} onClose={closeEditModal} />
      <IssueInvoiceModal
        isOpen={isIssueInvoiceModalOpen}
        onClose={() => setIssueInvoiceModalOpen(false)}
      />
      <RevenueInvoiceDetailModal
        invoiceId={selectedRevenueInvoiceId}
        onClose={() => setSelectedRevenueInvoiceId(null)}
      />
    </ViewContainer>
  );
};
