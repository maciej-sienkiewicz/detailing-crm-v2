// src/modules/comms/components/TagMultiSelect.tsx
// Wielokrotny wybór tagów leada, razem z zarządzaniem słownikiem.
//
// Wydzielone z okna „Oznacz jako lead", bo tagi poprawia się częściej niż nadaje:
// raz przy tworzeniu leada, potem wprost z tabeli, gdy okaże się, że rozmowa jest
// jednak o czymś innym. Jeden komponent znaczy jeden sposób zaznaczania, dodawania
// i kasowania tagów — niezależnie od tego, skąd użytkownik do nich wchodzi.
//
// Mechanika jak w ColorDropdown przy przyjęciu pojazdu: menu w portalu, pozycja
// liczona od triggera, zamykanie kliknięciem obok. Różnica jest jedna — wybór jest
// wielokrotny, więc menu zostaje otwarte po kliknięciu pozycji.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { Check, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { EmptyHint } from './shared';

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const SelectContainer = styled.div`
    position: relative;
`;

const SelectTrigger = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 13px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};
    font-size: 13.5px;
    font-family: inherit;
    color: ${p => p.theme.colors.text};
    text-align: left;

    &:hover { border-color: ${p => p.theme.colors.textMuted}; }
    &:focus-visible {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
    }

    .value {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .placeholder { color: ${p => p.theme.colors.textMuted}; }
    svg { flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
`;

/**
 * Menu jest kolumną: przewija się wyłącznie lista tagów, wiersz „Nowy tag" stoi.
 * Gdy tagów przybędzie, dopisanie kolejnego nie może wymagać przewinięcia na sam
 * dół — pole, którego nie widać, nie istnieje.
 */
const SelectMenu = styled.div`
    position: fixed;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const OptionsScroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 0;
`;

const SelectOption = styled.button<{ $selected: boolean }>`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: none;
    background: ${({ $selected, theme }) => ($selected ? theme.colors.surfaceAlt : 'transparent')};
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${({ $selected, theme }) =>
        $selected ? theme.fontWeights.semibold : theme.fontWeights.normal};
    color: ${p => p.theme.colors.text};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

/** Kwadracik zaznaczenia — bez niego nie widać, że wyborów może być kilka. */
const OptionBox = styled.span<{ $selected: boolean }>`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: ${p => p.theme.radii.sm};
    border: 1.5px solid
        ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
    background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
    color: #ffffff;
`;

/**
 * Wiersz opcji trzyma dwa cele kliknięcia: całą pozycję (zaznacz) i kosz (usuń ze
 * słownika). Kosz pojawia się dopiero po najechaniu na wiersz — stale widoczny przy
 * każdym tagu robiłby z listy wyboru listę do kasowania.
 */
const OptionRow = styled.div`
    display: flex;
    align-items: stretch;

    &:hover .remove { opacity: 1; }
`;

const RemoveTagButton = styled.button`
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    padding: 0 10px;
    opacity: 0;
    transition: opacity ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    &:hover { color: ${p => p.theme.colors.error}; }
    &:focus-visible { opacity: 1; }
`;

const MenuFooter = styled.div`
    flex-shrink: 0;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 6px;

    input {
        flex: 1;
        min-width: 0;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.sm};
        padding: 6px 9px;
        font-size: 12.5px;
        font-family: inherit;
        color: ${p => p.theme.colors.text};
        outline: none;

        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }

    button.add {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: none;
        background: ${p => p.theme.colors.primary};
        color: #ffffff;
        border-radius: ${p => p.theme.radii.sm};
        padding: 7px 10px;
        font-size: 12.5px;
        font-family: inherit;
        font-weight: ${p => p.theme.fontWeights.medium};
        cursor: pointer;

        &:disabled { opacity: 0.5; cursor: default; }
    }

    svg.spin { animation: ${spin} 900ms linear infinite; }
`;

export interface TagOption {
    code: string;
    label: string;
}

interface TagMultiSelectProps {
    options: TagOption[];
    value: string[];
    onChange: (next: string[]) => void;
    onCreate: (label: string) => void;
    onDelete: (option: TagOption) => void;
    isCreating: boolean;
}

export function TagMultiSelect({ options, value, onChange, onCreate, onDelete, isCreating }: TagMultiSelectProps) {
    const [newLabel, setNewLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({
        left: 0,
        width: 0,
        maxHeight: 0,
    });
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const calcPos = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const below = viewportHeight - rect.bottom - 4;
        const above = rect.top - 4;
        if (below < 140 && above > below) {
            setPos({ bottom: viewportHeight - rect.top + 4, left: rect.left, width: rect.width, maxHeight: Math.min(260, above) });
        } else {
            setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: Math.min(260, below) });
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
                setOpen(false);
            }
        };
        // Escape ma zamknąć listę, a nie całe okno — dlatego faza przechwytywania
        // i zatrzymanie zdarzenia, zanim dojdzie do nasłuchu modala.
        const onEsc = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setOpen(false);
        };
        const onReposition = () => calcPos();
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc, true);
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc, true);
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [open, calcPos]);

    const summary = useMemo(
        () =>
            options
                .filter((option) => value.includes(option.code))
                .map((option) => option.label)
                .join(', '),
        [options, value]
    );

    const toggle = (code: string) =>
        onChange(value.includes(code) ? value.filter((entry) => entry !== code) : [...value, code]);

    return (
        <SelectContainer ref={containerRef}>
            <SelectTrigger
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => {
                    calcPos();
                    setOpen((current) => !current);
                }}
            >
                <span className={summary ? 'value' : 'value placeholder'}>
                    {summary || 'Wybierz tagi'}
                </span>
                <ChevronDown size={15} />
            </SelectTrigger>
            {open &&
                createPortal(
                    <SelectMenu
                        ref={menuRef}
                        style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
                    >
                        <OptionsScroll role="listbox" aria-multiselectable>
                        {options.length === 0 && <EmptyHint>Brak tagów — dodaj pierwszy niżej</EmptyHint>}
                        {options.map((option) => {
                            const selected = value.includes(option.code);
                            return (
                                <OptionRow key={option.code}>
                                    <SelectOption
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        $selected={selected}
                                        onClick={() => toggle(option.code)}
                                    >
                                        <OptionBox $selected={selected}>
                                            {selected && <Check size={11} strokeWidth={3} />}
                                        </OptionBox>
                                        {option.label}
                                    </SelectOption>
                                    <RemoveTagButton
                                        className="remove"
                                        type="button"
                                        aria-label={`Usuń tag ${option.label}`}
                                        title="Usuń ze słownika"
                                        onClick={() => onDelete(option)}
                                    >
                                        <Trash2 size={13} />
                                    </RemoveTagButton>
                                </OptionRow>
                            );
                        })}
                        </OptionsScroll>

                        <MenuFooter>
                            <input
                                placeholder="Nowy tag…"
                                value={newLabel}
                                maxLength={80}
                                onChange={(event) => setNewLabel(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    // Enter w polu tagu nie ma prawa wysłać całego formularza.
                                    event.preventDefault();
                                    if (!newLabel.trim() || isCreating) return;
                                    onCreate(newLabel.trim());
                                    setNewLabel('');
                                }}
                            />
                            <button
                                className="add"
                                type="button"
                                disabled={!newLabel.trim() || isCreating}
                                onClick={() => {
                                    onCreate(newLabel.trim());
                                    setNewLabel('');
                                }}
                            >
                                {isCreating ? <Loader2 size={12} className="spin" /> : <Plus size={12} />}
                                Dodaj
                            </button>
                        </MenuFooter>
                    </SelectMenu>,
                    document.body
                )}
        </SelectContainer>
    );
}
