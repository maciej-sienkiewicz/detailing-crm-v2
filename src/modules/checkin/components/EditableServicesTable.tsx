// src/modules/checkin/components/EditableServicesTable.tsx
//
// Tabela wyceny wraz z drogą do cennika. Droga ma dwa układy, bo zależy od tego,
// ile miejsca dostała tabela:
//
//  - [stacked] (domyślny): pole z podpowiedziami nad tabelą. Tak działa przyjęcie
//    pojazdu i oznaczenie wiadomości jako leada - okna, w których tabela zajmuje
//    całą szerokość i nie ma obok niej wolnej kolumny;
//  - [split]: cennik jako panel OBOK tabeli, w którym klik dodaje pozycję. Pole
//    wymaga, żeby wiedzieć, czego się szuka; przy wycenie zapytania nie zawsze
//    się wie, więc cennik musi dać się przejrzeć wzrokiem jak menu.
//
// O tym, czy panel się zmieści, decyduje WŁASNA szerokość komponentu, a nie
// szerokość okna przeglądarki. To nie jest drobiazg: okno leada ma 1040-1400 px,
// ale edytor dostaje z tego jakieś 900, a po odjęciu panelu tabeli zostaje reszta.
// Zapytanie medialne na oknie mówiłoby „jest miejsce" także wtedy, gdy tabela ma
// realnie 240 px - czyli powtarzałoby dokładnie ten błąd, przez który ta tabela
// była nieczytalna w szynie.

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { ServicesTable } from '@/common/components/ServicesTable';
import type { SaveServiceData } from '@/common/components/ServicesTable';
import { ServiceAutocomplete } from './ServiceAutocomplete';
import { ServiceCatalogPanel } from './ServiceCatalogPanel';
import { ManualPriceModal } from './ManualPriceModal';
import type { ManualPriceResult } from './ManualPriceModal';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem } from '../types';
import type { Service, VatRate } from '@/modules/services/types';
import { servicesApi } from '@/modules/services/api/servicesApi';

/** Tabela z lewej, cennik z prawej. Panel ma stałą szerokość - to źródło, nie treść. */
const CATALOG_WIDTH = 300;
const CATALOG_GAP = 14;

/**
 * Ile miejsca musi mieć komponent, żeby panel cennika był zyskiem, a nie stratą.
 *
 * Tabela poniżej 560 px przechodzi w układ wąski (patrz ServicesTable), a panel
 * zabiera jej 314 px. Poniżej tej sumy panel odbierałby tabeli dokładnie to,
 * czego miał jej przysporzyć, więc wtedy wraca pole z podpowiedziami.
 */
const MIN_WIDTH_FOR_CATALOG = 560 + CATALOG_WIDTH + CATALOG_GAP + 6;

const SplitHost = styled.div`
    width: 100%;
    min-width: 0;
`;

const SplitGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) ${CATALOG_WIDTH}px;
    gap: ${CATALOG_GAP}px;
    align-items: start;
