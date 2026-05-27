import { useState } from 'react';
import { applyAdjustment, distributeAdjustment } from '@/common/utils/priceAdjustment';
import type { AdjustmentType, PriceAdjustment } from '@/common/utils/priceAdjustment';
import * as S from './styles';

export interface ServiceLineItem {
    id: string;
    serviceId: string | null;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    note?: string;
    requireManualPrice?: boolean;
}

interface Props {
    services: ServiceLineItem[];
    onChange: (services: ServiceLineItem[]) => void;
}

const DISCOUNT_TYPES: { type: AdjustmentType; label: string }[] = [
    { type: 'PERCENT', label: '%' },
    { type: 'FIXED_NET', label: '−Netto' },
    { type: 'FIXED_GROSS', label: '−Brutto' },
    { type: 'SET_NET', label: '=Netto' },
    { type: 'SET_GROSS', label: '=Brutto' },
];

const IconPercent = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);

const IconMessageSquare = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const IconTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export const ServicesTable = ({ services, onChange }: Props) => {
    const [expandedDiscount, setExpandedDiscount] = useState<string | null>(null);
    const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
    const [expandedNote, setExpandedNote] = useState<string | null>(null);
    const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
    const [bulkDiscountType, setBulkDiscountType] = useState<AdjustmentType>('PERCENT');
    const [bulkDiscountValue, setBulkDiscountValue] = useState('');

    const getServicePrice = (service: ServiceLineItem) => {
        const result = applyAdjustment(service.basePriceNet, service.vatRate, service.adjustment);
        const baseGrossCents = service.basePriceNet + Math.round(service.basePriceNet * service.vatRate / 100);
        return {
            baseNet: service.basePriceNet / 100,
            baseGross: baseGrossCents / 100,
            finalNet: result.finalNetCents / 100,
            finalGross: result.finalGrossCents / 100,
            hasDiscount: result.hasDiscount,
        };
    };

    const applyBulkDiscount = () => {
        const val = parseFloat(bulkDiscountValue.replace(',', '.'));
        if (isNaN(val) || val <= 0) return;
        const valueInCents = bulkDiscountType === 'PERCENT' ? val : Math.round(val * 100);
        const bases = services.map(s => ({ basePriceNetCents: s.basePriceNet, vatRate: s.vatRate }));
        const adjustments = distributeAdjustment(bases, bulkDiscountType, valueInCents);
        onChange(services.map((s, i) => ({ ...s, adjustment: adjustments[i] })));
        setBulkDiscountOpen(false);
        setBulkDiscountValue('');
    };

    let totalNet = 0;
    let totalGross = 0;
    services.forEach(s => {
        const p = getServicePrice(s);
        totalNet += p.finalNet;
        totalGross += p.finalGross;
    });
    const totalVat = Math.round((totalGross - totalNet) * 100) / 100;
    totalNet = Math.round(totalNet * 100) / 100;
    totalGross = Math.round(totalGross * 100) / 100;

    return (
        <>
            <S.ServicesBlock>
                <S.ServicesTableHeader>
                    <S.ServicesHeaderCell>Usługa</S.ServicesHeaderCell>
                    <S.ServicesHeaderCell>Netto</S.ServicesHeaderCell>
                    <S.ServicesHeaderCell>Brutto</S.ServicesHeaderCell>
                    <S.ServicesHeaderCell />
                </S.ServicesTableHeader>

                <S.ServicesList>
                    {services.map(service => {
                        const prices = getServicePrice(service);
                        const { hasDiscount, finalNet, finalGross, baseNet, baseGross } = prices;
                        const isDiscountExpanded = expandedDiscount === service.id;
                        const isNoteExpanded = expandedNote === service.id;
                        const hasNote = !!(service.note && service.note.length > 0);

                        const adj = service.adjustment;
                        const discountSuffix = adj.type === 'PERCENT' ? '%' : 'zł';
                        const discountDisplayValue = discountDrafts[service.id] !== undefined
                            ? discountDrafts[service.id]
                            : (adj.value === 0 ? ''
                                : adj.type === 'PERCENT'
                                    ? String(Math.abs(adj.value))
                                    : String(adj.value / 100));

                        return (
                            <S.ServiceItem key={service.id} $hasDiscount={hasDiscount}>
                                <S.ServiceItemRow>
                                    <S.ServiceName title={service.serviceName}>{service.serviceName}</S.ServiceName>

                                    <S.PriceDisplay>
                                        <S.PriceDisplayMain $isDiscounted={hasDiscount}>{finalNet.toFixed(2)}</S.PriceDisplayMain>
                                        {hasDiscount && <S.PriceDisplayOriginal>{baseNet.toFixed(2)}</S.PriceDisplayOriginal>}
                                    </S.PriceDisplay>
                                    <S.PriceDisplay>
                                        <S.PriceDisplayMain $isBrutto $isDiscounted={hasDiscount}>{finalGross.toFixed(2)}</S.PriceDisplayMain>
                                        {hasDiscount && <S.PriceDisplayOriginal>{baseGross.toFixed(2)}</S.PriceDisplayOriginal>}
                                    </S.PriceDisplay>

                                    <S.ServiceActions>
                                        <S.DiscountButton
                                            type="button"
                                            onClick={() => setExpandedDiscount(isDiscountExpanded ? null : service.id)}
                                            $active={hasDiscount}
                                            title={hasDiscount ? 'Edytuj rabat' : 'Dodaj rabat'}
                                        >
                                            <IconPercent />
                                        </S.DiscountButton>
                                        <S.IconButton
                                            type="button"
                                            onClick={() => setExpandedNote(isNoteExpanded ? null : service.id)}
                                            $active={hasNote}
                                            title="Notatka do usługi"
                                        >
                                            <IconMessageSquare />
                                        </S.IconButton>
                                        <S.DeleteButton
                                            type="button"
                                            onClick={() => {
                                                onChange(services.filter(s => s.id !== service.id));
                                                if (expandedDiscount === service.id) setExpandedDiscount(null);
                                                if (expandedNote === service.id) setExpandedNote(null);
                                                setDiscountDrafts(prev => { const n = { ...prev }; delete n[service.id]; return n; });
                                            }}
                                        >
                                            <IconTrash />
                                        </S.DeleteButton>
                                    </S.ServiceActions>
                                </S.ServiceItemRow>

                                {isDiscountExpanded && (
                                    <S.DiscountPanel>
                                        <S.DiscountTypeRow>
                                            {DISCOUNT_TYPES.map(({ type, label }) => (
                                                <S.DiscountTypePill
                                                    key={type}
                                                    type="button"
                                                    $selected={adj.type === type}
                                                    onClick={() => {
                                                        onChange(services.map(s => s.id === service.id
                                                            ? { ...s, adjustment: { type, value: 0 } }
                                                            : s
                                                        ));
                                                        setDiscountDrafts(prev => ({ ...prev, [service.id]: '' }));
                                                    }}
                                                >
                                                    {label}
                                                </S.DiscountTypePill>
                                            ))}
                                        </S.DiscountTypeRow>
                                        <S.DiscountValueRow>
                                            <S.DiscountValueInput
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={discountDisplayValue}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    setDiscountDrafts(prev => ({ ...prev, [service.id]: raw }));
                                                    const val = parseFloat(raw.replace(',', '.'));
                                                    const storeVal = isNaN(val) ? 0
                                                        : adj.type === 'PERCENT'
                                                            ? -Math.abs(val)
                                                            : Math.round(val * 100);
                                                    onChange(services.map(s => s.id === service.id
                                                        ? { ...s, adjustment: { ...s.adjustment, value: storeVal } }
                                                        : s
                                                    ));
                                                }}
                                                onBlur={() => {
                                                    setDiscountDrafts(prev => { const n = { ...prev }; delete n[service.id]; return n; });
                                                }}
                                            />
                                            <S.DiscountValueSuffix>{discountSuffix}</S.DiscountValueSuffix>
                                            <S.DiscountActionButtons>
                                                {hasDiscount && (
                                                    <S.DiscountRemoveButton
                                                        type="button"
                                                        onClick={() => {
                                                            onChange(services.map(s => s.id === service.id
                                                                ? { ...s, adjustment: { type: 'PERCENT', value: 0 } }
                                                                : s
                                                            ));
                                                            setDiscountDrafts(prev => { const n = { ...prev }; delete n[service.id]; return n; });
                                                        }}
                                                    >
                                                        Usuń rabat
                                                    </S.DiscountRemoveButton>
                                                )}
                                                <S.DiscountHideButton
                                                    type="button"
                                                    onClick={() => setExpandedDiscount(null)}
                                                >
                                                    Ukryj
                                                </S.DiscountHideButton>
                                            </S.DiscountActionButtons>
                                        </S.DiscountValueRow>
                                    </S.DiscountPanel>
                                )}

                                {isNoteExpanded && (
                                    <S.ServiceNoteContainer>
                                        <S.ServiceNoteTextarea
                                            placeholder="Notatka do usługi..."
                                            value={service.note || ''}
                                            onChange={(e) => onChange(services.map(s => s.id === service.id
                                                ? { ...s, note: e.target.value }
                                                : s
                                            ))}
                                            rows={2}
                                        />
                                    </S.ServiceNoteContainer>
                                )}
                            </S.ServiceItem>
                        );
                    })}
                </S.ServicesList>

                <S.SummarySection>
                    <S.BulkDiscountTrigger
                        type="button"
                        onClick={() => { setBulkDiscountOpen(true); setBulkDiscountValue(''); }}
                        title="Zastosuj rabat do wszystkich usług"
                        disabled={services.length === 0}
                    >
                        <IconPercent />
                        Rabatuj wszystko
                    </S.BulkDiscountTrigger>
                    <S.SummaryTotals>
                        <S.SummaryItem>
                            <S.SummaryLabel>Netto</S.SummaryLabel>
                            <S.SummaryValue>{totalNet.toFixed(2)} zł</S.SummaryValue>
                        </S.SummaryItem>
                        <S.SummaryItem>
                            <S.SummaryLabel>VAT</S.SummaryLabel>
                            <S.SummaryValue>{totalVat.toFixed(2)} zł</S.SummaryValue>
                        </S.SummaryItem>
                        <S.SummaryItem>
                            <S.SummaryLabel>Łącznie</S.SummaryLabel>
                            <S.SummaryValue $isTotal>{totalGross.toFixed(2)} zł</S.SummaryValue>
                        </S.SummaryItem>
                    </S.SummaryTotals>
                </S.SummarySection>
            </S.ServicesBlock>

            {bulkDiscountOpen && (
                <S.BulkDiscountOverlay onClick={() => setBulkDiscountOpen(false)}>
                    <S.BulkDiscountCard onClick={(e) => e.stopPropagation()}>
                        <S.BulkDiscountHeader>
                            <S.BulkDiscountTitle>Rabatuj wszystko</S.BulkDiscountTitle>
                            <S.CloseIconButton type="button" onClick={() => setBulkDiscountOpen(false)}>
                                <IconX />
                            </S.CloseIconButton>
                        </S.BulkDiscountHeader>
                        <S.BulkDiscountBody>
                            <S.DiscountTypeRow>
                                {DISCOUNT_TYPES.map(({ type, label }) => (
                                    <S.DiscountTypePill
                                        key={type}
                                        type="button"
                                        $selected={bulkDiscountType === type}
                                        onClick={() => { setBulkDiscountType(type); setBulkDiscountValue(''); }}
                                    >
                                        {label}
                                    </S.DiscountTypePill>
                                ))}
                            </S.DiscountTypeRow>
                            <S.DiscountValueRow>
                                <S.DiscountValueInput
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={bulkDiscountValue}
                                    onChange={(e) => setBulkDiscountValue(e.target.value)}
                                    autoFocus
                                />
                                <S.DiscountValueSuffix>
                                    {bulkDiscountType === 'PERCENT' ? '%' : 'zł'}
                                </S.DiscountValueSuffix>
                            </S.DiscountValueRow>
                        </S.BulkDiscountBody>
                        <S.BulkDiscountFooter>
                            <S.BulkDiscountCancelBtn type="button" onClick={() => setBulkDiscountOpen(false)}>
                                Anuluj
                            </S.BulkDiscountCancelBtn>
                            <S.BulkDiscountApplyBtn
                                type="button"
                                onClick={applyBulkDiscount}
                                disabled={!bulkDiscountValue || parseFloat(bulkDiscountValue.replace(',', '.')) <= 0}
                            >
                                Zastosuj
                            </S.BulkDiscountApplyBtn>
                        </S.BulkDiscountFooter>
                    </S.BulkDiscountCard>
                </S.BulkDiscountOverlay>
            )}
        </>
    );
};
