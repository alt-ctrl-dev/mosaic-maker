# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: personal photo hobbyists at home, turning their own photo libraries into mosaic art — for gifts, prints, and personal enjoyment. Secondary: pixel-art enthusiasts and developers drawn to the craft of the engine.

## Product Purpose

Mosaic Maker transforms a source image into a same-sized photomosaic assembled from cropped tesserae, entirely in the user's browser. Success is a finished full-resolution mosaic the user is proud to keep, share, or print — reached without their photos ever leaving the device.

## Positioning

Privacy and quality tied together: fully client-side photomosaic generation with real tessera control (uploaded collections or seeded generated tesserae) and full-resolution export (PNG, JPEG, WebP). A neighboring product could not truthfully copy "your photos never leave your device" plus the engine's resolution and control.

## Operating Context

Leisure, at-home, creative sessions on personal devices — desktop and mobile web alike. Sessions involve uploading personal photo collections (up to hundreds of files), choosing tessera size and generation settings, waiting through generation, judging the result, and exporting. A session's emotional peak is the mosaic reveal; its terminus is the export.

## Capabilities and Constraints

- Two modes: Photomosaic (default) and Brick Style (bricks chosen from preset color palettes or a custom color wheel).
- Tessera sources: user-uploaded image collections or generated tesserae (source-image colors plus seeded noise; seed reproduces results).
- Resource policy caps: 25 MB per file, 250 MB total, 500 files, 40 MP per file, 16384 px per axis. Tessera size clamped to 8 px floor up to a source-derived ceiling.
- Web Worker generation with main-thread fallback; cancellation; `beforeunload` guard.
- Full-resolution export: PNG, JPEG, WebP with quality and background controls; iOS share/popup fallback path.
- Micro-interactions with milestone haptics where the Vibration API is available (Android Chrome); silent no-op elsewhere.
- Opt-in telemetry via a telemetry-service contract (errors, web vitals, generation metrics). Never image data or user content.
- Strict CSP; no backend; deployable as static files (GitHub Pages, subpath base).
- Glossary vocabulary in `CONTEXT.md` is binding in all user-facing language: source image, tessera, tessera size, generated tessera, mosaic (and the documented avoided synonyms).
- Undecided: state persistence across refresh, power-user iteration features (re-seed shortcut, presets).

## Brand Commitments

- Name: **Mosaic Maker**.
- Voice: honest, quiet, privacy-respecting — the product explains plainly and never oversells; the telemetry consent respects the privacy claim.
- Glossary vocabulary is part of the voice (see Capabilities and Constraints).
- The four-tile favicon mark and its palette are NOT binding; they remain available as evidence of an earlier direction.

## Evidence on Hand

- Live deployment: https://alt-ctrl-dev.github.io/mosaic-maker/
- Engine documentation: `MOSAIC_ENGINE.md`; research notes: `NEIGHBOR_AVOIDANCE_FINDINGS.md`.
- Critique + audit of the live site (2026-10-15), archived at `.impeccable/critique/2026-10-15T01-30-15Z__alt-ctrl-dev-github-io-mosaic-maker.md`; fixes tracked in issue #285 and sub-issues #287–#293.
- No real example mosaics, testimonials, or imagery exist in the repo. Future work must not fabricate samples; illustrative material must be labeled synthetic.

## Product Principles

1. Photos never leave the device — every feature respects the client-side constraint.
2. The mosaic reveal is the emotional peak; the interface must land the user on their finished work with full fidelity.
3. Engine truth surfaces in the UI: recommendations, warnings, and defaults derive from real grid math, never blank fields.
4. One honest voice: glossary vocabulary, plain language, no hype, no dark patterns.
5. Quality at the finish: full-resolution export and truthful status at every high-stakes moment.
