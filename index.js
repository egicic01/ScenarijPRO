// Spirala 4: MySQL + Sequelize umjesto JSON datoteka.

const express = require("express");
const path = require("path");
const { Op } = require("sequelize");                                        
const { sequelize, Scenario, Line, Delta, Checkpoint } = require("./db");   

const app = express();

// Tabele se kreiraju iz modela pri svakom pokretanju (force: true briše stare podatke)
const ready = sequelize.sync({ force: true });
ready.catch(() => {}); // greška se prijavljuje pri pokretanju servera, ovdje samo sprječavamo neuhvaćeno odbijanje

app.use(express.json());
app.use(async (req, res, next) => { // zahtjevi čekaju da baza bude spremna
  try { await ready; next(); } catch (e) { next(e); }
});
["html", "css", "js"].forEach((f) => app.use(`/${f}`, express.static(path.join(__dirname, f))));
app.get("/", (req, res) => res.redirect("/html/projects.html"));

// ---------- Zaključavanja (i dalje u memoriji, ISTO kao u spirali 3) ----------
const lockLinija = new Map();      // "scenarioId:lineId" -> userId
const linijaKorisnika = new Map(); // userId -> "scenarioId:lineId" (jedna linija po korisniku)
const lockLikova = new Map();      // "scenarioId:ime" -> userId
const otkljucaj = (kljuc, userId) => {
  lockLinija.delete(kljuc);
  if (linijaKorisnika.get(userId) === kljuc) linijaKorisnika.delete(userId);
};

