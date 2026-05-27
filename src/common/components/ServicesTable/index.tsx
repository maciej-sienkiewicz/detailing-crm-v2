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

const IconCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const ServicesTable = ({ services, onChange }: Props) => {
    const [expandedNote, setExpandedNote] = useState<string | null>(null);

    // Per-service discount modal state
    const [discountModalId, setDiscountModalId] = useState<string | null>(null);
    const [discountModalType, setDiscountModalType] = useState<AdjustmentType>('PERCENT');
    const [discountModalValue, setDiscountModalValue] = useState('');

    // Bulk discount modal state
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

    const openDiscountModal = (service: ServiceLineItem) => {
        const adj = service.adjustment;
        setDiscountModalId(service.id);
        setDiscountModalType(adj.type);
        setDiscountModalValue(
            adj.value === 0 ? ''
                : adj.type === 'PERCENT'
                    ? String(Math.abs(adj.value))
                    : String(adj.value / 100)
        );
    };

    const closeDiscountModal = () => {
        setDiscountModalId(null);
        setDiscountModalValue('');
    };

    const applyServiceDiscount = () => {
        if (!discountModalId) return;
        const val = parseFloat(discountModalValue.replace(',', '.'));
        const storeVal = isNaN(val) ? 0
            : discountModalType === 'PERCENT'
                ? -Math.abs(val)
                : Math.round(val * 100);
        onChange(services.map(s => s.id === discountModalId
            ? { ...s, adjustment: { type: discountModalType, value: storeVal } }
            : s
        ));
        closeDiscountModal();
    };

    const removeServiceDiscount = () => {
        if (!discountModalId) return;
        onChange(services.map(s => s.id === discountModalId
            ? { ...s, adjustment: { type: 'PERCENT', value: 0 } }
            : s
        ));
        closeDiscountModal();
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

    const discountModalService = discountModalId ? services.find(s => s.id === discountModalId) : null;
    const discountModalPrices = discountModalService ? getServicePrice(discountModalService) : null;
    const discountModalHasDiscount = discountModalPrices?.hasDiscount ?? false;

    const bulkBaseNet = Math.round(services.reduce((sum, s) => sum + s.basePriceNet, 0)) / 100;
    const bulkBaseGross = Math.round(services.reduce((sum, s) => {
        return sum + s.basePriceNet + Math.round(s.basePriceNet * s.vatRate / 100);
    }, 0)) / 100;

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
                        const isNoteExpanded = expandedNote === service.id;
                        const hasNote = !!(service.note && service.note.length > 0);

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
                                            onClick={() => openDiscountModal(service)}
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
                                                if (expandedNote === service.id) setExpandedNote(null);
                                            }}
                                        >
                                            <IconTrash />
                                        </S.DeleteButton>
                                    </S.ServiceActions>
                                </S.ServiceItemRow>

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
                                            autoFocus
                                        />
                                        <S.NoteConfirmButton
                                            type="button"
                                            onClick={() => setExpandedNote(null)}
                                        >
                                            <IconCheck />
                                            Zatwierdź
                                        </S.NoteConfirmButton>
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

            {/* Per-service discount modal */}
            {discountModalId && discountModalService && (
                <S.BulkDiscountOverlay onClick={closeDiscountModal}>
                    <S.BulkDiscountCard onClick={(e) => e.stopPropagation()}>
                        <S.BulkDiscountHeader>
                            <div>
                                <S.BulkDiscountTitle>Rabat dla usługi</S.BulkDiscountTitle>
                                <S.DiscountModalServiceName>{discountModalService.serviceName}</S.DiscountModalServiceName>
                            </div>
                            <S.CloseIconButton type="button" onClick={closeDiscountModal}>
                                <IconX />
                            </S.CloseIconButton>
                        </S.BulkDiscountHeader>
                        <S.BulkDiscountBody>
                            {discountModalPrices && (
                                <S.DiscountBasePriceRow>
                                    <S.DiscountBasePriceLabel>Cena bazowa:</S.DiscountBasePriceLabel>
                                    <S.DiscountBasePriceValue>{discountModalPrices.baseNet.toFixed(2)} zł</S.DiscountBasePriceValue>
                                    <S.DiscountBasePriceLabel>netto</S.DiscountBasePriceLabel>
                                    <S.DiscountBasePriceSep>·</S.DiscountBasePriceSep>
                                    <S.DiscountBasePriceValue>{discountModalPrices.baseGross.toFixed(2)} zł</S.DiscountBasePriceValue>
                                    <S.DiscountBasePriceLabel>brutto</S.DiscountBasePriceLabel>
                                </S.DiscountBasePriceRow>
                            )}
                            <S.DiscountTypeRow>
                                {DISCOUNT_TYPES.map(({ type, label }) => (
                                    <S.DiscountTypePill
                                        key={type}
                                        type="button"
                                        $selected={discountModalType === type}
                                        onClick={() => { setDiscountModalType(type); setDiscountModalValue(''); }}
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
                                    value={discountModalValue}
                                    onChange={(e) => setDiscountModalValue(e.target.value)}
                                    autoFocus
                                />
                                <S.DiscountValueSuffix>
                                    {discountModalType === 'PERCENT' ? '%' : 'zł'}
                                </S.DiscountValueSuffix>
                            </S.DiscountValueRow>
                        </S.BulkDiscountBody>
                        <S.BulkDiscountFooter>
                            {discountModalHasDiscount && (
                                <S.DiscountRemoveButton
                                    type="button"
                                    onClick={removeServiceDiscount}
                                    style={{ marginRight: 'auto' }}
                                >
                                    Usuń rabat
                                </S.DiscountRemoveButton>
                            )}
                            <S.BulkDiscountCancelBtn type="button" onClick={closeDiscountModal}>
                                Anuluj
                            </S.BulkDiscountCancelBtn>
                            <S.BulkDiscountApplyBtn
                                type="button"
                                onClick={applyServiceDiscount}
                                disabled={!discountModalValue || parseFloat(discountModalValue.replace(',', '.')) <= 0}
                            >
                                Zastosuj
                            </S.BulkDiscountApplyBtn>
                        </S.BulkDiscountFooter>
                    </S.BulkDiscountCard>
                </S.BulkDiscountOverlay>
            )}

            {/* Bulk discount modal */}
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
                            <S.DiscountBasePriceRow>
                                <S.DiscountBasePriceLabel>Łącznie przed rabatem:</S.DiscountBasePriceLabel>
                                <S.DiscountBasePriceValue>{bulkBaseNet.toFixed(2)} zł</S.DiscountBasePriceValue>
                                <S.DiscountBasePriceLabel>netto</S.DiscountBasePriceLabel>
                                <S.DiscountBasePriceSep>·</S.DiscountBasePriceSep>
                                <S.DiscountBasePriceValue>{bulkBaseGross.toFixed(2)} zł</S.DiscountBasePriceValue>
                                <S.DiscountBasePriceLabel>brutto</S.DiscountBasePriceLabel>
                            </S.DiscountBasePriceRow>
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
