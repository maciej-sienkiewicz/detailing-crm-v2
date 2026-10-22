// src/modules/customers/views/MobileContactsImportView.tsx
// Trasa publiczna, bez logowania. Adres: /m/contacts?s=<handoffToken>

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    PhonePage, PhoneHeader, PhoneCard, PhoneText, PhonePrimaryButton, PhoneEndScreen, PhoneLoading,
} from '@/common/components/PhonePage';
import { pluralPl } from '@/common/utils/plural';
import { mobileContactImportApi, type PickedContact } from '../api/customerImportApi';
import { problemOf } from '@/core/problem';

/*
 * Ekran, który widzi telefon po zeskanowaniu kodu QR z komputera.
 *
 * Cała „magia" polega na jednym wywołaniu `navigator.contacts.select()`: przeglądarka
 * otwiera SYSTEMOWE okno wyboru kontaktów, a strona dostaje wyłącznie to, co człowiek
 * w nim zaznaczy. Nie ma tu żadnego cichego odczytu książki adresowej i nie da się go
 * zrobić - i dobrze, bo inaczej mógłby to zrobić każdy inny adres w internecie.
 *
 * Na iPhonie tego API nie ma (Safari trzyma je za flagą eksperymentalną), więc ekran
 * mówi to wprost i odsyła do drogi przez plik. Martwy przycisk byłby gorszy niż
 * uczciwy komunikat: użytkownik klikałby go, aż uzna, że CRM jest zepsuty.
 *
 * Telefon co kilka sekund sprawdza, czy okno importu na komputerze jest jeszcze otwarte:
 * zamknięte okno kończy stronę zamiast pozwalać wysłać kontakty, których nikt nie przejrzy.
 */

/** Co ile telefon sprawdza, czy okno importu na komputerze jest jeszcze otwarte. */
const CONTEXT_POLL_MS = 5_000;

/* ─── Contact Picker API ──────────────────────────────────────────────────── */

/**
 * API wyboru kontaktów nie jest w typach TypeScriptu, bo nie jest standardem - działa
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

type ErrorReason = 'CLOSED' | 'EXPIRED' | 'OTHER';

interface ServerError { message: string; reason: ErrorReason }

const serverError = (error: unknown): ServerError | null => {
    const problem = problemOf(error);
    if (!problem?.detail) return null;
    const reason: ErrorReason = problem.reason === 'CLOSED' ? 'CLOSED' : problem.reason === 'EXPIRED' ? 'EXPIRED' : 'OTHER';
    return { message: problem.detail, reason };
};

/** Co użytkownik zrobił na tym ekranie; stan pobierania kontekstu trzyma react-query. */
type Outcome =
    | { kind: 'idle' }
    | { kind: 'sending' }
    | { kind: 'done'; count: number }
    | { kind: 'error'; error: ServerError };

export const MobileContactsImportView = () => {
    const [searchParams] = useSearchParams();
    const handoffToken = searchParams.get('s') ?? '';

    const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
    const picker = contactsManager();
    const waiting = outcome.kind === 'idle';

    /*
     * Kontekst przez react-query, nie przez useEffect z setState: stan zapytania jest
     * stanem zewnętrznym, a nie czymś, co komponent ma sobie przepisywać do własnego
     * `useState` przy każdym renderze. Odpytujemy go, dopóki człowiek nic nie wysłał -
     * tak telefon dowiaduje się o zamkniętym oknie na komputerze.
     */
    const context = useQuery({
        queryKey: ['mobile-contacts-import', handoffToken],
        queryFn: () => mobileContactImportApi.getContext(handoffToken),
        enabled: handoffToken.length > 0,
        // Kod jest jednorazowy - ponawianie po odmowie tylko opóźnia komunikat.
        retry: false,
        refetchInterval: query => (waiting && !query.state.error ? CONTEXT_POLL_MS : false),
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
            // Zamknięcie systemowego okna bez wyboru też rzuca wyjątkiem - to nie awaria
            // i nie może tak wyglądać. Bez odpowiedzi serwera wracamy do stanu wyjściowego.
            const err = serverError(error);
            setOutcome(err ? { kind: 'error', error: err } : { kind: 'idle' });
        }
    };

    const failure: ServerError | null = !handoffToken
        ? { message: 'Nieprawidłowy link. Zeskanuj kod ponownie.', reason: 'OTHER' }
        : outcome.kind === 'error'
            ? outcome.error
            : outcome.kind !== 'done' && context.isError
                ? serverError(context.error) ?? { message: 'Kod jest nieprawidłowy lub wygasł. Wygeneruj nowy na komputerze.', reason: 'OTHER' }
                : null;

    if (outcome.kind === 'done') {
        return (
            <PhonePage>
                <PhoneEndScreen tone="ok" title="Gotowe">
                    Wysłano {outcome.count} {pluralPl(outcome.count, 'kontakt', 'kontakty', 'kontaktów')}.
                    Wróć do komputera - tam zobaczysz listę i zdecydujesz, kogo zapisać. Tę stronę możesz zamknąć.
                </PhoneEndScreen>
            </PhonePage>
        );
    }

    if (failure) {
        return (
            <PhonePage>
                {failure.reason === 'CLOSED' ? (
                    <PhoneEndScreen tone="neutral" title="Okno na komputerze jest zamknięte">
                        Kontakty nie zostały wysłane. Otwórz import ponownie na komputerze i zeskanuj nowy kod.
                    </PhoneEndScreen>
                ) : (
                    <PhoneEndScreen tone="danger" title={failure.reason === 'EXPIRED' ? 'Kod wygasł' : 'Nie udało się'}>
                        {failure.message}
                    </PhoneEndScreen>
                )}
            </PhonePage>
        );
    }

    if (context.isPending) {
        return <PhonePage><PhoneLoading>Sprawdzam kod…</PhoneLoading></PhonePage>;
    }

    const studioName = context.data?.studioName ?? '';

    // Na iPhonie (i części Androidów) przeglądarka nie oddaje kontaktów stronom. To też
    // jest koniec drogi na telefonie - mówimy to wprost i odsyłamy do pliku na komputerze.
    if (!picker) {
        return (
            <PhonePage>
                <PhoneEndScreen tone="neutral" title="Na tym telefonie się nie da">
                    Ta przeglądarka nie pozwala stronom pytać o kontakty - dotyczy to wszystkich iPhone'ów
                    i części przeglądarek na Androidzie. Wróć do komputera i wybierz „Mam plik z kontaktami" -
                    pokażemy tam, jak wyeksportować kontakty krok po kroku. Tę stronę możesz zamknąć.
                </PhoneEndScreen>
            </PhonePage>
        );
    }

    return (
        <PhonePage>
            <PhoneHeader eyebrow={studioName} title="Udostępnij kontakty">
                Zaznacz kontakty, które mają trafić do CRM-a.
            </PhoneHeader>
            <PhoneCard>
                <PhoneText>
                    Wybierasz je w oknie systemu - my zobaczymy tylko to, co zaznaczysz.
                    Nic jeszcze nie zostanie zapisane: listę przejrzysz i zatwierdzisz na komputerze.
                </PhoneText>
                <PhonePrimaryButton
                    type="button"
                    onClick={handlePick}
                    disabled={outcome.kind === 'sending'}
                >
                    {outcome.kind === 'sending' ? 'Wysyłam…' : 'Wybierz kontakty'}
                </PhonePrimaryButton>
            </PhoneCard>
        </PhonePage>
    );
};
