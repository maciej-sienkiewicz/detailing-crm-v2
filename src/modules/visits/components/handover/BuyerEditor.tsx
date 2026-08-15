import styled from 'styled-components';
import { FormGrid, FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { NipInputWithGus, type CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Muted } from './HandoverKit';
import type { HandoverBuyer } from '../../types/handover';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const ConsumerNote = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
    padding: 9px 11px;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
`;

/** Adres z GUS → jedna linia „ulica numer/lokal". */
const streetLine = (address: CompanyInfoResponse['address']): string =>
    [
        address.street,
        [address.buildingNumber, address.apartmentNumber].filter(Boolean).join('/'),
    ]
        .filter(Boolean)
        .join(' ')
        .trim();

interface BuyerEditorProps {
    buyer: HandoverBuyer;
    onChange: (buyer: HandoverBuyer) => void;
}

/**
 * Edycja nabywcy faktury. Otwiera się wypełniona danymi z kartoteki klienta —
 * NIP i adres firmy przychodzą teraz w detalu wizyty, więc w typowym wydaniu
 * nie ma tu nic do wpisania. Przycisk „Pobierz z GUS" uzupełnia nazwę i adres
 * po samym numerze NIP.
 */
export const BuyerEditor = ({ buyer, onChange }: BuyerEditorProps) => {
    const set = (changes: Partial<HandoverBuyer>) => onChange({ ...buyer, ...changes });

    const applyGus = (company: CompanyInfoResponse) =>
        onChange({
            ...buyer,
            nip: company.nip,
            name: company.name,
            addressLine1: streetLine(company.address) || buyer.addressLine1,
            addressLine2:
                [company.address.postalCode, company.address.city].filter(Boolean).join(' ') ||
                buyer.addressLine2,
            email: buyer.email || company.email || '',
        });

    return (
        <Wrap>
            <FormField>
                <FieldLabel htmlFor="handover-buyer-nip">NIP — puste oznacza konsumenta</FieldLabel>
                <NipInputWithGus
                    id="handover-buyer-nip"
                    value={buyer.nip}
                    onChange={value => set({ nip: value })}
                    onFetch={applyGus}
                    placeholder="np. 5213017228"
                    compact
                />
            </FormField>

            {!buyer.nip.trim() && (
                <ConsumerNote>
                    Bez numeru NIP faktura zostanie wystawiona dla konsumenta — na imię i nazwisko
                    podane niżej.
                </ConsumerNote>
            )}

            <FormGrid $columns={2}>
                <FormField>
                    <FieldLabel htmlFor="handover-buyer-name">Nazwa albo imię i nazwisko</FieldLabel>
                    <InputShell $compact>
                        <BareInput
                            id="handover-buyer-name"
                            value={buyer.name}
                            onChange={e => set({ name: e.target.value })}
                            $compact
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="handover-buyer-email">E-mail</FieldLabel>
                    <InputShell $compact>
                        <BareInput
                            id="handover-buyer-email"
                            type="email"
                            value={buyer.email}
                            onChange={e => set({ email: e.target.value })}
                            $compact
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="handover-buyer-street">Ulica i numer</FieldLabel>
                    <InputShell $compact>
                        <BareInput
                            id="handover-buyer-street"
                            value={buyer.addressLine1}
                            onChange={e => set({ addressLine1: e.target.value })}
                            $compact
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="handover-buyer-city">Kod pocztowy i miejscowość</FieldLabel>
                    <InputShell $compact>
                        <BareInput
                            id="handover-buyer-city"
                            value={buyer.addressLine2}
                            onChange={e => set({ addressLine2: e.target.value })}
                            $compact
                        />
                    </InputShell>
                </FormField>
            </FormGrid>

            <Muted>
                Dane pochodzą z kartoteki klienta. Zmiana dotyczy wyłącznie tej faktury — kartoteka
                zostaje bez zmian.
            </Muted>
        </Wrap>
    );
};
