---
name: Mosaic Maker
description: Private, in-browser photomosaic creation on a sprite workbench, dark or light
colors:
  sprite-gold: "#ffcf3f"
  bench-ink: "#16130a"
  workbench: "#12141c"
  cell-face: "#1a1e2a"
  cell-chrome: "#232939"
  cell-chrome-hover: "#2e374c"
  keyline: "#2a3040"
  gridline: "#20263a"
  sprite-ink: "#e8eaf2"
  bench-muted: "#9aa3b8"
  rack-ink: "#dfe4f2"
  signal-coral: "#ff5d73"
  coral-field: "#2e1a22"
  signal-teal: "#3ec6a8"
  readout-blue: "#5b8cff"
  gold-soft: "#2b2613"
  gold-hover: "#ffde70"
colorsLight:
  sprite-gold: "#8a6100"
  bench-ink: "#fffdf5"
  workbench: "#eceef3"
  cell-face: "#fbfbfd"
  cell-chrome: "#e3e6ee"
  cell-chrome-hover: "#d5dae6"
  keyline: "#c9cedb"
  gridline: "#dde1e9"
  sprite-ink: "#1b1e28"
  bench-muted: "#5c6478"
  rack-ink: "#1b2130"
  signal-coral: "#cf1c3f"
  coral-field: "#fde7ea"
  signal-teal: "#0b7a63"
  readout-blue: "#2f5fd0"
  gold-soft: "#fbf0d6"
  gold-hover: "#6f4e00"
typography:
  display:
    fontFamily: '"Press Start 2P", monospace'
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  none: "0px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.sprite-gold}"
    textColor: "{colors.bench-ink}"
    rounded: "{rounded.none}"
    padding: "0.65rem 1rem"
  button-secondary:
    backgroundColor: "{colors.cell-chrome}"
    textColor: "{colors.rack-ink}"
    rounded: "{rounded.none}"
    padding: "0.65rem 1rem"
  button-outline:
    textColor: "{colors.sprite-gold}"
    rounded: "{rounded.none}"
    padding: "0.65rem 1rem"
  stage-cell:
    backgroundColor: "{colors.cell-face}"
    textColor: "{colors.sprite-ink}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  stage-cell-current:
    backgroundColor: "{colors.cell-face}"
    textColor: "{colors.sprite-gold}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  card:
    backgroundColor: "{colors.cell-face}"
    rounded: "{rounded.none}"
    padding: "1.25rem"
  field:
    backgroundColor: "{colors.cell-face}"
    textColor: "{colors.sprite-ink}"
    rounded: "{rounded.none}"
    padding: "0.65rem 0.75rem"
---

# Design System: Mosaic Maker

## Overview

**Creative North Star: "The Sprite Workbench"**

Mosaic Maker is a maker's bench under a construction grid. The user's photo is the only bright thing on the bench: everything else — the field, the rack of stage cells, the controls — recedes into near-black chrome so imagery leads and colors can be judged honestly. The output of the product is a grid of pixels, so the interface speaks the same language: visible cells, hard 1px keylines, square counters, and a strict five-color sprite palette where each color has exactly one job.

The bench is dark by default, because the real usage scene is a person at home comparing colors and judging an image, and image work happens against a dark field. A light bench ships beside it for bright rooms and astigmatism: same palette roles, same three tonal steps, values re-cut for contrast. The OS chooses until the footer switch pins one. There are no shadows and no rounded corners anywhere — depth is expressed as flat elevation steps between cell faces, and the only motion signature is the generation progress rendered as sprite cells filling row by row.

