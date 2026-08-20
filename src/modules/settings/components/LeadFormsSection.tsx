// src/modules/settings/components/LeadFormsSection.tsx
// Formularze na stronie studia → leady w CRM-ie.
//
// Cała integracja po stronie studia to jedno wklejenie adresu w ustawienia wtyczki
// formularza. Ten ekran ma więc dokładnie jedno zadanie: wygenerować ten adres,
// pokazać go raz i dać go skopiować — a potem odpowiedzieć na pytanie, które i tak
// padnie pierwsze: „wysłałem formularz i nic nie przyszło, dlaczego?".
//
// Dlatego dziennik doręczeń jest tu równie ważny co przycisk „Dodaj". Pokazuje
// surową treść każdego zgłoszenia, więc widać, co formularz naprawdę wysłał — i czy
// to my nie rozpoznaliśmy pól, czy formularz w ogóle nie strzelił.
import { useState } from 'react';
import styled from 'styled-components';
import { Check, ChevronDown, Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    useCreateLeadIntakeWebhook,
    useDeleteLeadIntakeWebhook,
    useLeadIntakeDeliveries,
    useLeadIntakeWebhooks,
    useUpdateLeadIntakeWebhook,
} from '@/modules/comms/hooks/useLeads';
import type { LeadIntakeDeliveryStatus } from '@/modules/comms/types';

const Wrap = styled.section`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Intro = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: ${p => p.theme.colors.textSecondary};
    max-width: 70ch;
`;

const Card = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};
    overflow: hidden;
`;

const CardHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 16px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    .title { flex: 1; min-width: 0; }
    .name {
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .meta {
        margin-top: 2px;
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const CardBody = styled.div`
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const TokenBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surfaceAlt};
    padding: 9px 12px;

    code {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: ${p => p.theme.colors.text};
        overflow-wrap: anywhere;
    }
`;

const Note = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: ${p => p.theme.colors.textMuted};
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid ${({ $primary, $danger, theme }) =>
        $primary ? 'transparent' : $danger ? 'rgba(220, 38, 38, 0.28)' : theme.colors.border};
    background: ${({ $primary, theme }) => ($primary ? theme.colors.primary : theme.colors.surface)};
    color: ${({ $primary, $danger, theme }) =>
        $primary ? '#ffffff' : $danger ? theme.colors.error : theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 14px;
    font-size: 13px;
    font-family: inherit;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) { filter: brightness(0.97); }
    &:disabled { opacity: 0.55; cursor: default; }

    svg { width: 14px; height: 14px; }
`;

const NewRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    input {
        flex: 1 1 260px;
        min-width: 0;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 9px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: ${p => p.theme.colors.text};
        outline: none;

        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }
`;

const Toggle = styled.button<{ $on: boolean }>`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: inherit;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};

    .track {
        width: 34px;
        height: 19px;
        border-radius: 999px;
        background: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.border)};
        position: relative;
        transition: background ${p => p.theme.transitions.fast};
    }
    .knob {
        position: absolute;
        top: 2px;
        left: ${({ $on }) => ($on ? '17px' : '2px')};
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #ffffff;
        transition: left ${p => p.theme.transitions.fast};
    }
