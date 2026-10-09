# Faza 3: Backend API

**Status:** gotovo

## Cilj
Razviti REST API u Node.js i Express za kolaborativno uređivanje scenarija, uz zaključavanje koje sprječava konflikte, te klijentski modul `PoziviAjaxFetch` povezan s editorom.

## Pokretanje
```bash
npm install
node index.js
```
Aplikacija je na `http://localhost:3000` (otvara `html/projects.html`). Editor: `http://localhost:3000/html/writing.html?id=1`. Svaki tab preglednika je poseban korisnik, pa se zaključavanje može isprobati u dva taba.

## Datoteke
| Datoteka | Uloga |
|---|---|
| `index.js` | Express server, rute, pohrana i zaključavanja |
| `data/scenarios/scenario-<id>.json` | Po jedna datoteka za svaki scenarij |
| `data/deltas.json` | Zabilježene promjene (`line_update`, `char_rename`) |
| `js/PoziviAjaxFetch.js` | Klijentski modul za komunikaciju s API-jem |
| `js/editor.js` | Povezivanje editora s API-jem |

## Kako radi
- **Linije** su povezana lista: svaka ima `lineId` i `nextLineId` (zadnja `null`). Novi `lineId` je najveći postojeći plus 1. `GET` vraća linije u ispravnom redoslijedu.
- **Zaključavanje linija** je globalno: korisnik ima najviše jednu zaključanu liniju, a novo zaključavanje otključava staru. Zaključavanja su u memoriji, a podaci u datotekama, pa restart servera ne briše scenarije.
- **Ažuriranje linije** otključava liniju i bilježi deltu. Tekst duži od 20 riječi prelama se na više linija koje se umeću iza trenutne.
- **Promjena imena lika** mijenja ime u cijelom scenariju (razlikuje velika i mala slova, samo cijele riječi) i bilježi jednu `char_rename` deltu.
- **Provjera vlasnika:** ako je linija ili ime lika zaključano od drugog korisnika, server vraća `409`. Ažuriranje imena lika bez prethodnog zaključavanja je dozvoljeno.

## Povezivanje s editorom
Editor učitava scenarij sa servera i prikazuje svaku liniju kao poseban `div`. Klik na liniju je zaključava, prelazak na drugu liniju ili dugme "Spasi" spašava izmjene, a Enter dijeli liniju. Svake tri sekunde se provjeravaju delte pa se promjene drugih korisnika prikazuju same. Formatiranje (bold, italic, underline) se ne čuva na serveru jer scenarij sadrži samo običan tekst.
