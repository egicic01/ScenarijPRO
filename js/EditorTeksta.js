const EditorTeksta = function (divRef) {
  if (!divRef || divRef.tagName !== "DIV") {
    throw new Error("Pogresan tip elementa!");
  }
  if (divRef.getAttribute("contenteditable") !== "true") {
    throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
  }

  // ---------- Pomoćne funkcije ----------
  const BLOK_ELEMENTI = new Set(["DIV", "P", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE"]);
  const NASLOV_SCENE = /^(INT|EXT)\..*[-–]\s(DAY|NIGHT|AFTERNOON|MORNING|EVENING)\b/;
  const imaSlovo = (t) => /\p{L}/u.test(t);

  const jeBold = (el) => {
    if (el.tagName === "B" || el.tagName === "STRONG") return true;
    const w = el.style && el.style.fontWeight;
    return w === "bold" || w === "bolder" || Number(w) >= 600;
  };
  const jeItalic = (el) =>
    el.tagName === "I" || el.tagName === "EM" || (el.style && el.style.fontStyle === "italic");

  const jeSveVelikim = (t) => imaSlovo(t) && t === t.toUpperCase();
  const jeNaslovScene = (t) => jeSveVelikim(t) && NASLOV_SCENE.test(t);
  const jeImeUloge = (t) => /^[\p{L} ]+$/u.test(t) && jeSveVelikim(t);
  const jeUZagradi = (t) => t.includes("(") && t.replace(/\([^()]*\)/g, "").trim() === "";
  const jeGovor = (t) => t !== "" && !jeUZagradi(t) && !jeSveVelikim(t);
  const normaliziraj = (t) => t.trim().replace(/\s+/g, " ");

  // Ime uloge vrijedi samo ako ispod njega (preskačući linije u zagradama) slijedi govor
  const slijediGovor = (linije, j) => {
    while (j < linije.length && jeUZagradi(linije[j])) j++;
    return j < linije.length && jeGovor(linije[j]);
  };

  const razlika = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  const slicna = (a, b) => {
    const duga = a.replace(/ /g, "").length > 5 && b.replace(/ /g, "").length > 5;
    return razlika(a, b) <= (duga ? 2 : 1);
  };

  // ---------- Čitanje sadržaja iz DOM-a ----------
  // Vraća linije; svaka linija je niz znakova {ch, b, i} (b/i = boldiran/italic)
  const ucitajLinije = () => {
    const linije = [];
    let tren = [];
    const nova = () => { linije.push(tren); tren = []; };
    const zavrsi = () => { if (tren.length) nova(); };

    const obidji = (cvor, b, i) => {
      cvor.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          const t = n.data;
          const p = n.previousSibling, s = n.nextSibling;
          const izmedjuBlokova = (p && BLOK_ELEMENTI.has(p.tagName)) || (s && BLOK_ELEMENTI.has(s.tagName));
          if (!t.trim() && t.includes("\n") && izmedjuBlokova) return; // formatiranje HTML koda
          for (const ch of t) {
            if (ch === "\n") nova();
            else if (ch !== "\r") tren.push({ ch, b, i });
          }
        } else if (n.nodeType === 1) {
          if (n.tagName === "BR") { nova(); return; }
          const blok = BLOK_ELEMENTI.has(n.tagName);
          if (blok) zavrsi();
          obidji(n, b || jeBold(n), i || jeItalic(n));
          if (blok) zavrsi();
        }
      });
    };
    obidji(divRef, false, false);
    zavrsi();
    return linije;
  };

  // Riječ: niz znakova bez razmaka, zareza i tačke koji sadrži barem jedno slovo
  const izdvojiRijeci = (znakovi) => {
    const rijeci = [];
    let rijec = [];
    const kraj = () => {
      if (rijec.length && rijec.some((c) => imaSlovo(c.ch)))
        rijeci.push({ b: rijec.every((c) => c.b), i: rijec.every((c) => c.i) });
      rijec = [];
    };
    for (const c of znakovi) {
      if (/[\s,.]/.test(c.ch)) kraj();
      else rijec.push(c);
    }
    kraj();
    return rijeci;
  };

  // ---------- Parsiranje strukture scenarija ----------
  // scene -> dijalog-segmenti -> blokovi govora {uloga, linije}
  const parsiraj = () => {
    const linije = ucitajLinije().map((l) => l.map((c) => c.ch).join("").trim());
    const scene = [];
    const uloge = [];
    const pojave = new Map();
    let scena = { naslov: "", segmenti: [], brojReplika: 0 };
    let segment = null;
    scene.push(scena);

    const zabiljezi = (ime) => {
      if (!pojave.has(ime)) { pojave.set(ime, 0); uloge.push(ime); }
      pojave.set(ime, pojave.get(ime) + 1);
    };

    let i = 0;
    while (i < linije.length) {
      const t = linije[i];
      if (jeNaslovScene(t)) {
        scena = { naslov: t, segmenti: [], brojReplika: 0 };
        scene.push(scena);
        segment = null;
        i++;
      } else if (jeImeUloge(t) && slijediGovor(linije, i + 1)) {
        const ime = normaliziraj(t);
        const blok = { uloga: ime, linije: [], pozicija: ++scena.brojReplika };
        if (!segment) { segment = []; scena.segmenti.push(segment); }
        segment.push(blok);
        zabiljezi(ime);
        i++;
        while (i < linije.length) {
          const l = linije[i];
          if (jeUZagradi(l)) i++;
          else if (jeGovor(l)) { blok.linije.push(l); i++; }
          else if (jeImeUloge(l) && normaliziraj(l) === ime && slijediGovor(linije, i + 1)) { zabiljezi(ime); i++; }
          else break;
        }
      } else {
        if (t !== "" && !jeUZagradi(t)) segment = null; // akcijski segment prekida dijalog
        i++;
      }
    }
    return { scene, uloge, pojave };
  };

  // ---------- Javne metode ----------
  const dajBrojRijeci = () => {
    const rez = { ukupno: 0, boldiranih: 0, italic: 0 };
    ucitajLinije().forEach((l) =>
      izdvojiRijeci(l).forEach((r) => {
        rez.ukupno++;
        if (r.b) rez.boldiranih++;
        if (r.i) rez.italic++;
      })
    );
    return rez;
  };

  const dajUloge = () => [...parsiraj().uloge];

  const pogresnaUloga = () => {
    const { uloge, pojave } = parsiraj();
    return uloge.filter((a) =>
      uloge.some((b) => b !== a && slicna(a, b) && pojave.get(b) >= 4 && pojave.get(b) - pojave.get(a) >= 3)
    );
  };

  const brojLinijaTeksta = (uloga) => {
    const ime = normaliziraj(String(uloga)).toUpperCase();
    let broj = 0;
    parsiraj().scene.forEach((s) =>
      s.segmenti.forEach((seg) => seg.forEach((b) => { if (b.uloga === ime) broj += b.linije.length; }))
    );
    return broj;
  };

  const scenarijUloge = (uloga) => {
    const ime = normaliziraj(String(uloga)).toUpperCase();
    const prikaz = (b) => (b ? { uloga: b.uloga, linije: [...b.linije] } : null);
    const rez = [];
    parsiraj().scene.forEach((s) =>
      s.segmenti.forEach((seg) =>
        seg.forEach((b, k) => {
          if (b.uloga !== ime) return;
          rez.push({
            scena: s.naslov,
            pozicijaUTekstu: b.pozicija,
            prethodni: prikaz(seg[k - 1]),
            trenutni: prikaz(b),
            sljedeci: prikaz(seg[k + 1]),
          });
        })
      )
    );
    return rez;
  };

  const grupisiUloge = () => {
    const rez = [];
    parsiraj().scene.forEach((s) =>
      s.segmenti.forEach((seg, k) =>
        rez.push({ scena: s.naslov, segment: k + 1, uloge: [...new Set(seg.map((b) => b.uloga))] })
      )
    );
    return rez;
  };

  const formatirajTekst = (komanda) => {
    if (!["bold", "italic", "underline"].includes(komanda)) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    if (!divRef.contains(sel.getRangeAt(0).commonAncestorContainer)) return false;
    // izbjegava nepotrebno ugniježđivanje: ako je tekst već formatiran, ne radi ništa
    if (!document.queryCommandState(komanda)) document.execCommand(komanda, false, null);
    return true;
  };

  return {
    dajBrojRijeci: dajBrojRijeci,
    dajUloge: dajUloge,
    pogresnaUloga: pogresnaUloga,
    brojLinijaTeksta: brojLinijaTeksta,
    scenarijUloge: scenarijUloge,
    grupisiUloge: grupisiUloge,
    formatirajTekst: formatirajTekst,
  };
};