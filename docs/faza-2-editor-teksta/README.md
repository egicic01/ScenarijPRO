# Faza 2: Editor teksta

**Status:** gotovo

## Cilj
Napraviti JavaScript modul `EditorTeksta` koji analizira tekst scenarija unutar `contenteditable` elementa i omogućava formatiranje, te ga povezati s editorom.

## Datoteke
| Datoteka | Uloga |
|---|---|
| `js/EditorTeksta.js` | Modul s logikom analize i formatiranja |
| `js/editor.js` | Povezivanje modula sa stranicom (dugmad, ispis poruka) |
| `html/writing.html` | Dugmad iznad editora i element `#poruke` za ispis rezultata |

## Metode modula

| Metoda | Namjena |
|---|---|
| `dajBrojRijeci()` | Ukupan broj riječi te broj boldiranih i italic riječi |
| `dajUloge()` | Jedinstvene uloge po redoslijedu prvog pojavljivanja |
| `pogresnaUloga()` | Imena uloga koja su vjerovatno pogrešno napisana (slična češćem imenu) |
| `brojLinijaTeksta(uloga)` | Broj linija koje uloga izgovara |
| `scenarijUloge(uloga)` | Replike uloge s prethodnom i sljedećom replikom u dijalogu |
| `grupisiUloge()` | Uloge po dijalog-segmentima unutar svake scene |
| `formatirajTekst(komanda)` | Bold, italic i underline nad označenim tekstom |

Konstruktor baca izuzetak ako element nije `div` ili nema `contenteditable="true"`.

## Kako radi
1. **Čitanje teksta.** Modul prolazi kroz DOM i pretvara sadržaj u linije znakova, pri čemu za svaki znak pamti da li je boldiran ili italic. Novi red nastaje od `<br>`, blok elemenata (`div`, `p`...) i znaka `\n`.
2. **Riječi.** Riječ je niz znakova između razmaka, zareza i tačaka koji sadrži barem jedno slovo (brojevi i samostalni znakovi se ne računaju). Riječ je boldirana ili italic samo ako su svi njeni znakovi tako formatirani.
3. **Struktura scenarija.** Linije se klasificiraju kao naslov scene, ime uloge, govor, linija u zagradama ili akcija. Iz toga se gradi hijerarhija: scene, dijalog-segmenti i blokovi govora. Akcija i naslov scene prekidaju dijalog-segment, a prazne linije ne.
4. **Pogrešne uloge.** Sličnost imena se mjeri Levenshteinovom razdaljom (najviše 1, odnosno 2 za imena duža od pet slova).
5. **Formatiranje.** Koristi se `execCommand`, uz provjeru da je selekcija unutar editora i da tekst već nije formatiran, da ne dolazi do ugniježđivanja istih stilova.

## Odluke pri nejasnoćama u postavci
- Linije u zagradama između imena uloge i govora ne poništavaju ulogu.
- Isto ime uloge ponovljeno odmah ispod njenog bloka (bez prazne linije) nastavlja isti blok, a računa se kao novo pojavljivanje imena.
- Naslov scene može imati običnu crticu ili poluzipku (`-` ili `–`).
