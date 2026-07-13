import { useState, useRef } from "react";
import { validateImageFile } from "./imageValidation";
import { validateTesseraSize } from "./tesseraSize";

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
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [tesseraSize, setTesseraSize] = useState<string>("");
  const [tesseraValidation, setTesseraValidation] = useState<ReturnType<
    typeof validateTesseraSize
  > | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationResult = validateImageFile(file);

    if (validationResult.valid) {
      setSelectedImage(file);
      setValidationError(null);

      // Load image to get dimensions
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        // Initialize with a default tessera size request (1/10th of smaller dimension)
        const defaultSize = Math.floor(Math.min(img.width, img.height) / 10);
        setTesseraSize(defaultSize.toString());

        // Validate the default size
        const tesseraValidation = validateTesseraSize(
          defaultSize,
          img.width,
          img.height
        );
        setTesseraValidation(tesseraValidation);

        URL.revokeObjectURL(objectUrl);
      };

      img.onerror = () => {
        setValidationError("Failed to load image. Please try another file.");
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setSelectedImage(null);
      setValidationError(validationResult.reason);
    }
  };

  const handleTesseraSizeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const size = event.target.value;
    setTesseraSize(size);

    // Validate if we have image dimensions
    if (imageDimensions && size && !Number.isNaN(parseInt(size, 10))) {
      const sizeNum = parseInt(size, 10);
      const validation = validateTesseraSize(
        sizeNum,
        imageDimensions.width,
        imageDimensions.height
      );
      setTesseraValidation(validation);
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
                        {imageDimensions && (
                          <p>
                            Image dimensions: {imageDimensions.width} ×{" "}
                            {imageDimensions.height}px
                          </p>
                        )}
                        {validationError && (
                          <p className="error-message" role="alert">
                            {validationError}
                          </p>
                        )}
                      </div>
                    )}
                    {index === 1 && selectedImage && imageDimensions && (
                      <div className="tessera-size-step">
                        <label htmlFor="tessera-size">
                          Requested tessera size (px):
                          <input
                            id="tessera-size"
                            type="number"
                            value={tesseraSize}
                            onChange={handleTesseraSizeChange}
                            min="1"
                            aria-describedby="tessera-size-help"
                          />
                        </label>
                        <p id="tessera-size-help">
                          Enter your desired square tessera size in pixels.
                        </p>
                        {tesseraValidation && (
                          <div className="tessera-validation">
                            {tesseraValidation.valid ? (
                              <div>
                                <p>
                                  Adjusted size:{" "}
                                  {tesseraValidation.adjustedSize}px
                                </p>
                                <p>
                                  Grid:{" "}
                                  {Math.floor(
                                    imageDimensions.width /
                                      tesseraValidation.adjustedSize
                                  )}{" "}
                                  ×{" "}
                                  {Math.floor(
                                    imageDimensions.height /
                                      tesseraValidation.adjustedSize
                                  )}{" "}
                                  ({tesseraValidation.gridCells} cells)
                                </p>
                                {tesseraValidation.coarse && (
                                  <p className="warning-message">
                                    Warning: This will create a coarse mosaic
                                    with fewer than 100 cells.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="error-message" role="alert">
                                {tesseraValidation.reason}
                              </p>
                            )}
                          </div>
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
