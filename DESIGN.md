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
| Lavender | `#9d8fd8` | Nav links, tagline, card body |
| Dim lavender | `#7a6fb0` | Blurb, captions, small labels |
| Panel | `#12063a` | Project cards, cassette body |
| Border | `#2a1458` | Card borders, control pads, dividers |
| Hint | `#5a4f90` | Scene status label text |
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
| Name (hero) | `clamp(64px, 8.5vw, 110px)` |
| Card title | `24px` |
| Tagline | `20px` |
| Blurb | `16px` |
| Tags | `16px` |
| Nav links | `15px` |
| Card body | `15px` |
| Wave caption | `14px` |
| Card stack | `13px` |
| Brand (nav) | `12px` |
| Section title (cyan) | `12px` |
| Console label | `12px` |
| Buttons (start / github) | `10px` |
| Section title (pink) | `10px` |
| Foot brand | `9px` |
| Screen bar / card kick | `8px` |
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
