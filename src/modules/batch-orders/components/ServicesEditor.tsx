// src/modules/batch-orders/components/ServicesEditor.tsx
//
// Pozycje wpisu: nazwa z podpowiedzią z katalogu modułu + netto / brutto / VAT.
// Wyjęte z dawnego EntryFormModal bez zmiany zachowania cen:
//   - netto liczy brutto, brutto liczy netto - tymi samymi funkcjami co edytor wizyty,
//   - zmiana VAT zachowuje stronę wpisaną przez człowieka (CLAUDE.md §1),
//   - pozycja z katalogu przynosi DOKŁADNĄ parę netto/brutto z katalogu.

import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Plus, Trash2 } from 'lucide-react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { formatCurrency } from '@/common/utils';
import { InputShell, BareInput, Select } from '@/common/components/Form';
import { MAX_2_DECIMALS, centsToInput, inputToCents, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import { priceInputsForVatRate, storedPriceSide } from '@/common/utils/priceInputs';
import { useVisualViewportSheet } from '@/common/hooks';
import { useBatchServices } from '../hooks/useBatchOrders';
import type { BatchService } from '../types';
import { emptyService, type ServiceFormItem } from '../utils/entryForm';

const VAT_OPTIONS = [
    { label: '23%', value: 23 },
    { label: '8%', value: 8 },
    { label: '5%', value: 5 },
    { label: '0%', value: 0 },
    { label: 'ZW', value: -1 },
];

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Card = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    background: ${p => p.theme.colors.surface};
`;

const CardHeader = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const IconRemoveBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    cursor: pointer;

    &:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
    svg { width: 16px; height: 16px; }
    @media (hover: none) and (pointer: coarse) { width: 44px; height: 44px; }
`;

const PriceGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 92px;
    gap: 8px;

    @media (max-width: 360px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        > :last-child { grid-column: 1 / -1; }
    }
`;

const PriceField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const MoneyInput = styled(BareInput)`
    text-align: right;
    font-variant-numeric: tabular-nums;
`;

const AddBtn = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 14px; height: 14px; }
    &:hover:not(:disabled) { border-color: #94a3b8; color: ${p => p.theme.colors.text}; }
    @media (hover: none) and (pointer: coarse) { height: 42px; }
`;

// ─── Podpowiedzi z katalogu ───────────────────────────────────────────────────

/**
 * Lista podpowiedzi jest przypięta do viewportu i wyniesiona do <body>: pozycje usług
 * leżą w przewijanym wnętrzu szuflady, a lista pozycjonowana absolutnie byłaby
 * przycinana przez kontener dokładnie wtedy, gdy jest potrzebna.
 */
const FixedList = styled.ul`
    position: fixed;
    z-index: 3000;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    overflow-y: auto;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
`;

const Suggestion = styled.li<{ $create?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 40px;
    padding: 9px 14px;
    font-size: 14px;
    color: ${p => p.$create ? '#075985' : '#0f172a'};
    font-weight: ${p => p.$create ? 600 : 400};
    cursor: pointer;

    &:hover { background: #f8fafc; }
    > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    > span:last-child { flex-shrink: 0; font-size: 12.5px; color: ${p => p.$create ? '#075985' : '#64748b'}; font-variant-numeric: tabular-nums; }
    svg { width: 14px; height: 14px; }
`;

/* Telefon: pełnoekranowy arkusz zamiast listy przy polu - pole usługi leży nisko,
   klawiatura zabiera pół ekranu i lista wchodziła na pola cen. Ten sam wzorzec
   co picker usług przy wizycie (ServiceInlineRow). */
const SheetBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 3400;
    background: rgba(15, 23, 42, 0.35);
`;

const Sheet = styled.div`
    position: fixed;
    inset: 0;
    z-index: 3401;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-top: env(safe-area-inset-top);
    background: #fff;
`;

const SheetHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 8px 8px 16px;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
`;

const SheetClose = styled.button`
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #64748b;
    font-size: 20px;
    cursor: pointer;
`;

const SheetSearch = styled.input`
    margin: 10px 16px;
    min-height: 44px;
    padding: 11px 16px;
    font-family: inherit;
    font-size: 16px;
    color: #0f172a;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    outline: none;

    &:focus { border-color: var(--brand-primary); background: #fff; }
`;

const SheetList = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: calc(env(safe-area-inset-bottom) + var(--kb-inset, 0px));
`;

const SheetItem = styled.button<{ $create?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: ${p => p.$create ? 600 : 400};
    text-align: left;
    color: ${p => p.$create ? '#075985' : '#0f172a'};
    cursor: pointer;

    &:active { background: #f8fafc; }
    > span:last-child { flex-shrink: 0; font-size: 13px; font-weight: 600; color: ${p => p.$create ? '#075985' : '#64748b'}; }
`;

const SheetEmpty = styled.div`
    padding: 28px 16px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
`;

interface Props {
    services: ServiceFormItem[];
    onChange: (services: ServiceFormItem[]) => void;
    disabled?: boolean;
    /** Pole brutto pierwszej pozycji - szuflada ustawia w nim kursor po kliknięciu w kwotę. */
    firstGrossRef?: Ref<HTMLInputElement>;
}

export function ServicesEditor({ services, onChange, disabled, firstGrossRef }: Props) {
    // Katalog pobierany raz i filtrowany lokalnie: to krótka lista studia, a zapytanie
    // na każdy znak spóźniałoby się za pisaniem, które ma skracać.
    const { data: catalog } = useBatchServices();
    const [suggestFor, setSuggestFor] = useState<number | null>(null);
    const [suggestStyle, setSuggestStyle] = useState<React.CSSProperties>({});
    const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    const [sheetQuery, setSheetQuery] = useState('');
    const sheetRef = useRef<HTMLDivElement>(null);
    const sheetInputRef = useRef<HTMLInputElement>(null);
    const stackRef = useRef<HTMLDivElement>(null);
    const anchorRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const update = (idx: number, patch: Partial<ServiceFormItem>) =>
        onChange(services.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

    const position = useCallback(() => {
        const el = anchorRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const below = vh - rect.bottom - 12;
        const above = rect.top - 12;
        const openUp = below < 140 && above > below;
        setSuggestStyle({
            left: rect.left,
            width: rect.width,
            maxHeight: Math.min(240, Math.max(120, openUp ? above : below)),
            ...(openUp ? { bottom: vh - rect.top + 4 } : { top: rect.bottom + 4 }),
        });
    }, []);

    useEffect(() => {
        if (suggestFor === null || isMobile) return;
        position();
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!stackRef.current?.contains(t) && !listRef.current?.contains(t)) setSuggestFor(null);
        };
        const onKey = (e: KeyboardEvent) => {
            // Escape zamyka listę, a nie całą szufladę pod nią.
            if (e.key === 'Escape') { e.stopPropagation(); setSuggestFor(null); }
        };
        window.addEventListener('scroll', position, true);
        window.addEventListener('resize', position);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            window.removeEventListener('scroll', position, true);
            window.removeEventListener('resize', position);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [suggestFor, position, isMobile]);

    useVisualViewportSheet(isMobile && suggestFor !== null, sheetRef);

    function openSuggestions(idx: number, input: HTMLInputElement | null) {
        anchorRef.current = input;
        setSuggestFor(idx);
        if (isMobile) {
            setSheetQuery(services[idx]?.name ?? '');
            requestAnimationFrame(() => sheetInputRef.current?.focus());
        }
    }

    function suggestionsFor(query: string): BatchService[] {
        const q = query.trim().toLowerCase();
        if (!catalog?.length) return [];
        const matches = q ? catalog.filter(s => s.name.toLowerCase().includes(q)) : catalog;
        // Dokładne trafienie = pole już jest tym, czym by się stało; otwarta lista
        // zasłaniałaby pola cen, do których operator właśnie przechodzi.
        if (matches.length === 1 && matches[0].name.toLowerCase() === q) return [];
        return matches.slice(0, 8);
    }

    const isExactCatalogName = (name: string) => {
        const q = name.trim().toLowerCase();
        return !!q && (catalog ?? []).some(s => s.name.trim().toLowerCase() === q);
    };

    function applySuggestion(idx: number, service: BatchService) {
        update(idx, {
            name: service.name,
            netDisplay: centsToInput(service.netAmountCents),
            grossDisplay: centsToInput(service.grossAmountCents),
            vatRate: service.vatRate,
            priceSide: storedPriceSide(service.netAmountCents, service.grossAmountCents, service.vatRate),
        });
        setSuggestFor(null);
    }

    function commitTypedName(idx: number, name: string) {
        const clean = name.trim();
        if (clean) update(idx, { name: capitalizeFirst(clean) });
        setSuggestFor(null);
    }

    function updateNet(idx: number, val: string) {
        if (!MAX_2_DECIMALS.test(val)) return;
        const gross = netToGross(inputToCents(val), services[idx].vatRate);
        update(idx, { netDisplay: val, grossDisplay: val === '' ? '' : centsToInput(gross), priceSide: 'net' });
    }

    function updateGross(idx: number, val: string) {
        if (!MAX_2_DECIMALS.test(val)) return;
        const net = grossToNet(inputToCents(val), services[idx].vatRate);
        update(idx, { grossDisplay: val, netDisplay: val === '' ? '' : centsToInput(net), priceSide: 'gross' });
    }

    function updateVat(idx: number, vatRate: number) {
        const s = services[idx];
        const { net, gross } = priceInputsForVatRate(
            { net: s.netDisplay, gross: s.grossDisplay }, s.vatRate, vatRate, s.priceSide,
        );
        update(idx, { vatRate, netDisplay: net, grossDisplay: gross });
    }

    return (
        <Stack ref={stackRef}>
            {services.map((svc, idx) => {
                const suggestions = suggestFor === idx ? suggestionsFor(svc.name) : [];
                const showCreate = suggestFor === idx && svc.name.trim().length > 0 && !isExactCatalogName(svc.name);
                return (
                    <Card key={idx}>
                        <CardHeader>
                            <InputShell $compact style={{ flex: 1, minWidth: 0 }}>
                                <BareInput
                                    $compact
                                    aria-label={`Nazwa usługi ${idx + 1}`}
                                    value={svc.name}
                                    disabled={disabled}
                                    onChange={e => {
                                        update(idx, { name: capitalizeFirst(e.target.value) });
                                        openSuggestions(idx, e.currentTarget);
                                    }}
                                    onFocus={e => openSuggestions(idx, e.currentTarget)}
                                    placeholder="Nazwa usługi"
                                    autoComplete="off"
                                />
                            </InputShell>
                            {services.length > 1 && (
                                <IconRemoveBtn
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChange(services.filter((_, i) => i !== idx))}
                                    aria-label={`Usuń usługę ${idx + 1}`}
                                    title="Usuń usługę"
                                >
                                    <Trash2 />
                                </IconRemoveBtn>
                            )}
                        </CardHeader>
                        <PriceGrid>
                            <PriceField>
                                Netto (zł)
                                <InputShell $compact>
                                    <MoneyInput
                                        $compact
                                        type="text"
                                        inputMode="decimal"
                                        disabled={disabled}
                                        value={svc.netDisplay}
                                        onChange={e => updateNet(idx, e.target.value)}
                                        onKeyDown={handleZeroAwareKeyDown(svc.netDisplay, val => updateNet(idx, val))}
                                        placeholder="0,00"
                                    />
                                </InputShell>
                            </PriceField>
                            <PriceField>
                                Brutto (zł)
                                <InputShell $compact>
                                    <MoneyInput
                                        $compact
                                        ref={idx === 0 ? firstGrossRef : undefined}
                                        type="text"
                                        inputMode="decimal"
                                        disabled={disabled}
                                        value={svc.grossDisplay}
                                        onChange={e => updateGross(idx, e.target.value)}
                                        onKeyDown={handleZeroAwareKeyDown(svc.grossDisplay, val => updateGross(idx, val))}
                                        placeholder="0,00"
                                    />
                                </InputShell>
                            </PriceField>
                            <PriceField>
                                VAT
                                <Select
                                    $compact
                                    disabled={disabled}
                                    value={svc.vatRate}
                                    onChange={e => updateVat(idx, Number(e.target.value))}
                                >
                                    {VAT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Select>
                            </PriceField>
                        </PriceGrid>

                        {!isMobile && (suggestions.length > 0 || showCreate) && createPortal(
                            <FixedList ref={listRef} style={suggestStyle} role="listbox">
                                {suggestions.map(s => (
                                    // mousedown, nie click: blur pola nie może zwinąć listy przed wyborem.
                                    <Suggestion key={s.id} role="option" aria-selected="false" onMouseDown={() => applySuggestion(idx, s)}>
                                        <span>{s.name}</span>
                                        <span>{formatCurrency(s.grossAmountCents / 100)} brutto</span>
                                    </Suggestion>
                                ))}
                                {showCreate && (
                                    <Suggestion $create role="option" aria-selected="false" onMouseDown={() => commitTypedName(idx, svc.name)}>
                                        <span><Plus />Użyj „{svc.name.trim()}"</span>
                                        <span>nowa usługa</span>
                                    </Suggestion>
                                )}
                            </FixedList>,
                            document.body,
                        )}

                        {isMobile && suggestFor === idx && createPortal(
                            <>
                                <SheetBackdrop onClick={() => setSuggestFor(null)} />
                                <Sheet ref={sheetRef}>
                                    <SheetHeader>
                                        <span>Wybierz usługę</span>
                                        <SheetClose type="button" aria-label="Zamknij" onClick={() => setSuggestFor(null)}>✕</SheetClose>
                                    </SheetHeader>
                                    <SheetSearch
                                        ref={sheetInputRef}
                                        value={sheetQuery}
                                        onChange={e => {
                                            const text = capitalizeFirst(e.target.value);
                                            setSheetQuery(text);
                                            // Wpisana treść od razu ląduje w pozycji, więc zamknięcie
                                            // arkusza nie gubi nazwy usługi spoza katalogu.
                                            update(idx, { name: text });
                                        }}
                                        placeholder="Szukaj usługi..."
                                        autoComplete="off"
                                    />
                                    <SheetList>
                                        {suggestionsFor(sheetQuery).map(s => (
                                            <SheetItem key={s.id} type="button" onClick={() => applySuggestion(idx, s)}>
                                                <span>{s.name}</span>
                                                <span>{formatCurrency(s.grossAmountCents / 100)} brutto</span>
                                            </SheetItem>
                                        ))}
                                        {sheetQuery.trim() && !isExactCatalogName(sheetQuery) && (
                                            <SheetItem $create type="button" onClick={() => commitTypedName(idx, sheetQuery)}>
                                                <span>+ Użyj „{sheetQuery.trim()}"</span>
                                                <span>nowa usługa</span>
                                            </SheetItem>
                                        )}
                                        {suggestionsFor(sheetQuery).length === 0 && !sheetQuery.trim() && (
                                            <SheetEmpty>Katalog usług jest pusty - wpisz nazwę.</SheetEmpty>
                                        )}
                                    </SheetList>
                                </Sheet>
                            </>,
                            document.body,
                        )}
                    </Card>
                );
            })}
            {!disabled && (
                <AddBtn type="button" onClick={() => onChange([...services, emptyService()])}>
                    <Plus />Dodaj usługę
                </AddBtn>
            )}
        </Stack>
    );
}
