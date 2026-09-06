import React, { useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useLinkFacebookPage } from '../hooks/useAds';

/**
 * Wskazanie strony na Facebooku dla obserwowanego profilu.
 *
 * Robi to człowiek, a nie kod, bo Meta nie udostępnia mostu profil IG → strona FB,
 * a wyszukiwanie po nazwie trafia na zbieżności - „Auto Spa" jest w każdym mieście
 * i pomyłka podpięłaby właścicielowi cudze kampanie jako kampanie konkurenta.
 */

const Steps = styled.ol`
    margin: 0 0 16px;
    padding-left: 18px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.7;

    code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        background: ${st.bgCardAlt};
        padding: 1px 5px;
        border-radius: 4px;
    }
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const Input = styled.input`
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-family: inherit;
    font-size: ${st.fontMd};
    font-variant-numeric: tabular-nums;
    color: ${st.text};

    &:focus {
        outline: none;
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

const ErrorText = styled.p`
    margin: 10px 0 0;
    font-size: ${st.fontSm};
    color: ${st.accentRed};
`;

interface Props {
    profileId: string;
    username: string;
    onClose: () => void;
}

export const LinkFacebookPageModal: React.FC<Props> = ({ profileId, username, onClose }) => {
    const [pageId, setPageId] = useState('');
    const link = useLinkFacebookPage();

    const digitsOnly = pageId.trim().replace(/\D/g, '');
    const canSubmit = digitsOnly.length >= 5 && !link.isPending;

    const submit = () => {
        if (!canSubmit) return;
        link.mutate({ profileId, pageId: digitsOnly }, { onSuccess: onClose });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wskaż stronę na Facebooku</ModalTitle>
                    <ModalSubtitle>@{username}</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>

            <ModalContent>
                <Steps>
                    <li>
                        Otwórz Bibliotekę reklam Meta i wyszukaj nazwę studia:{' '}
                        <a
                            href="https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=PL"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            facebook.com/ads/library
                        </a>
                    </li>
                    <li>Wejdź na stronę tego studia.</li>
                    <li>
                        Z adresu przepisz liczbę po <code>view_all_page_id=</code>.
                    </li>
                </Steps>

                <Field>
                    Identyfikator strony
                    <Input
                        value={pageId}
                        onChange={event => setPageId(event.target.value)}
                        onKeyDown={event => event.key === 'Enter' && submit()}
                        placeholder="np. 100064123456789"
                        inputMode="numeric"
                        autoFocus
                    />
                </Field>

                {link.isError && (
                    <ErrorText>
                        Nie udało się powiązać strony. Sprawdź, czy identyfikator to sama liczba z adresu.
                    </ErrorText>
                )}
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={onClose}>
                    Anuluj
                </SharedButton>
                <SharedButton type="button" disabled={!canSubmit} onClick={submit}>
                    {link.isPending ? 'Zapisuję…' : 'Powiąż'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
