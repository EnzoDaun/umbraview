# Texto da submissão (card P4)

Este arquivo é o texto que vai para a página do projeto no site do Space Apps. Ele está **em
inglês** porque o guia de submissão de 2026 exige inglês na página da submissão e em tudo o que
ela linkar (card E19).

Cada seção abaixo é um bloco para colar num campo da página. Os campos exatos mudam de ano para
ano: pegue o bloco que corresponde ao campo e corte o que não couber no limite de palavras.

Antes de colar, confira o que está marcado com `TODO_PREENCHER`.

---

## High-level summary (~100 palavras)

A crewed landing site near the lunar south pole needs two things at the same time: sunlight, for
power and warmth, and the Earth above the horizon, for a direct radio link. Down there the Sun
circles low over the ground, so a single ridge can hide it for days.

UmbraView answers both questions for any site on the Moon and any date. It builds the real 360°
skyline of the exact spot you pick from NASA's LOLA terrain, then tracks the Sun and the Earth
over that skyline hour by hour and lists the landing windows: the stretches of at least 24 hours
with both of them in view at once. Everything runs in the browser, with no server.

---

## Project details

### The problem

Artemis III will land near the lunar south pole, and the candidate regions announced by NASA are
all within a few degrees of it. That is where the ice is, and it is also the hardest place on the
Moon to plan for.

Near the pole the Sun never climbs far above the horizon: it circles the sky almost parallel to
the ground, once every 29.53 days. A ridge a few kilometres away, only a couple of degrees high
as seen from the surface, is enough to put a site in darkness for days while a neighbouring spot
a few kilometres north stays lit. The Earth has the same problem. The Moon keeps one face toward
us, so from any given site the Earth barely moves — it only wobbles a few degrees around a fixed
spot as the Moon's orbit carries it (libration). Near the pole that wobble is enough to drop the
Earth behind the terrain, and with it the direct radio link.

So "is there sunlight here?" and "can I talk to Earth from here?" are not questions about
latitude and date. They are questions about the shape of the ground around that specific spot.

### What UmbraView does

Pick any point on the Moon — click it on the globe, or choose one of the known landing sites —
and a date. UmbraView then shows:

- **The site's real horizon**, drawn in 360°: the elevation of the terrain in every direction as
  seen by an observer 2 m above the ground.
- **The Sun and the Earth over that horizon**, hour by hour for 30 days, drawn solid where they
  are visible and dashed where the terrain hides them.
- **The landing windows**: every stretch of at least 24 hours in a row with both the Sun and the
  Earth above that horizon at the same time, plus the next sunset and the longest darkness in the
  period.
- **A map of the whole Moon** showing every place that has such a window on that date, computed
  on a 5 km grid south of 84°S and a 61 km grid everywhere else.
- **The 3D scene** that all of this comes from: the Moon with NASA's real colour and terrain, lit
  by the Sun of the chosen date, with the shadows the mountains actually cast, over the real star
  field; and an Earth–Moon–Sun view with the real orbits, tilts and libration, so you can see why
  the Sun grazes the poles in the first place.

### What makes it different

The answer comes from the terrain, not from an idealized horizon.

Most of the hard work happens before the site is even picked: the elevation models are turned
into a horizon profile for each point — the angle of the highest obstacle in each of 360
directions — and that profile is what the Sun and the Earth are compared against. A flat-horizon
calculation would say the Sun is up; UmbraView says whether the ridge in front of you lets you
see it.

The second difference is that it is *fast and local*. The whole thing is a static site: the
terrain is pre-processed into compact binary tiles, and every calculation — ephemerides, horizon,
windows, the whole-Moon map — runs in the visitor's browser, with the map in a Web Worker. There
is no server to pay for and nothing to install, so the tool stays usable long after the hackathon
weekend.

> **TODO_PREENCHER** — comparação com as ferramentas que já existem (NASA Moon Trek, LROC
> QuickMap): card P5 do backlog. Enquanto a comparação não for feita e conferida, não escreva na
> submissão o que essas ferramentas fazem ou deixam de fazer.

### How it works

1. **Terrain.** NASA's LOLA polar elevation models (80 m/pixel for the south pole, 240 m for the
   wider polar area) and the global LOLA GDR are read with `rasterio`, re-projected where needed,
   and written as compact binary tiles that the browser streams on demand.
