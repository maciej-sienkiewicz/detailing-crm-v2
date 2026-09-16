// src/modules/checkin/components/ServiceCatalogPanel.tsx
//
// Cennik stojący OBOK tabeli wyceny: lista usług, w której klik dodaje pozycję.
//
// Dlaczego panel, a nie samo pole z podpowiedziami. Pole wymaga, żeby wiedzieć,
// czego się szuka, i zacząć od pisania - a przy wycenie zapytania nie zawsze się
// wie. Szuka się wtedy po cenniku tak, jak po menu: przelatuje wzrokiem, co
// warsztat w ogóle robi, i składa z tego ofertę. Pole odpowiada na pytanie
// „gdzie jest usługa X", panel odpowiada na „co możemy zaproponować" - i dopiero
// to drugie jest pytaniem, które pada przy leadzie.
//
// Szukajka zostaje NAD listą i tylko ją zawęża. Nie jest jedyną drogą do usługi,
// więc nie musi być celna: trzy litery skracają listę, a resztę robi wzrok.
//
// Panel jest dodatkiem do pola, nie jego zamiennikiem. Poniżej ~1024 px nie ma
// dla niego miejsca obok tabeli i wtedy wraca ServiceAutocomplete - patrz
// EditableServicesTable.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { useDebounce } from '@/common/hooks';
import { formatCurrency } from '@/common/utils';
import { netToGross } from '@/common/utils/priceAdjustment';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { Service } from '@/modules/services/types';

/** Ile pozycji ściągamy na raz. Powyżej tego szukajka przestaje być opcjonalna. */
const PAGE_SIZE = 100;

const Panel = styled.aside`
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    background: ${p => p.theme.colors.surface};
    overflow: hidden;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceHover};
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};

    .total {
        margin-left: auto;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
    }
`;

const SearchWrap = styled.div`
    position: relative;
    padding: 8px 10px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};

    svg.magnifier {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 14px;
        height: 14px;
        color: ${p => p.theme.colors.textMuted};
        pointer-events: none;
    }

    input {
        width: 100%;
        padding: 7px 28px 7px 30px;
        font-family: inherit;
        font-size: 13px;
        color: ${p => p.theme.colors.text};
        background: ${p => p.theme.colors.surfaceAlt};
        border: 1px solid transparent;
        border-radius: ${p => p.theme.radii.md};
        transition: all ${p => p.theme.transitions.fast};

        &::placeholder { color: ${p => p.theme.colors.textMuted}; }
        &:focus-visible {
            outline: none;
            background: ${p => p.theme.colors.surface};
            border-color: var(--brand-primary);
        }
    }

    button.clear {
        position: absolute;
        right: 18px;
        top: 50%;
        transform: translateY(-50%);
        display: inline-flex;
        border: none;
        background: none;
        padding: 2px;
        cursor: pointer;
        color: ${p => p.theme.colors.textMuted};

        svg { width: 13px; height: 13px; }
        &:hover { color: ${p => p.theme.colors.text}; }
    }
`;

/**
 * Lista ma własne przewijanie i własny sufit wysokości. Bez sufitu rosłaby razem
 * z cennikiem i wypychała tabelę wyceny poza ekran - a to tabela jest tu treścią,
 * cennik tylko źródłem.
 */
const Scroll = styled.div`
    flex: 1;
    min-height: 0;
    max-height: 460px;
    overflow-y: auto;
    overscroll-behavior: contain;
`;

const GroupLabel = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 12px;
    background: ${p => p.theme.colors.surfaceHover};
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    font-size: 10.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Wiersz cennika jako przycisk. Plusik pojawia się pod kursorem, a nie stoi
 * stale: przy czterdziestu pozycjach czterdzieści plusików to nie podpowiedź,
 * tylko tapeta. Na dotyku (brak kursora) jest widoczny od razu.
 */
const Row = styled.button`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 4px 8px;
    width: 100%;
    padding: 8px 10px 8px 12px;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceHover};
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast};

    &:last-child { border-bottom: none; }
    &:hover { background: color-mix(in srgb, var(--brand-primary) 7%, transparent); }
    &:focus-visible {
        outline: 2px solid var(--brand-primary);
        outline-offset: -2px;
    }

    .name {
        min-width: 0;
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${p => p.theme.colors.text};
        overflow-wrap: anywhere;
    }

    .price {
        font-size: 12.5px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        color: ${p => p.theme.colors.textSecondary};
    }

    /* „cena ustalana": kwota pojawi się dopiero w modalu, więc tu jest słowo,
       a nie zero - zero wyglądałoby jak usługa za darmo. */
    .price.manual {
        font-size: 11px;
        color: ${p => p.theme.colors.warning};
    }

    .plus {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: ${p => p.theme.radii.sm};
        color: var(--brand-primary);
        opacity: 0;
        transition: opacity ${p => p.theme.transitions.fast};

        svg { width: 14px; height: 14px; }
    }
    &:hover .plus, &:focus-visible .plus { opacity: 1; }
    @media (hover: none) { .plus { opacity: 1; } }

    /* Ile razy ta usługa stoi już w wycenie. Bez tego przy dodaniu drugiej sztuki
       nie ma sygnału, że pierwsza w ogóle weszła - lista się nie zmienia. */
    .used {
        grid-column: 2;
        justify-self: end;
        padding: 0 5px;
        border-radius: ${p => p.theme.radii.full};
        background: color-mix(in srgb, var(--brand-primary) 13%, transparent);
        color: var(--brand-primary);
        font-size: 10px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        line-height: 16px;
        font-variant-numeric: tabular-nums;
    }
`;

