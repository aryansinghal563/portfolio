# Design

The design language for the site. Retro arcade / Gameboy, vaporwave palette, pixel type.

## Colors

### Core palette

| Token | Hex | Where it is used |
|-------|-----|------------------|
| Background | `#0d0221` | Page background |
| Screen | `#07011a` | Console screen, canvas scene background |
| Grid | `#170b38` | Faint grid lines inside scenes |
| Text | `#d1f7ff` | Primary text |
| Pink | `#ff2a6d` | Primary accent, name stroke, section rules |
| Cyan | `#05d9e8` | Secondary accent, links on hover, screen border |
| Magenta | `#ff6ac1` | Tertiary accent, labels |
| Purple | `#9d4edd` | Extra accent |
| Gold | `#f8b800` | Highlights, cassette details |

### Support shades

| Token | Hex | Where it is used |
|-------|-----|------------------|
| Lavender | `#9d8fd8` | Nav links, tagline |
| Dim lavender | `#8b7fca` | Blurb, captions, small labels |
| Panel | `#12063a` | Project cards, cassette body |
| Border | `#2a1458` | Card borders, control pads, dividers |
| Hint | `#7e74bd` | Scene status label text |
| Light gold | `#ffd23f` | Page fold highlight, moon glow |
| Ground dark | `#2a1458` | Anime scene ground |
| Ground light | `#3a1d6e` | Anime scene ground top edge |

## Fonts

All loaded from Google Fonts.

| Font | Role |
|------|------|
| Pixelify Sans | Body default, running text |
| Press Start 2P | Pixel headings, buttons, labels, console UI |
| VT323 | Reading scene quotes |

Fallback for every font is `monospace`.

## Font sizes

| Element | Size |
|---------|------|
| Name (hero) | `clamp(54px, 6.4vw, 86px)` |
| Tagline | `20px` |
| Tags | `16px` |
| Nav links | `15px` |
| Wave caption | `14px` |
| Brand (nav) | `12px` |
| Intent line | `10px` |
| Wave tabs / city chips | `8px` |
| Section title (cyan) | `12px` |
| Console label | `12px` |
| Buttons (start / github) | `10px` |
| Section title (pink) | `10px` |
| Foot brand | `9px` |
| Screen bar | `8px` |
| Scene hint label | `8px` |
| Swap hint / A-B labels | `7px` |
| Select-start labels | `6px` |

## Spacing and layout

| Token | Value |
|-------|-------|
| Content max width | `1180px` |
| Content side padding | `34px` (desktop), `18px` (under 480px) |
| Console width | `452px` |
| Screen stage | `356px` wide, `300px` min height |
| Section rule | `2px solid #ff2a6d` |

## Breakpoints

| Width | What changes |
|-------|--------------|
| `860px` | Hero stacks to one column, projects go single column |
| `560px` | Nav and footer wrap and center |
| `480px` | Tighter padding, smaller name, grid effect shrinks |

## Motion

| Animation | Use |
|-----------|-----|
| `snapIn` | Each name letter pops in on load |
| `fillSweep` | Pink fill sweeps across the name after it lands |
| `cartIn` | Console scene fades in on cartridge swap |
| `blink` | Cursor blink |

Canvas scenes run their own animation loops on `requestAnimationFrame`.

## Pixel scenes

Every console scene draws on a `#07011a` background with `#170b38` grid lines and uses only the core palette. Blocks are drawn with a light top-left edge (`rgba(255,255,255,.28)`) and a dark bottom-right edge (`rgba(0,0,0,.4)`) to give them depth.

## Aryan City

`<voxel-city>` is a real 3D model of a city, orbitable and zoomable, standing in
for the old project cards. Three files, split so the content survives a change
of renderer:

| File | Holds |
| --- | --- |
| `js/city-data.js` | The palette, the plate size, the roads, and the twelve landmarks with all their copy. No three.js. |
| `js/city-voxels.js` | Geometry builders. Takes a landmark, returns merged buffer geometry. No DOM, no scene. |
| `js/city3d.js` | The custom element: scene, camera, input, labels, panel. |

three.js r0.180 loads from a CDN through an import map. There is no build step.

**Look.** Chunky grid-snapped boxes under an orthographic camera on the true
isometric elevation, `normalize(1, 1/sqrt2, 1)`, so the diorama reads the same
as the flat version it replaces until you orbit it. Boxes are arbitrary sizes
rather than literal 1x1 voxels, which keeps the model cheap: the whole city is
40 draw calls and about 24,000 triangles.

