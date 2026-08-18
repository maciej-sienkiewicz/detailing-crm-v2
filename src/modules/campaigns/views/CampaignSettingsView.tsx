import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PageHeader } from '@/common/components/PageHeader';
import { useCampaignSettings } from '../hooks/useCampaigns';
import { Eyebrow, MutedText, Page, SectionCard } from '../components/shared';
import type { CampaignSettings } from '../types';

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text};
`;

const Input = styled.input`
  padding: 10px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  max-width: 220px;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const TextArea = styled.textarea`
  padding: 10px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  max-width: 560px;
  min-height: 70px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const SaveBtn = styled.button`
  background: #0ea5e9;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 10px 24px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;
  align-self: flex-start;

  &:hover:not(:disabled) { background: #0284c7; transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: default; }
`;

export function CampaignSettingsView() {
  const { settings, isLoading, save, isSaving } = useCampaignSettings();
  const [form, setForm] = useState<CampaignSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (isLoading || !form) return <Page><MutedText>Wczytywanie...</MutedText></Page>;

  const set = (patch: Partial<CampaignSettings>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };

  return (
    <Page>
      <PageHeader title="Ustawienia wysyłki" subtitle="Wspólne reguły dla wszystkich kampanii" />

      <SectionCard style={{ margin: '20px 0 16px' }}>
        <Eyebrow>Godziny ciszy</Eyebrow>
        <MutedText style={{ display: 'block', marginBottom: 12 }}>
          Wiadomości zaplanowane na noc wyślemy następnego dnia rano.
        </MutedText>
        <div style={{ display: 'flex', gap: 16 }}>
          <Field>
            <Label>Od</Label>
            <Input type="time" value={form.quietHoursStart}
              onChange={(e) => set({ quietHoursStart: e.target.value })} />
          </Field>
          <Field>
            <Label>Do</Label>
            <Input type="time" value={form.quietHoursEnd}
              onChange={(e) => set({ quietHoursEnd: e.target.value })} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard style={{ marginBottom: 16 }}>
        <Eyebrow>Limit częstotliwości</Eyebrow>
        <MutedText style={{ display: 'block', marginBottom: 12 }}>
          Klient nie dostanie kolejnej kampanii wcześniej niż po tylu dniach od poprzedniej.
          Nie dotyczy powiadomień o wizytach.
        </MutedText>
        <Field>
          <Label>Minimalny odstęp (dni)</Label>
          <Input type="number" min={0} max={90} value={form.frequencyCapDays}
            onChange={(e) => set({ frequencyCapDays: Number(e.target.value) })} />
        </Field>
      </SectionCard>

      <SectionCard style={{ marginBottom: 16 }}>
        <Eyebrow>Stopki wiadomości</Eyebrow>
        <Field>
          <Label>Stopka SMS</Label>
          <TextArea value={form.smsFooter ?? ''} placeholder="np. Rezygnacja: odpisz STOP"
            onChange={(e) => set({ smsFooter: e.target.value })} />
          <MutedText>Doliczana do każdego SMS-a kampanii, wlicza się w limit znaków.</MutedText>
        </Field>
        <Field>
          <Label>Stopka e-mail</Label>
          <TextArea value={form.emailFooter ?? ''} placeholder="np. dane studia i informacja o rezygnacji"
            onChange={(e) => set({ emailFooter: e.target.value })} />
        </Field>
      </SectionCard>

      <SaveBtn
        disabled={isSaving}
        onClick={async () => {
          await save(form);
          setSaved(true);
        }}
      >
        {isSaving ? 'Zapisywanie...' : saved ? 'Zapisano' : 'Zapisz ustawienia'}
      </SaveBtn>
    </Page>
  );
}
