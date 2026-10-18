import { percentChange } from './accountsLogic';
import { Change, ChangeText, KpiSub } from './accountsStyles';

/**
 * Zmiana do poprzednich 30 dni pod liczbą. Bez historii mówi tylko, za jaki okres
 * jest liczba - procentu z niczego nie wymyślamy.
 *
 * Słowny dopisek siedzi w `ChangeText`: na telefonie okres podaje raz podpis nad
 * kaflami (`periodCaption`), więc pod liczbą zostaje tylko dla czytnika ekranu.
 */
export const ChangeLine = ({ current, previous }: { current: number | null; previous: number | null }) => {
    const pct = percentChange(current, previous);
    if (pct === null) return <KpiSub><ChangeText>ostatnie 30 dni</ChangeText></KpiSub>;
    const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    return (
        <KpiSub>
            <Change $dir={dir}>{pct > 0 ? '▲ ' : pct < 0 ? '▼ ' : ''}{Math.abs(pct)}%</Change>
            <ChangeText>do poprzednich 30 dni</ChangeText>
        </KpiSub>
    );
};
