// src/modules/settings/components/DocumentLogoCard.tsx
//
// Ustawienia → Komunikacja → Dokumenty i podpisy → „Logo na dokumentach".
//
// Jeden przełącznik: „Czy umieszczać logo na dokumentach?". Steruje stemplem logo
// w nagłówku systemowych protokołów (przyjęcia, wydania) i systemowej zgody
// marketingowej. Samo logo wgrywa się w „Dane firmy" — ta karta tylko mówi,
// czy go tam w ogóle jest, i odsyła do właściwego miejsca, gdy brakuje.
//
// Karta nie ma osobnego nagłówka ani akapitu wstępnego: pytanie JEST nagłówkiem,
// a podpis pod nim mówi, co się stanie po przestawieniu. Poprzednia wersja
// tłumaczyła w czterech linijkach zasady, których i tak nie da się tu zmienić
// (że dotyczy tylko szablonów systemowych i tylko dokumentów przyszłych) —
// czytało się to przed każdym kliknięciem jednego przełącznika.
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

// Kreska u góry rozdzielała wiersz od akapitu, który stał nad nim. Akapitu nie
// ma, więc kreska zostałaby wiszącą linią tuż pod krawędzią karty.
const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
`;

const OptionTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

// Pytanie jest teraz jedynym tytułem tej karty, więc bierze metrykę nagłówka
// sekcji (15px/700) zamiast etykiety pola.
const OptionLabel = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
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
