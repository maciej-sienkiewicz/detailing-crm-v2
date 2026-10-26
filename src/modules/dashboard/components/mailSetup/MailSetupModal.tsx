// src/modules/dashboard/components/mailSetup/MailSetupModal.tsx
//
// Okno „Zarządzaj zapytaniami” z Tablicy, gdy studio nie podłączyło skrzynki: po lewej
// to, co studio zyskuje, po prawej duża animacja ze strony „Poznaj program” (dział #zapytania),
// która gra sama i w pętli - bez sterowania odtwarzacza, rozdziałów i plakatów -
// i jedna akcja: „Podłącz pocztę” albo, gdy skrzynka już jest, „Włącz tworzenie zapytań”.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Inbox, Mail } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button, ui } from '@/common/components/ui';
import { INQUIRIES_TOUR, tourFrameSrc } from './inquiriesTour';

const Layout = styled.div`
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 24px;
    align-items: start;

    @media (max-width: 760px) { grid-template-columns: 1fr; gap: 16px; }
`;

const Benefits = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Benefit = styled.button<{ $active: boolean }>`
    width: 100%;
    padding: 11px 14px;
    border: 1px solid ${p => (p.$active ? ui.brandLine : 'transparent')};
    border-radius: 10px;
    background: ${p => (p.$active ? ui.brandTint : 'transparent')};
    font-family: inherit;
    font-size: 14px;
    font-weight: ${p => (p.$active ? 600 : 500)};
    line-height: 1.35;
    color: ${p => (p.$active ? ui.brandDeep : ui.inkSoft)};
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;

    &:hover { background: ${p => (p.$active ? ui.brandTint : ui.surfaceAlt)}; color: ${ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const Stage = styled.div`
    overflow: hidden;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: #ffffff;
`;

const Frame = styled.iframe`
    display: block;
    width: 100%;
    border: 0;
`;

/**
 * Animacja z odtwarzaczem strony „Poznaj program”, pokazana jak w reklamie: bez
 * paska przewijania, przycisków, tempa i rozdziałów, odtwarzana sama i od nowa po
 * końcu. Ramka jest z tej samej domeny, więc styl i start wstrzykujemy z zewnątrz -
 * pliki animacji zostają takie jak na stronie. Kto ma w systemie ograniczony ruch,
 * dostaje pierwszą klatkę, bez samoczynnego odtwarzania.
 */
const HIDE_PLAYER_CHROME = '.scrub, .bar, .chaps, .prog { display: none !important; }';

const TourFrame = ({ slug, title }: { slug: string; title: string }) => {
    const ref = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState<number>();

    useEffect(() => {
        const frame = ref.current;
        if (!frame) return;
        let observer: ResizeObserver | undefined;
        let loop: number | undefined;
        const attach = () => {
            const doc = frame.contentDocument;
            if (!doc?.body) return;
            const style = doc.createElement('style');
            style.textContent = HIDE_PLAYER_CHROME;
            doc.head.appendChild(style);

            observer?.disconnect();
            const measure = () => setHeight(Math.ceil(doc.documentElement.scrollHeight));
            observer = new ResizeObserver(measure);
            observer.observe(doc.body);
            measure();

            const play = doc.getElementById('bPlay');
            const reduced = frame.contentWindow?.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!play || reduced) return;
            play.click();
            // Po końcu przycisk mówi „Od początku” - kliknięcie przewija i gra dalej.
            loop = window.setInterval(() => {
                if (play.textContent?.trim() === 'Od początku') play.click();
            }, 1000);
        };
        frame.addEventListener('load', attach);
        if (frame.contentDocument?.readyState === 'complete') attach();
        return () => {
            frame.removeEventListener('load', attach);
            observer?.disconnect();
            window.clearInterval(loop);
        };
    }, []);

    return (
        <Frame
            ref={ref}
            src={tourFrameSrc(slug)}
            title={`Animacja: ${title}`}
            // Do pierwszego pomiaru proporcje sceny, żeby okno nie skakało.
            style={height ? { height } : { aspectRatio: '16 / 9' }}
        />
    );
};

/**
 * Następny krok studia: `connect` - nie ma skrzynki; `auto-leads` - skrzynka jest, ale
 * wiadomości nie zamieniają się w zapytania (Ustawienia → Zapytania i poczta).
 */
export type MailSetupStep = 'connect' | 'auto-leads';

interface MailSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    step?: MailSetupStep;
}

export const MailSetupModal = ({ isOpen, onClose, step = 'connect' }: MailSetupModalProps) => {
    const navigate = useNavigate();
    const [slug, setSlug] = useState(INQUIRIES_TOUR[0].slug);
    const current = INQUIRIES_TOUR.find(a => a.slug === slug) ?? INQUIRIES_TOUR[0];

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="1120px" labelledBy="mail-setup-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="mail-setup-title">Zarządzaj zapytaniami</ModalTitle>
                    <ModalSubtitle>
                        {step === 'auto-leads'
                            ? 'Poczta jest podłączona. Włącz tworzenie zapytań, a maile od klientów same trafią do zapytań.'
                            : 'Maile od klientów w jednym miejscu z formularzami i Facebookiem.'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Layout>
                    <Benefits aria-label="Co zyskujesz">
                        {INQUIRIES_TOUR.map(a => (
                            <li key={a.slug}>
                                <Benefit
                                    type="button"
                                    $active={a.slug === current.slug}
                                    aria-pressed={a.slug === current.slug}
                                    onClick={() => setSlug(a.slug)}
                                >
                                    {a.title}
                                </Benefit>
                            </li>
                        ))}
                    </Benefits>
                    <Stage>
                        {/* key: nowa animacja zaczyna od początku i mierzy się od nowa. */}
                        <TourFrame key={current.slug} slug={current.slug} title={current.title} />
                    </Stage>
                </Layout>
            </ModalContent>
            <ModalFooter>
                {step === 'auto-leads' ? (
                    <Button variant="primary" size="lg" onClick={() => { onClose(); navigate('/settings?tab=leads'); }}>
                        <Inbox />Włącz tworzenie zapytań
                    </Button>
                ) : (
                    <Button variant="primary" size="lg" onClick={() => { onClose(); navigate('/communication/mailboxes'); }}>
                        <Mail />Podłącz pocztę
                    </Button>
                )}
            </ModalFooter>
        </ModalShell>
    );
};