**Key Characteristics:**
- Near-black workbench field (#12141c, light #eceef3) under a faint 1px construction grid (2rem cells)
- Strict sprite palette: gold = action, teal = success/progress, coral = alert, blue = informational readouts
- Hard 1px keylines, zero radius, zero shadows; elevation is tonal steps only
- Pixel display face (Press Start 2P, self-hosted) for identity moments; system-ui workhorse body; monospace for numeric readouts
- Cell-based signatures: stage rack cells, sprite-cell progress, construction-grid overlay driven by tessera size

## Colors

A five-role sprite palette on a near-black field; every color has one job and never borrows another's.

### Primary
- **Sprite Gold** (#ffcf3f): The one action color. Primary buttons, the current stage's keyline and ink, the nameplate. Ink on gold is #16130a (bench-ink). Hover #ffde70; soft field #2b2613.

### Secondary
- **Cell Chrome** (#232939): Secondary buttons and resting rack cells' hover. Ink on it is #dfe4f2 (rack-ink).

### Tertiary
- **Signal Teal** (#3ec6a8): success states, filled progress cells, completed-stage keylines, the privacy note.
- **Signal Coral** (#ff5d73): alerts and invalid states on its soft field #2e1a22.
- **Readout Blue** (#5b8cff): informational monospace readouts (grid cell counts, dimensions).

### Neutrals
- **Workbench** (#12141c) field · **Cell Face** (#1a1e2a) surfaces · **Keyline** (#2a3040) borders · **Gridline** (#20263a) the faint construction grid · **Sprite Ink** (#e8eaf2) body text · **Bench Muted** (#9aa3b8) secondary text.

### Light mode
Every token is one `light-dark()` pair, so the whole world follows the used `color-scheme` on `<html>`; nothing else knows which scheme is active. The light values (`colorsLight` above) deepen the gold, teal and coral to keep 4.5:1 on the light field, invert the three tonal steps (field #eceef3 → cell face #fbfbfd → chrome #e3e6ee) and flip the ink on gold to near-white. Imagery keeps its dark scrims in both schemes: a photo is judged against a dark surround.

## Typography

- **Display**: "Press Start 2P", self-hosted (`public/fonts/`), reserved for identity moments — the nameplate. It is a pixel face used at small display sizes; never body copy.
- **Body**: `system-ui, sans-serif` at 1rem/1.5. Headings step 2.5/2/1.5/1.25rem.
- **Mono**: `ui-monospace, monospace` for every numeric readout — dimensions, cell counts, percentages — with `tabular-nums`, and for uppercase tracked labels (0.06em).

## Layout

- One workspace row: canvas focal plane left (flex 1), stage rack right (fixed 14rem, left keyline). Below 900px the rack hides and a labeled dialog toggle carries navigation.
- The shell has a max width of 80rem and carries the construction-grid background at 2rem cells.
- Header is a baseline-aligned flex row: nameplate left, two-word privacy note right, bottom keyline.

## Elevation & Depth

Flat by commitment. `shadow: none` is a token; nothing in the world casts shadows. Depth is three tonal steps in either scheme — dark: field #12141c → cell face #1a1e2a → chrome #232939; light: field #eceef3 → cell face #fbfbfd → chrome #e3e6ee — separated by 1px keylines.

## Shapes

Zero radius everywhere (`rounded: 0px`). Square cells, square counters, 1px solid keylines. Drop zones are keylined slots with a faint internal grid (1.5rem cells), not dashed rectangles.

## Components

- **Primary button**: gold fill, bench-ink label, zero radius, 0.65rem/1rem padding. Exactly one primary plate per viewport.
- **Stage rack cell**: keylined cell-face button with a square monospace counter; current = gold keyline + gold ink (never a gold fill — gold fills mean action); completed = teal keyline with a drawn SVG checkmark; locked = field background with muted ink.
- **Construction-grid preview**: source image in a 1px keylined frame under a dark-line grid whose cell size is percentage-derived from tessera size over the real image dimensions, with a blue monospace readout of columns × rows × total.
- **Progress**: a 16 × 9 sprite-cell grid (teal fills row by row) above the native `<progress>` element, which stays for accessibility.

## Do's and Don'ts

**Do:**
- Reserve gold for actions; use keylines and ink color for state
- Keep every numeric readout monospace with tabular numerals
- Let imagery be the only saturated thing on a screen
- Respect `prefers-reduced-motion` on every animated element

**Don't:**
- Don't add shadows, rounded corners, or gradients — the world is flat construction
- Don't use Unicode glyphs as icons; draw them as inline SVG in one stroke weight
- Don't spend the display face on body copy or controls
- Don't add a second primary plate to any viewport
