const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const DATA = path.join(__dirname, "data");
const SCENARIOS = path.join(DATA, "scenarios");
const DELTAS = path.join(DATA, "deltas.json");

fs.mkdirSync(SCENARIOS, { recursive: true });
if (!fs.existsSync(DELTAS)) fs.writeFileSync(DELTAS, "[]");

app.use(express.json());
["html", "css", "js"].forEach((f) => app.use(`/${f}`, express.static(path.join(__dirname, f))));
app.get("/", (req, res) => res.redirect("/html/projects.html"));

// ---------- Pohrana (JSON datoteke) ----------
const fajl = (id) => path.join(SCENARIOS, `scenario-${id}.json`);
const ucitajScenario = (id) => {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1 || !fs.existsSync(fajl(n))) return null;
  return JSON.parse(fs.readFileSync(fajl(n), "utf8"));
};
const spasiScenario = (s) => fs.writeFileSync(fajl(s.id), JSON.stringify(s, null, 2));
const ucitajDelte = () => JSON.parse(fs.readFileSync(DELTAS, "utf8"));
const dodajDelte = (nove) => fs.writeFileSync(DELTAS, JSON.stringify([...ucitajDelte(), ...nove], null, 2));
const sada = () => Math.floor(Date.now() / 1000);
const sljedeciId = () => {
  const ids = fs.readdirSync(SCENARIOS).map((f) => /^scenario-(\d+)\.json$/.exec(f)).filter(Boolean).map((m) => Number(m[1]));
  return ids.length ? Math.max(...ids) + 1 : 1;
};
const uredi = (s) => { // linije u redoslijedu određenom pomoću nextLineId
  const poId = new Map(s.content.map((l) => [l.lineId, l]));
  const iducci = new Set(s.content.map((l) => l.nextLineId));
  let l = s.content.find((x) => !iducci.has(x.lineId));
  const rez = [];
  while (l) { rez.push(l); l = poId.get(l.nextLineId); }
  return { id: s.id, title: s.title, content: rez };
};

// ---------- Zaključavanja (u memoriji) ----------
const lockLinija = new Map();      // "scenarioId:lineId" -> userId
const linijaKorisnika = new Map(); // userId -> "scenarioId:lineId" (jedna linija po korisniku)
const lockLikova = new Map();      // "scenarioId:ime" -> userId
const otkljucaj = (kljuc, userId) => {
  lockLinija.delete(kljuc);
  if (linijaKorisnika.get(userId) === kljuc) linijaKorisnika.delete(userId);
};

// ---------- Pomoćne funkcije ----------
const poruka = (res, status, message) => res.status(status).json({ message });
const brojLinije = (s, lineId) => s.content.findIndex((l) => l.lineId === Number(lineId));
const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Prelama tekst na dijelove od najviše `max` riječi (riječ = niz bez razmaka, zareza i tačke sa slovom)
const prelomi = (tekst, max = 20) => {
  const re = /[^\s,.]+/g;
  const dijelovi = [];
  let m, broj = 0, pocetak = 0;
  while ((m = re.exec(tekst))) {
    if (!/\p{L}/u.test(m[0])) continue;
    broj++;
    if (broj > max && (broj - 1) % max === 0) {
      dijelovi.push(tekst.slice(pocetak, m.index).trim());
      pocetak = m.index;
    }
  }
  return dijelovi.length ? [...dijelovi, tekst.slice(pocetak).trim()] : [tekst];
};

// ---------- Rute ----------
app.post("/api/scenarios", (req, res) => {
  const naslov = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const scenario = {
    id: sljedeciId(),
    title: naslov || "Neimenovani scenarij",
    content: [{ lineId: 1, nextLineId: null, text: "" }],
  };
  spasiScenario(scenario);
  res.json(scenario);
});

app.get("/api/scenarios/:scenarioId", (req, res) => {
  const scenario = ucitajScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  res.json(uredi(scenario));
});

