// src/modules/communication/components/Composer.tsx
// Edytor odpowiedzi (§2.5): spoczynkowy 1 wiersz 48 px → rozwija się na focus;
// blok wyceny jako edytowalna tabelka pozycji; kontrolka "po wysłaniu: [ETAP ▾]"
// preselekcjonowana (wstawiona wycena → WYCENIONE); Cmd/Ctrl+Enter wysyła.
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import type { LeadStage, QuoteItem } from '../types';
import { formatPln } from '../utils/format';
import { StageSelect } from './StageSelect';

const Wrapper = styled.div`
    position: sticky;
    bottom: 0;
    z-index: 42;
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    padding: 8px 16px;
`;

const RestingRow = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    height: 48px;
    padding: 0 12px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: text;
    text-align: left;
`;

const Placeholder = styled.span`
    font-size: 14px;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ToolButtons = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;

const ToolButton = styled.button`
    height: 32px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: #e5e7eb;
    }

    &:disabled {
        color: #9ca3af;
        cursor: not-allowed;
    }
`;

const Expanded = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    max-height: 50vh;
    overflow-y: auto;
`;

const AddressRow = styled.div`
    font-size: 12px;
    color: #6b7280;
`;

const BodyTextarea = styled.textarea`
    width: 100%;
    min-height: 120px;
    resize: vertical;
    border: none;
    outline: none;
    font-size: 15px;
    line-height: 1.45;
    font-family: inherit;
    color: #1a1a1a;
`;

const QuoteBlock = styled.div`
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
`;

const QuoteBlockHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #6b7280;
    background: #fafafa;
    border-bottom: 1px solid #e5e7eb;
`;

const RemoveQuoteButton = styled.button`
    background: none;
    border: none;
    font-size: 12px;
    color: #6b7280;
    cursor: pointer;

    &:hover {
        color: #dc2626;
    }
`;

const QuoteItemRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;

    &:not(:last-child) {
        border-bottom: 1px solid #f3f4f6;
    }
`;

const NameInput = styled.input`
    flex: 1;
    height: 30px;
    border: none;
    outline: none;
    font-size: 13px;
    color: #1a1a1a;
`;

const PriceInput = styled.input`
    width: 96px;
    height: 30px;
    border: none;
    outline: none;
    font-size: 13px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #1a1a1a;
`;

const Currency = styled.span`
    font-size: 13px;
    color: #6b7280;
`;

const RemoveRowButton = styled.button`
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 14px;
    cursor: pointer;

    &:hover {
        color: #dc2626;
    }
`;

const AddRowButton = styled.button`
    align-self: flex-start;
    margin: 4px 12px 8px;
    background: none;
    border: none;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    border-top: 1px solid #e5e7eb;
    font-variant-numeric: tabular-nums;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
`;

const StageHint = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #6b7280;
`;

