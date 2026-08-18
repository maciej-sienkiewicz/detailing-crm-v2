import {
    MessageSquare, FileText, Wallet, CheckCircle2, Zap, Send, PenLine, Info,
    BadgeCheck, ArrowLeftRight, ArrowRight, FileSignature, AlertTriangle,
} from 'lucide-react';
import { GuidedTour, TourDesc, TourBulletList, TourBullet } from '@/common/components/GuidedTour';
import type { TourStep } from '@/common/components/GuidedTour';
import { useEntitlements } from '../api/subscriptionQueries';
import { STARTER_CREDITS } from '../starterCredits';
import type { PlanKey } from '../types';

/**
 * What buying the communication module actually commits you to.
 *
 * The module alone does not send anything: it needs message texts and it needs
 * credits. Studios used to discover both of those afterwards, one failed send at
 * a time, so this says it before the money changes hands, and ends on a button
 * that admits as much.
 */

interface CommunicationModuleTourProps {
    onClose: () => void;
    /** Runs on "Rozumiem i kontynuuję zakup": hands over to the purchase dialog. */
    onFinish: () => void;
}

export function CommunicationModuleTour({ onClose, onFinish }: CommunicationModuleTourProps) {
    const { data: entitlements } = useEntitlements();
    const planKey: PlanKey = entitlements?.plan.key ?? 'BASIC';
    const starter = STARTER_CREDITS[planKey];
    const planName = entitlements?.plan.name ?? planKey;

    const steps: TourStep[] = [
        {
            icon: <MessageSquare />,
            from: '#0ea5e9',
            to: '#6366f1',
            title: 'Co daje moduł komunikacji',
            body: (
                <>
                    <TourDesc>
                        Moduł włącza <strong>wysyłkę wiadomości do klientów</strong>: SMS-y i e-maile
                        wychodzące automatycznie na kolejnych etapach wizyty, oraz wysyłki ręczne
                        z poziomu wizyty.
                    </TourDesc>
                    <TourBulletList>
                        <TourBullet $color="#0ea5e9">
                            <Send />
                            <span>Potwierdzenie rezerwacji i przypomnienie przed wizytą</span>
                        </TourBullet>
                        <TourBullet $color="#0ea5e9">
                            <Send />
                            <span>Powiadomienie, gdy <strong>pojazd jest gotowy do odbioru</strong></span>
                        </TourBullet>
                        <TourBullet $color="#0ea5e9">
                            <Send />
                            <span>Link do podpisu dokumentów wysyłany SMS-em</span>
                        </TourBullet>
                    </TourBulletList>
                </>
            ),
        },
        {
            icon: <FileText />,
            from: '#6366f1',
            to: '#8b5cf6',
            title: 'Treści wiadomości: włączymy je za Ciebie',
            body: (
                <>
                    <TourDesc>
                        Każda sytuacja ma własną treść wiadomości. Po zakupie
                        <strong> włączymy wszystkie szablony automatycznie</strong>, z gotowymi
                        tekstami, nie musisz nic pisać, żeby zacząć.
                    </TourDesc>
                    <TourBulletList>
                        <TourBullet $color="#8b5cf6">
                            <PenLine />
                            <span>
                                Treści dopasujesz do siebie w <strong>Ustawienia → Szablony wiadomości</strong>
                            </span>
                        </TourBullet>
                        <TourBullet $color="#8b5cf6">
                            <Info />
                            <span>
                                Każdy szablon możesz wyłączyć osobno, jeśli danej wiadomości
                                nie chcesz wysyłać
                            </span>
                        </TourBullet>
                    </TourBulletList>
                </>
            ),
        },
        {
            icon: <BadgeCheck />,
            from: '#8b5cf6',
            to: '#a855f7',
            title: 'Kto wyświetli się klientowi jako nadawca',
            body: (
                <>
                    <TourDesc>
                        To jedna decyzja z realnym skutkiem: nadawca przesądza,
                        <strong> czy klient może odpisać</strong>.
                    </TourDesc>
                    <TourBulletList>
                        <TourBullet $color="#0ea5e9">
                            <ArrowLeftRight />
                            <span>
                                <strong>Numer telefonu</strong> (ustawienie domyślne), SMS
                                dwukierunkowy. Klient może odpisać, a odpowiedź
                                <strong> „TAK" zatwierdza dodatkowe usługi</strong> na wizycie.
                            </span>
                        </TourBullet>
                        <TourBullet $color="#a855f7">
                            <ArrowRight />
                            <span>
                                <strong>Nazwa firmy</strong> (do 11 znaków), SMS
                                jednokierunkowy. Wygląda profesjonalnie i buduje rozpoznawalność,
                                ale <strong>klient nie ma na co odpowiedzieć</strong>, więc zgody
                                przez „TAK" przestają działać.
                            </span>
                        </TourBullet>
                    </TourBulletList>
                    <TourDesc style={{ marginTop: 14 }}>
                        Ustawienie działa globalnie: obejmuje wszystkie wiadomości, nie da się
                        wybrać nadawcy osobno dla pojedynczego szablonu.
                    </TourDesc>
                </>
            ),
        },
        {
            icon: <FileSignature />,
            from: '#a855f7',
            to: '#d946ef',
            title: 'Nazwa firmy wymaga podpisanego upoważnienia',
            body: (
                <>
                    <TourDesc>
                        Operatorzy nie pozwalają nadawać pod cudzą nazwą bez zgody. Żeby w polu
                        nadawcy pojawiła się Twoja firma, musisz
                        <strong> przesłać podpisane upoważnienie</strong>.
                    </TourDesc>
                    <TourBulletList>
                        <TourBullet $color="#d946ef">
                            <FileSignature />
                            <span>
                                W <strong>Ustawienia → Szablony wiadomości</strong> pobierz wzór
                                upoważnienia, podpisz go i wgraj z powrotem
                            </span>
                        </TourBullet>
                        <TourBullet $color="#f59e0b">
                            <AlertTriangle />
                            <span>
                                Do czasu weryfikacji przez operatora
                                <strong> w polu odbiorcy nadal będzie widoczny numer telefonu</strong>,
                                wiadomości wychodzą normalnie, zmienia się tylko podpis
                            </span>
                        </TourBullet>
                        <TourBullet $color="#64748b">
                            <Info />
                            <span>
                                Nie chcesz nazwy firmy? Nie rób nic, zostajesz przy numerze
                                i zachowujesz odpowiedzi od klientów
                            </span>
                        </TourBullet>
                    </TourBulletList>
                </>
            ),
        },
        {
            icon: <Wallet />,
            from: '#d946ef',
            to: '#ec4899',
            title: 'SMS-y kosztują kredyty, osobno od abonamentu',
            body: (
                <>
                    <TourDesc>
                        Abonament włącza funkcję, ale każdy wysłany SMS zużywa <strong>1 kredyt</strong>.
                        Kredyty kupujesz w pakietach i nie wygasają z końcem miesiąca.
                    </TourDesc>
                    <TourBulletList>
                        <TourBullet $color="#d946ef">
                            <Zap />
                            <span>
                                Na start dodajemy <strong>{starter} SMS-ów</strong> w Twoim
                                pakiecie {planName}, wystarczą na pierwsze wizyty
                            </span>
                        </TourBullet>
                        <TourBullet $color="#d946ef">
                            <Wallet />
                            <span>
                                Kolejne doładujesz w <strong>Ustawienia → Kredyty SMS i AI</strong>,
                                albo wprost z wizyty, gdy zaczną się kończyć
                            </span>
                        </TourBullet>
                        <TourBullet $color="#d946ef">
                            <Info />
                            <span>E-maile nie zużywają kredytów</span>
                        </TourBullet>
                    </TourBulletList>
                </>
            ),
        },
        {
            icon: <CheckCircle2 />,
            from: '#ec4899',
            to: '#16a34a',
            title: 'Co się stanie po zakupie',
            body: (
                <>
                    <TourDesc>
                        Zaraz przejdziesz do potwierdzenia płatności. Po jej zaksięgowaniu:
                    </TourDesc>
                    <TourBulletList>
                        <TourBullet $color="#16a34a">
                            <CheckCircle2 />
                            <span>Moduł staje się aktywny od razu</span>
                        </TourBullet>
                        <TourBullet $color="#16a34a">
                            <CheckCircle2 />
                            <span>Wszystkie szablony wiadomości zostają <strong>włączone</strong></span>
                        </TourBullet>
                        <TourBullet $color="#16a34a">
                            <CheckCircle2 />
                            <span><strong>{starter} kredytów SMS</strong> trafia na Twoje konto</span>
                        </TourBullet>
                    </TourBulletList>
                    <TourDesc style={{ marginTop: 14 }}>
                        Po Twojej stronie zostają dwie rzeczy: przejrzeć treści szablonów oraz
                        (jeśli chcesz nadawać pod nazwą firmy)
                        <strong> wgrać podpisane upoważnienie</strong>. Bez niego SMS-y wychodzą
                        z numeru telefonu.
                    </TourDesc>
                </>
            ),
        },
    ];

    return (
        <GuidedTour
            steps={steps}
            onClose={onClose}
            onFinish={onFinish}
            finishLabel="Rozumiem i kontynuuję zakup"
        />
    );
}
