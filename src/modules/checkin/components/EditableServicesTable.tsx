// src/modules/checkin/components/EditableServicesTable.tsx

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/common/components/Form';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, ModalCloseButton } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { ServicesTable } from '@/common/components/ServicesTable';
import { ServiceAutocomplete } from './ServiceAutocomplete';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { formatCurrency } from '@/common/utils';
import styled from 'styled-components';
import type { ServiceLineItem } from '../types';
import type { Service } from '@/modules/services/types';

const ModalFieldLabel = styled.p`
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const ModalTotalInfo = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    color: #64748b;
`;

const PriceModeToggle = styled.div`
    display: flex;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    margin-bottom: 12px;
`;

const PriceModeBtn = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 6px 0;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: ${p => p.$active ? 600 : 400};
    background: ${p => p.$active ? '#2563eb' : 'transparent'};
    color: ${p => p.$active ? '#fff' : '#64748b'};
    transition: background 150ms ease, color 150ms ease;
    &:hover { background: ${p => p.$active ? '#1d4ed8' : '#f1f5f9'}; }
`;

export const EditableServicesTable = ({ services, onChange }: { services: ServiceLineItem[], onChange: (s: ServiceLineItem[]) => void }) => {
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [quickServiceInitialName, setQuickServiceInitialName] = useState('');
    const [isManualPriceModalOpen, setIsManualPriceModalOpen] = useState(false);
    const [pendingManualPriceService, setPendingManualPriceService] = useState<Service | null>(null);
    const [manualPriceInput, setManualPriceInput] = useState('');
    const [manualPriceMode, setManualPriceMode] = useState<'NET' | 'GROSS'>('GROSS');
    const queryClient = useQueryClient();

    const handleServiceSelect = (s: Service) => {
        if (s.requireManualPrice) {
            setPendingManualPriceService(s);
            setManualPriceInput('');
            setManualPriceMode('GROSS');
            setIsManualPriceModalOpen(true);
        } else {
            onChange([...services, {
                id: `${s.id}_${Date.now()}`,
                serviceId: s.id,
                serviceName: s.name,
                basePriceNet: s.basePriceNet,
                vatRate: s.vatRate,
                adjustment: { type: 'PERCENT', value: 0 },
                note: '',
                requireManualPrice: false,
            }]);
        }
    };

    const handleConfirmManualPrice = () => {
        if (!pendingManualPriceService) return;
        const parsed = parseFloat(manualPriceInput.replace(',', '.'));
        if (isNaN(parsed) || parsed < 0) return;
        const s = pendingManualPriceService;
        const valueCents = Math.round(parsed * 100);
        const basePriceNet = manualPriceMode === 'GROSS'
            ? (s.vatRate <= 0 ? valueCents : Math.round((valueCents * 100) / (100 + s.vatRate)))
            : valueCents;
        onChange([...services, {
            id: `${s.id}_${Date.now()}`,
            serviceId: s.id,
            serviceName: s.name,
            basePriceNet,
            vatRate: s.vatRate,
            adjustment: { type: 'PERCENT', value: 0 },
            note: '',
            requireManualPrice: true,
        }]);
        setIsManualPriceModalOpen(false);
        setPendingManualPriceService(null);
        setManualPriceInput('');
    };

    return (
        <>
            <ServiceAutocomplete
                onSelect={handleServiceSelect}
                onAddNew={(q) => { setQuickServiceInitialName(q); setIsQuickServiceModalOpen(true); }}
            />

            <div style={{ marginTop: 12 }}>
                <ServicesTable services={services} onChange={onChange} />
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
                        vatRate: s.vatRate,
                        adjustment: { type: 'PERCENT', value: 0 },
                        note: '',
                    }]);
                }}
            />

            <ModalShell
                isOpen={isManualPriceModalOpen}
                onClose={() => { setIsManualPriceModalOpen(false); setPendingManualPriceService(null); }}
                size="sm"
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Podaj cenę usługi</ModalTitle>
                    </ModalTitleGroup>
                    <ModalCloseButton
                        type="button"
                        onClick={() => { setIsManualPriceModalOpen(false); setPendingManualPriceService(null); }}
                        aria-label="Zamknij"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </ModalCloseButton>
                </ModalHeader>
                <ModalContent>
                    {pendingManualPriceService && (
                        <div style={{ marginBottom: 12, fontWeight: 600, color: '#0f172a' }}>
                            {pendingManualPriceService.name}
                        </div>
                    )}
                    <PriceModeToggle>
                        <PriceModeBtn
                            type="button"
                            $active={manualPriceMode === 'GROSS'}
                            onClick={() => { setManualPriceMode('GROSS'); setManualPriceInput(''); }}
                        >
                            Brutto
                        </PriceModeBtn>
                        <PriceModeBtn
                            type="button"
                            $active={manualPriceMode === 'NET'}
                            onClick={() => { setManualPriceMode('NET'); setManualPriceInput(''); }}
                        >
                            Netto
                        </PriceModeBtn>
                    </PriceModeToggle>
                    <div>
                        <ModalFieldLabel>Cena {manualPriceMode === 'GROSS' ? 'brutto' : 'netto'} (PLN)</ModalFieldLabel>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={manualPriceInput}
                            onChange={e => setManualPriceInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmManualPrice(); } }}
                            placeholder="0.00"
                            autoFocus
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        {manualPriceInput && !isNaN(parseFloat(manualPriceInput.replace(',', '.'))) && pendingManualPriceService && (() => {
                            const parsed = parseFloat(manualPriceInput.replace(',', '.'));
                            const vat = pendingManualPriceService.vatRate;
                            const other = manualPriceMode === 'GROSS'
                                ? parsed / (1 + vat / 100)
                                : parsed * (1 + vat / 100);
                            const otherLabel = manualPriceMode === 'GROSS' ? 'Netto' : 'Brutto';
                            return (
                                <ModalTotalInfo>
                                    {otherLabel} ({vat}% VAT): <strong>{formatCurrency(other)}</strong>
                                </ModalTotalInfo>
                            );
                        })()}
                    </div>
                </ModalContent>
                <ModalFooter>
                    <SharedButton
                        $variant="secondary"
                        $size="sm"
                        type="button"
                        onClick={() => { setIsManualPriceModalOpen(false); setPendingManualPriceService(null); }}
                    >
                        Anuluj
                    </SharedButton>
                    <SharedButton
                        $variant="primary"
                        $size="sm"
                        type="button"
                        onClick={handleConfirmManualPrice}
                        disabled={!manualPriceInput || isNaN(parseFloat(manualPriceInput.replace(',', '.')))}
                    >
                        Dodaj usługę
                    </SharedButton>
                </ModalFooter>
            </ModalShell>
        </>
    );
};
