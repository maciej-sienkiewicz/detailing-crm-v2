// src/modules/settings/components/MySignatureSection.tsx
//
// „Twój podpis" w Ustawienia → Dokumenty i podpisy: dane profilu + SignatureConfigCard.
//
// Błąd wczytania wyglądał wcześniej jak „Brak podpisu" z przyciskiem „Dodaj podpis" -
// ktoś, kto podpis ma, rysował go drugi raz. Teraz błąd to komunikat z ponowieniem.

import { useCallback } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/modules/profile/api/profileApi';
import { SignatureConfigCard } from '@/modules/employees/components/SignatureConfigCard';
import { Button, Notice, Panel, ui } from '@/common/components/ui';

const Placeholder = styled(Panel)`
    padding: 16px 20px;

    p { margin: 0; font-size: 14px; color: ${ui.textMuted}; }
`;

export function MySignatureSection() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['profile', 'signature'],
        queryFn: () => profileApi.getSignature(),
        staleTime: 30_000,
    });

    // Stała referencja: karta odpytuje tym po wysłaniu linku SMS.
    const reload = useCallback(() => { void refetch(); }, [refetch]);

    if (isLoading) {
        return <Placeholder aria-label="Twój podpis"><p role="status">Wczytywanie podpisu...</p></Placeholder>;
    }

    if (isError && !data) {
        return (
            <Placeholder aria-label="Twój podpis">
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać Twojego podpisu"
                    action={<Button variant="ghost" size="sm" onClick={reload}>Spróbuj ponownie</Button>}
                >
                    Sprawdź połączenie z internetem.
                </Notice>
            </Placeholder>
        );
    }

    return (
        <SignatureConfigCard
            hasSignature={data?.hasSignature ?? false}
            initialPreviewUrl={data?.url ?? null}
            onSave={(base64) => profileApi.saveSignature(base64)}
            onDelete={() => profileApi.deleteSignature()}
            onSendLink={(phoneNumber) => profileApi.sendSignatureLink(phoneNumber).then(() => {})}
            onChanged={reload}
        />
    );
}
