// src/modules/settings/components/CampaignsSettingsSection.tsx
//
// Ustawienia → Klienci → Kampanie.
//
// Wspólne reguły wysyłki kampanii: godziny ciszy, limit częstotliwości i stopki. Dawniej
// osobna strona /campaigns/settings z własnym nagłówkiem i przyciskiem „Zapisz" na dole,
// do której prowadził tylko przycisk z listy kampanii - w Ustawieniach jej nie było,
// więc kto szukał „godzin ciszy" tam, nie znajdował nic. Stary adres przekierowuje tutaj.
//
// Zapis jak w innych formularzach ustawień: pasek niezapisanych zmian (UnsavedChangesBanner)
// pilnuje też wyjścia z sekcji z niezapisaną zmianą.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import { Panel, SectionTitle, ui } from '@/common/components/ui';
import { useFeature } from '@/modules/subscription';
import { useCampaignSettings } from '@/modules/campaigns/hooks/useCampaigns';
import { TextAreaField, TextField } from '@/modules/campaigns/components/shared';
import type { CampaignSettings } from '@/modules/campaigns/types';
import { UnsavedChangesBanner } from './shared/SettingsLayout';

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const Box = styled(Panel)`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 22px;

    @media (max-width: 640px) { padding: 16px; }
`;

const Hint = styled.p`
    margin: 0;
    max-width: 68ch;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const Row = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    max-width: 620px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};

    /* Pole leży w <label> - bez tego dziedziczyłoby pogrubienie etykiety. */
    input, textarea { font-weight: 400; }
    input[type='time'], input[type='number'] { width: 140px; }
    textarea { min-height: 70px; }
`;

const Loading = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const changedFields = (a: CampaignSettings, b: CampaignSettings): number =>
    (Object.keys(a) as (keyof CampaignSettings)[]).filter(key => (a[key] ?? '') !== (b[key] ?? '')).length;

export function CampaignsSettingsSection() {
    const feature = useFeature('CAMPAIGNS');
    const { settings, isLoading, save, isSaving } = useCampaignSettings();
    const { showSuccess } = useToast();
    // Zmiany trzymamy osobno od danych z serwera: bez edycji formularz pokazuje to, co
    // przyszło z API, a po zapisie i odświeżeniu pasek gaśnie sam, bo obie strony są równe.
    const [draft, setDraft] = useState<CampaignSettings | null>(null);
    const form = draft ?? settings ?? null;

    const changed = useMemo(() => (draft && settings ? changedFields(draft, settings) : 0), [draft, settings]);

    const set = (patch: Partial<CampaignSettings>) => {
        if (form) setDraft({ ...form, ...patch });
    };

    const submit = async () => {
        if (!form) return;
        try {
            await save(form);
            showSuccess('Zapisano ustawienia kampanii');
        } catch {
            // Komunikat 4xx pokazał interceptor, 5xx zgłasza MutationCache (App.tsx).
        }
    };

    return (
        <LockedSection
            locked={!feature.enabled}
            message="Twój abonament nie obsługuje kampanii SMS i e-mail."
        >
            {isLoading || !form ? (
                <Loading role="status">Wczytywanie…</Loading>
            ) : (
                <Stack>
                    <Box aria-labelledby="campaigns-quiet-title">
                        <SectionTitle as="h3" id="campaigns-quiet-title">Godziny ciszy</SectionTitle>
                        <Hint>Wiadomości zaplanowane na noc wyślemy następnego dnia rano.</Hint>
                        <Row>
                            <Field>
                                Od
                                <TextField
                                    type="time"
                                    value={form.quietHoursStart}
                                    onChange={e => set({ quietHoursStart: e.target.value })}
                                />
                            </Field>
                            <Field>
                                Do
                                <TextField
                                    type="time"
                                    value={form.quietHoursEnd}
                                    onChange={e => set({ quietHoursEnd: e.target.value })}
                                />
                            </Field>
                        </Row>
                    </Box>

                    <Box aria-labelledby="campaigns-cap-title">
                        <SectionTitle as="h3" id="campaigns-cap-title">Limit częstotliwości</SectionTitle>
                        <Hint>
                            Klient nie dostanie kolejnej kampanii wcześniej niż po tylu dniach od poprzedniej.
                            Nie dotyczy wiadomości o wizytach.
                        </Hint>
                        <Field>
                            Minimalny odstęp w dniach
                            <TextField
                                type="number"
                                min={0}
                                max={90}
                                value={form.frequencyCapDays}
                                onChange={e => set({ frequencyCapDays: Number(e.target.value) })}
                            />
                        </Field>
                    </Box>

                    <Box aria-labelledby="campaigns-footers-title">
                        <SectionTitle as="h3" id="campaigns-footers-title">Stopki wiadomości</SectionTitle>
                        <Field>
                            Stopka SMS
                            <TextAreaField
                                value={form.smsFooter ?? ''}
                                placeholder="np. Rezygnacja: odpisz STOP"
                                onChange={e => set({ smsFooter: e.target.value })}
                            />
                        </Field>
                        <Hint>Doliczana do każdego SMS-a kampanii. Wlicza się w limit znaków.</Hint>
                        <Field>
                            Stopka e-mail
                            <TextAreaField
                                value={form.emailFooter ?? ''}
                                placeholder="np. dane studia i informacja o rezygnacji"
                                onChange={e => set({ emailFooter: e.target.value })}
                            />
                        </Field>
                    </Box>

                    <UnsavedChangesBanner
                        visible={changed > 0}
                        changedCount={changed}
                        isSaving={isSaving}
                        onSave={() => void submit()}
                        onDiscard={() => setDraft(null)}
                    />
                </Stack>
            )}
        </LockedSection>
    );
}
