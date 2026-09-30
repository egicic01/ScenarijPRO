# Faza 1: Statični interfejs

**Status:** gotovo

## Cilj
Izraditi tri stranice aplikacije samo pomoću HTML5 i CSS3, bez JavaScripta i UI frameworka, s naglaskom na čist kod i bez ponavljanja CSS-a.

## Stranice

| Stranica | Sadržaj |
|---|---|
| `html/projects.html` | Sidebar (250px), zaglavlje s pretragom, grid kartica scenarija (2 kolone, 1 na mobilnom), kartica za kreiranje novog scenarija |
| `html/writing.html` | Sticky zaglavlje s alatima, lista scena s brojem stranica, editor u obliku papira, Courier Prime font |
| `html/user.html` | Forma postavki s tri sekcije, labele pored polja na velikim ekranima i iznad njih ispod 750px |

## Tehničke odluke
- Zajednički design tokeni i reset u `css/common.css`
- Semantički HTML i pristupačnost (`aria-*`, vidljiv fokus, `prefers-reduced-motion`)
- Numeracija scena preko CSS countera, ikonice kao inline SVG
- Prelom na 750px na sve tri stranice
- Hover stanja prema specifikaciji (sjene, boje, postepen prijelaz na dugmetu "Spasi")

## Pokretanje
Otvorite `html/projects.html` u pregledniku.
