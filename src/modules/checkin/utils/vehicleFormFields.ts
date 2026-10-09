// src/modules/checkin/utils/vehicleFormFields.ts
//
// Pola sekcji „Dane pojazdu", które studio może ukryć („Ustawienia pól"). Klucze są
// kontraktem z serwerem (`VehicleFormField`) i zapisem w ustawieniach studia.
import type { VehicleFormFieldKey } from '@/modules/settings/types';

/** Kolejność jak na formularzu. Marki i modelu nie ma: bez nich nie ma pojazdu. */
export const VEHICLE_FORM_FIELDS: { key: VehicleFormFieldKey; label: string; hint: string }[] = [
    { key: 'yearOfProduction', label: 'Rok produkcji', hint: 'Rocznik auta' },
    { key: 'licensePlate', label: 'Numer rejestracyjny', hint: 'Tablica, po której szuka się auta' },
    { key: 'mileage', label: 'Przebieg', hint: 'Stan licznika przy przyjęciu' },
    { key: 'color', label: 'Kolor', hint: 'Kolor nadwozia' },
    { key: 'vin', label: 'VIN', hint: 'Numer nadwozia, także ze zdjęcia telefonem' },
];

/** Czy pole jest widoczne przy danej liście ukrytych - brak ustawień znaczy „wszystko widać". */
export const isVehicleFieldVisible = (hiddenFields: readonly string[] | undefined, key: VehicleFormFieldKey): boolean =>
    !(hiddenFields ?? []).includes(key);
