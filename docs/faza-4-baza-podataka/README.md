# Faza 4: Baza podataka i verzionisanje

**Status:** gotovo

## Cilj
Zamijeniti pohranu u JSON datotekama relacionom bazom MySQL (Sequelize ORM) i dodati sistem checkpointa koji omogućava rekonstrukciju scenarija u bilo kojem trenutku.

## Priprema baze
Potreban je MySQL server s bazom `wt26` i korisnikom `root` (šifra `password`):
```sql
CREATE DATABASE wt26;
```
Podaci za povezivanje su u `db.js`, a mogu se zaobići varijablama okruženja `DB_NAME`, `DB_USER`, `DB_PASSWORD` i `DB_HOST`. Alternativa bez instalacije, ako postoji Docker:
```bash
docker run --name wt26-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=wt26 -p 3306:3306 -d mysql:8
```

## Pokretanje
```bash
npm install
node index.js
```
Pri svakom pokretanju tabele se brišu i ponovo kreiraju iz modela (`sequelize.sync({ force: true })`), pa su podaci privremeni.

## Model podataka

| Model | Atributi | Veze |
|---|---|---|
| `Scenario` | `id`, `title` | ima više `Line`, `Delta` i `Checkpoint` |
| `Line` | `id`, `lineId`, `text`, `nextLineId`, `scenarioId` | pripada scenariju; par (`scenarioId`, `lineId`) je jedinstven |
| `Delta` | `id`, `scenarioId`, `type`, `lineId`, `nextLineId`, `content`, `oldName`, `newName`, `timestamp` | pripada scenariju |
| `Checkpoint` | `id`, `scenarioId`, `timestamp` | pripada scenariju |

## Rute za verzionisanje

| Metoda | Ruta | Odgovor |
|---|---|---|
| POST | `/api/scenarios/:scenarioId/checkpoint` | `200` i poruka da je checkpoint kreiran |
| GET | `/api/scenarios/:scenarioId/checkpoints` | `200` i niz `{id, timestamp}` |
| GET | `/api/scenarios/:scenarioId/restore/:checkpointId` | `200` i scenarij u istom obliku kao `GET /api/scenarios/:scenarioId` |

Ako scenarij ili checkpoint ne postoje, vraća se `404`.

## Kako radi rekonstrukcija
1. Polazi se od početnog stanja scenarija: jedna prazna linija (stanje nakon `POST /api/scenarios`).
2. Iz tabele `Delta` uzimaju se sve delte tog scenarija s `timestamp` manjim ili jednakim vremenu checkpointa, sortirane po vremenu (a pri istom vremenu po `id`).
3. Delte se primjenjuju redom. `line_update` postavlja tekst i `nextLineId` linije (ili je dodaje ako ne postoji), a `char_rename` mijenja ime lika u svim linijama.
4. Linije se poredaju prateći `nextLineId`.

## Odluke
- Svaka izmjena linije (linija, nove linije od prelamanja i delte) upisuje se u jednoj transakciji, pa se uvijek upiše sve ili ništa.
- Zaključavanja ostaju u memoriji, kao u fazi 3.
- Isključene su automatske kolone `createdAt` i `updatedAt`, pa modeli sadrže samo atribute iz postavke.