const SendButton = styled.button`
    height: 36px;
    padding: 0 20px;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: ${({ theme }) => theme.colors.primary};
    border: none;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface DraftQuoteItem {
    name: string;
    /** Kwota w złotych jako tekst pola (konwersja na grosze przy wysyłce). */
    priceZl: string;
}

const parseGrosze = (priceZl: string): number => {
    const normalized = priceZl.replace(/\s/g, '').replace(',', '.');
    const value = Number(normalized);
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
};

interface ComposerProps {
    customerName?: string | null;
    contactEmail: string;
    currentStage: LeadStage;
    sending: boolean;
    onSend: (bodyText: string, quote: { items: QuoteItem[] } | undefined, nextStage: LeadStage | undefined) => void;
}

export const Composer = ({ customerName, contactEmail, currentStage, sending, onSend }: ComposerProps) => {
    const [expanded, setExpanded] = useState(false);
    const [body, setBody] = useState('');
    const [quoteItems, setQuoteItems] = useState<DraftQuoteItem[] | null>(null);
    const [stageTouched, setStageTouched] = useState(false);
    const [nextStage, setNextStage] = useState<LeadStage | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasQuote = quoteItems !== null;

    // Preselekcja etapu: wstawiona wycena → WYCENIONE; sama odpowiedź → bez zmiany.
    // Dopóki użytkownik nie dotknął dropdownu, etap wynika z zawartości composera.
    const effectiveNextStage: LeadStage | null = stageTouched ? nextStage : (hasQuote ? 'QUOTED' : null);

    useEffect(() => {
        if (expanded) textareaRef.current?.focus();
    }, [expanded]);

    const total = useMemo(
        () => (quoteItems ?? []).reduce((sum, item) => sum + parseGrosze(item.priceZl), 0),
        [quoteItems],
    );

    const canSend = !sending && (body.trim().length > 0 || (hasQuote && (quoteItems?.length ?? 0) > 0));

    const insertQuote = () => {
        setQuoteItems((items) => items ?? [{ name: '', priceZl: '' }]);
        setExpanded(true);
    };

    const send = () => {
        if (!canSend) return;
        const quote = hasQuote && quoteItems && quoteItems.length > 0
            ? {
                items: quoteItems
                    .filter((item) => item.name.trim())
                    .map((item) => ({ name: item.name.trim(), price: parseGrosze(item.priceZl) })),
            }
            : undefined;
        onSend(body.trim(), quote && quote.items.length > 0 ? quote : undefined, effectiveNextStage ?? undefined);
        setBody('');
        setQuoteItems(null);
        setStageTouched(false);
        setNextStage(null);
        setExpanded(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            send();
        }
    };

    const firstName = customerName?.split(' ')[0];

    if (!expanded) {
        return (
            <Wrapper>
                <RestingRow onClick={() => setExpanded(true)}>
                    <Placeholder>{firstName ? `Odpowiedz — ${firstName}…` : 'Odpowiedz…'}</Placeholder>
                    <ToolButtons onClick={(e) => e.stopPropagation()}>
                        <ToolButton onClick={insertQuote}>Wycena</ToolButton>
                        <ToolButton disabled title="Wkrótce">Terminy</ToolButton>
                        <ToolButton disabled title="Wkrótce">Szablon ▾</ToolButton>
                    </ToolButtons>
                </RestingRow>
            </Wrapper>
        );
    }

    return (
        <Wrapper onKeyDown={handleKeyDown}>
            <Expanded>
                <AddressRow>Do: {contactEmail} · Temat: Re: (automatyczny)</AddressRow>
                <BodyTextarea
                    ref={textareaRef}
                    value={body}
                    placeholder={firstName ? `Odpowiedz — ${firstName}…` : 'Treść odpowiedzi…'}
                    onChange={(e) => setBody(e.target.value)}
                />
                {hasQuote && quoteItems && (
                    <QuoteBlock>
                        <QuoteBlockHeader>
                            Wycena
                            <RemoveQuoteButton onClick={() => setQuoteItems(null)}>Usuń wycenę</RemoveQuoteButton>
                        </QuoteBlockHeader>
                        {quoteItems.map((item, index) => (
                            <QuoteItemRow key={index}>
                                <NameInput
                                    placeholder="Nazwa usługi"
                                    value={item.name}
                                    onChange={(e) => setQuoteItems((items) =>
                                        items!.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)))}
                                />
                                <PriceInput
                                    placeholder="0"
                                    inputMode="decimal"
                                    value={item.priceZl}
                                    onChange={(e) => setQuoteItems((items) =>
                                        items!.map((it, i) => (i === index ? { ...it, priceZl: e.target.value } : it)))}
                                />
                                <Currency>zł</Currency>
                                <RemoveRowButton
                                    aria-label="Usuń pozycję"
                                    onClick={() => setQuoteItems((items) => items!.filter((_, i) => i !== index))}
                                >
                                    ✕
                                </RemoveRowButton>
                            </QuoteItemRow>
                        ))}
                        <AddRowButton onClick={() => setQuoteItems((items) => [...(items ?? []), { name: '', priceZl: '' }])}>
                            + pozycja
                        </AddRowButton>
                        <TotalRow>
                            <span>Razem</span>
                            <span>{formatPln(total)}</span>
                        </TotalRow>
                    </QuoteBlock>
                )}
                <FooterRow>
                    {!hasQuote && <ToolButton onClick={insertQuote}>Wycena</ToolButton>}
                    <ToolButton disabled title="Wkrótce">Terminy</ToolButton>
                    <ToolButton disabled title="Wkrótce">Szablon ▾</ToolButton>
                    <StageHint>
                        po wysłaniu:
                        <StageSelect
                            compact
                            value={effectiveNextStage ?? currentStage}
                            allowNoChange
                            noChangeSelected={effectiveNextStage === null}
                            onNoChange={() => {
                                setStageTouched(true);
                                setNextStage(null);
                            }}
                            onChange={(stage) => {
                                setStageTouched(true);
                                setNextStage(stage);
                            }}
                            ariaLabel="Etap po wysłaniu"
                        />
                    </StageHint>
                    <SendButton disabled={!canSend} onClick={send} title="Cmd/Ctrl+Enter">
                        {sending ? 'Wysyłanie…' : 'Wyślij'}
                    </SendButton>
                </FooterRow>
            </Expanded>
        </Wrapper>
    );
};
