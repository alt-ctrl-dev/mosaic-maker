import { useState, useRef } from "react";
import { validateImageFile } from "./imageValidation";

const stages = [
  ["Choose source image", "Select a JPEG, PNG, or WebP image."],
  ["Set tessera size", "Choose the square size of each tessera."],
  ["Choose tesserae", "Upload tesserae or create generated tesserae."],
  ["Review tesserae", "Check the collection before building the mosaic."],
  ["Generate and preview", "Build the mosaic and inspect the result."],
  ["Export mosaic", "Download the full-resolution mosaic."],
] as const;

export function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationResult = validateImageFile(file);

    if (validationResult.valid) {
      setSelectedImage(file);
      setValidationError(null);
    } else {
      setSelectedImage(null);
      setValidationError(validationResult.reason);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <header className="container">
        <p className="eyebrow">Private, in-browser image making</p>
        <h1>Mosaic Maker</h1>
        <p>
          Turn a source image into a full-resolution photomosaic. Your source
          image and tesserae stay on this device.
        </p>
      </header>

      <main className="container">
        <nav aria-label="Mosaic workflow">
          <ol className="workflow">
            {stages.map(([title, description], index) => (
              <li aria-current={index === 0 ? "step" : undefined} key={title}>
                <article>
                  <span className="step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                    {index === 0 && (
                      <div className="source-image-step">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: "none" }}
                          aria-label="Choose source image"
                        />
                        <button type="button" onClick={triggerFileSelect}>
                          {selectedImage ? "Change Image" : "Choose Image"}
                        </button>
                        {selectedImage && <p>Selected: {selectedImage.name}</p>}
                        {validationError && (
                          <p className="error-message" role="alert">
                            {validationError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </nav>
      </main>
    </>
  );
}
