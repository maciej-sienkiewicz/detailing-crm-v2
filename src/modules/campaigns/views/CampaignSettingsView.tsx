// src/modules/campaigns/views/CampaignSettingsView.tsx
// Wspólne reguły wysyłki. Trzy panele, jedna akcja główna na dole - ten sam
// układ i te same klocki, co w reszcie modułu.
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { useCampaignSettings } from '../hooks/useCampaigns';
import {
  Field,
  FieldLabel,
  HintText,
  MutedText,
  Panel,
  PrimaryButton,
  TextAreaField,
  TextField,
  ViewContainer,
} from '../components/shared';
import type { CampaignSettings } from '../types';

const TimeRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

/**
 * Stopka ustawień. Jedna akcja główna i nic obok niej - „Zapisz" wygląda tu
 * inaczej po zapisie, żeby potwierdzenie nie musiało być osobnym komunikatem
 * gdzieś z boku ekranu.
 */
const SaveRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export function CampaignSettingsView() {
  const navigate = useNavigate();
  const { settings, isLoading, save, isSaving } = useCampaignSettings();
  const [form, setForm] = useState<CampaignSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (isLoading || !form) {
    return <ViewContainer><MutedText>Wczytywanie…</MutedText></ViewContainer>;
  }

  const set = (patch: Partial<CampaignSettings>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };

  return (
    <ViewContainer>
      <PageHeader
        title="Ustawienia wysyłki"
        subtitle="Wspólne reguły dla wszystkich kampanii"
        actions={
          <PageHeaderGhostButton onClick={() => navigate('/campaigns')}>
            <ArrowLeft /> Wróć do kampanii
          </PageHeaderGhostButton>
        }
      />

      <Panel>
        <h4>Godziny ciszy</h4>
        <HintText>Wiadomości zaplanowane na noc wyślemy następnego dnia rano.</HintText>
        <TimeRow>
          <Field>
            <FieldLabel>Od</FieldLabel>
            <TextField
              style={{ maxWidth: 140 }}
              type="time"
              value={form.quietHoursStart}
              onChange={(e) => set({ quietHoursStart: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Do</FieldLabel>
            <TextField
              style={{ maxWidth: 140 }}
              type="time"
              value={form.quietHoursEnd}
              onChange={(e) => set({ quietHoursEnd: e.target.value })}
            />
          </Field>
        </TimeRow>
      </Panel>

      <Panel>
        <h4>Limit częstotliwości</h4>
        <HintText>
          Klient nie dostanie kolejnej kampanii wcześniej niż po tylu dniach od poprzedniej.
          Nie dotyczy powiadomień o wizytach.
        </HintText>
        <Field>
          <FieldLabel>Minimalny odstęp (dni)</FieldLabel>
          <TextField
            style={{ maxWidth: 140 }}
            type="number"
            min={0}
            max={90}
            value={form.frequencyCapDays}
            onChange={(e) => set({ frequencyCapDays: Number(e.target.value) })}
          />
        </Field>
      </Panel>

      <Panel>
        <h4>Stopki wiadomości</h4>
        <Field style={{ maxWidth: 620 }}>
          <FieldLabel>Stopka SMS</FieldLabel>
          <TextAreaField
            style={{ minHeight: 70 }}
            value={form.smsFooter ?? ''}
            placeholder="np. Rezygnacja: odpisz STOP"
            onChange={(e) => set({ smsFooter: e.target.value })}
          />
          <HintText>Doliczana do każdego SMS-a kampanii, wlicza się w limit znaków.</HintText>
        </Field>
        <Field style={{ maxWidth: 620 }}>
          <FieldLabel>Stopka e-mail</FieldLabel>
          <TextAreaField
            style={{ minHeight: 70 }}
            value={form.emailFooter ?? ''}
            placeholder="np. dane studia i informacja o rezygnacji"
            onChange={(e) => set({ emailFooter: e.target.value })}
          />
        </Field>
      </Panel>

      <SaveRow>
        <PrimaryButton
          type="button"
          disabled={isSaving}
          onClick={async () => {
            await save(form);
            setSaved(true);
          }}
        >
          {saved ? <Check /> : <Save />}
          {isSaving ? 'Zapisywanie…' : saved ? 'Zapisano' : 'Zapisz ustawienia'}
        </PrimaryButton>
      </SaveRow>
    </ViewContainer>
  );
}
