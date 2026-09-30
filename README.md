# ScenarijPRO

**Web aplikacija za kolaborativno pisanje scenarija.** Urednik u klasičnom scenarističkom formatu, analiza uloga i dijaloga, istovremeni rad više korisnika uz zaključavanje linija i historija verzija s mogućnošću vraćanja na bilo koji checkpoint.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?logo=sequelize&logoColor=white)

## O projektu

ScenarijPro je full-stack projekat koji se razvija kroz četiri faze: od statičnog interfejsa, preko klijentske logike za analizu teksta i REST API-ja s kolaboracijom u realnom vremenu, do relacione baze i verzionisanja. Svaka faza ima vlastitu dokumentaciju u folderu [`docs/`](docs).

## Mogućnosti

**Pregled i organizacija**
- Pregled svih scenarija u responzivnom gridu kartica (status, broj stranica, vrijeme posljednje izmjene)
- Korisničke postavke: lični podaci, sigurnost (2FA) i notifikacije

**Editor i analiza teksta**
- Editor s formatiranjem teksta (bold, italic, underline)
- Automatsko prepoznavanje scena, uloga, replika i dijalog-segmenata
- Statistika teksta: broj riječi (ukupno, boldirano, italic), broj linija po ulozi
- Detekcija potencijalno pogrešno napisanih imena uloga
- Grupisanje uloga po dijalozima i pregled konteksta replika

**Kolaboracija**
- REST API za rad više korisnika istovremeno
- Zaključavanje linija i imena likova, uz provjeru vlasnika zaključavanja
- Automatsko prelamanje dugih linija (20 riječi)
- Zamjena imena lika u cijelom scenariju

**Verzionisanje**
- Svaka promjena se bilježi kao delta
- Checkpointi i rekonstrukcija scenarija u bilo kojem trenutku

## Razvoj projekta

| Faza | Sadržaj | Status | Dokumentacija |
|---|---|---|---|
| 1 | Statični interfejs: pregled projekata, editor, postavke | Gotovo | [docs/faza-1-staticni-interfejs](docs/faza-1-staticni-interfejs) |
| 2 | JavaScript modul za analizu i formatiranje teksta | Planirano | [docs/faza-2-editor-teksta](docs/faza-2-editor-teksta) |
| 3 | Backend API (Node.js, Express), zaključavanje, AJAX modul | Planirano | [docs/faza-3-backend-api](docs/faza-3-backend-api) |
| 4 | MySQL i Sequelize, checkpointi i restore | Planirano | [docs/faza-4-baza-podataka](docs/faza-4-baza-podataka) |

## Tehnologije

| Sloj | Tehnologije |
|---|---|
| Frontend | HTML5, CSS3 (Grid, Flexbox, custom properties), JavaScript (modularni obrazac) |
| Backend | Node.js, Express |
| Baza podataka | MySQL, Sequelize ORM |

## Struktura repozitorija

```
html/   projects.html, writing.html, user.html
css/    common.css (tokeni, reset), projects.css, writing.css, user.css
docs/   dokumentacija po fazama
```

Folderi `js/` i `data/`, te serverski kod, dodaju se u kasnijim fazama.

## Pokretanje

Trenutno (faza 1) nije potreban build niti server: otvorite `html/projects.html` u pregledniku. Upute za pokretanje servera i baze dodaju se u dokumentaciju faza 3 i 4.

## API (planirano)

| Metoda | Ruta | Opis |
|---|---|---|
| POST | `/api/scenarios` | Kreira novi scenarij |
| GET | `/api/scenarios/:scenarioId` | Vraća scenarij s linijama u ispravnom redoslijedu |
| POST | `/api/scenarios/:scenarioId/lines/:lineId/lock` | Zaključava liniju za uređivanje |
| PUT | `/api/scenarios/:scenarioId/lines/:lineId` | Ažurira liniju i otključava je |
| POST | `/api/scenarios/:scenarioId/characters/lock` | Zaključava ime lika |
| POST | `/api/scenarios/:scenarioId/characters/update` | Mijenja ime lika u cijelom scenariju |
| GET | `/api/scenarios/:scenarioId/deltas?since=` | Promjene nakon zadanog trenutka |
| POST | `/api/scenarios/:scenarioId/checkpoint` | Kreira checkpoint |
| GET | `/api/scenarios/:scenarioId/checkpoints` | Lista checkpointa |
| GET | `/api/scenarios/:scenarioId/restore/:checkpointId` | Stanje scenarija u trenutku checkpointa |



## O autoru

Ena Gicić, student Elektrotehničkog fakulteta u Sarajevu. Projekat je nastao u okviru predmeta Web tehnologije.
