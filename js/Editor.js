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