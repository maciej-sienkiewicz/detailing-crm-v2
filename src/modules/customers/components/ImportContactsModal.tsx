import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    CloseBtn,
} from '@/common/components/ModalKit';
import { useToast } from '@/common/components/Toast';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { customerImportApi } from '../api/customerImportApi';
import { ImportContactsTable } from './ImportContactsTable';
import type { ImportPreview } from '../types';

/*
 * Import klientów z telefonu.
 *
 * Kolejność ekranów jest wynikiem jednego ustalenia: **telefon tylko wysyła, decyduje
 * komputer**. Odznaczanie ośmiuset kontaktów na ekranie telefonu jest udręką, na
 * komputerze zajmuje minutę — a to właśnie odznaczanie jest tu całą pracą. Ten sam
 * podział działa już przy przyjęciu pojazdu: telefon robi zdjęcia, obsługa weryfikuje
 * je w panelu.
 *
 * Dwie drogi wejścia, bo systemy dają różne możliwości:
 *  - **Android** — telefon oddaje kontakty po zeskanowaniu kodu QR (systemowe okno wyboru),
 *  - **iPhone** — Safari nie pozwala stronom pytać o kontakty, więc jedyną drogą jest
 *    plik `.vcf`; ekran mówi krok po kroku, jak go zdobyć, zamiast zakładać, że
 *    użytkownik wie, co to vCard.
 *
 * Od momentu, w którym kontakty są w sesji, obie drogi są tym samym ekranem.
 */

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 0;
`;

const SourceGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 639px) {
        grid-template-columns: 1fr;
    }
`;

const SourceCard = styled.button`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px;
    text-align: left;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: transparent;
    cursor: pointer;
    transition: border-color ${st.transition};

    &:hover { border-color: ${st.accentBlue}; }
`;

const SourceTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const SourceDesc = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: ${st.textSecondary};
`;

const QrPanel = styled.div`
    display: flex;
    gap: 24px;
    align-items: flex-start;

    @media (max-width: 639px) {
        flex-direction: column;
        align-items: center;
    }
`;

const QrBox = styled.div`
    flex-shrink: 0;
    padding: 12px;
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    line-height: 0;
`;

const Steps = styled.ol`
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.55;
`;

const Waiting = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${st.textSecondary};
`;

const Note = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: ${st.textSecondary};
`;

const DropZone = styled.label<{ $dragging: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px 20px;
    border: 2px dashed ${({ $dragging }) => ($dragging ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${({ $dragging }) => ($dragging ? st.accentBlueDim : 'transparent')};
    cursor: pointer;
    text-align: center;
`;

const DropTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 14px;
    border-top: 1px solid ${st.border};
    flex-wrap: wrap;
`;

const SelectionCount = styled.span`
    font-size: 12px;
    color: ${st.textSecondary};
`;

const Actions = styled.div`
    display: flex;
    gap: 10px;
`;

const GhostBtn = styled.button`
    padding: 9px 18px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: none;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;

    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
`;

const PrimaryBtn = styled.button`
    padding: 9px 20px;
    border: none;
    border-radius: ${st.radiusSm};
    background: ${st.accentBlue};
    color: #fff;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorNote = styled.p`
    margin: 0;
    padding: 10px 14px;
    border-radius: ${st.radiusSm};
    background: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #EF4444;
    font-size: 12px;
    color: #B91C1C;
    line-height: 1.5;
