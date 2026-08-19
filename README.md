# LayerCraft

LayerCraft is a browser-based, multi-layer image editor for building simple image compositions. It runs entirely in the browser and uses an HTML canvas for rendering, so there is no backend or project upload required.

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
- The editor supports image composition and basic adjustments, but it does not provide advanced features such as text editing, vector tools, or non-destructive project files.

## Project structure

```text
.
├── docs/
│   ├── index.html   # Application markup and UI
│   ├── index.js     # Editor state, rendering, and interactions
│   └── index.css    # Custom styling
├── biome.json       # Biome configuration
└── package.json     # Development scripts
```

## Development

Run the linter:

```bash
npm run lint
```

Run the test script (currently an alias for linting):

```bash
npm test
```