2. **Horizon.** For a chosen point, the engine walks outward in 360 directions and keeps the
   largest elevation angle found along each one. That is the site's skyline.
3. **Sun and Earth.** Positions come from the Moon's orbit and rotation (IAU model, via
   Astronomy Engine), converted into the site's local frame.
4. **Visibility and windows.** Each hour, the engine compares the altitude of the Sun and of the
   Earth with the horizon in their azimuth, and groups the hours when both are above it.

### How we checked it

- Positions agree with **NASA JPL's SPICE** kernels to within 0.01°.
- The polar projection agrees with **pyproj**.
- The fraction of time the Sun and the Earth are visible was compared against **NASA's average
  visibility maps** (Mazarico et al., 2011) for the same points.
- 598 automated tests run on every pull request, together with the lint and the build.

### NASA data we used

| Data | What it does here |
|---|---|
| LOLA polar elevation models `LDEM_80S_80MPP_ADJ` and `LDEM_60S_240MPP_ADJ` (NASA GSFC) | The horizon of every site near the south pole — the core of the product |
| LOLA global elevation (GDR, NASA PDS) | The horizon everywhere else on the Moon |
| *CGI Moon Kit* (NASA SVS, from LROC and LOLA) | The colour and relief of the Moon in the 3D scene |
| Average Sun/Earth visibility maps `AVGVISIB_85S_060M` and `AVGVISIB_65S_240M` (NASA GSFC) | Reference we checked our own results against |
| *Blue Marble* (NASA GSFC SVS) | The Earth in the Earth–Moon–Sun view |
| Artemis III candidate regions (NASA RELEASE 22-089; names from NASA NTRS 20250011660) | The sites offered in the list |
| IM-2 *Athena* landing site and time (NASA mission blog, LROC imagery) | A real landing in the list, for comparison |
| Moon Fact Sheet and Earth Fact Sheet (NASA NSSDC) | The sidereal and synodic periods used in the explanations and in the orbit view |
| SPICE kernels (NASA/JPL NAIF) | Validation of our positions (not shipped with the site) |

Non-NASA sources: the Artemis region outlines (USGS, CC0 1.0), the HYG star catalogue (CC BY-SA
4.0) for the star field, and the open-source libraries listed in
[CREDITS.md](../CREDITS.md), which also records the licence of every item above.

This material includes data provided by NASA. No conclusion presented here necessarily represents
the view of NASA, and the project is not endorsed by it.

### Use of artificial intelligence

We used **Claude (Anthropic)** throughout the project: to research the data sources, to write and
review code and tests, to write documentation, and to generate the project logo. Every output was
read, tested and accepted by a member of the team before it entered the repository; the commit
history is the team's, and no commit is signed by the AI.

The logo is the only AI-generated *image* in the project, and the site labels it as such in the
footer. The full statement is in [docs/uso-de-ia.md](uso-de-ia.md).

> **TODO_PREENCHER** — se o vídeo usar imagem, música ou narração feita com IA, a marca tem de
> aparecer no próprio vídeo, e a linha correspondente entra aqui (cards V3 e V4).

### The team

Umbra Team — **TODO_PREENCHER** (confirme a lista e o papel de cada um antes de colar; o
histórico do Git tem Enzo Daun, Marco A. Lonardon Jr., Mateus Berlingieri Lusvarghi e Miguel
Ribas Berlese).

### Links

- Live site: https://enzodaun.github.io/umbraview/
- Source code: https://github.com/EnzoDaun/umbraview
- Data sources and licences: [CREDITS.md](../CREDITS.md)
- Use of AI: [docs/uso-de-ia.md](uso-de-ia.md)
- Challenge page: **TODO_PREENCHER** (o endereço da página do *Lunar Landing Site Navigator* no
  site do Space Apps)

---

## Short paragraph for the code page (README / repository description)

UmbraView shows when the Sun and the Earth are above the real horizon of any site on the Moon.
It builds each site's 360° skyline from NASA's LOLA terrain, tracks the Sun and the Earth over
that skyline hour by hour, and lists the landing windows — the stretches of at least 24 hours
with both in view at once. Built for the *Lunar Landing Site Navigator* challenge of the NASA
Space Apps Challenge 2026 by the Umbra Team. Everything runs in the browser: no server, no
install.
