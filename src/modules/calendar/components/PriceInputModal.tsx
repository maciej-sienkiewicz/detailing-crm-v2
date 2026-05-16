// src/modules/calendar/components/PriceInputModal.tsx

import React, { useState, useEffect } from 'react';
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

interface PriceInputModalProps {
    isOpen: boolean;
    serviceName: string;
    vatRate?: number;
    onClose: () => void;
    onConfirm: (priceNet: number) => void;
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
    const [priceNet, setPriceNet] = useState(0);

    useEffect(() => {
        if (isOpen) setPriceNet(0);
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(priceNet);
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
                                vatRate={vatRate as 0 | 5 | 8 | 23 | -1}
                                onChange={setPriceNet}
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
