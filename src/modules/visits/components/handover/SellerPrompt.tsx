import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormGrid, FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { Button, Notice } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { toastUnhandledError } from '@/modules/subscription/utils/apiErrors';
import { companyApi } from '@/modules/settings/api/companyApi';
import type { CompanySettings } from '@/modules/settings/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Box = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: ${st.radiusSm};

    h4 { margin: 0; font-size: ${st.fontMd}; color: #0c4a6e; }
    p  { margin: 0; font-size: ${st.fontSm}; color: #075985; line-height: 1.5; }
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
 * Pokazuje się od razu po otwarciu ekranu, a nie dopiero przy próbie zapisu:
 * brak NIP-u studia blokuje wysyłkę do KSeF, więc użytkownik ma się o tym
 * dowiedzieć zanim zacznie, a nie przy kliencie stojącym przy ladzie.
 */
export const SellerPrompt = ({ company }: SellerPromptProps) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    // Ten sam wpis cache co w useHandover - tu tylko po to, żeby odróżnić „danych
    // nie ma" od „nie udało się ich wczytać".
    const settings = useQuery({
        queryKey: ['company', 'settings'],
        queryFn: () => companyApi.getCompanySettings(),
    });

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
        // Wyłącznie to, co wpisano tutaj; reszty backend nie rusza. Pełny obiekt
        // składany z `company` nadpisywał telefon, e-mail, REGON i adres studia
        // pustymi wartościami, gdy ustawień nie udało się wczytać.
        mutationFn: () =>
            companyApi.updateCompanySettings({
                name: draft.name.trim(),
                taxId: draft.taxId.trim(),
                street: edits.street?.trim() || undefined,
                postalCode: edits.postalCode?.trim() || undefined,
                city: edits.city?.trim() || undefined,
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company', 'settings'] }),
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się zapisać danych firmy', 'Spróbuj ponownie.'),
    });

    if (settings.isLoading) return null;

    if (settings.isError && !company) {
        return (
            <Notice
                tone="warn"
                title="Nie udało się wczytać danych Twojej firmy"
                action={<Button variant="ghost" size="sm" onClick={() => settings.refetch()}>Spróbuj ponownie</Button>}
            >
                Pojazd wydasz dalej: nazwę i NIP firmy system sprawdzi sam przy wydaniu.
            </Notice>
        );
    }

    return (
        <Box>
            <h4>Uzupełnij dane swojej firmy</h4>
            <p>
                Do wystawienia faktury w KSeF potrzebna jest nazwa i NIP. Dane zapiszą się
                w ustawieniach studia, wpisujesz je tylko raz.
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
            {/* Odcień, nie wypełnienie: krokiem następnym okna jest „Wydaj pojazd" w stopce. */}
            <Button
                variant="tinted"
                size="sm"
                disabled={save.isPending || !draft.name.trim() || !draft.taxId.trim()}
                onClick={() => save.mutate()}
                style={{ alignSelf: 'flex-start' }}
            >
                {save.isPending ? 'Zapisywanie…' : 'Zapisz dane firmy'}
            </Button>
        </Box>
    );
};
