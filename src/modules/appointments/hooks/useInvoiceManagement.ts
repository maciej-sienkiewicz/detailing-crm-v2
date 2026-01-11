// src/modules/appointments/hooks/useInvoiceManagement.ts
import { useState } from 'react';
import type { ServiceLineItem, Service } from '../types';

export const useInvoiceManagement = (
    services: ServiceLineItem[],
    onChange: (services: ServiceLineItem[]) => void
) => {
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [noteExpandedItem, setNoteExpandedItem] = useState<string | null>(null);

    const addService = (service: Service) => {
        const newService: ServiceLineItem = {
            id: `${Date.now()}`,
            serviceId: service.id,
            serviceName: service.name,
            basePriceNet: service.basePriceNet,
            vatRate: service.vatRate,
            adjustment: {
                type: 'FIXED_GROSS',
                value: 0,
            },
            note: '',
        };

        onChange([...services, newService]);
    };

    const removeService = (id: string) => {
        onChange(services.filter(s => s.id !== id));
        if (expandedItem === id) setExpandedItem(null);
        if (noteExpandedItem === id) setNoteExpandedItem(null);
    };

    const updateService = (id: string, updates: Partial<ServiceLineItem>) => {
        onChange(services.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const toggleDiscount = (id: string) => {
        setExpandedItem(expandedItem === id ? null : id);
        setNoteExpandedItem(null);
    };

    const toggleNote = (id: string) => {
        setNoteExpandedItem(noteExpandedItem === id ? null : id);
        setExpandedItem(null);
    };

    return {
        addService,
        removeService,
        updateService,
        toggleDiscount,
        toggleNote,
        expandedItem,
        noteExpandedItem,
    };
};