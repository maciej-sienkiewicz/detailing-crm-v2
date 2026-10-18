import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, ChevronDown, ImageOff, PenLine } from 'lucide-react';
import { SectionTitle, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { PublishVisit } from '../../accountsTypes';
import { formatDate } from '../MetricBits';
import { PHONE } from '../../utils/phone';
import { Order, Thumb, Thumbs } from './PublishSection';
import { MAX_AI_PHOTOS } from './publishLogic';

/**
 * „Realizacja" w generatorze: z której wizyty jest post i które jej zdjęcia trafią do posta.
 *
 * Fakty z wizyty (auto, wykonane usługi) okno wpisuje do „Dodatkowego kontekstu", gdzie właściciel
 * je widzi i poprawia - tu zostaje tylko wybór wizyty i zdjęć. Te same zdjęcia, w tej samej
 * kolejności, są potem zaznaczone do publikacji, więc tekst opisuje dokładnie to, co jest w karuzeli.
 *
 * Wybierak jest własny, nie systemowy `<select>`: lista systemowa pokazywała surowy tekst
 * „Volvo XC60, VIS-2026-00412, 14 paź" bez zdjęcia, w kroju i kolorach systemu, obca reszcie okna.
 */

const Wrap = styled.section<{ $highlight: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    margin-bottom: 20px;
    border: 1px solid ${p => (p.$highlight ? ui.brandLineSoft : ui.line)};
    border-radius: 12px;
    background: ${p => (p.$highlight ? ui.brandTint : ui.surface)};
`;

const Picker = styled.div`
    position: relative;
`;

const VisitButton = styled.button<{ $open: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px 8px 8px;
    border: 1.5px solid ${p => (p.$open ? ui.brand : ui.line)};
    border-radius: 12px;
    background: ${ui.surface};
    box-shadow: ${p => (p.$open ? '0 0 0 3px rgba(14, 165, 233, 0.12)' : 'none')};
    font-family: inherit;
    text-align: left;
    color: ${ui.ink};
    cursor: pointer;
    transition: border-color 0.15s ease;

    &:hover { border-color: ${p => (p.$open ? ui.brand : ui.lineStrong)}; }
    &:focus-visible { outline: none; border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }

    > svg:last-child {
        width: 18px;
        height: 18px;
        margin-left: auto;
        flex-shrink: 0;
        color: ${ui.textMuted};
        transform: rotate(${p => (p.$open ? '180deg' : '0deg')});
        transition: transform 0.15s ease;
    }

    ${PHONE} {
        min-height: 56px;
        strong { font-size: 15px; }
    }
`;

const Cover = styled.span`
    width: 44px;
    height: 44px;
    border-radius: 9px;
    overflow: hidden;
    flex-shrink: 0;
    background: ${ui.surfaceAlt};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${ui.textMuted};

    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    svg { width: 18px; height: 18px; }
`;

const VisitText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong {
        font-size: 14px;
        font-weight: 650;
        color: ${ui.ink};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/** Numer, data i liczba zdjęć jako osobne elementy z odstępem (CLAUDE.md §4: bez kropek). */
const VisitMeta = styled.span`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Menu = styled.ul`
    position: absolute;
    z-index: 20;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    max-height: 320px;
    overflow-y: auto;
    margin: 0;
    padding: 6px;
    list-style: none;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06);
`;

const Option = styled.li<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px 6px 6px;
    border-radius: 9px;
    cursor: pointer;
    background: ${p => (p.$selected ? ui.brandTint : 'transparent')};

    &:hover, &[data-active='true'] { background: ${p => (p.$selected ? ui.brandTint : ui.surfaceSoft)}; }

    > svg:last-child { width: 16px; height: 16px; margin-left: auto; flex-shrink: 0; color: ${ui.brandInk}; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const Empty = styled.p`
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${ui.textMuted};

    svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

const photosLabel = (count: number) => `${count} ${pluralPl(count, 'zdjęcie', 'zdjęcia', 'zdjęć')}`;

/** Okładka i opis jednej wizyty - ten sam układ w przycisku i na liście. */
const VisitSummary = ({ visit }: { visit: PublishVisit | undefined }) => (
    <>
        <Cover aria-hidden="true">
            {visit?.photos[0] ? <img src={visit.photos[0].thumbnailUrl} alt="" loading="lazy" /> : <PenLine />}
        </Cover>
        <VisitText>
            <strong>{visit ? visit.vehicle : 'Bez realizacji, sam temat'}</strong>
            <VisitMeta>
                {visit ? (
                    <>
                        {visit.visitNumber && <span>{visit.visitNumber}</span>}
                        <span>{formatDate(visit.date)}</span>
                        <span>{photosLabel(visit.photos.length)}</span>
                    </>
                ) : (
                    <span>Post o promocji, poradzie albo nowości w studiu</span>
                )}
            </VisitMeta>
        </VisitText>
    </>
);

interface Props {
    visits: PublishVisit[] | undefined;
    loading: boolean;
    visitId: string | undefined;
    onVisitChange: (visit: PublishVisit | undefined) => void;
    aiPhotos: string[];
    onToggleAiPhoto: (photoId: string) => void;
    /** Otwarte z „Wybierz inną realizację" - sekcja ma przyciągnąć wzrok, bo to jest pytanie okna. */
    highlight?: boolean;
    /** Focus na wyborze wizyty przy `highlight`. Okno wyłącza go na telefonie - tam focus daje tylko palec. */
    autoFocus?: boolean;
}

export const VisitMaterialSection = ({
    visits, loading, visitId, onVisitChange, aiPhotos, onToggleAiPhoto, highlight = false, autoFocus = true,
}: Props) => {
    const list = visits ?? [];
    const visit = list.find(v => v.visitId === visitId);
    const full = aiPhotos.length >= MAX_AI_PHOTOS;

    // Otwarte od razu, gdy okno przyszło z „Wybierz inną realizację": wybór wizyty jest wtedy pytaniem okna.
    const [open, setOpen] = useState(highlight);
    const [active, setActive] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Pozycja 0 to „Bez realizacji", dalej wizyty w kolejności listy.
    const options: (PublishVisit | undefined)[] = [undefined, ...list];

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const toggle = () => {
        setActive(Math.max(0, options.findIndex(o => o?.visitId === visitId)));
        setOpen(o => !o);
    };

    const choose = (next: PublishVisit | undefined) => {
        onVisitChange(next);
        setOpen(false);
        buttonRef.current?.focus();
    };

    // Klawiatura jak w systemowej liście: strzałki, Enter, Escape (Escape nie zamyka całego okna).
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); toggle(); }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(options[active]); }
    };

    return (
        <Wrap $highlight={highlight} aria-label="Realizacja">
            <SectionTitle
                as="h3"
                count={visit ? `${photosLabel(aiPhotos.length)} w poście, do ${MAX_AI_PHOTOS}` : 'opcjonalnie'}
            >
                {highlight ? 'Wybierz realizację' : 'Realizacja'}
            </SectionTitle>

            {loading ? (
                <Hint>Wczytuję ostatnie wizyty ze zdjęciami…</Hint>
            ) : list.length === 0 ? (
                <Empty><ImageOff aria-hidden="true" />Brak wizyt ze zdjęciami z ostatnich 60 dni. Post powstanie z samego tematu.</Empty>
            ) : (
                <>
                    <Picker ref={pickerRef} onKeyDown={onKeyDown}>
                        <VisitButton
                            ref={buttonRef}
                            type="button"
                            autoFocus={highlight && autoFocus}
                            $open={open}
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            aria-label={`Wizyta, której dotyczy post: ${visit ? visit.vehicle : 'bez realizacji'}`}
                            onClick={toggle}
                        >
                            <VisitSummary visit={visit} />
                            <ChevronDown aria-hidden="true" />
                        </VisitButton>
                        {open && (
                            <Menu role="listbox" aria-label="Ostatnie realizacje">
                                {options.map((option, index) => {
                                    const selected = option?.visitId === visitId;
                                    return (
                                        <Option
                                            key={option?.visitId ?? 'none'}
                                            role="option"
                                            aria-selected={selected}
                                            $selected={selected}
                                            data-active={index === active}
                                            onMouseEnter={() => setActive(index)}
                                            onClick={() => choose(option)}
                                        >
                                            <VisitSummary visit={option} />
                                            {selected && <Check aria-hidden="true" />}
                                        </Option>
                                    );
                                })}
                            </Menu>
                        )}
                    </Picker>

                    {visit && (
                        <Thumbs>
                            {visit.photos.map(photo => {
                                const order = aiPhotos.indexOf(photo.id);
                                const isSelected = order >= 0;
                                return (
                                    <Thumb
                                        key={photo.id}
                                        type="button"
                                        $selected={isSelected}
                                        aria-pressed={isSelected}
                                        aria-label={isSelected ? `Zdjęcie ${order + 1} w poście, odznacz` : 'Dodaj zdjęcie do posta'}
                                        disabled={!isSelected && full}
                                        onClick={() => onToggleAiPhoto(photo.id)}
                                    >
                                        <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                                        {isSelected && <Order>{aiPhotos.length > 1 ? order + 1 : <Check size={12} />}</Order>}
                                    </Thumb>
                                );
                            })}
                        </Thumbs>
                    )}
                </>
            )}
        </Wrap>
    );
};