`;

/** Czy obok tabeli zmieści się cennik - mierzone na komponencie, nie na oknie. */
const useRoomForCatalog = (enabled: boolean) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const [hasRoom, setHasRoom] = useState(false);

    useEffect(() => {
        const element = hostRef.current;
        // Bez obserwatora (jsdom w testach) zostaje pole z podpowiedziami: układ
        // domyślny działa zawsze, więc to jest bezpieczniejsza strona pomyłki.
        if (!enabled || !element || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? 0;
            setHasRoom(width >= MIN_WIDTH_FOR_CATALOG);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [enabled]);

    return { hostRef, hasRoom };
};

export interface EditableServicesTableProps {
    services: ServiceLineItem[];
    onChange: (s: ServiceLineItem[]) => void;
    /**
     * Skąd bierze się nowa usługa. `split` wymaga co najmniej ~900 px szerokości
     * na cały komponent; przy węższym oknie i tak cofa się do pola.
     */
    layout?: 'stacked' | 'split';
}

export const EditableServicesTable = ({ services, onChange, layout = 'stacked' }: EditableServicesTableProps) => {
    const queryClient = useQueryClient();

    const handleSaveService = useCallback(async (serviceId: string, data: SaveServiceData): Promise<string | null> => {
        const updatedService = await servicesApi.updateService({
            originalServiceId: serviceId,
            name: data.name,
            basePriceNet: data.basePriceNet,
            basePriceGross: data.basePriceGross,
            vatRate: data.vatRate as VatRate,
            requireManualPrice: data.requireManualPrice,
        });
        queryClient.setQueryData<Service[]>(['services'], (old = []) =>
            old.map(s => s.id === serviceId ? updatedService : s)
        );
        return updatedService.id !== serviceId ? updatedService.id : null;
    }, [queryClient]);

    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [quickServiceInitialName, setQuickServiceInitialName] = useState('');

    const { hostRef, hasRoom } = useRoomForCatalog(layout === 'split');

    const openQuickService = useCallback((initialName: string) => {
        setQuickServiceInitialName(initialName);
        setIsQuickServiceModalOpen(true);
    }, []);

    /**
     * Ile razy każda usługa stoi już w wycenie. Bez tej liczby klik w pozycję
     * cennika nie zostawia po sobie śladu w panelu - lista wygląda tak samo przed
     * i po dodaniu, więc nie wiadomo, czy kliknięcie w ogóle weszło.
     */
    const usageByServiceId = useMemo(() => {
        const usage: Record<string, number> = {};
        for (const line of services) {
            if (line.serviceId) usage[line.serviceId] = (usage[line.serviceId] ?? 0) + 1;
        }
        return usage;
    }, [services]);
    // Usługa czekająca na podanie ceny; jej obecność otwiera modal.
    const [pendingManualPriceService, setPendingManualPriceService] = useState<Service | null>(null);

    const handleServiceSelect = (s: Service) => {
        if (s.requireManualPrice) {
            setPendingManualPriceService(s);
        } else {
            onChange([...services, {
                id: `${s.id}_${Date.now()}`,
                serviceId: s.id,
                serviceName: s.name,
                basePriceNet: s.basePriceNet,
                basePriceGross: s.basePriceGross,
                vatRate: s.vatRate,
                adjustment: { type: 'PERCENT', value: 0 },
                note: '',
                requireManualPrice: false,
                isPackage: s.isPackage || false,
                packageItems: s.packageItems ?? null,
            }]);
        }
    };

    const handleConfirmManualPrice = ({ basePriceNet, basePriceGross, vatRate }: ManualPriceResult) => {
        const s = pendingManualPriceService;
        if (!s) return;
        onChange([...services, {
            id: `${s.id}_${Date.now()}`,
            serviceId: s.id,
            serviceName: s.name,
            basePriceNet,
            basePriceGross,
            vatRate,
            adjustment: { type: 'PERCENT', value: 0 },
            note: '',
            requireManualPrice: true,
            isPackage: s.isPackage || false,
            packageItems: s.packageItems ?? null,
        }]);
        setPendingManualPriceService(null);
    };

    const table = (
        <ServicesTable services={services} onChange={onChange} onSaveService={handleSaveService} />
    );

    const stacked = (
        <>
            <ServiceAutocomplete
                onSelect={handleServiceSelect}
                onAddNew={openQuickService}
            />
            <div style={{ marginTop: 12 }}>{table}</div>
        </>
    );

    return (
        <>
            {/* Obudowa TYLKO w układzie dzielonym - w domyślnym komponent oddaje
                swoje dzieci wprost do rodzica, tak jak dotąd, i nic mu się nie
                zmienia w odstępach. */}
            {layout === 'split' ? (
                <SplitHost ref={hostRef}>
                    {hasRoom ? (
                        <SplitGrid>
                            <div>{table}</div>
                            <ServiceCatalogPanel
                                onSelect={handleServiceSelect}
                                onAddNew={openQuickService}
                                usageByServiceId={usageByServiceId}
                            />
                        </SplitGrid>
                    ) : stacked}
                </SplitHost>
            ) : stacked}

            <QuickServiceModal
                isOpen={isQuickServiceModalOpen}
                onClose={() => setIsQuickServiceModalOpen(false)}
                initialServiceName={quickServiceInitialName}
                onServiceCreate={(s) => {
                    if (s.id) queryClient.invalidateQueries({ queryKey: ['services'] });
                    onChange([...services, {
                        id: `temp_${Date.now()}`,
                        serviceId: s.id || null,
                        serviceName: s.name,
                        basePriceNet: s.basePriceNet,
                        basePriceGross: s.basePriceGross,
                        vatRate: s.vatRate,
                        adjustment: { type: 'PERCENT', value: 0 },
                        note: '',
                    }]);
                }}
            />

            {pendingManualPriceService && (
                <ManualPriceModal
                    // Remount na każdą usługę zeruje pola bez efektu synchronizującego stan.
                    key={pendingManualPriceService.id}
                    isOpen
                    service={pendingManualPriceService}
                    onClose={() => setPendingManualPriceService(null)}
                    onConfirm={handleConfirmManualPrice}
                />
            )}
        </>
    );
};
