import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * Transient UI operation state. These atoms hold what a single interaction
 * is doing right now (processing flags, in-flight errors, drafts) so
 * components carry no local state of their own.
 */

// --- Source image selection ---

/** Whether the source image file is currently being processed. */
export const isSelectingSourceAtom = atom(false);
/** Whether a drag is hovering the source drop zone. */
export const isSourceDragActiveAtom = atom(false);

// --- Tile upload ---

/** Whether uploaded tile files are currently being processed. */
export const isProcessingUploadAtom = atom(false);
/** User-facing error from the last tile upload attempt. */
export const uploadErrorAtom = atom<string | null>(null);

// --- Noise tile generation ---

/** Whether procedural tile generation is running. */
export const isGeneratingTilesAtom = atom(false);

// --- Mosaic generation ---

/** Whether mosaic generation is running. */
export const isGeneratingMosaicAtom = atom(false);
/** Progress of the running mosaic generation, if reported. */
export const generationProgressAtom = atom<{
	percent: number;
	message: string;
} | null>(null);
/** User-facing error from the last mosaic generation attempt. */
export const generationErrorAtom = atom<string | null>(null);

// --- Export ---

/** Whether a mosaic export is running. */
export const isExportingAtom = atom(false);
/** User-facing error from the last export attempt. */
export const exportErrorAtom = atom<string | null>(null);

// --- Brick color picker ---

/** Draft color in the custom color input. */
export const customBrickColorAtom = atom("#FF0000");
/** Which preset palette is active, if any. */
export const activeBrickPaletteAtom = atom<number | null>(null);

// --- Telemetry consent ---

/**
 * Consent preference, persisted in localStorage by atomWithStorage.
 * Key mirrors CONSENT_KEY in telemetry.ts; defaults to consenting, matching
 * hasTelemetryConsent().
 */
export const telemetryConsentAtom = atomWithStorage("telemetry-consent", true);