`;

const DeliveryRow = styled.div<{ $status: LeadIntakeDeliveryStatus }>`
    border-top: 1px dashed ${p => p.theme.colors.border};
    padding: 9px 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12.5px;

    .top { display: flex; align-items: center; gap: 8px; }
    .status {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${({ $status, theme }) =>
            $status === 'CREATED' ? theme.colors.success
                : $status === 'REJECTED' ? theme.colors.error
                : theme.colors.textMuted};
    }
    .when { color: ${p => p.theme.colors.textMuted}; }
    .reason { color: ${p => p.theme.colors.textSecondary}; }
    pre {
        margin: 0;
        max-height: 160px;
        overflow: auto;
        background: ${p => p.theme.colors.surfaceAlt};
        border-radius: ${p => p.theme.radii.sm};
        padding: 8px 10px;
        font-size: 11.5px;
        white-space: pre-wrap;
        word-break: break-all;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const STATUS_LABELS: Record<LeadIntakeDeliveryStatus, string> = {
    CREATED: 'Lead utworzony',
    DUPLICATE: 'Duplikat — pominięty',
    REJECTED: 'Odrzucone',
};

const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

const webhookUrl = (token: string): string =>
    `${window.location.origin}/api/public/lead-forms/${token}`;

export function LeadFormsSection() {
    const [name, setName] = useState('');
    const [freshToken, setFreshToken] = useState<{ id: string; token: string } | null>(null);
    const [openDeliveries, setOpenDeliveries] = useState<string | null>(null);
    const [deleteFor, setDeleteFor] = useState<string | null>(null);

    const { data: webhooks, isLoading } = useLeadIntakeWebhooks();
    const { data: deliveries, isLoading: deliveriesLoading } = useLeadIntakeDeliveries(openDeliveries);
    const createWebhook = useCreateLeadIntakeWebhook();
    const updateWebhook = useUpdateLeadIntakeWebhook();
    const deleteWebhook = useDeleteLeadIntakeWebhook();
    const { showSuccess, showError } = useToast();

    const failed = (title: string) => (error: unknown) => {
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showError(title, message ?? 'Spróbuj ponownie');
    };

    const add = () =>
        createWebhook.mutate(
            { name: name.trim() || 'Formularz na stronie', defaultTagCodes: [] },
            {
                onSuccess: (created) => {
                    setName('');
                    setFreshToken({ id: created.webhook.id, token: created.token });
                },
                onError: failed('Nie udało się utworzyć adresu'),
            }
        );

    const copy = async (token: string) => {
        try {
            await navigator.clipboard.writeText(webhookUrl(token));
            showSuccess('Skopiowano adres', 'Wklej go w ustawieniach formularza na stronie');
        } catch {
            showError('Nie udało się skopiować', 'Zaznacz adres i skopiuj ręcznie');
        }
    };

    const confirmDelete = () => {
        const id = deleteFor;
        if (!id) return;
        setDeleteFor(null);
        deleteWebhook.mutate(id, {
            onSuccess: () => showSuccess('Adres usunięty', 'Formularz przestanie tworzyć leady'),
            onError: failed('Nie udało się usunąć adresu'),
        });
    };

    return (
        <Wrap>
            <Intro>
                Formularz na Twojej stronie może tworzyć leady bezpośrednio w CRM-ie, bez
                przepisywania z maila. Wygeneruj adres, wklej go w ustawieniach wtyczki
                formularza (Elementor, WPForms, Contact Form 7, Tally — obojętne) w polu
                „webhook” lub „adres URL” i gotowe. Nie musisz nic zmieniać w formularzu:
                rozpoznajemy typowe nazwy pól po polsku i po angielsku, a wszystko, czego
                nie rozpoznamy, i tak trafi do treści zapytania.
            </Intro>

            <NewRow>
                <input
                    placeholder="Nazwa, np. Formularz wyceny"
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') add();
                    }}
                />
                <Button $primary type="button" onClick={add} disabled={createWebhook.isPending}>
                    {createWebhook.isPending ? <Loader2 /> : <Plus />} Wygeneruj adres
                </Button>
            </NewRow>

            {isLoading && <Note>Wczytywanie…</Note>}
            {!isLoading && (webhooks ?? []).length === 0 && (
                <Note>Nie masz jeszcze żadnego podłączonego formularza.</Note>
            )}

            {(webhooks ?? []).map((webhook) => {
                // Token trzymamy tylko dla świeżo utworzonego wpisu — osobna zmienna,
                // żeby TypeScript widział, że w tej gałęzi na pewno nie jest pusty.
                const justCreated = freshToken?.id === webhook.id ? freshToken.token : null;
                return (
                <Card key={webhook.id}>
                    <CardHead>
                        <div className="title">
                            <div className="name">{webhook.name}</div>
                            <div className="meta">
                                …{webhook.tokenHint} ·{' '}
                                {webhook.receivedCount > 0
                                    ? `${webhook.receivedCount} zgłoszeń, ostatnie ${formatWhen(webhook.lastReceivedAt!)}`
                                    : 'jeszcze żadnego zgłoszenia'}
                            </div>
                        </div>
                        <Toggle
                            type="button"
                            $on={webhook.active}
                            title={webhook.active ? 'Wyłącz' : 'Włącz'}
                            onClick={() =>
                                updateWebhook.mutate(
                                    { id: webhook.id, active: !webhook.active },
                                    { onError: failed('Nie udało się zmienić stanu') }
                                )
                            }
                        >
                            <span className="track"><span className="knob" /></span>
                            {webhook.active ? 'Aktywny' : 'Wyłączony'}
                        </Toggle>
                        <Button $danger type="button" onClick={() => setDeleteFor(webhook.id)}>
                            <Trash2 />
                        </Button>
                    </CardHead>

                    <CardBody>
                        {justCreated ? (
                            <>
                                <TokenBox>
                                    <code>{webhookUrl(justCreated)}</code>
                                    <Button type="button" onClick={() => copy(justCreated)}>
                                        <Copy /> Kopiuj
                                    </Button>
                                </TokenBox>
                                <Note>
                                    <strong>Skopiuj ten adres teraz.</strong> Ze względów
                                    bezpieczeństwa nie przechowujemy go w całości i nie pokażemy
                                    go drugi raz — jeśli zginie, wygeneruj nowy i podmień
                                    w ustawieniach formularza.
                                </Note>
                            </>
                        ) : (
                            <Note>
                                Adres tego formularza został pokazany przy tworzeniu i nie da się
                                go odczytać ponownie. Jeśli go nie masz — usuń ten wpis i wygeneruj
                                nowy.
                            </Note>
                        )}

                        <Button
                            type="button"
                            style={{ alignSelf: 'flex-start' }}
                            onClick={() =>
                                setOpenDeliveries((current) => (current === webhook.id ? null : webhook.id))
                            }
                        >
                            <ChevronDown /> {openDeliveries === webhook.id ? 'Ukryj' : 'Pokaż'} ostatnie zgłoszenia
                        </Button>

                        {openDeliveries === webhook.id && (
                            <>
                                {deliveriesLoading && <Note>Wczytywanie…</Note>}
                                {!deliveriesLoading && (deliveries ?? []).length === 0 && (
                                    <Note>
                                        Nic jeszcze nie przyszło. Wyślij testowo swój formularz —
                                        zgłoszenie pojawi się tutaj nawet wtedy, gdy nie uda się
                                        z niego zrobić leada.
                                    </Note>
                                )}
                                {(deliveries ?? []).map((delivery) => (
                                    <DeliveryRow key={delivery.id} $status={delivery.status}>
                                        <div className="top">
                                            <span className="status">
                                                {delivery.status === 'CREATED' && <Check size={12} />}{' '}
                                                {STATUS_LABELS[delivery.status]}
                                            </span>
                                            <span className="when">{formatWhen(delivery.receivedAt)}</span>
                                        </div>
                                        {delivery.reason && <span className="reason">{delivery.reason}</span>}
                                        <pre>{delivery.payload}</pre>
                                    </DeliveryRow>
                                ))}
                            </>
                        )}
                    </CardBody>
                </Card>
                );
            })}

            <ConfirmationModal
                isOpen={deleteFor !== null}
                title="Usunąć ten adres?"
                message="Formularz korzystający z tego adresu przestanie tworzyć leady. Wcześniejsze leady zostają."
                variant="danger"
                confirmText="Usuń"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteFor(null)}
            />
        </Wrap>
    );
}
