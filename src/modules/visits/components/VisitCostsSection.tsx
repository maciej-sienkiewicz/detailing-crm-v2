// src/modules/visits/components/VisitCostsSection.tsx
//
// Sekcja „Koszty i zysk" na karcie wizyty: dokumenty z zakładki „Dokumenty kosztowe"
// przypięte do wizyty i jej zysk netto.
//
// Hierarchia (CLAUDE.md §2): płaski Panel - wyniesiona jest tylko karta „Usługi".
// „Przypnij koszt" to główna akcja SEKCJI, więc odcień bez wypełnienia. Liczba, po
// którą się wraca - zysk - jest nagłówkiem sekcji, a przychód, koszty i marża jej
// rozpisaniem zwykłym zdaniem (§4). Strata nosi czerwień: to jej znaczenie, nie ozdoba.
//
// Kwoty liczy serwer (VisitProfit): netto po obu stronach, jak w podsumowaniu finansów,
// bo VAT od kosztu się odlicza. Dokument ukryty w finansach, anulowany albo w obcej
// walucie zostaje na liście z powodem, ale do sumy nie wchodzi.

import { useState } from 'react';
import styled from 'styled-components';
import { Link2, X } from 'lucide-react';
import {
    Button, IconButton, Notice, Panel, PanelActions, PanelBody, PanelHead, SectionTitle, StatusPill, SummaryStrip, ui,
} from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { pluralPl } from '@/common/utils/plural';
import { formatMoney, formatDate } from '@/modules/finance/utils/formatters';
import { InvoicePreviewModal } from '@/modules/finance/components/InvoicePreviewModal';
import { useVisitCosts } from '../hooks/useVisitCosts';
import { apiErrorMessage } from '../api/apiError';
import type { LinkedCostDocument } from '../api/visitCostsApi';
import { EXCLUSION_LABEL, documentAmount, documentTitle, profitDetails, profitLabel } from '../utils/visitCosts';
import { LinkCostDocumentModal } from './LinkCostDocumentModal';

const Body = styled(PanelBody)`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ProfitAmount = styled.span<{ $loss: boolean }>`
    color: ${p => p.$loss ? ui.dangerInk : 'inherit'};
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const CostList = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${ui.lineSoft};
    border-radius: ${ui.radiusStrip};
`;

const CostItem = styled.li`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 0;
    min-width: 0;

    & + & { border-top: 1px solid ${ui.lineSoft}; }
`;

/* Cały wiersz otwiera podgląd faktury - przycisk obok samego krzyżyka, bez zagnieżdżania. */
const CostOpen = styled.button<{ $muted: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    border: none;
    border-radius: ${ui.radiusRow};
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    opacity: ${p => p.$muted ? 0.75 : 1};

    &:hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
`;

const CostMain = styled.span`
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
`;

const CostSeller = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

/* Rodzaj z numerem i data to dwa fakty - dwa elementy z odstępem, nie kropka (§4). */
const CostFacts = styled.span`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const CostAmounts = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const AmountNet = styled.span<{ $struck: boolean }>`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.$struck ? ui.textMuted : ui.ink};
    text-decoration: ${p => p.$struck ? 'line-through' : 'none'};
`;

const AmountGross = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
`;

interface Props {
    visitId: string;
}

export function VisitCostsSection({ visitId }: Props) {
    const { costs, isLoading, isError, refetch, link, unlink } = useVisitCosts(visitId, true);
    const { showError } = useToast();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [previewId, setPreviewId] = useState<string | null>(null);

    const documents = costs?.documents ?? [];
    const count = documents.length;

    const handleUnlink = (entry: LinkedCostDocument) => {
        unlink.mutate(entry.document.id, {
            onError: e => showError('Nie udało się odpiąć dokumentu', apiErrorMessage(e, 'Spróbuj jeszcze raz.')),
        });
    };

    const renderDocument = (entry: LinkedCostDocument) => {
        const doc = entry.document;
        const title = documentTitle(doc);
        const net = documentAmount(doc.netAmount, doc.currency);
        const gross = documentAmount(doc.grossAmount, doc.currency);
        return (
            <CostItem key={doc.id}>
                <CostOpen
                    type="button"
                    $muted={!doc.counted}
                    onClick={() => setPreviewId(doc.id)}
                    aria-label={`Podgląd: ${title}, ${doc.sellerName ?? 'bez sprzedawcy'}`}
                >
                    <CostMain>
                        <CostSeller>{doc.sellerName ?? 'Bez sprzedawcy'}</CostSeller>
                        <CostFacts>
                            <span>{title}</span>
                            <span>{formatDate(doc.saleDate)}</span>
                            {doc.exclusion && <StatusPill $tone="warn">{EXCLUSION_LABEL[doc.exclusion]}</StatusPill>}
                        </CostFacts>
                    </CostMain>
                    <CostAmounts>
                        {net ? (
                            <>
                                <AmountNet $struck={!doc.counted}>{net} netto</AmountNet>
                                {gross && <AmountGross>{gross} brutto</AmountGross>}
                            </>
                        ) : (
                            <AmountGross>Bez kwoty</AmountGross>
                        )}
                    </CostAmounts>
                </CostOpen>
                <IconButton
                    label={`Odepnij od wizyty: ${title}`}
                    variant="ghost"
                    size="sm"
                    disabled={unlink.isPending}
                    onClick={() => handleUnlink(entry)}
                >
                    <X />
                </IconButton>
            </CostItem>
        );
    };

    return (
        <Panel aria-labelledby="visit-costs-title">
            <PanelHead>
                <SectionTitle
                    id="visit-costs-title"
                    count={count > 0 ? `${count} ${pluralPl(count, 'dokument', 'dokumenty', 'dokumentów')}` : undefined}
                >
                    Koszty i zysk
                </SectionTitle>
                <PanelActions>
                    <Button size="sm" variant="tinted" onClick={() => setIsPickerOpen(true)} disabled={!costs}>
                        <Link2 />Przypnij koszt
                    </Button>
                </PanelActions>
            </PanelHead>

            <Body>
                {isError ? (
                    <Notice
                        tone="danger"
                        title="Nie udało się wczytać kosztów wizyty"
                        action={<Button size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                    />
                ) : (
                    <SummaryStrip
                        loading={isLoading || !costs}
                        label={costs ? profitLabel(costs.revenueBasis) : 'Zysk netto'}
                        amount={costs && (
                            <ProfitAmount $loss={costs.profitNet < 0}>{formatMoney(costs.profitNet)}</ProfitAmount>
                        )}
                        details={costs && profitDetails(costs)}
                    />
                )}

                {costs && count === 0 && (
                    <Hint>
                        Przypnij koszty tej wizyty: fakturę, paragon albo rachunek, na przykład za materiał
                        kupiony pod to auto albo usługę podwykonawcy. Zysk przeliczy się sam.
                    </Hint>
                )}

                {count > 0 && <CostList aria-label="Przypięte dokumenty kosztowe">{documents.map(renderDocument)}</CostList>}
            </Body>

            {isPickerOpen && (
                <LinkCostDocumentModal
                    isOpen
                    visitId={visitId}
                    onClose={() => setIsPickerOpen(false)}
                    onLink={(costDocumentId, reassign) => link.mutateAsync({ costDocumentId, reassign })}
                />
            )}

            <InvoicePreviewModal expenseId={previewId} onClose={() => setPreviewId(null)} />
        </Panel>
    );
}
