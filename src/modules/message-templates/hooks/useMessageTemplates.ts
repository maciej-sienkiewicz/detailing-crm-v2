import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { updateAutomationConfig } from '@/modules/sms-settings/api/smsSettingsApi';
import { SMS_AUTOMATION_KEY as SMS_KEY, smsAutomationQuery } from '@/modules/sms-settings/api/smsAutomationQuery';
import { updateEmailAutomationConfig } from '@/modules/email-campaigns/api/emailCampaignsApi';
import { EMAIL_AUTOMATION_KEY as EMAIL_KEY, emailAutomationQuery } from '@/modules/email-campaigns/api/emailAutomationQuery';
import type { SmsAutomationConfig, SmsRuleKey } from '@/modules/sms-settings/types';
import type { EmailAutomationConfig, EmailRuleKey } from '@/modules/email-campaigns/types';
import { DEFAULT_OFFSET_MINUTES, MESSAGES } from '../catalog';
import type { Channel, ChannelDraft, MessageKey, TemplatesDraft } from '../types';
import { problemDetail } from '@/core/problem';

/** Backend → screen: two per-channel configs collapse into one list of messages. */
function toDraft(sms: SmsAutomationConfig, email: EmailAutomationConfig): TemplatesDraft {
  const draft = {} as TemplatesDraft;

  MESSAGES.forEach(spec => {
    const entry: Partial<Record<Channel, ChannelDraft>> = {};

    if (spec.sms) {
      const rule = sms[spec.sms.ruleKey];
      entry.sms = {
        enabled: rule?.enabled ?? false,
        body: rule?.messageTemplate ?? '',
        checkedByDefault: rule?.checkedByDefault ?? false,
        offsetMinutes: spec.timing
          ? rule?.offsetMinutes ?? DEFAULT_OFFSET_MINUTES[spec.key] ?? 60
          : undefined,
      };
    }

    if (spec.email) {
      const rule = email[spec.email.ruleKey];
      entry.email = {
        enabled: rule?.enabled ?? false,
        subject: rule?.subjectTemplate ?? '',
        body: rule?.bodyTemplate ?? '',
        checkedByDefault: rule?.checkedByDefault ?? false,
      };
    }

    draft[spec.key] = entry;
  });

  return draft;
}

/**
 * Screen → backend. Starts from the config we fetched so any field this screen does not
 * render survives the round-trip untouched.
 */
function toSmsConfig(base: SmsAutomationConfig, draft: TemplatesDraft): SmsAutomationConfig {
  const next = { ...base };
  MESSAGES.forEach(spec => {
    const d = draft[spec.key]?.sms;
    if (!spec.sms || !d) return;
    const key = spec.sms.ruleKey as SmsRuleKey;
    next[key] = {
      ...base[key],
      enabled: d.enabled,
      messageTemplate: d.body,
      checkedByDefault: d.checkedByDefault ?? false,
      ...(d.offsetMinutes !== undefined ? { offsetMinutes: d.offsetMinutes } : {}),
    };
  });
  return next;
}

function toEmailConfig(base: EmailAutomationConfig, draft: TemplatesDraft): EmailAutomationConfig {
  const next = { ...base };
  MESSAGES.forEach(spec => {
    const d = draft[spec.key]?.email;
    if (!spec.email || !d) return;
    const key = spec.email.ruleKey as EmailRuleKey;
    next[key] = {
      ...base[key],
      enabled: d.enabled,
      subjectTemplate: d.subject ?? '',
      bodyTemplate: d.body,
      checkedByDefault: d.checkedByDefault ?? false,
    };
  });
  return next;
}

export interface MessageTemplatesState {
  draft: TemplatesDraft | null;
  isLoading: boolean;
  isError: boolean;
  /** Ponawia wczytanie obu konfiguracji po błędzie. */
  refetch: () => void;
  dirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  patchChannel: (key: MessageKey, channel: Channel, patch: Partial<ChannelDraft>) => void;
  save: () => Promise<void>;
  discard: () => void;
}

