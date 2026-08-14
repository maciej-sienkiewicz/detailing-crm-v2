import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormGrid, FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { companyApi } from '@/modules/settings/api/companyApi';
import type { CompanySettings } from '@/modules/settings/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Box = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: ${st.radiusSm};

    h4 { margin: 0; font-size: ${st.fontMd}; color: #1e3a8a; }
    p  { margin: 0; font-size: ${st.fontSm}; color: #1e40af; line-height: 1.5; }
`;

interface CompanyDraft {
    name: string;
    taxId: string;
    street: string;
    postalCode: string;
    city: string;
}

interface SellerPromptProps {
    company: CompanySettings | undefined;
}

/**
 * Uzupełnienie danych sprzedawcy bez wychodzenia z wydania.
 *
 * Pokazuje się od razu po otwarciu ekranu, a nie dopiero przy próbie zapisu —
 * brak NIP-u studia blokuje wysyłkę do KSeF, więc użytkownik ma się o tym
 * dowiedzieć zanim zacznie, a nie przy kliencie stojącym przy ladzie.
 */
export const SellerPrompt = ({ company }: SellerPromptProps) => {
    const queryClient = useQueryClient();

    // Trzymamy wyłącznie to, co użytkownik zmienił. Reszta czyta się wprost
    // z ustawień studia, więc dane doczytane w tle nie wymagają kopiowania
    // do stanu ani efektu synchronizującego.
    const [edits, setEdits] = useState<Partial<Record<keyof CompanyDraft, string>>>({});

    const draft: CompanyDraft = {
        name: edits.name ?? company?.name ?? '',
        taxId: edits.taxId ?? company?.taxId ?? '',
        street: edits.street ?? company?.street ?? '',
        postalCode: edits.postalCode ?? company?.postalCode ?? '',
        city: edits.city ?? company?.city ?? '',
    };

    const set = (changes: Partial<CompanyDraft>) => setEdits(prev => ({ ...prev, ...changes }));

    const save = useMutation({
        // Pełny obiekt aktualizacji — pola nieedytowane tutaj przechodzą bez zmian.
        mutationFn: () =>
            companyApi.updateCompanySettings({
                name: draft.name.trim(),
                taxId: draft.taxId.trim(),
                regon: company?.regon ?? '',
                street: draft.street.trim() || (company?.street ?? ''),
                postalCode: draft.postalCode.trim() || (company?.postalCode ?? ''),
                city: draft.city.trim() || (company?.city ?? ''),
                phone: company?.phone ?? '',
                email: company?.email ?? '',
                website: company?.website ?? null,
                bankAccount: company?.bankAccount ?? null,
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company', 'settings'] }),
    });

    return (
        <Box>
            <h4>Uzupełnij dane swojej firmy</h4>
            <p>
                Do wystawienia faktury w KSeF potrzebna jest nazwa i NIP. Dane zapiszą się
                w ustawieniach studia — wpisujesz je tylko raz.
            </p>
            <FormGrid $columns={2}>
                <FormField>
                    <FieldLabel htmlFor="seller-name">Nazwa firmy *</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="seller-name"
                            value={draft.name}
                            onChange={e => set({ name: e.target.value })}
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="seller-nip">NIP *</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="seller-nip"
                            value={draft.taxId}
                            inputMode="numeric"
                            onChange={e => set({ taxId: e.target.value })}
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="seller-street">Ulica i numer</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="seller-street"
                            value={draft.street}
                            onChange={e => set({ street: e.target.value })}
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="seller-city">Kod pocztowy i miejscowość</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="seller-city"
                            value={`${draft.postalCode} ${draft.city}`.trim()}
                            onChange={e => {
                                const [postalCode = '', ...rest] = e.target.value.split(' ');
                                set({ postalCode, city: rest.join(' ') });
                            }}
                        />
                    </InputShell>
                </FormField>
            </FormGrid>
            <SharedButton
                $variant="primary"
                $size="sm"
                type="button"
                disabled={save.isPending || !draft.name.trim() || !draft.taxId.trim()}
                onClick={() => save.mutate()}
            >
                {save.isPending ? 'Zapisywanie…' : 'Zapisz dane firmy'}
            </SharedButton>
        </Box>
    );
};
