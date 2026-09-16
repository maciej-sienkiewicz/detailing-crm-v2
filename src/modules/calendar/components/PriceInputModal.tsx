// src/modules/calendar/components/PriceInputModal.tsx

import React, { useState } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { PriceInput } from '@/modules/services/components/PriceInput';
import { FormInfoBox, FormInfoLabel, FormInfoValue } from '@/common/styles';
import styled from 'styled-components';
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
    Footer,
    Button,
} from './QuickServiceModalStyles';

const ServiceInfoBox = styled(FormInfoBox)`
    margin-bottom: 0;
`;

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

/**
 * Cena usługi rozliczanej indywidualnie - wynik okna to PARA kwot, nie jedna liczba.
 *
 * Wcześniej okno oddawało samo netto, a brutto odtwarzał sobie z niego formularz
 * kreatora. To łamie regułę z CLAUDE.md §1: przejście brutto → netto → brutto nie
 * jest tożsamością, więc człowiek, który wpisał 1900,00 zł w polu BRUTTO, dostawał
 * z powrotem 1900,01 zł. [PriceInput] oddaje obie kwoty naraz i obie tu zostają -
 * dokładnie tak, jak robi to bliźniacze okno przy przyjęciu pojazdu
 * (`checkin/ManualPriceModal`).
 */
export interface ManualPriceInput {
    /** Netto w groszach - dokładne, gdy człowiek wpisał netto. */
    priceNet: number;
    /** Brutto w groszach - dokładne, gdy człowiek wpisał brutto. */
    priceGross: number;
}

interface PriceInputModalProps {
    isOpen: boolean;
    serviceName: string;
    vatRate?: number;
    onClose: () => void;
    onConfirm: (price: ManualPriceInput) => void;
}

export const PriceInputModal: React.FC<PriceInputModalProps> = ({
    isOpen,
    serviceName,
    vatRate = 23,
    onClose,
    onConfirm,
}) => {
    const { isCollapsed } = useSidebar();
    const contentLeft = typeof window !== 'undefined' ? (isCollapsed ? 64 : 240) : 0;
    // Pola startują puste i nie mają się z niczym synchronizować: rodzic montuje
    // to okno osobno dla każdej usługi (key), więc kolejna cena zaczyna od czystego
    // stanu bez efektu zerującego. Ten sam wzorzec co w checkin/ManualPriceModal.
    const [priceNet, setPriceNet] = useState(0);
    const [priceGross, setPriceGross] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ priceNet, priceGross });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Overlay
            $isOpen={isOpen}
            $contentLeft={contentLeft}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <ModalContainer $isOpen={isOpen}>
                <Form onSubmit={handleSubmit}>
                    <Header>
                        <TitleGroup>
                            <Title>Wprowadź cenę</Title>
                        </TitleGroup>
                        <CloseButton type="button" onClick={onClose}>
                            <IconX />
                        </CloseButton>
                    </Header>

                    <Content>
                        <ServiceInfoBox>
                            <FormInfoLabel>Usługa</FormInfoLabel>
                            <FormInfoValue>{serviceName}</FormInfoValue>
                        </ServiceInfoBox>

                        <FieldGroup>
                            <PriceInput
                                netAmount={priceNet}
                                /* Brutto oddane z powrotem do pola, żeby kwota wpisana
                                   w brutcie nie została przeliczona na ekranie. */
                                grossAmount={priceGross}
                                vatRate={vatRate as 0 | 5 | 8 | 23 | -1}
                                onChange={(net, gross) => { setPriceNet(net); setPriceGross(gross); }}
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
                        <Button type="submit" $variant="primary">
                            Potwierdź cenę
                        </Button>
                    </Footer>
                </Form>
            </ModalContainer>
        </Overlay>
    );
};
