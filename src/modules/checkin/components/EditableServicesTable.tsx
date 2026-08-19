// src/modules/checkin/components/EditableServicesTable.tsx

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ServicesTable } from '@/common/components/ServicesTable';
import type { SaveServiceData } from '@/common/components/ServicesTable';
import { ServiceAutocomplete } from './ServiceAutocomplete';
import { ManualPriceModal } from './ManualPriceModal';
import type { ManualPriceResult } from './ManualPriceModal';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem } from '../types';
import type { Service, VatRate } from '@/modules/services/types';
import { servicesApi } from '@/modules/services/api/servicesApi';

export const EditableServicesTable = ({ services, onChange }: { services: ServiceLineItem[], onChange: (s: ServiceLineItem[]) => void }) => {
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

    return (
        <>
            <ServiceAutocomplete
                onSelect={handleServiceSelect}
                onAddNew={(q) => { setQuickServiceInitialName(q); setIsQuickServiceModalOpen(true); }}
            />

            <div style={{ marginTop: 12 }}>
                <ServicesTable services={services} onChange={onChange} onSaveService={handleSaveService} />
            </div>

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
