# Mosaic Maker

Mosaic Maker is a privacy-focused, in-browser application that transforms source images into full-resolution photomosaics. All processing happens locally in your browser - your images never leave your device.

## What is a Photomosaic?

A photomosaic is a mosaic made up of small photographs, creating a larger composite image. Each small image (called a "tessera") contributes to forming the overall picture when viewed from a distance.

## Features

- **Privacy First**: All image processing happens in your browser, nothing is uploaded to any server
- **Full Resolution Output**: Generate high-quality mosaics that maintain the resolution of your source image
- **Custom Tesserae**: Upload your own images or generate random colored tesserae as building blocks
- **Responsive Design**: Works on desktop and mobile devices
- **Export Options**: Download your finished mosaic as a PNG image

## How It Works

Mosaic Maker follows a four-step workflow:

1. **Choose Source Image**: Select the image you want to turn into a mosaic
2. **Build Tesserae**: Upload or generate the small images that will form your mosaic
3. **Generate and Preview**: Watch your mosaic come together in real-time
4. **Export Mosaic**: Download your finished creation

## Quick Start

### Running Locally

```bash
# Clone the repository
git clone https://github.com/alt-ctrl-dev/mosaic-maker.git
cd mosaic-maker

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

### Building for Production

```bash
# Build the application
pnpm run build

# The built files will be in the `dist` directory
```

## Development

### Available Scripts

- `pnpm run dev` - Start the development server
- `pnpm run build` - Build the application for production
- `pnpm run test` - Run the test suite
- `pnpm run lint` - Check code for linting issues
- `pnpm run format` - Check code formatting
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm run check` - Run all checks (lint, format, test, typecheck)

### Project Structure

```
src/
├── components/     # React components for each step of the workflow
├── engine/         # Core logic for image processing and mosaic generation
├── hooks/          # Custom React hooks
├── App.tsx         # Main application component
├── main.tsx        # Application entry point
└── styles.css      # Global styles
```

### Testing

This project uses Vitest for testing with React Testing Library for component testing:

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm exec vitest
```

## Technology Stack

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and development server
- **Pico CSS** - Minimal CSS framework
- **Vitest** - Test runner
- **GitHub Pages** - Hosting for the demo

## Browser Support

Mosaic Maker works in all modern browsers that support the following features:
- Canvas API
- File API
- Modern JavaScript (ES2017+)

Internet Explorer is not supported.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

Before submitting changes:
1. Ensure all tests pass (`pnpm run test`)
2. Check code formatting (`pnpm run format`)
3. Run linting checks (`pnpm run lint`)
4. Verify type checking (`pnpm run typecheck`)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Demo

You can try Mosaic Maker online at: [https://alt-ctrl-dev.github.io/mosaic-maker/](https://alt-ctrl-dev.github.io/mosaic-maker/)

## Privacy Policy

Mosaic Maker does not collect, store, or transmit any personal data or images. All processing occurs locally in your browser, and images are never sent to any server.