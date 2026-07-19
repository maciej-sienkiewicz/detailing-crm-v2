// src/modules/settings/components/VisitCardSection.tsx
//
// Ustawienia → Komunikacja → Karta Wizyty.
//
// Two studio-level switches:
//  - "Czy korzystać z Karty Wizyty?"       (master switch)
//  - "Czy domyślnie wysyłać Kartę Wizyty?" (default of the send checkbox at
//    booking / check-in; only meaningful when the card is enabled)
//
// The Visit Card requires the purchased SMS module — without it the whole
// section is locked with an upsell message.

import styled, { keyframes } from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import { useFeature } from '@/modules/subscription';
import { visitCardApi } from '@/modules/visit-card/api/visitCardApi';
import type { UpdateVisitCardSettingsPayload } from '@/modules/visit-card/types';
import { useVisitCardSettings, VISIT_CARD_SETTINGS_QUERY_KEY } from '@/modules/visit-card/hooks/useVisitCardSettings';

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 700ms linear infinite;
    margin: 60px auto;
`;

const Card = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px 28px;
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
    margin: 0 0 20px;
    line-height: 1.5;
    max-width: 640px;
`;

const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid ${p => p.theme.colors.border};
    opacity: ${p => (p.$disabled ? 0.5 : 1)};
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
`;

const ToggleTrack = styled.button<{ $on: boolean }>`
    position: relative;
    width: 42px;
    height: 24px;
    flex-shrink: 0;
    border: none;
    border-radius: 9999px;
    background: ${p => (p.$on ? '#0ea5e9' : '#cbd5e1')};
    cursor: pointer;
    transition: background 180ms ease;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => (p.$on ? '21px' : '3px')};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
        transition: left 180ms ease;
    }

    &:disabled {
        cursor: not-allowed;
    }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const VisitCardSection = () => {
    const smsFeature = useFeature('SMS_EMAIL');
    const { settings, isPending } = useVisitCardSettings();
    const { showError } = useToast();
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateVisitCardSettingsPayload) => visitCardApi.updateSettings(payload),
        onSuccess: data => {
            queryClient.setQueryData(VISIT_CARD_SETTINGS_QUERY_KEY, data);
        },
        onError: () => {
            showError('Nie udało się zapisać ustawień Karty Wizyty');
            queryClient.invalidateQueries({ queryKey: VISIT_CARD_SETTINGS_QUERY_KEY });
        },
    });

    const enabled = settings?.enabled ?? true;
    const sendByDefault = settings?.sendByDefault ?? false;
    const saving = updateMutation.isPending;

    return (
        <LockedSection
            locked={!smsFeature.enabled}
            message="Karta Wizyty wymaga wykupionego modułu SMS."
        >
            <Card>
                <CardTitle>Karta Wizyty</CardTitle>
                <CardDescription>
                    Karta Wizyty to strona dla klienta z podsumowaniem rezerwacji, zakresem usług
                    i wyceną, a w trakcie wizyty także dokumentacją zdjęciową i dokumentami.
                    Link do karty wysyłany jest SMS-em lub e-mailem.
                </CardDescription>

                {isPending ? (
                    <Spinner />
                ) : (
                    <>
                        <OptionRow>
                            <OptionTexts>
                                <OptionLabel>Czy korzystać z Karty Wizyty?</OptionLabel>
                                <OptionHint>
                                    Po wyłączeniu opcja wysyłki karty zniknie z tworzenia rezerwacji
                                    i przyjęcia pojazdu, a linki nie będą wysyłane.
                                </OptionHint>
                            </OptionTexts>
                            <ToggleTrack
                                $on={enabled}
                                disabled={saving}
                                aria-label="Czy korzystać z Karty Wizyty?"
                                onClick={() => updateMutation.mutate({ enabled: !enabled })}
                            />
                        </OptionRow>

                        <OptionRow $disabled={!enabled}>
                            <OptionTexts>
                                <OptionLabel>Czy domyślnie wysyłać Kartę Wizyty?</OptionLabel>
                                <OptionHint>
                                    Steruje domyślnym zaznaczeniem opcji „Czy wysłać Kartę Wizyty do
                                    klienta?" przy tworzeniu rezerwacji i przyjęciu pojazdu.
                                </OptionHint>
                            </OptionTexts>
                            <ToggleTrack
                                $on={enabled && sendByDefault}
                                disabled={saving || !enabled}
                                aria-label="Czy domyślnie wysyłać Kartę Wizyty?"
                                onClick={() => updateMutation.mutate({ sendByDefault: !sendByDefault })}
                            />
                        </OptionRow>
                    </>
                )}
            </Card>
        </LockedSection>
    );
};
