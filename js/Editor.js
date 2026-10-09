const div = document.getElementById("divEditor");
const editor = EditorTeksta(div);
const poruke = document.getElementById("poruke");
const ulogaInput = document.getElementById("ulogaInput");

const ispisi = (tekst) => { poruke.textContent = tekst; };
const json = (o) => JSON.stringify(o, null, 2);
const trazenaUloga = () => ulogaInput.value.trim();

const akcije = {
  rijeci: () => {
    const r = editor.dajBrojRijeci();
    return `Ukupno riječi: ${r.ukupno}\nBoldiranih: ${r.boldiranih}\nItalic: ${r.italic}`;
  },
  uloge: () => {
    const u = editor.dajUloge();
    return u.length ? `Uloge: ${u.join(", ")}` : "U tekstu nema uloga.";
  },
  pogresne: () => {
    const u = editor.pogresnaUloga();
    return u.length ? `Potencijalno pogrešna imena: ${u.join(", ")}` : "Nema potencijalno pogrešnih imena uloga.";
  },
  linije: () => {
    const uloga = trazenaUloga();
    if (!uloga) return "Unesite ime uloge.";
    return `${uloga.toUpperCase()} ima ${editor.brojLinijaTeksta(uloga)} linija teksta.`;
  },
  scenarij: () => {
    const uloga = trazenaUloga();
    if (!uloga) return "Unesite ime uloge.";
    const s = editor.scenarijUloge(uloga);
    return s.length ? json(s) : `Uloga ${uloga.toUpperCase()} ne postoji u scenariju.`;
  },
  grupe: () => {
    const g = editor.grupisiUloge();
    return g.length ? json(g) : "U tekstu nema dijaloga.";
  },
};

document.querySelectorAll("[data-akcija]").forEach((dugme) =>
  dugme.addEventListener("click", () => ispisi(akcije[dugme.dataset.akcija]()))
);

document.querySelectorAll("[data-format]").forEach((dugme) => {
  // mousedown ne smije oduzeti fokus editoru, inače se izgubi selekcija
  dugme.addEventListener("mousedown", (e) => e.preventDefault());
  dugme.addEventListener("click", () => {
    const uspjeh = editor.formatirajTekst(dugme.dataset.format);
    ispisi(uspjeh ? "Formatiranje primijenjeno." : "Označite tekst unutar editora da biste ga formatirali.");
  });
});

// Spirala 3

// Editor se puni sa servera. Svaka linija scenarija je jedan <div data-line-id="...">.
// Klik na liniju je zaključava, prelazak na drugu liniju spašava izmjene prethodne,
// Enter dijeli liniju, a dugme "Spasi" spašava trenutnu liniju.
const parametri = new URLSearchParams(window.location.search);
const imaIdUAdresi = parametri.has("id");
let scenarioId = Number(parametri.get("id")) || 1;
let userId = Number(sessionStorage.getItem("userId")); // svaki tab = poseban korisnik
if (!userId) {
  userId = Math.floor(Math.random() * 1000000) + 1;
  sessionStorage.setItem("userId", userId);
}
 
let aktivnaLinija = null; // linija koju je ovaj korisnik zaključao
let zadnjaLinija = null;  // zadnja linija za koju je pokušano zaključavanje
let ucitano = false;
let zadnjiSince = Math.floor(Date.now() / 1000);
 
const tekstLinije = (el) => el.textContent.replace(/\u00a0/g, " ");
const linijaOd = (cvor) => {
  if (cvor && cvor.nodeType === 3) cvor = cvor.parentNode;
  return cvor && div.contains(cvor) && cvor.closest ? cvor.closest("[data-line-id]") : null;
};
const pozicijaKursora = (el) => {
  const sel = window.getSelection();
  const opseg = document.createRange();
  opseg.selectNodeContents(el);
  opseg.setEnd(sel.focusNode, sel.focusOffset);
  return opseg.toString().length;
};
const nadjiLiniju = (id) => div.querySelector(`[data-line-id="${id}"]`);
 
function prikaziScenarij(scenario) {
  aktivnaLinija = null;
  zadnjaLinija = null;
  document.querySelector(".doc-title").textContent = scenario.title;
  div.innerHTML = "";
  scenario.content.forEach((l) => {
    const el = document.createElement("div");
    el.className = "linija";
    el.dataset.lineId = l.lineId;
    if (/^(INT|EXT)\./.test(l.text)) el.classList.add("scene-heading");
    if (l.text) el.textContent = l.text;
    else el.appendChild(document.createElement("br"));
    div.appendChild(el);
  });
  ucitano = true;
}
 
const istoKaoPrikaz = (scenario) => {
  const elementi = [...div.children];
  return elementi.length === scenario.content.length &&
    scenario.content.every((l, i) => Number(elementi[i].dataset.lineId) === l.lineId && tekstLinije(elementi[i]) === l.text);
};
 
function fokusiraj(id) {
  const el = nadjiLiniju(id);
  if (!el) return;
  div.focus();
  const opseg = document.createRange();
  opseg.selectNodeContents(el);
  opseg.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(opseg);
}
 
