// src/modules/checkin/components/ServiceAutocomplete.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useDebounce, useVisualViewportSheet } from '@/common/hooks';
import { Input } from '@/common/components/Form';
import { formatCurrency } from '@/common/utils';
import { netToGross } from '@/common/utils/priceAdjustment';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { Service } from '@/modules/services/types';
// Mobile bottom-sheet primitives shared with QuickEventModal, so the service
// picker looks and behaves identically in both places.
import {
    MobileSheetBackdrop,
    MobileBottomSheet,
    MobileSheetHandle,
    MobileSheetTitle,
    MobileSheetClose,
    MobileSheetSearchWrap,
    MobileSheetSearchEditable,
    MobileSheetScrollable,
    MobileAddServiceButton,
    ServiceSearchClear,
} from '@/modules/calendar/components/QuickEventModalStyles';

/**
 * Ile najwyżej miejsca zajmie lista podpowiedzi. 240 px mieściło pięć pozycji
 * i kończyło się mniej więcej na krawędzi okna, w którym stoi pole — przez co
 * wyglądało to na listę uciętą przez modal, a nie na listę, która się skończyła.
 * Lista jest w portalu i leży nad każdą warstwą aplikacji, więc nic nie stoi na
 * przeszkodzie, żeby wychodziła poza okno; ogranicza ją tylko brzeg ekranu.
 */
const MAX_DROPDOWN_HEIGHT = 420;

/** Poniżej tej wysokości lista nie ma sensu — wtedy otwieramy ją w drugą stronę. */
const MIN_DROPDOWN_HEIGHT = 180;

const AutocompleteContainer = styled.div`
    position: relative;
    width: 100%;
`;

const StyledInput = styled(Input)`
    width: 100%;
`;

const DropdownContainer = styled.div`
    position: fixed;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 4px rgba(15, 23, 42, 0.06);
    overflow-y: auto;
    /* Above every modal/popover layer (ModalShell: 1000, calendar popover: 1000, context menus: 1200) */
    z-index: 3000;
`;

const SuggestionItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};
    border-bottom: 1px solid #f1f5f9;

    &:hover {
        background-color: #f8fafc;
    }

    &:last-child {
        border-bottom: none;
    }
`;

const ServiceName = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PriceInfo = styled.div`
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: #64748b;
    font-feature-settings: 'tnum';
    flex-shrink: 0;
`;

const PriceLabel = styled.span`
    color: #94a3b8;
`;

const PackageBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    background: rgb(239, 246, 255);
    color: rgb(37, 99, 235);
    border: 1px solid rgb(191, 219, 254);
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
`;

const PackageItemsHint = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const EmptyState = styled.div`
    padding: 12px 14px;
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: 13px;
`;

