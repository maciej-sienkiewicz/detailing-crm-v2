// src/core/components/BootSplash.tsx
//
// Ekran startowy w wersji Reacta. Markup i klasy MUSZĄ zgadzać się z tym w index.html:
// statyczny ekran maluje się przed bundlem, a ten go zastępuje przy pierwszym renderze
// i trwa, dopóki sesja, subskrypcja i kod pierwszego widoku nie są gotowe. Ten sam
// wygląd na całej drodze startu - bez białej przerwy między etapami. Style żyją
// w index.html (działają, zanim przyjdzie CSS z bundla), dlatego tu nie ma styled().
export function BootSplash() {
    return (
        <div className="boot-splash" role="status" aria-label="Wczytywanie DetailBoost">
            <img className="boot-splash__icon" src="/icons/icon-192.png?v=2" alt="" width={72} height={72} />
            <span className="boot-splash__bar" />
        </div>
    );
}
