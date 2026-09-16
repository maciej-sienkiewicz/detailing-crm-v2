// src/modules/customers/components/SendSmsModal.tsx
//
// SMS napisany ręcznie do klienta. Treść pisze użytkownik, więc obok pola
// stoi ten sam korektor co przy tworzeniu maila - literówka w SMS-ie wychodzi
// do klienta i nie da się jej cofnąć.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Send, SpellCheck, Undo2 } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FormField, FieldLabel, InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { useProofread } from '@/modules/comms/hooks/useComms';
import { hasPolishCharacters, smsSegments, smsWord } from '@/common/utils';
import { customerEditApi } from '../api/customerEditApi';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/* Bez polskich znaków SMS mieści się w GSM-7 (160 znaków na segment, 153 przy
   dzieleniu). Z ogonkami operator przechodzi na UCS-2 i segment ma 70 znaków. */
const MAX_LENGTH = 612;

const Meta = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 6px;
    font-size: 12px;
    color: ${st.textMuted};
`;

const CostHint = styled.span<{ $warn?: boolean }>`
    font-variant-numeric: tabular-nums;
    color: ${p => p.$warn ? st.accentAmber : st.textMuted};
    font-weight: 600;
`;

const FooterActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex-wrap: wrap;

    .spin { animation: spin 900ms linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
`;

interface SendSmsModalProps {
    customerId: string;
    customerName: string;
    phone: string;
    onClose: () => void;
}

export const SendSmsModal = ({ customerId, customerName, phone, onClose }: SendSmsModalProps) => {
    const [message, setMessage] = useState('');
    // Treść sprzed korekty - dopóki użytkownik jej nie tknął, można wrócić jednym kliknięciem.
    const [beforeProofread, setBeforeProofread] = useState<string | null>(null);
    const { showSuccess, showError } = useToast();
    const proofread = useProofread();

    const sendSms = useMutation({
        mutationFn: () => customerEditApi.sendSms(customerId, message.trim()),
    });

    const polish = hasPolishCharacters(message);
    const segments = useMemo(() => smsSegments(message.trim().length, polish), [message, polish]);

    const runProofread = () => {
        const source = message.trim();
        if (!source || proofread.isPending) return;
        proofread.mutate({ text: source }, {
            onSuccess: (corrected) => {
                if (corrected.trim() === source) {
                    showSuccess('Bez zmian', 'Nie znaleźliśmy błędów w tej treści');
                    return;
                }
                setBeforeProofread(message);
                setMessage(corrected);
                showSuccess('Poprawiono', 'Przejrzyj zmiany przed wysłaniem');
            },
            onError: (error) => {
                const detail = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się poprawić treści', detail ?? 'Spróbuj ponownie za chwilę');
            },
        });
    };

    const submit = () => {
        if (!message.trim() || sendSms.isPending) return;
        sendSms.mutate(undefined, {
            onSuccess: () => {
                showSuccess('SMS wysłany', `Wiadomość poszła na ${phone}`);
                onClose();
            },
            onError: (error) => {
                const detail = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się wysłać SMS-a', detail ?? 'Spróbuj ponownie za chwilę');
            },
        });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wyślij SMS</ModalTitle>
                    <ModalSubtitle>{customerName} · {phone}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <FormField>
                    <FieldLabel htmlFor="customer-sms-body">Treść wiadomości</FieldLabel>
                    <InputShellTextArea>
                        <BareTextArea
                            id="customer-sms-body"
                            rows={5}
                            maxLength={MAX_LENGTH}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Napisz wiadomość do klienta…"
                        />
                    </InputShellTextArea>
                    <Meta>
                        <span>{message.trim().length} / {MAX_LENGTH} znaków</span>
                        <CostHint $warn={segments > 1}>
                            {segments === 0
                                ? (polish ? 'Z polskimi znakami: 70 znaków na SMS' : '160 znaków na SMS')
                                : `${segments} ${smsWord(segments)}${polish ? ' · polskie znaki' : ''}`}
                        </CostHint>
                    </Meta>
                </FormField>
            </ModalContent>

            <ModalFooter>
                <FooterActions>
                    {beforeProofread !== null && (
                        <SharedButton
                            $variant="ghost"
                            onClick={() => { setMessage(beforeProofread); setBeforeProofread(null); }}
                            title="Przywróć treść sprzed korekty"
                        >
                            <Undo2 size={14} /> Cofnij
                        </SharedButton>
                    )}
                    <SharedButton
                        $variant="secondary"
                        onClick={runProofread}
                        disabled={proofread.isPending || !message.trim()}
                        title="Popraw literówki, interpunkcję i odmianę - bez zmiany treści"
                    >
                        {proofread.isPending
                            ? <><Loader2 size={14} className="spin" /> Poprawiam…</>
                            : <><SpellCheck size={14} /> Popraw błędy</>}
                    </SharedButton>
                    <SharedButton
                        $variant="primary"
                        onClick={submit}
                        disabled={sendSms.isPending || !message.trim()}
                    >
                        <Send size={14} />
                        {sendSms.isPending ? 'Wysyłanie…' : 'Wyślij'}
                    </SharedButton>
                </FooterActions>
            </ModalFooter>
        </ModalShell>
    );
};