const Info = styled.div`
    padding: 18px 14px;
    text-align: center;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textMuted};
`;

const Foot = styled.div`
    padding: 8px 10px;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceHover};
`;

const AddNewButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px;
    border: 1px dashed ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    svg { width: 14px; height: 14px; }

    &:hover {
        border-color: var(--brand-primary);
        border-style: solid;
        color: var(--brand-primary);
    }
    &:focus-visible {
        outline: 2px solid var(--brand-primary);
        outline-offset: 1px;
    }
`;

export interface ServiceCatalogPanelProps {
    /** Klik w pozycję cennika - dodaje ją do wyceny. */
    onSelect: (service: Service) => void;
    /** „Nowa usługa" z wpisaną frazą jako nazwą startową. */
    onAddNew: (initialName: string) => void;
    /** Ile razy każda usługa stoi już w wycenie, po `serviceId`. */
    usageByServiceId?: Record<string, number>;
    className?: string;
}

export function ServiceCatalogPanel({
    onSelect,
    onAddNew,
    usageByServiceId,
    className,
}: ServiceCatalogPanelProps) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 250);

    // Ten sam kształt klucza co w ServiceAutocomplete - obie drogi do cennika
    // dzielą pamięć podręczną, więc przełączenie układu nie kosztuje zapytania.
    const { data, isLoading, isError } = useQuery({
        queryKey: ['services', debouncedQuery, 'catalog-panel'],
        queryFn: () => servicesApi.getServices({
            search: debouncedQuery,
            page: 1,
            limit: PAGE_SIZE,
            showInactive: false,
            sortBy: 'name',
            sortDirection: 'asc',
        }),
    });

    const services = useMemo(() => data?.services ?? [], [data]);
    // Łańcuch opcjonalny na całej drodze: odpowiedź bez stronicowania nie jest
    // błędem do wysypania widoku, tylko brakiem liczby do pokazania.
    const total = data?.pagination?.totalItems ?? 0;

    // Pakiety na górze: to one są gotową odpowiedzią na „ile za całość", a pojedyncze
    // usługi dokłada się do nich, a nie odwrotnie.
    const groups = useMemo(() => {
        const packages = services.filter((s) => s.isPackage);
        const singles = services.filter((s) => !s.isPackage);
        return [
            { key: 'packages', label: 'Pakiety', items: packages },
            { key: 'singles', label: 'Usługi', items: singles },
        ].filter((group) => group.items.length > 0);
    }, [services]);

    const renderRow = (service: Service) => {
        // Dokładne brutto z cennika wygrywa; przeliczenie z netta jest ostatecznością
        // i potrafi się rozminąć o grosz (CLAUDE.md §1).
        const grossCents = service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate);
        const used = usageByServiceId?.[service.id] ?? 0;
        return (
            <Row
                key={service.id}
                type="button"
                onClick={() => onSelect(service)}
                title={`Dodaj do wyceny: ${service.name}`}
            >
                <span className="name">{service.name}</span>
                {used > 0 && <span className="used">×{used}</span>}
                {service.requireManualPrice
                    ? <span className="price manual">cena ustalana</span>
                    : <span className="price">{formatCurrency(grossCents / 100)}</span>}
                <span className="plus" aria-hidden="true"><Plus /></span>
            </Row>
        );
    };

    return (
        <Panel className={className}>
            <Head>
                Cennik
                {total > 0 && (
                    <span className="total">
                        {services.length < total ? `${services.length} z ${total}` : total}
                    </span>
                )}
            </Head>

            <SearchWrap>
                <Search className="magnifier" />
                <input
                    type="search"
                    value={query}
                    placeholder="Szukaj w cenniku…"
                    aria-label="Szukaj w cenniku"
                    onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                    <button
                        type="button"
                        className="clear"
                        aria-label="Wyczyść wyszukiwanie"
                        onClick={() => setQuery('')}
                    >
                        <X />
                    </button>
                )}
            </SearchWrap>

            <Scroll>
                {isLoading && <Info>Wczytuję cennik…</Info>}
                {isError && <Info>Nie udało się wczytać cennika. Spróbuj ponownie za chwilę.</Info>}
                {!isLoading && !isError && services.length === 0 && (
                    <Info>
                        {debouncedQuery
                            ? <>Nic nie pasuje do „{debouncedQuery}".</>
                            : <>Cennik jest jeszcze pusty.</>}
                    </Info>
                )}
                {groups.map((group) => (
                    <div key={group.key}>
                        {/* Etykieta grupy tylko wtedy, gdy grupy są dwie - przy samych
                            usługach „USŁUGI" nad wszystkim niczego nie rozdziela. */}
                        {groups.length > 1 && <GroupLabel>{group.label}</GroupLabel>}
                        {group.items.map(renderRow)}
                    </div>
                ))}
                {services.length < total && (
                    <Info>Pokazujemy {services.length} z {total} pozycji — zawęź wyszukiwanie.</Info>
                )}
            </Scroll>

            <Foot>
                <AddNewButton type="button" onClick={() => onAddNew(query)}>
                    <Plus />
                    {query ? <>Dodaj „{query}" do cennika</> : <>Nowa usługa</>}
                </AddNewButton>
            </Foot>
        </Panel>
    );
}
