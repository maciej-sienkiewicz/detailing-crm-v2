// src/modules/batch-orders/utils/format.ts

import { pluralPl } from '@/common/utils/plural';

const money = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

export const formatMoney = (cents: number): string => money.format(cents / 100);

/**
 * „1 auto", „2 auta", „8 aut". Liczymy AUTA, nie „wpisy": wpis to słowo z bazy
 * danych, a pracownia myśli samochodami, które zrobiła dla kontrahenta.
 * Historia miała dawniej własną odmianę (`< 5 ? 'wpisy' : 'wpisów'`), która
 * pisała „12 wpisy" i „22 wpisów".
 */
export const carsLabel = (count: number): string =>
    `${count} ${pluralPl(count, 'auto', 'auta', 'aut')}`;

/** „Brutto za 8 aut. Netto 10 689,44 zł." - kwota główna jest brutto, netto to dopisek. */
export const grossForCars = (count: number, netCents: number): string =>
    `Brutto za ${carsLabel(count)}. Netto ${formatMoney(netCents)}.`;

/** Marka i model wpisu albo myślnik - wiersz tabeli nigdy nie zostaje pusty. */
export const vehicleName = (e: { vehicleMake: string | null; vehicleModel: string | null }): string =>
    [e.vehicleMake, e.vehicleModel].filter(Boolean).join(' ') || 'Pojazd bez nazwy';