app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", (req, res) => {
  const scenario = ucitajScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  if (brojLinije(scenario, req.params.lineId) === -1) return poruka(res, 404, "Linija ne postoji!");
  const { userId } = req.body;
  const kljuc = `${scenario.id}:${Number(req.params.lineId)}`;
  if (lockLinija.has(kljuc) && lockLinija.get(kljuc) !== userId) return poruka(res, 409, "Linija je vec zakljucana!");
  const stara = linijaKorisnika.get(userId);
  if (stara && stara !== kljuc) lockLinija.delete(stara);
  lockLinija.set(kljuc, userId);
  linijaKorisnika.set(userId, kljuc);
  poruka(res, 200, "Linija je uspjesno zakljucana!");
});

app.put("/api/scenarios/:scenarioId/lines/:lineId", (req, res) => {
  const scenario = ucitajScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const idx = brojLinije(scenario, req.params.lineId);
  if (idx === -1) return poruka(res, 404, "Linija ne postoji!");
  const { userId, newText } = req.body;
  if (!Array.isArray(newText) || newText.length === 0) return poruka(res, 400, "Niz new_text ne smije biti prazan!");
  const lineId = Number(req.params.lineId);
  const kljuc = `${scenario.id}:${lineId}`;
  if (!lockLinija.has(kljuc)) return poruka(res, 409, "Linija nije zakljucana!");
  if (lockLinija.get(kljuc) !== userId) return poruka(res, 409, "Linija je vec zakljucana!");

  const staroSljedece = scenario.content[idx].nextLineId;
  let zadnjiId = Math.max(...scenario.content.map((l) => l.lineId));
  const tekstovi = newText.flatMap((t) => prelomi(String(t)));
  const nove = tekstovi.map((text, k) => ({ lineId: k === 0 ? lineId : ++zadnjiId, nextLineId: null, text }));
  nove.forEach((l, k) => { l.nextLineId = k < nove.length - 1 ? nove[k + 1].lineId : staroSljedece; });
  scenario.content.splice(idx, 1, ...nove);
  spasiScenario(scenario);

  const timestamp = sada();
  dodajDelte(nove.map((l) => ({ scenarioId: scenario.id, type: "line_update", lineId: l.lineId, nextLineId: l.nextLineId, content: l.text, timestamp })));
  otkljucaj(kljuc, userId);
  poruka(res, 200, "Linija je uspjesno azurirana!");
});

app.post("/api/scenarios/:scenarioId/characters/lock", (req, res) => {
  const scenario = ucitajScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const { userId, characterName } = req.body;
  const kljuc = `${scenario.id}:${characterName}`;
  if (lockLikova.has(kljuc) && lockLikova.get(kljuc) !== userId) return poruka(res, 409, "Konflikt! Ime lika je vec zakljucano!");
  lockLikova.set(kljuc, userId);
  poruka(res, 200, "Ime lika je uspjesno zakljucano!");
});

app.post("/api/scenarios/:scenarioId/characters/update", (req, res) => {
  const scenario = ucitajScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const { userId, oldName, newName } = req.body;
  if (typeof oldName !== "string" || typeof newName !== "string" || !oldName) return poruka(res, 400, "Neispravni podaci!");
  const kljuc = `${scenario.id}:${oldName}`;
  if (lockLikova.has(kljuc) && lockLikova.get(kljuc) !== userId) return poruka(res, 409, "Konflikt! Ime lika je vec zakljucano!");

  const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(oldName)}(?![\\p{L}\\p{N}_])`, "gu");
  scenario.content.forEach((l) => { l.text = l.text.replace(re, () => newName); });
  spasiScenario(scenario);
  dodajDelte([{ scenarioId: scenario.id, type: "char_rename", oldName, newName, timestamp: sada() }]);
  lockLikova.delete(kljuc);
  poruka(res, 200, "Ime lika je uspjesno promijenjeno!");
});

app.get("/api/scenarios/:scenarioId/deltas", (req, res) => {
  const scenario = ucitajScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const since = Number(req.query.since) || 0;
  const deltas = ucitajDelte()
    .filter((d) => d.scenarioId === scenario.id && d.timestamp > since)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((d) => d.type === "char_rename"
      ? { type: d.type, oldName: d.oldName, newName: d.newName, timestamp: d.timestamp }
      : { type: d.type, lineId: d.lineId, nextLineId: d.nextLineId, content: d.content, timestamp: d.timestamp });
  res.json({ deltas });
});

module.exports = app;
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`ScenarijPro: http://localhost:${port}`));
}