// Učitaj stanje sa servera; prikaz se mijenja samo ako se razlikuje od trenutnog
function osvjezi(poslije) {
  PoziviAjaxFetch.getScenario(scenarioId, (status, scenario) => {
    if (status === 200 && !istoKaoPrikaz(scenario)) prikaziScenarij(scenario);
    if (poslije) poslije();
  });
}
 
function zakljucajPoId(id) {
  const el = nadjiLiniju(id);
  if (!el) return;
  PoziviAjaxFetch.lockLine(scenarioId, id, userId, (status, odgovor) => {
    if (status === 200 && div.contains(el)) {
      aktivnaLinija = el;
      el.dataset.original = tekstLinije(el);
      el.classList.add("aktivna");
    } else if (status !== 200) {
      ispisi(odgovor.message);
    }
  });
}
 
// Spašava liniju (server je i otključava), pa osvježi prikaz zbog mogućeg prelamanja
function sacuvaj(el, poslije) {
  el.classList.remove("aktivna");
  PoziviAjaxFetch.updateLine(scenarioId, Number(el.dataset.lineId), userId, [tekstLinije(el)], (status, odgovor) => {
    if (status !== 200) ispisi(odgovor.message);
    osvjezi(poslije);
  });
}
 
function prijedjiNa(id) {
  const stara = aktivnaLinija;
  aktivnaLinija = null;
  const dalje = () => zakljucajPoId(id);
  if (!stara) return dalje();
  if (tekstLinije(stara) !== stara.dataset.original) sacuvaj(stara, dalje);
  else { stara.classList.remove("aktivna"); osvjezi(dalje); }
}
 
document.addEventListener("selectionchange", () => {
  if (!ucitano) return;
  const el = linijaOd(window.getSelection().anchorNode);
  if (!el || el === zadnjaLinija) return;
  zadnjaLinija = el;
  prijedjiNa(Number(el.dataset.lineId));
});
 
// Samo zaključana linija se smije uređivati, a linije se ne smiju spajati brisanjem
div.addEventListener("beforeinput", (e) => {
  if (!ucitano) return;
  const sel = window.getSelection();
  const el = linijaOd(sel.anchorNode);
  const dozvoljeno = el && el === aktivnaLinija && linijaOd(sel.focusNode) === el;
  let spajanje = false;
  if (dozvoljeno && sel.isCollapsed) {
    const poz = pozicijaKursora(el);
    spajanje = (e.inputType === "deleteContentBackward" && poz === 0) ||
      (e.inputType === "deleteContentForward" && poz === tekstLinije(el).length);
  }
  if (!dozvoljeno || spajanje) {
    e.preventDefault();
    if (!dozvoljeno) ispisi("Linija nije zaključana za uređivanje. Odaberite drugu liniju ili pričekajte.");
  }
});
 
div.addEventListener("paste", (e) => {
  e.preventDefault();
  document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
});
 
// Enter dijeli liniju na mjestu kursora; nova linija se odmah zaključava
div.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !ucitano) return;
  e.preventDefault();
  const el = aktivnaLinija;
  if (!el) return ispisi("Linija nije zaključana za uređivanje.");
  const id = Number(el.dataset.lineId);
  const tekst = tekstLinije(el);
  const poz = pozicijaKursora(el);
  aktivnaLinija = null;
  PoziviAjaxFetch.updateLine(scenarioId, id, userId, [tekst.slice(0, poz), tekst.slice(poz)], (status, odgovor) => {
    if (status !== 200) return ispisi(odgovor.message);
    PoziviAjaxFetch.getScenario(scenarioId, (s, scenario) => {
      if (s !== 200) return;
      prikaziScenarij(scenario);
      const sljedeca = scenario.content[scenario.content.findIndex((l) => l.lineId === id) + 1];
      if (sljedeca) fokusiraj(sljedeca.lineId);
    });
  });
});
 
document.querySelector(".save").addEventListener("click", () => {
  const el = aktivnaLinija;
  if (!el || tekstLinije(el) === el.dataset.original) return ispisi("Nema izmjena za spašavanje.");
  aktivnaLinija = null;
  sacuvaj(el, () => { zakljucajPoId(Number(el.dataset.lineId)); ispisi("Spašeno."); });
});
 
// Svake 3 sekunde provjeri da li je netko drugi mijenjao scenarij
setInterval(() => {
  if (!ucitano) return;
  PoziviAjaxFetch.getDeltas(scenarioId, zadnjiSince, (status, odgovor) => {
    if (status !== 200 || !odgovor.deltas.length) return;
    zadnjiSince = Math.max(...odgovor.deltas.map((d) => d.timestamp));
    if (!aktivnaLinija) osvjezi();
  });
}, 3000);
 
// Početno učitavanje: bez ?id= u adresi koristi se scenarij 1 (kreira se ako ne postoji)
PoziviAjaxFetch.getScenario(scenarioId, (status, scenario) => {
  if (status === 200) return prikaziScenarij(scenario);
  if (status === 404 && !imaIdUAdresi) {
    return PoziviAjaxFetch.postScenario("Neimenovani scenarij", (s, novi) => {
      if (s !== 200) return;
      scenarioId = novi.id;
      history.replaceState(null, "", `?id=${novi.id}`);
      prikaziScenarij(novi);
    });
  }
  ispisi(status === 404 ? "Scenarij ne postoji." : "Server nije dostupan. Prikazan je primjer teksta.");
});