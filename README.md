# LayerCraft

LayerCraft is a lightweight, browser-based image editor for creating simple compositions from multiple layers. It runs entirely in the browser and renders with HTML Canvas, so your images stay on your device and no backend or project upload is required. The project began in Gemini Canvas and later evolved through Gemini CLI with the `gemini-3.5-flash-lite` model.

## Run locally

### Requirements

- Python 3 (for the local server)
- Node.js (for development scripts)
- A modern browser

No npm dependencies are required. Start the local server with:

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

The command serves the `docs/` directory using Python's built-in HTTP server. Opening `docs/index.html` directly may prevent some browser features from working as expected because the app is designed to run over HTTP.

## Limitations

- LayerCraft runs entirely in the browser, so projects are not saved automatically. Export your work before closing or refreshing the page.
- Exported files are flattened images; the editable layer structure is not included.
- Performance depends on the browser and available memory, especially with large images, large canvases, or many layers.
- Adjustments are available only in the current session; there is no project-file format to reopen later.
- The editor does not provide text editing or vector tools.

## Project structure

```text
.
├── docs/
│   ├── index.html   # Application markup and UI
│   ├── index.js     # Browser entry point
│   ├── editor/      # Editor state, layers, rendering, UI, and interactions
│   └── index.css    # Custom styling
├── biome.json       # Biome configuration
└── package.json     # Development scripts
```

## Development

Run the linter (Biome is invoked through `npx`):

```bash
npm run lint
```

Run the test script (currently an alias for linting):

```bash
npm test
```
