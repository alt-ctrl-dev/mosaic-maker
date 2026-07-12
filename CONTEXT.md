# Mosaic Maker

Mosaic Maker transforms a source image into a same-sized photomosaic assembled from cropped tesserae.

## Language

**Source image**:
The user-provided image whose dimensions and visual composition the final mosaic preserves.
_Avoid_: Hero image, feature image, input image

**Tessera**:
A small image available for use as a tile in the mosaic. A tessera may appear repeatedly or remain unused.
_Avoid_: Image tile, tile image

**Tessera size**:
The square side length requested by the user and adjusted to the nearest value that divides both source-image dimensions. An equal-distance tie resolves to the smaller value.
_Avoid_: Tile size, tessera dimensions

**Generated tessera**:
A tessera created from source-image colors and seeded noise. Each generated tessera is randomly assigned either softly blended noise or sharp pixel noise, never both; the seed reproduces the assignment.
_Avoid_: Random tile, noise tile

**Mosaic**:
The final image assembled from tesserae, with the same pixel width and height as the source image.
_Avoid_: Output image, result image
