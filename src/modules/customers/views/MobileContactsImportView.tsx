// src/modules/customers/views/MobileContactsImportView.tsx
// Trasa publiczna, bez logowania. Adres: /m/contacts?s=<handoffToken>

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { mobileContactImportApi, type PickedContact } from '../api/customerImportApi';

/*
 * Ekran, który widzi telefon po zeskanowaniu kodu QR z komputera.
 *
 * Cała „magia" polega na jednym wywołaniu `navigator.contacts.select()`: przeglądarka
 * otwiera SYSTEMOWE okno wyboru kontaktów, a strona dostaje wyłącznie to, co człowiek
 * w nim zaznaczy. Nie ma tu żadnego cichego odczytu książki adresowej i nie da się go
 * zrobić — i dobrze, bo inaczej mógłby to zrobić każdy inny adres w internecie.
 *
 * Na iPhonie tego API nie ma (Safari trzyma je za flagą eksperymentalną), więc ekran
 * mówi to wprost i odsyła do drogi przez plik. Martwy przycisk byłby gorszy niż
 * uczciwy komunikat: użytkownik klikałby go, aż uzna, że CRM jest zepsuty.
 */

const Page = styled.main`
    min-height: 100vh;
    background: #0f172a;
    color: #e2e8f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
    gap: 20px;
`;

const Card = styled.section`
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 28px 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
`;

const StudioName = styled.p`
    margin: 0;
    font-size: 14px;
    color: #94a3b8;
`;

const Description = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #cbd5e1;
`;

const PrimaryButton = styled.button`
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 12px;
    background: #3b82f6;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

const Notice = styled.div<{ $tone: 'info' | 'error' | 'success' }>`
    padding: 14px 16px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    text-align: left;
    background: ${({ $tone }) =>
        $tone === 'error' ? 'rgba(239, 68, 68, 0.12)'
        : $tone === 'success' ? 'rgba(34, 197, 94, 0.12)'
        : 'rgba(59, 130, 246, 0.12)'};
    border: 1px solid ${({ $tone }) =>
        $tone === 'error' ? 'rgba(239, 68, 68, 0.35)'
        : $tone === 'success' ? 'rgba(34, 197, 94, 0.35)'
        : 'rgba(59, 130, 246, 0.35)'};
    color: ${({ $tone }) =>
        $tone === 'error' ? '#fecaca'
        : $tone === 'success' ? '#bbf7d0'
        : '#bfdbfe'};
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
`;

/* ─── Contact Picker API ──────────────────────────────────────────────────── */

/**
 * API wyboru kontaktów nie jest w typach TypeScriptu, bo nie jest standardem — działa
 * dziś w Chrome na Androidzie i nigdzie indziej. Dlatego deklaracja jest lokalna
 * i zawężona do tego, o co faktycznie prosimy.
 */
interface ContactsManager {
    select: (
        properties: string[],
        options?: { multiple?: boolean },
    ) => Promise<PickedContact[]>;
    getProperties?: () => Promise<string[]>;
}

const contactsManager = (): ContactsManager | null => {
    const candidate = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
    return candidate && typeof candidate.select === 'function' ? candidate : null;
};

type Phase =
    | { kind: 'loading' }
    | { kind: 'ready'; studioName: string }
    | { kind: 'sending' }
    | { kind: 'done'; count: number }
    | { kind: 'error'; message: string };

/** Co użytkownik zrobił na tym ekranie; stan pobierania kontekstu trzyma react-query. */
type Outcome =
    | { kind: 'idle' }
    | { kind: 'sending' }
    | { kind: 'done'; count: number }
    | { kind: 'error'; message: string };

