// src/modules/settings/components/DocumentLogoCard.tsx
//
// Ustawienia → Komunikacja → Dokumenty i podpisy → „Logo na dokumentach".
//
// Jeden przełącznik: „Czy umieszczać logo na dokumentach?". Steruje stemplem logo
// w nagłówku systemowych protokołów (przyjęcia, wydania) i systemowej zgody
// marketingowej. Samo logo wgrywa się w „Dane firmy" — ta karta tylko mówi,
// czy go tam w ogóle jest, i odsyła do właściwego miejsca, gdy brakuje.
//
// Zapis natychmiast po kliknięciu (jak w Karcie Wizyty), bez przycisku „Zapisz";
// błąd cofa stan przez ponowne pobranie konfiguracji.

import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { useDocumentLogoConfig, useUpdateDocumentLogoConfig } from '../hooks/useCompany';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 22px 26px;
`;

const CardTitle = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin: 0 0 6px;
`;

const CardDescription = styled.p`
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    margin: 0 0 16px;
    line-height: 1.5;
    max-width: 640px;
`;

const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 0 2px;
    border-top: 1px solid ${p => p.theme.colors.border};
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
`;

const OptionTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const OptionHint = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    margin-top: 2px;
    line-height: 1.45;

    a {
        color: ${p => p.theme.colors.primary};
        font-weight: 600;
        text-decoration: none;
    }
    a:hover { text-decoration: underline; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentLogoCard() {
    const { isOwner } = usePermissions();
    const { config, isLoading } = useDocumentLogoConfig();
    const updateMutation = useUpdateDocumentLogoConfig();
    const { showError } = useToast();

    // Do czasu odpowiedzi zakładamy stan domyślny backendu (włączone) — tak samo
    // zachowuje się system, zanim ktokolwiek dotknął przełącznika.
    const enabled = config?.showLogoOnDocuments ?? true;
    const hasLogo = config?.hasLogo ?? false;
    const saving = updateMutation.isPending;
    const locked = isLoading || saving || !isOwner;

    const handleChange = (value: boolean) => {
        updateMutation.mutate(
            { showLogoOnDocuments: value },
            { onError: () => showError('Nie udało się zapisać ustawienia logo na dokumentach') },
        );
    };

    return (
        <Card>
            <CardTitle>Logo na dokumentach</CardTitle>
            <CardDescription>
                Logo firmy z sekcji „Dane firmy" może trafiać w nagłówek systemowych protokołów
                przyjęcia i wydania oraz systemowej zgody marketingowej. Własne szablony wgrane
                przez studio nie są zmieniane. Ustawienie dotyczy dokumentów generowanych od tej chwili.
            </CardDescription>

            <OptionRow $disabled={!isOwner}>
                <OptionTexts>
                    <OptionLabel>Czy umieszczać logo na dokumentach?</OptionLabel>
                    <OptionHint>
                        {!hasLogo && !isLoading ? (
                            <>
                                Firma nie ma jeszcze wgranego logo. Dodaj je w{' '}
                                <Link to="/settings?tab=company">Danych firmy</Link>, a pojawi się na dokumentach.
                            </>
                        ) : !isOwner ? (
                            'Zmienić to ustawienie może tylko właściciel studia.'
                        ) : enabled ? (
                            'Po wyłączeniu nowe protokoły i zgody będą generowane bez logo w nagłówku.'
                        ) : (
                            'Logo nie jest obecnie umieszczane na dokumentach.'
                        )}
                    </OptionHint>
                </OptionTexts>
                <Toggle
                    checked={enabled}
                    disabled={locked}
                    ariaLabel="Czy umieszczać logo na dokumentach?"
                    onChange={handleChange}
                />
            </OptionRow>
        </Card>
    );
}