Colour is baked into vertices, not materials, so everything merges. Each
landmark reduces to at most two meshes, one `MeshLambertMaterial` for solids and
one unlit `MeshBasicMaterial` for windows, screens and neon, which is what makes
lit surfaces read as glowing at night. `paint()` also darkens vertices near the
ground, a cheap stand-in for a shadow map. The skyline is seeded (`mulberry`,
1337) so it is identical on every load.

**Plate.** A square plate projects to a diamond whose four points are always
empty, so the ground is laid as strips with the corners chamfered off
(`CHAMFER` in `city-data.js`). Everything that is not a landmark is scattered at
import time by `city-data.js` itself: it enumerates the free half-cells of the
plate once, shuffles them with a fixed-seed LCG, then walks that list placing
what fits and claiming the space. Enumerate-then-shuffle rather than reject
sampling, because only about a quarter of the plate is free and uniform
sampling threw away more than ninety-nine tries in a hundred. That yields
roughly 25 filler blocks, 100 props and 14 cars, all deterministic.

`tools/layout.mjs` audits the twelve hand-placed landmarks: on the plate, out of
the water, off the roads, not overlapping, and not completely burying each
other.

**Depth.** Under this camera screen-x is proportional to `x - z` and distance
toward the viewer to `x + z`, so a landmark with a larger `x + z` occludes what
is behind it. This is a layout constraint, not a detail. The bay was originally
on the far edge of the plate and the entire cargo ship rendered behind the two
tallest towers; it now sits in the near corner, where nothing can get in front
of it. `tools/layout.mjs` checks for the same mistake, comparing projected
screen rectangles rather than raw heights, because a far-back object is lifted
up the frame by distance alone.

**Water.** The harbour is cut out of the near corner (`WATER` in
`city-data.js`), and the ground loop splits each strip into a land half and a
sea half. The rock skirt under the land has to stop *below* grade rather than at
it, or it quietly buries the whole bay.

**Motion.** A landmark can return named animated parts and `city3d.js` binds
them without knowing what they are: `spin` (the crane jib, the ferris wheel),
`screen` (the billboard flicker), `beacons` (pulsing spheres), and `float`,
which bobs and rolls the cargo ship on the swell. A `float` part is built around
its own origin and dropped into a group that is then moved, the same trick as
`spin`.

**Stage.** The diorama projects about 1.31 times as wide as it is tall, so the
stage is sized from that ratio rather than from the viewport. On a wide screen
the width is tied to the height (`min(100%, 118vh, 1180px)`), because a stage
wider than the subject only adds margin and shrinks the city. Below 900px the
opposite applies and the height is tied to the width (`min(104vw, 76vh, 620px)`)
so a portrait stage does not leave the city floating in the top half.

**Framing.** Nothing is hand-tuned. `_frameScene()` measures every mesh in the
camera's own axes and derives the frustum from that, so the city fits whatever
the stage is. Clicking a landmark flies the camera to it over 780ms, keeping
whatever angle you had orbited to, and on a wide screen aims off-centre so the
subject lands clear of the info panel. A landmark may override both the label
anchor and the fly-in target with `pin` and `pinR`: the person on the bench sits
in one corner of an 18x18 lawn, so framing the park's bounding box put the one
thing worth flying to at about fifteen pixels.

**Discovery.** Every landmark carries an HTML label projected over the canvas
each frame. They are real buttons, so on a phone you can see and tap what is
there without hovering anything, which the flat version required.

Twelve fixed tags collide the moment the stage narrows, so `_placeLabels()` runs
a small 2D relaxation each frame: each tag is pulled toward the column above its
landmark and pushed off any tag it overlaps, separating on the axis of least
movement with a bias toward vertical. The connector is an SVG leader line drawn
from the tag's bottom edge to the anchor, not a strut under the tag, because the
relaxation moves a tag sideways as well as up. Below 620px each landmark swaps
to its `short` label, and below 900px the muted tags hide entirely once you have
flown in, since ten of them pile over the subject you just asked to look at.

**Touch.** The canvas starts inert behind a "tap to explore" veil so the page
still scrolls past it. Tapping the veil enables the controls and sets
`touch-action: none`; a "done" button hands the gestures back. Labels stay
tappable either way.

**Bailouts.** No WebGL renders the same twelve landmarks as a plain list.
`prefers-reduced-motion` stops the idle animation and makes the fly-in instant.
The render loop only runs while the section is on screen and the tab is visible.
