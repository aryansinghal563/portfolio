<p align="center">
  <img src="assets/portfolio.svg" alt="PORTFOLIO" width="600">
</p>

My personal portfolio. A retro arcade / Gameboy themed site with a bit of personality mixed in (books, anime, music).

## What is on the page

- **ARYAN BOY** — a handheld console that boots with a logo, plays five pixel
  cartridges (skills tetris, music, anime, reading, homelab terminal) and swaps
  them with the d-pad, A/B buttons and keyboard arrows. Renders in 2D canvas,
  or as a 3D handheld when WebGL is available.
- **ARYAN CITY** — a voxel diorama of my work: project houses, internship
  towers, campus, homelab mast and a park bench that is me. Drag to orbit,
  scroll to zoom, click a tag to fly in. Falls back to a plain list with no
  WebGL.
- **SKILL DRIVE** — the stack, as arcade tags.
- **CONTRIBUTION WAVE** — GitHub and LeetCode heatmaps with tabs.

See [DESIGN.md](DESIGN.md) for the full design language and how the city is
laid out, framed and audited.

## Run it

Any static server from the repo root, for example:

```sh
npx serve .
```

or:

```sh
python -m http.server 8000
```

## Check the city layout

```sh
node tools/layout.mjs
```

Audits the hand-placed landmarks: on the plate, out of the water, off the
roads, no overlaps, and nothing tall completely burying something shorter.
