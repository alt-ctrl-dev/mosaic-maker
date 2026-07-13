export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateImageFile(file: File): ValidationResult {
  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      reason:
        "Unsupported file type. Please select a JPEG, PNG, or WebP image.",
    };
  }

  return { valid: true };
}
