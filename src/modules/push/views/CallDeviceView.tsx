import styled from 'styled-components';
import { usePushDevice } from '../hooks/usePushDevice';
import { PushPairingCard } from '../components/PushPairingCard';
import { PushDeviceList } from '../components/PushDeviceList';

/**
 * „Powiadomienia na telefon" — strona otwierana NA TELEFONIE (trasa /call-device,
 * zwykle z kodu QR w ustawieniach na komputerze). Jedno dotknięcie włącza na tym
 * urządzeniu powiadomienia z CRM: prośby o połączenie, zakończone wizyty, nowe
 * zapytania. Niżej lista wszystkich urządzeń konta z możliwością odłączenia.
 *
 * Stan parowania i lista urządzeń są tymi samymi komponentami, których używa
 * panel w Ustawieniach — jedna implementacja znaczy, że telefon zachowuje się
 * identycznie niezależnie od tego, którą drogą użytkownik tu trafił.
 */

const Page = styled.div`
    padding: 32px;
    max-width: 560px;

    @media (max-width: 600px) {
        padding: 20px 16px;
    }
`;

const PageTitle = styled.h1`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
`;

const PageSubtitle = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
`;

const SectionTitle = styled.h2`
    margin: 28px 0 10px;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const Card = styled.div`
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);

    @media (max-width: 600px) { padding: 18px; }
`;

export const CallDeviceView = () => {
    const push = usePushDevice();

    return (
        <Page>
            <PageTitle>Powiadomienia na telefon</PageTitle>
            <PageSubtitle>
                Włącz powiadomienia na tym telefonie: kliknięty na komputerze numer klienta
                pojawi się tu z przyciskiem „Zadzwoń", a CRM da znać o zakończonej wizycie
                i nowym zapytaniu.
            </PageSubtitle>

            <Card>
                <PushPairingCard push={push} actionLabel="Włącz powiadomienia na tym telefonie" />
            </Card>

            {push.devices.length > 0 && (
                <>
                    <SectionTitle>Sparowane urządzenia</SectionTitle>
                    <PushDeviceList devices={push.devices} onRevoke={push.revokeDevice} />
                </>
            )}
        </Page>
    );
};
