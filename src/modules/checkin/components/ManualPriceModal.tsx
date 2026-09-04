// src/modules/checkin/components/ManualPriceModal.tsx
// Cena usługi rozliczanej indywidualnie, podawana przy dodawaniu jej do wizyty.
//
// Wygląd i mechanika są celowo takie same jak w „Wprowadź nową usługę": ten sam
// zestaw styli, ten sam PriceInput z parą pól netto/brutto i ta sama lista stawek
// VAT. Ktoś, kto raz nauczył się wpisywać cenę w jednym miejscu CRM-u, ma ją
// wpisywać tak samo wszędzie - a my mamy jedną implementację przeliczeń zamiast
// dwóch, które z czasem rozjeżdżają się w zaokrągleniach.
//
// Jedyna różnica wobec tamtego modala: nazwa usługi jest tu zablokowana. Usługa
// jest już wybrana z katalogu, więc to nie jest pole do wypełnienia, tylko
// przypomnienie, czego dotyczy cena.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { PriceInput } from '@/modules/services/components/PriceInput';
import type { Service, VatRate } from '@/modules/services/types';
import { VAT_OPTIONS } from '@/modules/services/vatOptions';
import {
    Overlay,
    ModalContainer,
    Form,
    Header,
    TitleGroup,
    CloseButton,
    Title,
    Content,
    FieldGroup,
    Label,
    Input,
    Select,
    Footer,
    Button,
} from '@/modules/calendar/components/QuickServiceModalStyles';

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export interface ManualPriceResult {
    basePriceNet: number;
    basePriceGross: number;
    vatRate: VatRate;
}

interface ManualPriceModalProps {
    isOpen: boolean;
    /** Usługa wybrana z katalogu - jej nazwa i stawka VAT są punktem wyjścia. */
    service: Service;
    onClose: () => void;
    onConfirm: (result: ManualPriceResult) => void;
    contentLeft?: number;
}

export const ManualPriceModal = ({
    isOpen,
    service,
    onClose,
    onConfirm,
    contentLeft: contentLeftProp,
}: ManualPriceModalProps) => {
    const { isCollapsed } = useSidebar();
    const contentLeft = contentLeftProp ?? (typeof window !== 'undefined' ? (isCollapsed ? 64 : 240) : 0);

    // Stan startowy bierzemy raz, przy montowaniu: rodzic remontuje modal dla każdej
    // kolejnej usługi (key), więc nie potrzeba efektu synchronizującego pola z propsami.
    const [vatRate, setVatRate] = useState<VatRate>(service.vatRate);
    const [basePriceNet, setBasePriceNet] = useState(0);
    const [basePriceGross, setBasePriceGross] = useState(0);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (basePriceGross <= 0 && basePriceNet <= 0) return;
        onConfirm({ basePriceNet, basePriceGross, vatRate });
    };

    /** Zmiana stawki przelicza brutto od netto - netto jest tym, co wpisał użytkownik. */
    const handleVatChange = (nextRate: VatRate) => {
        setVatRate(nextRate);
        const rate = Math.max(0, nextRate);
        setBasePriceGross(Math.round(basePriceNet * (1 + rate / 100)));
    };

    return createPortal(
        <Overlay
            $isOpen={isOpen}
            $contentLeft={contentLeft}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <ModalContainer $isOpen={isOpen}>
                <Form onSubmit={handleSubmit}>
                    <Header>
                        <TitleGroup>
                            <Title>Podaj cenę usługi</Title>
                        </TitleGroup>
                        <CloseButton type="button" onClick={onClose} aria-label="Zamknij">
                            <IconX />
                        </CloseButton>
                    </Header>

                    <Content>
                        <FieldGroup>
                            <Label>Nazwa usługi</Label>
                            <Input type="text" value={service.name} disabled readOnly />
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Stawka VAT</Label>
                            <Select
                                value={vatRate}
                                onChange={(e) => handleVatChange(Number(e.target.value) as VatRate)}
                            >
                                {VAT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </Select>
                        </FieldGroup>

                        <FieldGroup>
                            <PriceInput
                                netAmount={basePriceNet}
                                grossAmount={basePriceGross}
                                vatRate={vatRate}
                                onChange={(net, gross) => { setBasePriceNet(net); setBasePriceGross(gross); }}
                                netLabel="Cena netto"
                                grossLabel="Cena brutto"
                                vatLabel="VAT"
                            />
                        </FieldGroup>
                    </Content>

                    <Footer>
                        <Button type="button" $variant="secondary" onClick={onClose}>
                            Anuluj
                        </Button>
                        <Button
                            type="submit"
                            $variant="primary"
                            disabled={basePriceNet <= 0 && basePriceGross <= 0}
                        >
                            Dodaj usługę
                        </Button>
                    </Footer>
                </Form>
            </ModalContainer>
        </Overlay>,
        document.body
    );
};
