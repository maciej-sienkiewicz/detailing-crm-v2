// src/modules/statistics/components/shared/HeaderDatePicker.tsx
// Wspólny wybór zakresu dat w nagłówku strony (Przychody / Koszty).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { st } from '../StatisticsTheme';
import { applyFloatingPlacement } from '@/common/utils/floatingPlacement';
import type { Granularity } from '../../types';
import { today, spDaysAgo, spMonthsAgo, currentMonthStart, currentMonthName } from './format';

const PickerWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

const PickerTrigger = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 15px;
    background: ${p => p.$active ? '#f0f9ff' : '#ffffff'};
    color: ${p => p.$active ? '#0369a1' : st.text};
    border: 1px solid ${p => p.$active ? '#7dd3fc' : st.border};
    border-radius: 9999px;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all ${st.transition};
    &:hover { background: ${p => p.$active ? '#e0f2fe' : '#f8fafc'}; border-color: ${p => p.$active ? '#38bdf8' : st.borderHover}; }
    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const PickerPanel = styled.div`
    position: fixed;
    z-index: 9000;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
    width: 280px;
    padding: 8px;
    /* Pozycję i limity ustawia applyFloatingPlacement; do pierwszego pomiaru panel
       jest niewidoczny, żeby nie mignął w lewym górnym rogu. */
    top: 0;
    left: 0;
    visibility: hidden;
    overscroll-behavior: contain;
    box-sizing: border-box;
`;

const PresetGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PresetBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    background: ${p => p.$active ? '#f0f9ff' : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.text};
    border: none;
    border-radius: 6px;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => p.$active ? '600' : '500'};
    text-align: left;
    cursor: pointer;
    transition: background ${st.transition}, color ${st.transition};
    &:hover { background: ${p => p.$active ? '#e0f2fe' : st.bg}; }
    span.hint { font-size: 11px; color: ${p => p.$active ? '#7dd3fc' : st.textMuted}; font-weight: 400; }
`;

const Divider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 6px 0;
`;

const DateLabel = styled.div`
    padding: 2px 10px 6px;
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const RangeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 2px;
`;

const DateInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    background: ${st.bg};
    color: ${st.text};
    border: 1.5px solid ${st.border};
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    transition: border-color ${st.transition};
    &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

const ApplyBtn = styled.button`
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
    &:hover { background: #0284c7; }
    &:disabled { background: #94a3b8; cursor: not-allowed; }
`;

const RangeSep = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

const CalIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ChevIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

type Preset = { label: string; hint: string; startDate: string; endDate: string; granularity: Granularity };

const getPresets = (): Preset[] => [
    // Rozliczenia prowadzi się miesiącami - to jest pytanie, z którym najczęściej
    // wchodzi się w statystyki, więc stoi pierwsze i jest domyślne.
    { label: 'Bieżący miesiąc',      hint: currentMonthName(), startDate: currentMonthStart(), endDate: today(), granularity: 'DAILY' },
    { label: 'Ostatnie 7 dni',       hint: '7 dni',    startDate: spDaysAgo(7),    endDate: today(), granularity: 'DAILY' },
    { label: 'Ostatnie 30 dni',      hint: '30 dni',   startDate: spDaysAgo(30),   endDate: today(), granularity: 'WEEKLY' },
    // Tygodniowo, nie miesięcznie: kwartał w trzech słupkach nie jest wykresem. To jest
    // też ustawienie domyślne widoku, więc preset ma do niego WRACAĆ, a nie dawać co innego.
    { label: 'Ostatnie 3 miesiące',  hint: '3 mies.',  startDate: spMonthsAgo(3),  endDate: today(), granularity: 'WEEKLY' },
    { label: 'Ostatnie 12 miesięcy', hint: '12 mies.', startDate: spMonthsAgo(12), endDate: today(), granularity: 'MONTHLY' },
];

// ─── Grupowanie ───────────────────────────────────────────────────────────────
//
// Dziennie / tygodniowo / miesięcznie to ustawienie, które prawie zawsze wynika
// z wybranego zakresu - użytkownik zmienia je raz na sto wejść. Zajmowało własną
// kartę na całą szerokość ekranu; teraz siedzi cicho pod przyciskiem zakresu,
// a przy zmianie zakresu ustawia się samo.

const GRANULARITY_LABELS: { value: Granularity; label: string }[] = [
    { value: 'DAILY',     label: 'Dziennie' },
    { value: 'WEEKLY',    label: 'Tygodniowo' },
    { value: 'MONTHLY',   label: 'Miesięcznie' },
    { value: 'QUARTERLY', label: 'Kwartalnie' },
    { value: 'YEARLY',    label: 'Rocznie' },
];

const GRANULARITY_ORDER: Granularity[] = ['YEARLY', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY'];

const daysBetween = (start: string, end: string) =>
    Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));

/** Które grupowania mają sens dla zakresu - te same progi co wcześniej. */
const allowedGranularities = (days: number): Set<Granularity> => {
    if (days <= 7)  return new Set<Granularity>(['DAILY']);
    if (days <= 30) return new Set<Granularity>(['DAILY', 'WEEKLY']);
    if (days <= 90) return new Set<Granularity>(['DAILY', 'WEEKLY', 'MONTHLY']);
    return new Set<Granularity>(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
};

const GroupRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 2px 2px;
`;

const GroupChip = styled.button<{ $active: boolean }>`
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => (p.$active ? st.accentBlue : st.border)};
    background: ${p => (p.$active ? st.accentBlue : 'transparent')};
    color: ${p => (p.$active ? '#fff' : st.textSecondary)};
    font-family: inherit;
    font-size: 12px;
    font-weight: ${p => (p.$active ? 600 : 500)};
    cursor: pointer;
    transition: all ${st.transition};

    &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

