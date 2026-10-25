// src/modules/bays/api/clock.ts
//
// Zegar PROTOTYPU. Tablica „Teraz" w niedzielę albo o 22:00 byłaby pusta i nic by
// nie pokazała, więc poza godzinami otwarcia zegar przeskakuje na najbliższy dzień
// roboczy, 11:05, i dalej idzie normalnie. W godzinach otwarcia to zwykły czas.
// Przy podpięciu prawdziwego API ten plik znika - zostaje `new Date()`.

import { DEFAULT_HOURS, addDays, hoursOf, toDateKey } from '../utils/slots';

const isOpenAt = (d: Date): boolean => {
    const h = hoursOf(toDateKey(d));
    if (!h) return false;
    const m = d.getHours() * 60 + d.getMinutes();
    return m >= h.opens && m < h.closes;
};

const demoBase = (real: Date): Date => {
    if (isOpenAt(real)) return real;
    let cursor = new Date(real);
    const m = real.getHours() * 60 + real.getMinutes();
    const todayHours = hoursOf(toDateKey(real));
    // Przed otwarciem - dziś; po zamknięciu albo w dzień wolny - następny dzień roboczy.
    if (!(todayHours && m < todayHours.opens)) cursor = addDays(cursor, 1);
    for (let i = 0; i < 8 && !hoursOf(toDateKey(cursor), DEFAULT_HOURS); i++) cursor = addDays(cursor, 1);
    cursor.setHours(11, 5, 0, 0);
    return cursor;
};

const offset = demoBase(new Date()).getTime() - Date.now();

export const baysNow = (): Date => new Date(Date.now() + offset);

/** Czy zegar prototypu odbiega od prawdziwego - wtedy widok mówi to wprost. */
export const isDemoClock = (): boolean => Math.abs(offset) > 60_000;
