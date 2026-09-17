import { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { FieldLabel, InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { useToast } from '@/common/components/Toast/ToastContainer';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { reportProblemApi } from '@/modules/support/api/reportProblemApi';
import type { Product } from '../types';

// „Zgłoś nieprawidłowość" przy produkcie.
//
// Świadomie NIE ma osobnego endpointu: zgłoszenie idzie tą samą drogą co „Zgłoś problem"
// z menu, więc ląduje w tej samej skrzynce (support.report.recipient-email) bez dublowania
// konfiguracji poczty. Dokładamy tylko NAGŁÓWEK z tożsamością produktu — bez niego obsługa
// dostaje „nazwa się nie zgadza" i nie wie, którego wiersza katalogu dotyczy.

const Context = styled.div`
    padding: 10px 12px; border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt}; border: 1px solid ${st.border};
    font-size: 12.5px; color: ${st.textSecondary};
    display: flex; flex-direction: column; gap: 2px;
    overflow-wrap: anywhere;
`;
const Strong = styled.span` color: ${st.text}; font-weight: 600; `;
const Hint = styled.p` margin: 8px 0 0; font-size: 12.5px; color: ${st.textMuted}; `;

interface Props {
    product: Product;
    onClose: () => void;
}

export function ReportProductIssueModal({ product, onClose }: Props) {
    const [description, setDescription] = useState('');
    const [sending, setSending] = useState(false);
    const { showSuccess, showError } = useToast();

    const submit = async () => {
        const text = description.trim();
        if (text.length < 5) return;
        setSending(true);
        try {
            const header = [
                'ZGŁOSZENIE NIEPRAWIDŁOWOŚCI W KARCIE PRODUKTU',
                `Produkt: ${product.name}`,
                `Marka: ${product.brand || '(brak)'}`,
                `Kod (GTIN): ${product.gtin ?? '(brak)'}`,
                `Identyfikator: ${product.id}`,
                `Adres karty: ${window.location.origin}/products/${product.id}`,
                `Wpis prywatny studia: ${product.isPrivate ? 'tak' : 'nie'}`,
                '',
                'Opis nieprawidłowości:',
            ].join('\n');

            await reportProblemApi.submit(`${header}\n${text}`, []);
            showSuccess('Zgłoszenie wysłane', 'Dziękujemy — obsługa przyjrzy się tej karcie.');
            onClose();
        } catch {
            showError('Nie udało się wysłać zgłoszenia', 'Spróbuj ponownie za chwilę.');
        } finally {
            setSending(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="560px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zgłoś nieprawidłowość</ModalTitle>
                    <ModalSubtitle>Napisz, co się nie zgadza w danych tego produktu</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Context>
                    <Strong>{product.name}</Strong>
                    <span>{[product.brand, product.gtin].filter(Boolean).join(' · ') || 'bez marki i kodu'}</span>
                </Context>

                <div style={{ marginTop: 14 }}>
                    <FieldLabel htmlFor="product-issue">Co jest nie tak?</FieldLabel>
                    <InputShellTextArea>
                        <BareTextArea
                            id="product-issue"
                            rows={6}
                            placeholder="np. zła pojemność opakowania, nazwa dotyczy innego wariantu, kod kreskowy prowadzi do innego produktu…"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </InputShellTextArea>
                    <Hint>
                        Karty produktów z kodem kreskowym są wspólne dla wszystkich warsztatów, więc
                        poprawka pomoże nie tylko Tobie.
                    </Hint>
                </div>
            </ModalContent>
            <ModalFooter>
                <SharedButton type="button" $variant="ghost" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    type="button"
                    $variant="primary"
                    onClick={submit}
                    disabled={description.trim().length < 5 || sending}
                >
                    {sending ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