// ---------- Pomoćne funkcije ----------
const poruka = (res, status, message) => res.status(status).json({ message });
const sada = () => Math.floor(Date.now() / 1000);
const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regexImena = (ime) => new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(ime)}(?![\\p{L}\\p{N}_])`, "gu");
const asinhrono = (fn) => (req, res, next) => fn(req, res, next).catch(next); // rute su sada async

// [PROMIJENJENO] umjesto čitanja datoteke, scenarij se traži u bazi
const nadjiScenario = async (id) => {
  const n = Number(id);
  return Number.isInteger(n) && n >= 1 ? Scenario.findByPk(n) : null;
};
const nadjiLiniju = async (scenarioId, lineId) => {
  const n = Number(lineId);
  return Number.isInteger(n) ? Line.findOne({ where: { scenarioId, lineId: n } }) : null;
};

// Linije u redoslijedu određenom pomoću nextLineId
const uredi = (linije) => {
  const poId = new Map(linije.map((l) => [l.lineId, l]));
  const iducci = new Set(linije.map((l) => l.nextLineId));
  let l = linije.find((x) => !iducci.has(x.lineId));
  const rez = [];
  while (l) { rez.push(l); l = poId.get(l.nextLineId); }
  return rez;
};
const dajScenario = async (scenario) => { // sastavlja odgovor iz tabela Scenario i Line
  const linije = await Line.findAll({ where: { scenarioId: scenario.id } });
  const content = uredi(linije.map((l) => ({ lineId: l.lineId, nextLineId: l.nextLineId, text: l.text })));
  return { id: scenario.id, title: scenario.title, content };
};

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

// ---------- Rute iz spirale 3 (isti odgovori, sada nad bazom) ----------
app.post("/api/scenarios", asinhrono(async (req, res) => {
  const { title } = req.body || {};
  const naslov = typeof title === "string" ? title.trim() : "";
  const scenario = await sequelize.transaction(async (t) => { // [PROMIJENJENO]
    const s = await Scenario.create({ title: naslov || "Neimenovani scenarij" }, { transaction: t });
    await Line.create({ lineId: 1, nextLineId: null, text: "", scenarioId: s.id }, { transaction: t });
    return s;
  });
  res.json(await dajScenario(scenario));
}));

app.get("/api/scenarios/:scenarioId", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  res.json(await dajScenario(scenario));
}));

app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const linija = await nadjiLiniju(scenario.id, req.params.lineId);
  if (!linija) return poruka(res, 404, "Linija ne postoji!");
  const { userId } = req.body || {};
  const kljuc = `${scenario.id}:${linija.lineId}`;
  if (lockLinija.has(kljuc) && lockLinija.get(kljuc) !== userId) return poruka(res, 409, "Linija je vec zakljucana!");
  const stara = linijaKorisnika.get(userId);
  if (stara && stara !== kljuc) lockLinija.delete(stara);
  lockLinija.set(kljuc, userId);
  linijaKorisnika.set(userId, kljuc);
  poruka(res, 200, "Linija je uspjesno zakljucana!");
}));

app.put("/api/scenarios/:scenarioId/lines/:lineId", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const linija = await nadjiLiniju(scenario.id, req.params.lineId);
  if (!linija) return poruka(res, 404, "Linija ne postoji!");
  const { userId, newText } = req.body || {};
  if (!Array.isArray(newText) || newText.length === 0) return poruka(res, 400, "Niz new_text ne smije biti prazan!");
  const kljuc = `${scenario.id}:${linija.lineId}`;
  if (!lockLinija.has(kljuc)) return poruka(res, 409, "Linija nije zakljucana!");
  if (lockLinija.get(kljuc) !== userId) return poruka(res, 409, "Linija je vec zakljucana!");

  // [PROMIJENJENO] sve izmjene (linije + delte) u jednoj transakciji: ili se upišu sve ili ništa
  await sequelize.transaction(async (t) => {
    const postojece = await Line.findAll({ where: { scenarioId: scenario.id }, attributes: ["lineId"], transaction: t });
    let zadnjiId = Math.max(...postojece.map((l) => l.lineId));
    const tekstovi = newText.flatMap((x) => prelomi(String(x)));
    const nove = tekstovi.map((text, k) => ({ lineId: k === 0 ? linija.lineId : ++zadnjiId, nextLineId: null, text }));
    nove.forEach((l, k) => { l.nextLineId = k < nove.length - 1 ? nove[k + 1].lineId : linija.nextLineId; });

    await linija.update({ text: nove[0].text, nextLineId: nove[0].nextLineId }, { transaction: t });
    await Line.bulkCreate(nove.slice(1).map((l) => ({ ...l, scenarioId: scenario.id })), { transaction: t });
    const timestamp = sada();
    await Delta.bulkCreate(
      nove.map((l) => ({ scenarioId: scenario.id, type: "line_update", lineId: l.lineId, nextLineId: l.nextLineId, content: l.text, timestamp })),
      { transaction: t }
    );
  });
  otkljucaj(kljuc, userId);
  poruka(res, 200, "Linija je uspjesno azurirana!");
}));

app.post("/api/scenarios/:scenarioId/characters/lock", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const { userId, characterName } = req.body || {};
  const kljuc = `${scenario.id}:${characterName}`;
  if (lockLikova.has(kljuc) && lockLikova.get(kljuc) !== userId) return poruka(res, 409, "Konflikt! Ime lika je vec zakljucano!");
  lockLikova.set(kljuc, userId);
  poruka(res, 200, "Ime lika je uspjesno zakljucano!");
}));

app.post("/api/scenarios/:scenarioId/characters/update", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const { userId, oldName, newName } = req.body || {};
  if (typeof oldName !== "string" || typeof newName !== "string" || !oldName) return poruka(res, 400, "Neispravni podaci!");
  const kljuc = `${scenario.id}:${oldName}`;
  if (lockLikova.has(kljuc) && lockLikova.get(kljuc) !== userId) return poruka(res, 409, "Konflikt! Ime lika je vec zakljucano!");

  await sequelize.transaction(async (t) => { // [PROMIJENJENO]
    const linije = await Line.findAll({ where: { scenarioId: scenario.id }, transaction: t });
    for (const l of linije) {
      const novi = l.text.replace(regexImena(oldName), () => newName);
      if (novi !== l.text) await l.update({ text: novi }, { transaction: t });
    }
    await Delta.create({ scenarioId: scenario.id, type: "char_rename", oldName, newName, timestamp: sada() }, { transaction: t });
  });
  lockLikova.delete(kljuc);
  poruka(res, 200, "Ime lika je uspjesno promijenjeno!");
}));

app.get("/api/scenarios/:scenarioId/deltas", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const since = Number(req.query.since) || 0;
  const delte = await Delta.findAll({
    where: { scenarioId: scenario.id, timestamp: { [Op.gt]: since } },
    order: [["timestamp", "ASC"], ["id", "ASC"]],
  });
  res.json({
    deltas: delte.map((d) => d.type === "char_rename"
      ? { type: d.type, oldName: d.oldName, newName: d.newName, timestamp: d.timestamp }
      : { type: d.type, lineId: d.lineId, nextLineId: d.nextLineId, content: d.content, timestamp: d.timestamp }),
  });
}));

// ---------- Verzionisanje: checkpointi ----------
app.post("/api/scenarios/:scenarioId/checkpoint", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  await Checkpoint.create({ scenarioId: scenario.id, timestamp: sada() });
  poruka(res, 200, "Checkpoint je uspjesno kreiran!");
}));

app.get("/api/scenarios/:scenarioId/checkpoints", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const lista = await Checkpoint.findAll({ where: { scenarioId: scenario.id }, order: [["timestamp", "ASC"], ["id", "ASC"]] });
  res.json(lista.map((c) => ({ id: c.id, timestamp: c.timestamp })));
}));

// Rekonstrukcija: početno stanje (jedna prazna linija) + sve delte do vremena checkpointa, hronološki
app.get("/api/scenarios/:scenarioId/restore/:checkpointId", asinhrono(async (req, res) => {
  const scenario = await nadjiScenario(req.params.scenarioId);
  if (!scenario) return poruka(res, 404, "Scenario ne postoji!");
  const cpId = Number(req.params.checkpointId);
  const checkpoint = Number.isInteger(cpId) ? await Checkpoint.findOne({ where: { id: cpId, scenarioId: scenario.id } }) : null;
  if (!checkpoint) return poruka(res, 404, "Checkpoint ne postoji!");

  const delte = await Delta.findAll({
    where: { scenarioId: scenario.id, timestamp: { [Op.lte]: checkpoint.timestamp } },
    order: [["timestamp", "ASC"], ["id", "ASC"]],
  });
  const linije = new Map([[1, { lineId: 1, nextLineId: null, text: "" }]]); // stanje nakon POST /api/scenarios
  for (const d of delte) {
    if (d.type === "line_update") {
      linije.set(d.lineId, { lineId: d.lineId, nextLineId: d.nextLineId, text: d.content ?? "" });
    } else if (d.type === "char_rename") {
      for (const l of linije.values()) l.text = l.text.replace(regexImena(d.oldName), () => d.newName);
    }
  }
  res.json({ id: scenario.id, title: scenario.title, content: uredi([...linije.values()]) });
}));

// Greške (npr. baza nije dostupna) vraćaju JSON umjesto HTML stranice
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: "Greska na serveru!" });
});

module.exports = app;
if (require.main === module) { //server se pokreće tek kad je baza spremna
  const port = process.env.PORT || 3000;
  ready
    .then(() => app.listen(port, () => console.log(`ScenarijPro: http://localhost:${port}`)))
    .catch((e) => { console.error("Ne mogu se spojiti na bazu wt26:", e.message); process.exit(1); });
}