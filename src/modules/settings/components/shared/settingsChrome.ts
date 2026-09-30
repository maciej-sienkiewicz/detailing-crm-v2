// src/modules/settings/components/shared/settingsChrome.ts
//
// Kontrakt ramy ustawień z sekcjami mieszka teraz we wspólnym PageChrome
// (src/common/components/PageChrome), bo korzysta z niego także moduł „Pracownicy".
// Te nazwy zostają jako cienkie aliasy, żeby sekcje ustawień nie musiały zmieniać
// importów naraz - nowy kod importuje wprost z PageChrome.

export {
    PageChromeContext as SettingsChromeContext,
    usePageChrome as useSettingsChrome,
    usePageDirty as useSettingsDirty,
} from '@/common/components/PageChrome';
export type { PageChromeValue as SettingsChromeValue } from '@/common/components/PageChrome';