export const MobileContactsImportView = () => {
    const [searchParams] = useSearchParams();
    const handoffToken = searchParams.get('s') ?? '';

    const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
    const picker = contactsManager();

    /*
     * Kontekst przez react-query, nie przez useEffect z setState: stan zapytania jest
     * stanem zewnętrznym, a nie czymś, co komponent ma sobie przepisywać do własnego
     * `useState` przy każdym renderze.
     */
    const context = useQuery({
        queryKey: ['mobile-contacts-import', handoffToken],
        queryFn: () => mobileContactImportApi.getContext(handoffToken),
        enabled: handoffToken.length > 0,
        // Kod jest jednorazowy — ponawianie po odmowie tylko opóźnia komunikat.
        retry: false,
    });

    const handlePick = async () => {
        if (!picker) return;
        try {
            // Prosimy o trzy pola i ani jedno więcej. Adresy i zdjęcia z książki adresowej
            // nie są nam do niczego potrzebne, a zakres pytania widzi użytkownik
            // w systemowym oknie.
            const picked = await picker.select(['name', 'tel', 'email'], { multiple: true });
            if (!picked || picked.length === 0) return;

            setOutcome({ kind: 'sending' });
            const result = await mobileContactImportApi.submit(
                handoffToken,
                picked,
                navigator.userAgent.includes('Android') ? 'Android' : undefined,
            );
            setOutcome({ kind: 'done', count: result.received });
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            // Zamknięcie systemowego okna bez wyboru też rzuca wyjątkiem — to nie awaria
            // i nie może tak wyglądać. Bez odpowiedzi serwera wracamy do stanu wyjściowego.
            setOutcome(message
                ? { kind: 'error', message }
                : { kind: 'idle' });
        }
    };

    const phase: Phase = (() => {
        if (!handoffToken) {
            return { kind: 'error', message: 'Nieprawidłowy link. Zeskanuj kod ponownie.' };
        }
        if (outcome.kind === 'done') return outcome;
        if (outcome.kind === 'error') return outcome;
        if (context.isPending) return { kind: 'loading' };
        if (context.isError) {
            const message = (context.error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message
                ?? 'Kod jest nieprawidłowy lub wygasł. Wygeneruj nowy na komputerze.';
            return { kind: 'error', message };
        }
        if (outcome.kind === 'sending') return { kind: 'sending' };
        return { kind: 'ready', studioName: context.data?.studioName ?? '' };
    })();

    if (phase.kind === 'loading') {
        return <Page><Card><Description>Sprawdzam kod…</Description></Card></Page>;
    }

    if (phase.kind === 'error') {
        return (
            <Page>
                <Card>
                    <Title>Nie udało się</Title>
                    <Notice $tone="error">{phase.message}</Notice>
                </Card>
            </Page>
        );
    }

    if (phase.kind === 'done') {
        return (
            <Page>
                <Card>
                    <Title>Gotowe</Title>
                    <Notice $tone="success">
                        Wysłano {phase.count} {phase.count === 1 ? 'kontakt' : 'kontaktów'}.
                        Wróć do komputera — tam zobaczysz listę i zdecydujesz, kogo zapisać.
                    </Notice>
                </Card>
            </Page>
        );
    }

    const studioName = phase.kind === 'ready' ? phase.studioName : '';

    return (
        <Page>
            <Card>
                <div>
                    <Title>Udostępnij kontakty</Title>
                    {studioName && <StudioName>{studioName}</StudioName>}
                </div>

                {picker ? (
                    <>
                        <Description>
                            Dotknij przycisku i zaznacz kontakty, które mają trafić do CRM-a.
                            Wybierasz je w oknie systemu — my zobaczymy tylko to, co zaznaczysz.
                        </Description>
                        <PrimaryButton
                            onClick={handlePick}
                            disabled={phase.kind === 'sending'}
                        >
                            {phase.kind === 'sending' ? 'Wysyłam…' : 'Wybierz kontakty'}
                        </PrimaryButton>
                        <Hint>
                            Nic jeszcze nie zostanie zapisane. Listę przejrzysz i zatwierdzisz
                            na komputerze.
                        </Hint>
                    </>
                ) : (
                    <Notice $tone="info">
                        Ta przeglądarka nie pozwala stronom pytać o kontakty — dotyczy to
                        wszystkich iPhone'ów i części przeglądarek na Androidzie.
                        <br /><br />
                        Wróć do komputera i wybierz „Mam plik z kontaktami" — pokażemy tam,
                        jak wyeksportować kontakty krok po kroku.
                    </Notice>
                )}
            </Card>
        </Page>
    );
};
