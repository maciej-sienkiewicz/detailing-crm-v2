// Flagi metod płatności z oficjalnej paczki Przelewy24 (public/brand/payments). P24 wymaga
// ich w stopce każdej publicznej podstrony - Visa i Mastercard przy płatnościach kartą.
// Logotypy stoją na białych plakietkach, bo te same flagi idą też na ciemny pas logowania.

import styled from 'styled-components';

const FLAGS = [
    { file: 'przelewy24', label: 'Przelewy24', width: 66 },
    { file: 'blik', label: 'BLIK', width: 34 },
    { file: 'visa', label: 'Visa', width: 46 },
    { file: 'mastercard', label: 'Mastercard', width: 28 },
] as const;

export function PaymentFlags() {
    return (
        <Row aria-label="Metody płatności">
            <span>Płatności obsługuje</span>
            {FLAGS.map(flag => (
                <Chip key={flag.file}>
                    <img src={`/brand/payments/${flag.file}.png`} alt={flag.label} width={flag.width} height={18} loading="lazy" />
                </Chip>
            ))}
        </Row>
    );
}

const Row = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 10px;

    > span {
        margin-right: 2px;
    }
`;

const Chip = styled.span`
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 6px;
    border-radius: 5px;
    background: #ffffff;
    border: 1px solid #e4e7ec;

    img {
        height: 18px;
        width: auto;
        object-fit: contain;
    }
`;