interface HeaderDatePickerProps {
    startDate: string;
    endDate: string;
    onStartChange: (d: string) => void;
    onEndChange: (d: string) => void;
    /** Gdy podane, presety ustawiają też pasujące grupowanie */
    onGranularityChange?: (g: Granularity) => void;
    /** Gdy podane razem z onGranularityChange, panel pokazuje wybór grupowania. */
    granularity?: Granularity;
}

export const HeaderDatePicker = ({
    startDate, endDate, onStartChange, onEndChange, onGranularityChange, granularity,
}: HeaderDatePickerProps) => {
    const [open, setOpen] = useState(false);
    const [pendingFrom, setPendingFrom] = useState('');
    const [pendingTo, setPendingTo] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const presets = getPresets();
    const activeIdx = presets.findIndex(p => p.startDate === startDate && p.endDate === endDate);

    // Zakres decyduje o grupowaniu: po zmianie dat schodzimy na najgrubsze
    // sensowne grupowanie, żeby wykres nie został z ustawieniem, którego
    // nowy zakres nie obsługuje.
    const allowed = allowedGranularities(daysBetween(startDate, endDate));
    useEffect(() => {
        if (!granularity || !onGranularityChange) return;
        if (allowed.has(granularity)) return;
        onGranularityChange(GRANULARITY_ORDER.find(g => allowed.has(g)) ?? 'DAILY');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Panel mieści się w ekranie zawsze (applyFloatingPlacement): wcześniej kleił się
    // prawą krawędzią do przycisku i na telefonie, gdzie przycisk ląduje przy lewej
    // krawędzi nagłówka, wyjeżdżał za ekran. Pozycja idzie za przyciskiem przy
    // przewijaniu i przy zmianie rozmiaru, także gdy wysuwa się klawiatura przy datach.
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const panel = panelRef.current;
            const trigger = triggerRef.current;
            if (panel && trigger) applyFloatingPlacement(panel, trigger.getBoundingClientRect(), { align: 'right', offset: 8 });
        };
        // Przewijanie wewnątrz panelu (niski ekran) nie przesuwa przycisku - przeliczenie
        // zdjęłoby na chwilę limit wysokości i wyzerowało przewinięcie listy.
        const onScroll = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            place();
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', onScroll, true);
        window.visualViewport?.addEventListener('resize', place);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', onScroll, true);
            window.visualViewport?.removeEventListener('resize', place);
        };
    }, [open, granularity]);

    const handleToggle = () => {
        if (!open) {
            setPendingFrom(startDate);
            setPendingTo(endDate);
        }
        setOpen(p => !p);
    };

    const applyPreset = (preset: Preset) => {
        onStartChange(preset.startDate);
        onEndChange(preset.endDate);
        onGranularityChange?.(preset.granularity);
        setOpen(false);
    };

    const applyCustom = () => {
        if (pendingFrom) onStartChange(pendingFrom);
        if (pendingTo) onEndChange(pendingTo);
        setOpen(false);
    };

    const label = activeIdx >= 0 ? presets[activeIdx].label : `${startDate} - ${endDate}`;

    return (
        <PickerWrap>
            <PickerTrigger ref={triggerRef} $active onClick={handleToggle}>
                <CalIcon />
                {label}
                <ChevIcon />
            </PickerTrigger>

            {open && createPortal(
                <PickerPanel ref={panelRef}>
                    <PresetGroup>
                        {presets.map((p, idx) => (
                            <PresetBtn key={p.label} $active={idx === activeIdx} onClick={() => applyPreset(p)}>
                                {p.label}
                                <span className="hint">{p.hint}</span>
                                {idx === activeIdx && <CheckIcon />}
                            </PresetBtn>
                        ))}
                    </PresetGroup>

                    {granularity && onGranularityChange && (
                        <>
                            <Divider />
                            <DateLabel>Grupowanie na wykresie</DateLabel>
                            <GroupRow>
                                {GRANULARITY_LABELS.map(g => (
                                    <GroupChip
                                        key={g.value}
                                        $active={granularity === g.value}
                                        disabled={!allowed.has(g.value)}
                                        title={!allowed.has(g.value) ? 'Niedostępne dla wybranego zakresu' : undefined}
                                        onClick={() => onGranularityChange(g.value)}
                                    >
                                        {g.label}
                                    </GroupChip>
                                ))}
                            </GroupRow>
                        </>
                    )}

                    <Divider />
                    <DateLabel>Niestandardowy zakres</DateLabel>

                    <RangeRow>
                        <DateInput
                            type="date"
                            value={pendingFrom}
                            max={pendingTo || undefined}
                            onChange={e => setPendingFrom(e.target.value)}
                        />
                        <RangeSep>-</RangeSep>
                        <DateInput
                            type="date"
                            value={pendingTo}
                            min={pendingFrom || undefined}
                            onChange={e => setPendingTo(e.target.value)}
                        />
                    </RangeRow>

                    <ApplyBtn disabled={!pendingFrom && !pendingTo} onClick={applyCustom}>
                        Zastosuj zakres
                    </ApplyBtn>
                </PickerPanel>,
                document.body
            )}
        </PickerWrap>
    );
};
