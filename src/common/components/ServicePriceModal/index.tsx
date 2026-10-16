// src/common/components/ServicePriceModal/index.tsx
//
// „Cena w tej rezerwacji" - jedno okno do zmiany ceny pozycji BEZ ruszania cennika.
//
// Zastępuje dwa przyciski w wierszu tabeli usług: ołówek „Edytuj pozycję" (który
// zmieniał cennik dla wszystkich klientów, choć wyglądał na „popraw ten wiersz")
// i % „Rabat" (który umiał podnieść cenę, ale nikt nie szukał podwyżki pod słowem
// „rabat"). Cennik zmienia się teraz wyłącznie przez „Zmień w cenniku…" w menu ⋯.
//
// Wartości pieniężne przychodzą i wychodzą w GROSZACH.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PriceAdjustment } from '@/common/utils/priceAdjustment';
import { MAX_2_DECIMALS, centsToInput, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { useModalViewport } from '@/common/hooks';
import { shouldAutoFocusInput } from '@/common/utils';
import { Button, Notice, Segmented } from '@/common/components/ui';
import {
    baseGrossOf, counterpart, describeChange, formatPln, fromDiscount, fromSurcharge, fromTypedPrice,
    initialMode, priceAfter,
    type AmountUnit, type PriceBase, type PriceMode, type TypedPrice,
} from './priceDraft';
import * as S from './styles';

/**
 * Gdzie obowiązuje cena pozycji, w formach, których wymaga polszczyzna:
 * „Cena w tej wizycie", „dotyczy tylko tej wizyty", „Usuń z wizyty".
 */
export interface PriceScope {
    here: string;
    of: string;
    from: string;
}

export const PRICE_SCOPES = {
    reservation: { here: 'w tej rezerwacji', of: 'tej rezerwacji', from: 'z rezerwacji' },
    visit: { here: 'w tej wizycie', of: 'tej wizyty', from: 'z wizyty' },
    quote: { here: 'w tej wycenie', of: 'tej wyceny', from: 'z wyceny' },
} satisfies Record<string, PriceScope>;

export interface ServicePriceModalProps {
    serviceName: string;
    /** Cena wyjściowa (z cennika albo ustalona ręcznie) - netto w groszach. */
    basePriceNet: number;
    /** Dokładne brutto wyjściowe, jeśli ktoś je ustalił; inaczej liczone z netto. */
    basePriceGross?: number | null;
    vatRate: number;
    /** Obecna zmiana ceny pozycji - do wypełnienia pól. */
    adjustment?: PriceAdjustment | null;
    /** Gdzie zmiana obowiązuje - rezerwacja, wizyta albo wycena. */
    scope?: PriceScope;
    /** Podpis ceny wyjściowej: „Cena z cennika", „Cena ustalona ręcznie". */
    baseLabel?: string;
    onApply: (adjustment: PriceAdjustment) => void;
    /** Gdy podane i cena jest zmieniona - przycisk powrotu do ceny wyjściowej. */
    onReset?: () => void;
    resetLabel?: string;
    onClose: () => void;
}

const MODES: { value: PriceMode; label: string }[] = [
    { value: 'price', label: 'Ustal cenę' },
    { value: 'discount', label: 'Rabat' },
    { value: 'surcharge', label: 'Dopłata' },
];

const UNITS: { value: AmountUnit; label: string }[] = [
    { value: 'percent', label: '%' },
    { value: 'gross', label: 'zł brutto' },
    { value: 'net', label: 'zł netto' },
];

const VAT_LABEL = (rate: number) => rate === -1 ? 'zw.' : `${rate}%`;

/** Pola zakładek „Rabat" i „Dopłata" wypełnione obecną zmianą, jeśli dotyczy tej zakładki. */
const initialAmount = (adjustment: PriceAdjustment | null | undefined, mode: PriceMode) => {
    if (adjustment && adjustment.value !== 0 && initialMode(adjustment) === mode) {
        if (adjustment.type === 'PERCENT') return { unit: 'percent' as const, raw: String(Math.abs(adjustment.value)).replace('.', ',') };
        if (adjustment.type === 'FIXED_GROSS') return { unit: 'gross' as const, raw: centsToInput(adjustment.value) };
        if (adjustment.type === 'FIXED_NET') return { unit: 'net' as const, raw: centsToInput(adjustment.value) };
    }
    // Rabat najczęściej daje się procentem, dopłatę - kwotą („doliczam 300 zł").
    return { unit: (mode === 'discount' ? 'percent' : 'gross') as AmountUnit, raw: '' };
};

export const ServicePriceModal = ({
    serviceName,
    basePriceNet,
    basePriceGross,
    vatRate,
    adjustment,
    scope = PRICE_SCOPES.reservation,
    baseLabel = 'Cena z cennika',
    onApply,
    onReset,
    resetLabel = 'Przywróć cenę z cennika',
    onClose,
}: ServicePriceModalProps) => {
    const base: PriceBase = { netCents: basePriceNet, exactGrossCents: basePriceGross ?? undefined, vatRate };
    const baseGross = baseGrossOf(base);
    const current = priceAfter(base, adjustment ?? { type: 'PERCENT', value: 0 });

    const [mode, setMode] = useState<PriceMode>(() => initialMode(adjustment));

    // „Ustal cenę": pola startują z obecną ceną pozycji. Za stronę wpisaną uchodzi
    // dopiero ta, którą człowiek dotknął - albo ta, w której zapisano cenę docelową.
    const [typed, setTyped] = useState<TypedPrice | null>(() => {
        if (adjustment?.type === 'SET_GROSS') return { side: 'gross', raw: centsToInput(adjustment.value) };
        if (adjustment?.type === 'SET_NET') return { side: 'net', raw: centsToInput(adjustment.value) };
        return null;
    });
    const [discount, setDiscount] = useState(() => initialAmount(adjustment, 'discount'));
    const [surcharge, setSurcharge] = useState(() => initialAmount(adjustment, 'surcharge'));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Blokada przewijania tła i układ przy wysuniętej klawiaturze - jak w ModalShell.
    const overlayRef = useRef<HTMLDivElement>(null);
    useModalViewport(true, overlayRef);

    const draft: PriceAdjustment | null =
        mode === 'price' ? fromTypedPrice(typed)
        : mode === 'discount' ? fromDiscount(discount.unit, discount.raw, base)
        : fromSurcharge(surcharge.unit, surcharge.raw, base);

    const shown = draft ? priceAfter(base, draft) : current;
    const change = describeChange(base, draft ?? adjustment);
    const isChanged = !!adjustment && describeChange(base, adjustment).kind !== 'none';

    const submit = () => { if (draft) onApply(draft); };

    // Pola „Ustal cenę": wpisana strona pokazuje to, co wpisano; druga - pochodną.
    const typedOther = typed ? counterpart(typed, vatRate) : null;
    const netField = typed?.side === 'net' ? typed.raw
        : typed ? (typedOther !== null ? centsToInput(typedOther) : '')
        : centsToInput(current.finalNetCents);
    const grossField = typed?.side === 'gross' ? typed.raw
        : typed ? (typedOther !== null ? centsToInput(typedOther) : '')
        : centsToInput(current.finalGrossCents);

    const typePrice = (side: 'net' | 'gross') => (raw: string) => {
        if (MAX_2_DECIMALS.test(raw)) setTyped({ side, raw });
    };

    const amount = mode === 'discount' ? discount : surcharge;
    const setAmount = mode === 'discount' ? setDiscount : setSurcharge;
    const typeAmount = (raw: string) => {
        if (MAX_2_DECIMALS.test(raw)) setAmount(prev => ({ ...prev, raw }));
    };

    const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

    const amountInvalid = mode !== 'price' && amount.raw !== '' && !draft;

    // Portal do <body>: tabela usług bywa w innym oknie, którego karta ma przekształcenie
    // i obcięcie - bez portalu to okno byłoby ucięte jej krawędziami.
    return createPortal(
        <S.Overlay ref={overlayRef} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Cena ${scope.here}`}>
            <S.Card onClick={e => e.stopPropagation()}>
                <S.Header>
                    <S.HeadText>
                        <S.Title>Cena {scope.here}</S.Title>
                        <S.ServiceName title={serviceName}>{serviceName || 'Nowa usługa'}</S.ServiceName>
                    </S.HeadText>
                    <S.CloseBtn type="button" onClick={onClose} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </S.CloseBtn>
                </S.Header>

                <S.Body>
                    <Notice tone="info">
                        Zmiana dotyczy tylko {scope.of}. Cennik zostaje bez zmian.
                    </Notice>

                    <S.BaseRow>
                        <S.BaseLabel>{baseLabel}</S.BaseLabel>
                        <S.BaseValue>
                            <S.BaseGross><strong>{formatPln(baseGross)}</strong> brutto</S.BaseGross>
                            <S.BaseNet>{formatPln(basePriceNet)} netto, VAT {VAT_LABEL(vatRate)}</S.BaseNet>
                        </S.BaseValue>
                    </S.BaseRow>

                    <Segmented
                        block
                        label="Sposób zmiany ceny"
                        options={MODES}
                        value={mode}
                        onChange={setMode}
                    />

                    {mode === 'price' ? (
                        <S.PriceGrid>
                            <S.Field>
                                <S.FieldLabel htmlFor="service-price-gross">Brutto</S.FieldLabel>
                                <S.InputWrap>
                                    <S.Input
                                        id="service-price-gross"
                                        type="text"
                                        inputMode="decimal"
                                        value={grossField}
                                        onChange={e => typePrice('gross')(e.target.value)}
                                        onFocus={e => e.target.select()}
                                        onKeyDown={e => { onEnter(e); handleZeroAwareKeyDown(grossField, typePrice('gross'))(e); }}
                                        autoFocus={shouldAutoFocusInput()}
                                    />
                                    <S.Suffix>zł</S.Suffix>
                                </S.InputWrap>
                            </S.Field>
                            <S.Field>
                                <S.FieldLabel htmlFor="service-price-net">Netto</S.FieldLabel>
                                <S.InputWrap>
                                    <S.Input
                                        id="service-price-net"
                                        type="text"
                                        inputMode="decimal"
                                        value={netField}
                                        onChange={e => typePrice('net')(e.target.value)}
                                        onFocus={e => e.target.select()}
                                        onKeyDown={e => { onEnter(e); handleZeroAwareKeyDown(netField, typePrice('net'))(e); }}
                                    />
                                    <S.Suffix>zł</S.Suffix>
                                </S.InputWrap>
                            </S.Field>
                        </S.PriceGrid>
                    ) : (
                        <S.AmountBlock>
                            <S.FieldLabel htmlFor="service-price-amount">
                                {mode === 'discount' ? 'Ile taniej' : 'Ile doliczyć'}
                            </S.FieldLabel>
                            <S.AmountRow>
                                <S.InputWrap $grow>
                                    <S.Input
                                        id="service-price-amount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={amount.raw}
                                        aria-invalid={amountInvalid || undefined}
                                        onChange={e => typeAmount(e.target.value)}
                                        onKeyDown={e => { onEnter(e); handleZeroAwareKeyDown(amount.raw, typeAmount)(e); }}
                                        autoFocus={shouldAutoFocusInput()}
                                    />
                                </S.InputWrap>
                                <S.UnitSwitch>
                                    <Segmented
                                        size="sm"
                                        label="Jednostka"
                                        options={UNITS}
                                        value={amount.unit}
                                        onChange={unit => setAmount(prev => ({ ...prev, unit }))}
                                    />
                                </S.UnitSwitch>
                            </S.AmountRow>
                            {amountInvalid && (
                                <S.FieldError role="alert">Rabat nie może być większy niż cena.</S.FieldError>
                            )}
                        </S.AmountBlock>
                    )}

                    <S.Result $kind={change.kind}>
                        <S.ResultHead>
                            <S.ResultLabel>Cena {scope.here}</S.ResultLabel>
                            {change.kind === 'discount' && <S.ResultChip $kind="discount">Taniej o {formatPln(change.grossDeltaCents)}</S.ResultChip>}
                            {change.kind === 'surcharge' && <S.ResultChip $kind="surcharge">Drożej o {formatPln(change.grossDeltaCents)}</S.ResultChip>}
                            {change.kind === 'none' && <S.ResultChip $kind="none">Bez zmiany ceny</S.ResultChip>}
                        </S.ResultHead>
                        <S.ResultPrices>
                            <S.ResultGross>{formatPln(shown.finalGrossCents)}</S.ResultGross>
                            <S.ResultNet>{formatPln(shown.finalNetCents)} netto</S.ResultNet>
                        </S.ResultPrices>
                    </S.Result>
                </S.Body>

                <S.Footer>
                    {onReset && isChanged && (
                        <S.ResetBtn type="button" onClick={onReset}>{resetLabel}</S.ResetBtn>
                    )}
                    <S.FooterEnd>
                        <Button variant="outline" onClick={onClose}>Anuluj</Button>
                        <Button variant="primary" onClick={submit} disabled={!draft}>Zastosuj</Button>
                    </S.FooterEnd>
                </S.Footer>
            </S.Card>
        </S.Overlay>,
        document.body,
    );
};
