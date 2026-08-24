// src/common/components/ServiceDiscountModal/index.tsx
//
// Wspólny modal rabatu dla pojedynczej usługi. Używany wszędzie tam, gdzie
// użytkownik klika "Dodaj rabat" / "Rabatuj" przy pozycji usługi:
//   • common/components/ServicesTable (check-in, kalendarz),
//   • modules/visits/components/ServicesTable (wiersze robocze na widoku wizyty).
//
// Wartości pieniężne przychodzą i wychodzą w GROSZACH.

import { useEffect, useRef, useState } from 'react';
import { applyAdjustment, netToGross } from '@/common/utils/priceAdjustment';
import type { AdjustmentType, PriceAdjustment } from '@/common/utils/priceAdjustment';
import { MAX_2_DECIMALS, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { useModalViewport } from '@/common/hooks';
import * as S from './styles';

const TYPE_LABELS: Record<AdjustmentType, string> = {
    PERCENT: 'Procent',
    FIXED_NET: 'Kwota netto',
    FIXED_GROSS: 'Kwota brutto',
    SET_NET: 'Cena netto',
    SET_GROSS: 'Cena brutto',
};

const DEFAULT_DISCOUNT_TYPES: AdjustmentType[] = [
    'PERCENT', 'FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS',
];

export interface ServiceDiscountModalProps {
    /** Nazwa usługi pokazywana pod tytułem. */
    serviceName: string;
    /** Cena bazowa (przed rabatem) w groszach — netto. */
    basePriceNet?: number | null;
    /** Dokładne brutto z cennika, jeśli jest; inaczej wyliczane z netto i VAT. */
    basePriceGross?: number | null;
    vatRate?: number | null;
    /** Aktualnie ustawiony rabat (do wstępnego wypełnienia pól). */
    adjustment?: PriceAdjustment | null;
    /** Dostępne rodzaje rabatu; domyślnie wszystkie. */
    types?: AdjustmentType[];
    onApply: (adjustment: PriceAdjustment) => void;
    /** Gdy podane i rabat już istnieje — pokazujemy "Usuń rabat". */
    onRemove?: () => void;
    onClose: () => void;
}

const fmt = (cents: number) => `${(cents / 100).toFixed(2)} zł`;

export const ServiceDiscountModal = ({
    serviceName,
    basePriceNet,
    basePriceGross,
    vatRate,
    adjustment,
    types = DEFAULT_DISCOUNT_TYPES,
    onApply,
    onRemove,
    onClose,
}: ServiceDiscountModalProps) => {
    const initialType = adjustment && adjustment.value !== 0 && types.includes(adjustment.type)
        ? adjustment.type
        : types[0];
    const [type, setType] = useState<AdjustmentType>(initialType);
    const [value, setValue] = useState(() => {
        if (!adjustment || adjustment.value === 0) return '';
        return adjustment.type === 'PERCENT'
            ? String(Math.abs(adjustment.value))
            : String(adjustment.value / 100);
    });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Blokada przewijania tła i układ przy wysuniętej klawiaturze — jak
    // w ModalShell. Escape zostaje wyżej, bo zatrzymuje propagację.
    const overlayRef = useRef<HTMLDivElement>(null);
    useModalViewport(true, overlayRef);

    const parsed = parseFloat(value.replace(',', '.'));
    const isValid = value !== '' && !isNaN(parsed) && parsed > 0;
    const storeValue = !isValid ? 0
        : type === 'PERCENT' ? -Math.abs(parsed) : Math.round(parsed * 100);

    const hasBase = basePriceNet !== null && basePriceNet !== undefined;
    const baseNetCents = hasBase ? basePriceNet as number : 0;
    const effectiveVat = vatRate ?? 23;
    const baseGrossCents = basePriceGross ?? netToGross(baseNetCents, effectiveVat);

    const preview = hasBase && isValid
        ? applyAdjustment(baseNetCents, effectiveVat, { type, value: storeValue }, basePriceGross ?? undefined)
        : null;
    const savedGross = preview ? baseGrossCents - preview.finalGrossCents : 0;

    const hasExistingDiscount = !!adjustment && adjustment.value !== 0;

    const submit = () => {
        if (!isValid) return;
        onApply({ type, value: storeValue });
    };

    return (
        <S.Overlay ref={overlayRef} onClick={onClose} role="dialog" aria-modal="true" aria-label="Rabat dla usługi">
            <S.Card onClick={e => e.stopPropagation()}>
                <S.Header>
                    <div>
                        <S.Title>Rabat dla usługi</S.Title>
                        <S.ServiceName title={serviceName}>{serviceName || 'Nowa usługa'}</S.ServiceName>
                    </div>
                    <S.CloseBtn type="button" onClick={onClose} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </S.CloseBtn>
                </S.Header>

                <S.Body>
                    {hasBase && (
                        <S.FromBox>
                            <S.FromBoxLabel>Cena przed rabatem</S.FromBoxLabel>
                            <S.FromPrices>
                                <S.FromPrice>
                                    <S.FromPriceValue>{fmt(baseNetCents)}</S.FromPriceValue>
                                    <S.FromPriceLabel>Netto</S.FromPriceLabel>
                                </S.FromPrice>
                                <S.FromPrice>
                                    <S.FromPriceValue>{fmt(baseGrossCents)}</S.FromPriceValue>
                                    <S.FromPriceLabel>Brutto</S.FromPriceLabel>
                                </S.FromPrice>
                            </S.FromPrices>
                        </S.FromBox>
                    )}

                    <div>
                        <S.SectionLabel>Rodzaj rabatu</S.SectionLabel>
                        <S.TypeRow>
                            {types.map(t => (
                                <S.TypePill
                                    key={t}
                                    type="button"
                                    $selected={type === t}
                                    onClick={() => { setType(t); setValue(''); }}
                                >
                                    {TYPE_LABELS[t]}
                                </S.TypePill>
                            ))}
                        </S.TypeRow>
                    </div>

                    <div>
                        <S.SectionLabel>Wartość</S.SectionLabel>
                        <S.ValueRow>
                            <S.ValueInput
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={value}
                                onChange={e => { if (MAX_2_DECIMALS.test(e.target.value)) setValue(e.target.value); }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') submit();
                                    handleZeroAwareKeyDown(value, setValue)(e);
                                }}
                                autoFocus
                            />
                            <S.ValueSuffix>{type === 'PERCENT' ? '%' : 'zł'}</S.ValueSuffix>
                        </S.ValueRow>
                    </div>

                    {preview && (
                        <S.ResultBox>
                            <S.ResultHead>
                                <S.ResultLabel>Po rabacie</S.ResultLabel>
                                {savedGross > 0 && <S.SavedChip>Taniej o {fmt(savedGross)}</S.SavedChip>}
                            </S.ResultHead>
                            <S.FromPrices>
                                <S.FromPrice>
                                    <S.ResultValue>{fmt(preview.finalNetCents)}</S.ResultValue>
                                    <S.FromPriceLabel>Netto</S.FromPriceLabel>
                                </S.FromPrice>
                                <S.FromPrice>
                                    <S.ResultValue $strong>{fmt(preview.finalGrossCents)}</S.ResultValue>
                                    <S.FromPriceLabel>Brutto</S.FromPriceLabel>
                                </S.FromPrice>
                            </S.FromPrices>
                        </S.ResultBox>
                    )}
                </S.Body>

                <S.Footer>
                    {onRemove && hasExistingDiscount && (
                        <S.RemoveBtn type="button" onClick={onRemove}>Usuń rabat</S.RemoveBtn>
                    )}
                    <S.CancelBtn
                        type="button"
                        onClick={onClose}
                        style={onRemove && hasExistingDiscount ? undefined : { marginLeft: 'auto' }}
                    >
                        Anuluj
                    </S.CancelBtn>
                    <S.ApplyBtn type="button" onClick={submit} disabled={!isValid}>Zastosuj</S.ApplyBtn>
                </S.Footer>
            </S.Card>
        </S.Overlay>
    );
};