`;

/**
 * Ekran wyboru źródła. Podgląd nie jest osobnym krokiem w tym typie: pojawia się
 * z chwilą, gdy kontakty są w sesji — niezależnie od tego, którą drogą przyszły.
 */
type Mode = 'source' | 'phone' | 'file';

interface ImportContactsModalProps {
    /** Rodzic montuje ten komponent dopiero po otwarciu, więc stan czyści się sam. */
    onClose: () => void;
    /** Zaimportowano klientów — lista w tle wymaga odświeżenia. */
    onImported: (count: number) => void;
}

export const ImportContactsModal = ({ onClose, onImported }: ImportContactsModalProps) => {
    const { showSuccess, showError } = useToast();

    const [mode, setMode] = useState<Mode>('source');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [seededSession, setSeededSession] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Ścieżka telefonu ─────────────────────────────────────────────────────

    const handoff = useMutation({
        mutationFn: customerImportApi.openHandoffSession,
        onSuccess: () => setMode('phone'),
        onError: () => showError('Nie udało się wygenerować kodu. Spróbuj ponownie.'),
    });

    const handoffSession = handoff.data ?? null;

    /*
     * Odpytywanie zamiast gniazda: telefon przysyła kontakty raz, w ciągu kilkudziesięciu
     * sekund od zeskanowania kodu. Utrzymywanie połączenia przez ten czas byłoby większą
     * maszynerią niż samo zadanie — a odpytywanie co dwie sekundy przez kwadrans to
     * kilkaset lekkich zapytań w całym życiu studia, nie w ciągu dnia.
     */
    const { data: polled } = useQuery({
        queryKey: ['customer-import-session', handoffSession?.sessionId],
        queryFn: () => customerImportApi.getSession(handoffSession!.sessionId),
        enabled: mode === 'phone' && handoffSession != null,
        refetchInterval: query => (query.state.data?.status === 'READY' ? false : 2000),
    });

    const mobileUrl = handoffSession
        ? `${window.location.origin}/m/contacts?s=${handoffSession.handoffToken}`
        : null;

    // ── Ścieżka pliku ────────────────────────────────────────────────────────

    const upload = useMutation({
        mutationFn: (file: File) => customerImportApi.uploadVCard(file),
        onSuccess: () => setErrorMessage(null),
        onError: (error: unknown) => {
            const message = (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            setErrorMessage(message ?? 'Nie udało się odczytać pliku.');
        },
    });

    const handleFile = (file: File | undefined) => {
        if (!file) return;
        setErrorMessage(null);
        upload.mutate(file);
    };

    // ── Zapis ────────────────────────────────────────────────────────────────

    /*
     * Podgląd jest stanem POCHODNYM, nie kolejnym `useState`: przychodzi albo z odpowiedzi
     * na wgrany plik, albo z odpytywania sesji telefonu. Trzymanie go osobno znaczyłoby
     * przepisywanie tej samej informacji z react-query do stanu komponentu — i pilnowanie
     * w efekcie, żeby obie kopie się nie rozjechały.
     */
    const preview: ImportPreview | null =
        upload.data ?? (polled?.status === 'READY' ? polled : null);

    /*
     * Zaznaczenie startowe ustawiane w trakcie renderu, gdy pojawi się nowa sesja —
     * wzorzec „dostosowanie stanu przy zmianie danych wejściowych" z dokumentacji Reacta.
     * W efekcie oznaczałoby to dodatkowy przebieg renderowania z pustym zaznaczeniem,
     * czyli mignięcie „Zaznaczono 0" zanim pojawią się właściwe liczby.
     */
    if (preview && preview.sessionId !== seededSession) {
        setSeededSession(preview.sessionId);
        setSelected(new Set(
            preview.rows.filter(row => row.selectedByDefault).map(row => row.index),
        ));
    }

    const commit = useMutation({
        mutationFn: () => {
            if (!preview) throw new Error('Brak sesji importu');
            return customerImportApi.commit(preview.sessionId, [...selected]);
        },
        onSuccess: result => {
            if (result.imported === 0) {
                showError('Nie zaimportowano żadnego kontaktu', 'Wszystkie zaznaczone pozycje okazały się już istnieć.');
            } else {
                showSuccess(
                    `Zaimportowano ${result.imported} ${result.imported === 1 ? 'klienta' : 'klientów'}`,
                    result.skipped > 0
                        ? `${result.skipped} pominięto — w międzyczasie przestały być nowe.`
                        : undefined,
                );
            }
            onImported(result.imported);
            onClose();
        },
        onError: (error: unknown) => {
            const message = (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            showError('Nie udało się zapisać importu', message);
        },
    });

    const selectableCount = useMemo(
        () => preview?.rows.filter(row => row.status === 'NEW').length ?? 0,
        [preview],
    );

    // ── Widok ────────────────────────────────────────────────────────────────

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="880px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zaimportuj klientów z telefonu</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Body>
                    {errorMessage && <ErrorNote>{errorMessage}</ErrorNote>}

                    {!preview && mode === 'source' && (
                        <>
                            <SourceGrid>
                                <SourceCard onClick={() => handoff.mutate()} type="button">
                                    <SourceTitle>Prześlij z telefonu (Android)</SourceTitle>
                                    <SourceDesc>
                                        Zeskanuj kod aparatem i zaznacz kontakty w oknie systemu.
                                        Bez instalowania czegokolwiek i bez plików.
                                    </SourceDesc>
                                </SourceCard>

                                <SourceCard onClick={() => setMode('file')} type="button">
                                    <SourceTitle>Mam plik z kontaktami (iPhone, Outlook)</SourceTitle>
                                    <SourceDesc>
                                        Wgraj plik vCard (.vcf). Pokażemy krok po kroku, jak go
                                        pobrać — na iPhonie to jedyna droga.
                                    </SourceDesc>
                                </SourceCard>
                            </SourceGrid>

                            <Note>
                                Nic nie zostanie zapisane od razu. Najpierw zobaczysz listę
                                z zaznaczonymi duplikatami i sam zdecydujesz, kogo zaimportować.
                            </Note>
                        </>
                    )}

                    {!preview && mode === 'phone' && mobileUrl && (
                        <>
                            <QrPanel>
                                <QrBox>
                                    <QRCodeSVG value={mobileUrl} size={168} level="M" />
                                </QrBox>
                                <div>
                                    <Steps>
                                        <li>Zeskanuj kod aparatem telefonu.</li>
                                        <li>Na telefonie dotknij „Wybierz kontakty".</li>
                                        <li>Zaznacz kontakty w oknie systemu i potwierdź.</li>
                                        <li>Wróć tutaj — lista pojawi się sama.</li>
                                    </Steps>
                                    <Waiting>Czekam na kontakty z telefonu…</Waiting>
                                </div>
                            </QrPanel>

                            <Note>
                                Kod działa raz i wygasa po kilkunastu minutach. Na iPhonie ta droga
                                nie zadziała — Safari nie pozwala stronom pytać o kontakty; użyj
                                wtedy pliku.
                            </Note>

                            <Footer>
                                <span />
                                <Actions>
                                    <GhostBtn onClick={() => setMode('source')} type="button">
                                        Wróć
                                    </GhostBtn>
                                </Actions>
                            </Footer>
                        </>
                    )}

                    {!preview && mode === 'file' && (
                        <>
                            <Steps>
                                <li>
                                    <strong>iPhone:</strong> wejdź na komputerze na iCloud.com →
                                    Kontakty → zaznacz wszystkie (Ctrl/Cmd+A) → koło zębate →
                                    „Eksportuj vCard".
                                </li>
                                <li>
                                    <strong>Android:</strong> aplikacja Kontakty → Ustawienia →
                                    „Eksportuj" → zapisz plik .vcf i prześlij go sobie na komputer.
                                </li>
                                <li><strong>Outlook:</strong> Osoby → Zarządzaj → Eksportuj kontakty.</li>
                            </Steps>

                            <DropZone
                                $dragging={dragging}
                                onDragOver={event => { event.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={event => {
                                    event.preventDefault();
                                    setDragging(false);
                                    handleFile(event.dataTransfer.files?.[0]);
                                }}
                            >
                                <DropTitle>
                                    {upload.isPending ? 'Czytam plik…' : 'Przeciągnij plik .vcf albo kliknij, żeby wybrać'}
                                </DropTitle>
                                <SourceDesc>Obsługujemy vCard z iPhone'a, Androida i Outlooka.</SourceDesc>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".vcf,text/vcard,text/x-vcard"
                                    hidden
                                    onChange={event => handleFile(event.target.files?.[0])}
                                />
                            </DropZone>

                            <Footer>
                                <span />
                                <Actions>
                                    <GhostBtn onClick={() => setMode('source')} type="button">
                                        Wróć
                                    </GhostBtn>
                                </Actions>
                            </Footer>
                        </>
                    )}

                    {preview && (
                        <>
                            <Note>
                                Zaznaczone są tylko kontakty, których jeszcze nie ma w bazie.
                                Odznacz te, których nie chcesz — resztę zapiszemy jako klientów.
                            </Note>

                            <ImportContactsTable
                                rows={preview.rows}
                                selected={selected}
                                onChange={setSelected}
                            />

                            <Footer>
                                <SelectionCount>
                                    Zaznaczono {selected.size} z {selectableCount} nowych
                                    {preview.deviceLabel ? ` · źródło: ${preview.deviceLabel}` : ''}
                                </SelectionCount>
                                <Actions>
                                    <GhostBtn onClick={onClose} type="button">Anuluj</GhostBtn>
                                    <PrimaryBtn
                                        onClick={() => commit.mutate()}
                                        disabled={selected.size === 0 || commit.isPending}
                                        type="button"
                                    >
                                        {commit.isPending
                                            ? 'Zapisuję…'
                                            : `Zapisz ${selected.size} ${selected.size === 1 ? 'klienta' : 'klientów'}`}
                                    </PrimaryBtn>
                                </Actions>
                            </Footer>
                        </>
                    )}
                </Body>
            </ModalContent>
        </ModalShell>
    );
};
