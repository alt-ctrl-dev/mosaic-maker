# Visual QA: Alert & Message Contrast

A repeatable, manual process for capturing before/after screenshots that
verify the alert/warning/error contrast fixes from PR #98 (issue #97).

This guide is written so you can run it **locally, by hand**. It does not
require an AI agent to execute code or switch branches on your behalf. You
drive the browser; you take the screenshots.

## What you are verifying

The fix in PR #98 makes alert, warning, and error messages theme-aware by
using Pico's `--pico-contrast-background` / `--pico-contrast-color`
variables instead of hard-coded colors, and removes redundant CSS. You are
confirming that the affected surfaces stay legible in both themes.

Capture these **areas** (all called out in issue #97):

- Page header (`.container` header with the eyebrow, title, and blurb)
- Step navigation sidebar (`.workflow-sidebar`, current/completed states)
- Primary and outline buttons (`Confirm Size`, `Continue to Generate`,
  `Download`, `← Back` / `Next →`)
- Warning banner on **Set tessera size** (`.warning-message`)
- Warning banner on **Review tesserae** (`.tessera-review .warning.alert`)
- Error banner on **Export mosaic** (`.export-mosaic-step .error-message.alert`)

Capture these **workflow steps**:

1. **Set tessera size** — showing the coarse-grid warning.
2. **Review tesserae** — showing the low-variety warning.
3. **Export mosaic** — showing the export error banner.

Capture in both **themes**:

- **Light theme** (primary target of the fix).
- **Dark theme** (confirm no regression).

## Prerequisites

- Node + `pnpm` installed (`pnpm@11.10.0`, see `package.json`).
- Dependencies installed: `pnpm install`.
- A small source image handy to trigger the coarse-grid warning. Any
  small square PNG/JPEG/WebP works — for a reliable coarse grid, use an
  image whose dimensions are small (for example **32×32**). A grid is
  coarse when it has fewer than 100 cells (see `isCoarseGrid` in
  `src/engine/tessera-sizing.ts`), so a 32×32 image at the default
  16px tessera size yields a 2×2 grid (4 cells) and shows the warning.

If you do not have a 32×32 image, create one:

```bash
# Requires ImageMagick. Produces a 32x32 test image in your home dir.
magick -size 32x32 xc:cornflowerblue ~/mosaic-qa-source.png
```

## Step 0 — Decide before vs. after

You will run the **exact same capture pass twice**:

- **Before**: check out the PR's parent commit (the state without the fix).
- **After**: check out the PR head commit (the state with the fix).

Use whatever branch/commit management you prefer. For reference, the PR
branch is `sandcastle/issue-97`; its parent is the commit immediately
before the two styling commits. Example (run these yourself; the AI does
not switch branches for you):

```bash
# AFTER (fix applied) — the PR head:
git checkout sandcastle/issue-97

# BEFORE (no fix) — the parent of the first styling commit:
git checkout sandcastle/issue-97~2
```

`sandcastle/issue-97~2` is the commit before
`fix: improve text contrast in light theme for alert messages` and
`refactor: remove redundant CSS rules ...`. Verify with:

```bash
git log --oneline -3 sandcastle/issue-97
```

Save before/after shots into separate folders so they are easy to compare:

```bash
mkdir -p qa-shots/before qa-shots/after
```

## Step 1 — Start the dev server

```bash
pnpm dev
```

Vite serves the app under the `/mosaic-maker/` base path (see
`vite.config.ts`). Open the URL Vite prints — typically:

```
http://localhost:5173/mosaic-maker/
```

Keep this running for the whole capture pass.

## Step 2 — Set the theme

Pico reads the theme from a `data-theme` attribute on `<html>` (falling
back to the OS `prefers-color-scheme`). To force a theme without changing
code, run one of these in the browser **DevTools Console**:

```js
// Force light theme
document.documentElement.setAttribute("data-theme", "light");

// Force dark theme
document.documentElement.setAttribute("data-theme", "dark");
```

Do a full capture pass in **light** first, then repeat in **dark**.

## Step 3 — Capture the header, navigation, and buttons

1. Land on the first step (**Choose source image**).
2. Screenshot the **header** and the **step navigation sidebar**. The
   sidebar shows the current-step and completed-step styling as you
   advance, so also grab it again on a later step to show a completed
   check mark.
3. As you move through the workflow, screenshot the **Back / Next**
   navigation buttons and each step's primary/outline buttons.

## Step 4 — Capture the tessera-size warning

1. On **Choose source image**, upload your small (e.g. 32×32) image.
2. Click **Next →** to reach **Set tessera size**.
3. Keep the default requested size (16px). With a 32×32 image this
   produces a 2×2 = 4-cell grid, which is below the 100-cell threshold,
   so the **coarse-grid warning** (`.warning-message`) appears.
4. Screenshot the warning banner together with the `Confirm Size` button.

## Step 5 — Capture the review-tesserae warning

1. Click **Confirm Size**, then advance to **Choose tesserae**.
2. Choose the **generated tesserae** path and generate a **small** number
   of tesserae (for example 2–3) so the collection is below the
   recommended variety count.
3. Advance to **Review tesserae**. The **low-variety warning**
   (`.tessera-review .warning.alert`) appears with the
   `Add Generated Tesserae` button.
4. Screenshot the warning banner and the `Continue to Generate` button.

## Step 6 — Capture the export error

The export error banner (`.export-mosaic-step .error-message.alert`)
renders when a download/export attempt throws. To force it reliably
without special inputs, advance to **Export mosaic** (after generating a
preview) and trigger the error path from the DevTools Console, or use a
browser state where no mosaic result is present so the export handler
reports an error.

The simplest deterministic trigger: on the **Export mosaic** step, use
DevTools to stub the download so the handler's `catch` runs — for example
temporarily override the anchor/canvas API the export uses, click
**Download**, and the `.error-message.alert` banner appears. Screenshot the
error banner together with the `Download` button.

> Tip: the export error text is set from the caught error's `message`
> (`src/components/ExportMosaic.tsx`). Any thrown error surfaces in the
> banner, so any of the above triggers is fine for a contrast screenshot.

## Step 7 — Repeat

1. Repeat **Steps 3–6** in the **dark** theme (Step 2).
2. Then check out the **other** commit (before vs. after, Step 0),
   restart `pnpm dev`, and repeat the whole pass so you have matching
   before/after pairs for every area, step, and theme.

## Suggested file naming

Keep names parallel so before/after diffs line up:

```
qa-shots/before/light-01-header.png
qa-shots/before/light-02-nav.png
qa-shots/before/light-03-buttons.png
qa-shots/before/light-04-size-warning.png
qa-shots/before/light-05-review-warning.png
qa-shots/before/light-06-export-error.png
qa-shots/before/dark-01-header.png
...
qa-shots/after/light-01-header.png
...
```

## Checklist

- [ ] Light + dark themes captured
- [ ] Header captured
- [ ] Step navigation (current + completed states) captured
- [ ] Primary and outline buttons captured
- [ ] Set-tessera-size coarse-grid warning captured
- [ ] Review-tesserae low-variety warning captured
- [ ] Export-mosaic error banner captured
- [ ] Matching before/after pairs for every shot
