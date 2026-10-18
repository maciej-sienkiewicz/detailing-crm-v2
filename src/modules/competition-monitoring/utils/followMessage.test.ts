import { describe, expect, it } from 'vitest';
import { followMessage } from './followMessage';

// „Obserwuj" w „W okolicy" przypina też stronę na Facebooku - komunikat mówi o tym wprost,
// żeby nikt nie szedł do „Reklam" przekonany, że musi tam jeszcze coś wskazać.
describe('followMessage', () => {
    it('ze stroną i reklamami', () => {
        expect(followMessage({ profileId: 'p', username: 'dbtuning.pl', status: 'ACTIVE', facebookPageLinked: true, adsFound: 3 }))
            .toEqual({
                title: '@dbtuning.pl dodany do obserwowanych',
                body: 'Strona na Facebooku przypięta, 3 reklamy już w zakładce „Reklamy”. Dane pojawią się po najbliższym pobraniu.',
            });
    });

    it('ze stroną, bez aktywnych reklam albo bez pobrania', () => {
        expect(followMessage({ profileId: 'p', username: 'x', status: 'ACTIVE', facebookPageLinked: true, adsFound: 0 }).body)
            .toMatch(/^Strona na Facebooku przypięta\. W tej chwili nie ma aktywnych reklam\./);
        expect(followMessage({ profileId: 'p', username: 'x', status: 'PENDING_APPROVAL', facebookPageLinked: true, adsFound: null }).body)
            .toBe('Strona na Facebooku przypięta, reklamy pojawią się w zakładce „Reklamy”. Czeka na zatwierdzenie. Dane pojawią się po najbliższym pobraniu.');
    });

    it('bez strony jak dotąd', () => {
        expect(followMessage({ profileId: 'p', username: 'x', status: 'PENDING_APPROVAL' }).body)
            .toBe('Czeka na zatwierdzenie. Dane pojawią się po najbliższym pobraniu.');
    });
});
