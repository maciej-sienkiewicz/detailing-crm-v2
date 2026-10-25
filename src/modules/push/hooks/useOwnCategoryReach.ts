// src/modules/push/hooks/useOwnCategoryReach.ts
//
// Czy dany rodzaj powiadomień dochodzi do osoby, która ogląda ekran.
//
// Tabela „Rodzaje powiadomień" jest jedynym włącznikiem (serwer: PushNotificationCategory,
// od 25.10.2026). Ustawienia „kiedy i jak często" pod nią - przypomnienie, raport,
// reklamy - pytają o to, żeby nie udawać, że coś przyjdzie: gdy rodzaj jest wyłączony na
// wszystkich własnych urządzeniach, wiersz jest wyszarzony i mówi, gdzie go włączyć.
// Wcześniej to były dwa włączniki do jednej rzeczy i ekran raz mówił „włączone",
// a raz „wyłączone".
//
// Liczą się tylko WŁASNE urządzenia (`mine`): właściciel widzi w tabeli także telefon
// recepcji, ale przypomnienie z jego ustawienia przyjdzie na jego telefon, nie tamten.

import { useQuery } from '@tanstack/react-query';
import { pushApi } from '../api/pushApi';
import type { PushNotificationCategory, PushNotificationSettings } from '../types';
import { copyOf } from '../utils/notificationCategories';
import { pushQueryKeys } from './usePushDevice';

/** `unknown` - jeszcze nie wiadomo (wczytywanie, błąd): wiersz wygląda zwyczajnie. */
export type CategoryReach = 'unknown' | 'reaches' | 'off' | 'no-device';

export function categoryReach(
    settings: PushNotificationSettings | undefined,
    category: PushNotificationCategory,
): CategoryReach {
    if (!settings) return 'unknown';
    const mine = settings.devices.filter(device => device.mine);
    if (mine.length === 0) return 'no-device';
    const reaches = mine.some(device =>
        device.categories.some(setting => setting.category === category && setting.enabled && setting.available));
    return reaches ? 'reaches' : 'off';
}

/**
 * Zdanie pod wyszarzonym wierszem; null = rodzaj dochodzi (albo jeszcze nie wiadomo).
 * „Rodzaj …" zamiast samej nazwy: nazwy mają różne rodzaje gramatyczne („Nowy raport",
 * „Przypomnienie…", „Reklamy…"), a zdanie ma pasować do każdej.
 */
export function reachNote(reach: CategoryReach, category: PushNotificationCategory): string | null {
    if (reach === 'off') {
        return `Rodzaj „${copyOf(category).label}” jest wyłączony na wszystkich Twoich urządzeniach. `
            + 'Włącz go w tabeli „Rodzaje powiadomień”.';
    }
    if (reach === 'no-device') return 'Twoje konto nie ma jeszcze sparowanego urządzenia.';
    return null;
}

export function useOwnCategoryReach(category: PushNotificationCategory): CategoryReach {
    // Ten sam klucz co tabela: przełączenie w tabeli od razu zmienia wiersz pod nią.
    const settings = useQuery({
        queryKey: pushQueryKeys.notificationSettings,
        queryFn: pushApi.getNotificationSettings,
        staleTime: 30_000,
    });
    return categoryReach(settings.data, category);
}
