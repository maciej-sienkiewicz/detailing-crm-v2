// src/modules/settings/components/MyAccountSection.tsx
//
// Ustawienia → Moje → Moje konto.
//
// Wszystko, co należy do zalogowanej OSOBY: logowanie, PIN, podpis na protokołach,
// stopka maila i styl szkiców AI. Dawniej leżało w czterech miejscach: konto i PIN
// w „Bezpieczeństwie", podpis w „Dokumentach i podpisach", a stopka i styl szkiców
// tylko pod kołem zębatym poczty. Koło zostaje jako skrót, ale ustawienia osoby
// mają jedno miejsce, w którym ich się szuka.
//
// Na dole, tylko dla właściciela, „Dane i konto studia": wyczyszczenie i usunięcie
// konta. To nie jest ustawienie osoby, ale właściciel szuka go tam, gdzie swojego
// konta, a nie między cennikiem a oznaczeniami.

import { useState } from 'react';
import styled from 'styled-components';
import { usePermissions } from '@/core/permissions';
import { SectionTitle, ui } from '@/common/components/ui';
import { SignatureSettingsModal } from '@/modules/comms/components/SignatureSettingsModal';
import { ReplyDraftStyleSettings } from '@/modules/comms/components/ReplyDraftButton';
import { useMailSignature } from '@/modules/comms/hooks/useComms';
import { useReplyDraftPreferences } from '@/modules/comms/hooks/useReplyDraft';
import { signatureHtmlToText } from '@/modules/comms/utils/signatureText';
import { AccountCard, ClearAccountCard, DeleteAccountCard } from './AccountCards';
import { PinCard } from './security/PinCard';
import { MySignatureSection } from './MySignatureSection';
import {
    Card, CardActions, CardHead, CardHeadText, CardNote, CardTitle, OutlineBtn,
} from './security/SecurityCard';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
`;

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    margin-top: 10px;
`;

const GroupHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    p { margin: 0; font-size: 13.5px; line-height: 1.5; color: ${ui.textSecondary}; }
`;

/** Stopka tak, jak ją zobaczy klient: kilka linijek, bez ramki kreatora. */
const SignaturePreview = styled.p`
    margin: 0;
    padding: 10px 14px;
    border-left: 3px solid ${ui.brandLine};
    border-radius: 0 8px 8px 0;
    background: ${ui.surfaceSoft};
    font-size: 13px;
    line-height: 1.55;
    color: ${ui.inkSoft};
    white-space: pre-line;
    overflow-wrap: anywhere;
`;

const ChosenStyle = styled.p`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

/** Pięć linijek wystarcza, żeby poznać stopkę; reszta (adres, sieci) jest w oknie edycji. */
const PREVIEW_LINES = 5;

function MailSignatureCard() {
    const { data: signature, isLoading, isError } = useMailSignature();
    const [open, setOpen] = useState(false);
    const lines = signatureHtmlToText(signature?.bodyHtml ?? null).split('\n').filter(Boolean);
    const hasSignature = lines.length > 0;

    return (
        <Card aria-labelledby="mail-signature-title">
            <CardHead>
                <CardHeadText>
                    <CardTitle id="mail-signature-title">Stopka maila</CardTitle>
                    <CardNote>
                        {isError
                            ? 'Nie udało się wczytać stopki. Sprawdź połączenie z internetem.'
                            : isLoading
                                ? 'Wczytywanie stopki…'
                                : !hasSignature
                                    ? 'Nie masz jeszcze stopki. Z jednej skrzynki każdy podpisuje się sobą.'
                                    : signature?.enabledByDefault
                                        ? 'Stopka jest od razu dołączona do każdej odpowiedzi. Przy pisaniu możesz ją odpiąć.'
                                        : 'Stopkę dołączasz przełącznikiem przy pisaniu maila.'}
                    </CardNote>
                </CardHeadText>
                <CardActions>
                    <OutlineBtn type="button" onClick={() => setOpen(true)} disabled={isLoading}>
                        {hasSignature ? 'Edytuj stopkę' : 'Utwórz stopkę'}
                    </OutlineBtn>
                </CardActions>
            </CardHead>
            {hasSignature && (
                <SignaturePreview>{lines.slice(0, PREVIEW_LINES).join('\n')}</SignaturePreview>
            )}
            {open && <SignatureSettingsModal isOpen onClose={() => setOpen(false)} />}
        </Card>
    );
}

function DraftStyleCard() {
    const { data, isLoading, isError } = useReplyDraftPreferences();
    const [open, setOpen] = useState(false);
    const choice = data?.useSentStyle ?? null;

    return (
        <Card aria-labelledby="draft-style-title">
            <CardHead>
                <CardHeadText>
                    <CardTitle id="draft-style-title">Styl szkiców AI</CardTitle>
                    <CardNote>
                        Jak asystent pisze szkic odpowiedzi na zapytanie. Szkic zawsze przeczytasz
                        i poprawisz przed wysłaniem.
                    </CardNote>
                </CardHeadText>
                <CardActions>
                    <OutlineBtn type="button" onClick={() => setOpen(true)} disabled={isLoading || isError}>
                        Zmień styl
                    </OutlineBtn>
                </CardActions>
            </CardHead>
            {!isLoading && !isError && (
                <ChosenStyle>
                    {choice === true
                        ? 'W moim stylu'
                        : choice === false
                            ? 'Propozycja asystenta'
                            : 'Nie wybrano. Asystent zapyta przy pierwszym szkicu.'}
                </ChosenStyle>
            )}
            {open && <ReplyDraftStyleSettings onClose={() => setOpen(false)} />}
        </Card>
    );
}

export function MyAccountSection() {
    const { can, isOwner } = usePermissions();
    // Stopka i szkice należą do poczty: kto nie ma do niej dostępu (trasa /mail wymaga
    // LEADS_MANAGE), nie ma czego podpisywać, a backend i tak odmówiłby odczytu.
    const usesMail = can('LEADS_MANAGE');

    return (
        <Wrap>
            <AccountCard />
            <PinCard />
            <MySignatureSection />
            {usesMail && <MailSignatureCard />}
            {usesMail && <DraftStyleCard />}

            {isOwner && (
                <Group aria-labelledby="studio-account-title">
                    <GroupHead>
                        <SectionTitle as="h3" size="lg" id="studio-account-title">Dane i konto studia</SectionTitle>
                        <p>Widzi to tylko właściciel studia.</p>
                    </GroupHead>
                    <ClearAccountCard />
                    <DeleteAccountCard />
                </Group>
            )}
        </Wrap>
    );
}