/**
 * Holds the whole screen's editable state. The two backend configs are fetched together
 * and saved together, but only the channel the studio actually touched is written: a PUT
 * replaces the entire config, so writing both would broadcast edits nobody made.
 */
export function useMessageTemplates(): MessageTemplatesState {
  const qc = useQueryClient();

  const [smsQuery, emailQuery] = useQueries({
    queries: [
      // Ekran edycji czyta zawsze świeżo - ktoś mógł zmienić szablony w innej karcie.
      { ...smsAutomationQuery(), staleTime: 0 },
      { ...emailAutomationQuery(), staleTime: 0 },
    ],
  });

  const [draft, setDraft] = useState<TemplatesDraft | null>(null);
  const [saved, setSaved] = useState<TemplatesDraft | null>(null);
  const [touched, setTouched] = useState<Set<Channel>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const server = useMemo(
    () => (smsQuery.data && emailQuery.data ? { sms: smsQuery.data, email: emailQuery.data } : null),
    [smsQuery.data, emailQuery.data]
  );

  // Pierwsza odpowiedź serwera staje się szkicem ekranu. W trakcie renderu, a nie
  // w efekcie: efekt dawał jeden render ze szkieletem po tym, jak dane już były.
  if (server && !draft) {
    const initial = toDraft(server.sms, server.email);
    setDraft(initial);
    setSaved(initial);
  }

  const patchChannel = useCallback(
    (key: MessageKey, channel: Channel, patch: Partial<ChannelDraft>) => {
      setDraft(prev => {
        if (!prev) return prev;
        const current = prev[key]?.[channel];
        if (!current) return prev;
        return { ...prev, [key]: { ...prev[key], [channel]: { ...current, ...patch } } };
      });
      setTouched(prev => (prev.has(channel) ? prev : new Set(prev).add(channel)));
      setSaveError(null);
    },
    []
  );

  const mutation = useMutation({
    mutationFn: async (next: TemplatesDraft) => {
      if (!server) throw new Error('Ustawienia jeszcze się wczytują - spróbuj za chwilę.');
      const writes: Promise<unknown>[] = [];
      if (touched.has('sms')) {
        writes.push(
          updateAutomationConfig(toSmsConfig(server.sms, next)).then(r => qc.setQueryData(SMS_KEY, r))
        );
      }
      if (touched.has('email')) {
        writes.push(
          updateEmailAutomationConfig(toEmailConfig(server.email, next)).then(r =>
            qc.setQueryData(EMAIL_KEY, r)
          )
        );
      }
      await Promise.all(writes);
    },
  });

  const save = useCallback(async () => {
    if (!draft) return;
    setSaveError(null);
    try {
      await mutation.mutateAsync(draft);
      setSaved(draft);
      setTouched(new Set());
    } catch (err) {
      // The backend rejects a template using a placeholder the message cannot fill; that
      // message names the offending token, so it is worth showing verbatim.
      const detail =
        problemDetail(err) ??
        (err as Error)?.message;
      setSaveError(detail || 'Nie udało się zapisać zmian');
      throw err;
    }
  }, [draft, mutation]);

  const refetchSms = smsQuery.refetch;
  const refetchEmail = emailQuery.refetch;
  const refetch = useCallback(() => {
    void refetchSms();
    void refetchEmail();
  }, [refetchSms, refetchEmail]);

  const discard = useCallback(() => {
    setDraft(saved);
    setTouched(new Set());
    setSaveError(null);
  }, [saved]);

  return {
    draft,
    isLoading: smsQuery.isLoading || emailQuery.isLoading,
    isError: smsQuery.isError || emailQuery.isError,
    refetch,
    dirty: touched.size > 0 && draft !== saved,
    isSaving: mutation.isPending,
    saveError,
    patchChannel,
    save,
    discard,
  };
}
