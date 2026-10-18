// Komunikat po „Obserwuj" w „W okolicy" - co serwer faktycznie zrobił.
//
// „Obserwuj" przypina teraz także stronę reklamodawcy na Facebooku i od razu pobiera
// jego reklamy. Komunikat mówi to wprost: inaczej właściciel szedł do zakładki
// „Reklamy" przekonany, że musi tam jeszcze coś wskazać.
import { pluralPl } from '@/common/utils/plural';
import type { FollowedAdvertiser } from '../types';

export const followMessage = (result: FollowedAdvertiser): { title: string; body: string } => {
    const data = result.status === 'ACTIVE'
        ? 'Dane pojawią się po najbliższym pobraniu.'
        : 'Czeka na zatwierdzenie. Dane pojawią się po najbliższym pobraniu.';
    if (!result.facebookPageLinked) return { title: `@${result.username} dodany do obserwowanych`, body: data };

    const ads = result.adsFound == null
        ? 'Strona na Facebooku przypięta, reklamy pojawią się w zakładce „Reklamy”.'
        : result.adsFound === 0
            ? 'Strona na Facebooku przypięta. W tej chwili nie ma aktywnych reklam.'
            : `Strona na Facebooku przypięta, ${result.adsFound} ${pluralPl(result.adsFound, 'reklama', 'reklamy', 'reklam')} już w zakładce „Reklamy”.`;
    return { title: `@${result.username} dodany do obserwowanych`, body: `${ads} ${data}` };
};