const AddNewButton = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};
    border-top: 1px solid #f1f5f9;
    background-color: #f8faff;
    color: #2563eb;
    font-size: 13px;
    font-weight: 500;

    &:hover {
        background-color: #eff6ff;
    }

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }
`;

interface ServiceAutocompleteProps {
    onSelect: (service: Service) => void;
    onAddNew?: (searchQuery: string) => void;
}

export const ServiceAutocomplete = ({ onSelect, onAddNew }: ServiceAutocompleteProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(searchQuery, 300);

    // Same breakpoint as QuickEventModal; under it the positioned dropdown is
    // replaced by a full-screen bottom sheet that the keyboard can't cover.
    const [isMobile] = useState(() => window.innerWidth < 640);
    const sheetRef = useRef<HTMLDivElement>(null);
    const sheetInputRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const el = inputRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vvHeight = window.visualViewport?.height ?? window.innerHeight;
        const spaceBelow = vvHeight - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        // Open in the roomier direction and take the space that is actually there.
        // The only limit is the edge of the screen — the list is portalled above
        // every layer, so the modal it was opened from must not shorten it.
        const openUp = spaceBelow < MIN_DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
        const available = openUp ? spaceAbove : spaceBelow;
        const maxHeight = Math.max(120, Math.min(MAX_DROPDOWN_HEIGHT, available));
        setDropdownStyle(
            openUp
                ? { bottom: vvHeight - rect.top + 4, left: rect.left, width: rect.width, maxHeight }
                : { top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight }
        );
    }, []);

    useEffect(() => {
        if (!isOpen || isMobile) return;
        // Modals/popovers animate in with a transform, track the anchor for the
        // first moments so the list doesn't stay glued to a mid-animation position.
        // The first frame of this loop is also what positions the list initially —
        // measuring straight in the effect body would set state during the effect.
        let raf = 0;
        const start = performance.now();
        const follow = (now: number) => {
            updatePosition();
            if (now - start < 400) raf = requestAnimationFrame(follow);
        };
        raf = requestAnimationFrame(follow);
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        window.visualViewport?.addEventListener('resize', updatePosition);
        window.visualViewport?.addEventListener('scroll', updatePosition);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            window.visualViewport?.removeEventListener('resize', updatePosition);
            window.visualViewport?.removeEventListener('scroll', updatePosition);
        };
    }, [isOpen, isMobile, updatePosition]);

    // Keep the mobile sheet spanning the visible region: title and search field
    // pinned to the top of the screen, list ending at the keyboard edge.
    useVisualViewportSheet(isMobile && isOpen, sheetRef);

    // While the sheet is open, take background inputs out of the tab order so
    // iOS grays out the ^ v form-navigation arrows above the keyboard.
    useEffect(() => {
        if (!isMobile || !isOpen) return;

        const inputs = Array.from(
            document.querySelectorAll<HTMLElement>('input, textarea, select')
        );
        inputs.forEach(el => {
            el.dataset._prevTabindex = el.getAttribute('tabindex') ?? '__none__';
            el.setAttribute('tabindex', '-1');
        });

        return () => {
            inputs.forEach(el => {
                const prev = el.dataset._prevTabindex;
                delete el.dataset._prevTabindex;
                if (prev === '__none__') {
                    el.removeAttribute('tabindex');
                } else if (prev !== undefined) {
                    el.setAttribute('tabindex', prev);
                }
            });
        };
    }, [isMobile, isOpen]);

    const { data: servicesResponse, isLoading } = useQuery({
        queryKey: ['services', debouncedQuery],
        queryFn: () => servicesApi.getServices({
            search: debouncedQuery,
            page: 1,
            limit: 50,
            showInactive: false,
        }),
    });

    const services = servicesResponse?.services || [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const insideContainer = containerRef.current?.contains(target);
            const insideDropdown = dropdownRef.current?.contains(target);
            const insideSheet = sheetRef.current?.contains(target);
            if (!insideContainer && !insideDropdown && !insideSheet) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (value: string) => {
        setSearchQuery(value);
        setIsOpen(true);
    };

    const closeSheet = () => {
        setIsOpen(false);
        setSearchQuery('');
    };

    const openSheet = () => {
        // iOS only opens the keyboard from focus() called within a user gesture.
        // Mount a temporary off-screen contenteditable NOW (within the gesture),
        // open the keyboard, then transfer focus after the portal mounts.
        const tmp = document.createElement('div');
        tmp.contentEditable = 'true';
        tmp.setAttribute('inputmode', 'search');
        tmp.style.cssText = 'position:fixed;top:-200px;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(tmp);
        tmp.focus();

        setSearchQuery('');
        setIsOpen(true);

        // Transfer focus to the real search field after the portal renders (~2 frames)
        requestAnimationFrame(() => requestAnimationFrame(() => {
            sheetInputRef.current?.focus();
            document.body.removeChild(tmp);
        }));
    };

    const handleServiceSelect = (service: Service) => {
        onSelect(service);
        setSearchQuery('');
        setIsOpen(false);
        // Blur input to ensure dropdown closes
        inputRef.current?.blur();
    };

    const renderSuggestions = () => (
        <>
            {services.length > 0 ? (
                services.map((service) => {
                    const priceNet = service.basePriceNet / 100;
                    // Stored gross: exact, as entered when the service was created;
                    // re-deriving from net can drift by 1 grosz (201.00 → 200.99).
                    const priceGross = (service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate)) / 100;

                    return (
                        <SuggestionItem
                            key={service.id}
                            onClick={() => handleServiceSelect(service)}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <ServiceName>{service.name}</ServiceName>
                                    {service.isPackage && <PackageBadge>Pakiet</PackageBadge>}
                                </div>
                                {service.isPackage && service.packageItems && service.packageItems.length > 0 && (
                                    <PackageItemsHint>
                                        {service.packageItems.map(i => i.serviceName).join(' · ')}
                                    </PackageItemsHint>
                                )}
                            </div>
                            {service.requireManualPrice ? (
                                <PriceInfo>
                                    <div style={{ fontWeight: 600, color: '#f59e0b' }}>NIESTANDARDOWA</div>
                                </PriceInfo>
                            ) : (
                                <PriceInfo>
                                    <div>
                                        <PriceLabel>Netto:</PriceLabel> {formatCurrency(priceNet)}
                                    </div>
                                    <div>
                                        <PriceLabel>Brutto:</PriceLabel> {formatCurrency(priceGross)}
                                    </div>
                                </PriceInfo>
                            )}
                        </SuggestionItem>
                    );
                })
            ) : (
                <EmptyState>Nie znaleziono usług</EmptyState>
            )}
            {onAddNew && searchQuery.trim().length > 0 && (
                <AddNewButton onClick={() => {
                    onAddNew(searchQuery);
                    setSearchQuery('');
                    setIsOpen(false);
                    inputRef.current?.blur();
                }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <span>Wprowadź nową usługę</span>
                </AddNewButton>
            )}
        </>
    );

    // ── Mobile: tap-to-open bottom sheet (same UX as QuickEventModal) ────────
    if (isMobile) {
        return (
            <>
                <MobileAddServiceButton type="button" onClick={openSheet}>
                    <span>Wpisz nazwę usługi, aby dodać...</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </MobileAddServiceButton>

                {isOpen && createPortal(
                    <>
                        <MobileSheetBackdrop onClick={closeSheet} />
                        <MobileBottomSheet ref={sheetRef}>
                            <MobileSheetHandle />
                            <MobileSheetTitle>
                                <span>Wybierz usługę</span>
                                <MobileSheetClose
                                    type="button"
                                    aria-label="Zamknij"
                                    // Keep focus on the editable until the click lands; the
                                    // sheet then unmounts and the keyboard drops with it.
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={closeSheet}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </MobileSheetClose>
                            </MobileSheetTitle>
                            <MobileSheetSearchWrap>
                                <MobileSheetSearchEditable
                                    ref={sheetInputRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    role="searchbox"
                                    aria-label="Szukaj usługi"
                                    data-placeholder="Szukaj usługi..."
                                    inputMode="search"
                                    enterKeyHint="search"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    onInput={(e) => {
                                        const text = e.currentTarget.innerText.replace(/\n/g, '');
                                        setSearchQuery(text);
                                    }}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
                                        document.execCommand('insertText', false, text);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.preventDefault();
                                    }}
                                />
                                {searchQuery && (
                                    <ServiceSearchClear
                                        type="button"
                                        tabIndex={-1}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            if (sheetInputRef.current) {
                                                sheetInputRef.current.innerText = '';
                                            }
                                            setSearchQuery('');
                                            sheetInputRef.current?.focus();
                                        }}
                                        style={{ top: '50%', right: 26 }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </ServiceSearchClear>
                                )}
                            </MobileSheetSearchWrap>
                            <MobileSheetScrollable>
                                {isLoading ? (
                                    <EmptyState>Wyszukiwanie...</EmptyState>
                                ) : renderSuggestions()}
                            </MobileSheetScrollable>
                        </MobileBottomSheet>
                    </>,
                    document.body
                )}
            </>
        );
    }

    // ── Desktop: inline input + positioned portal dropdown ───────────────────
    return (
        <AutocompleteContainer ref={containerRef}>
            <StyledInput
                ref={inputRef}
                type="text"
                placeholder="Wpisz nazwę usługi, aby dodać..."
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
            />

            {isOpen && createPortal(
                <DropdownContainer
                    ref={dropdownRef}
                    // Do pierwszego pomiaru lista nie ma jeszcze miejsca na ekranie —
                    // pokazana bez niego mignęłaby w lewym górnym rogu okna.
                    style={{ ...dropdownStyle, visibility: dropdownStyle.width ? 'visible' : 'hidden' }}
                >
                    {isLoading ? (
                        <EmptyState>Wyszukiwanie...</EmptyState>
                    ) : renderSuggestions()}
                </DropdownContainer>,
                document.body
            )}
        </AutocompleteContainer>
    );
};
