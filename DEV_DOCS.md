# UtilSuite — Developer Documentation

## Overview

UtilSuite is a 100% client-side web application built with React 18 + Vite. Every computation runs inside the user's browser tab; no user files are ever transmitted to a server.

---

## Architecture

```
src/
├── App.jsx                      React Router root
├── main.jsx                     Entry point
├── index.css                    Global styles (Tailwind + component classes)
├── components/
│   ├── layout/
│   │   ├── Layout.jsx           Outer shell: sidebar + scrollable main
│   │   └── Sidebar.jsx          Collapsible nav (desktop fixed / mobile drawer)
│   └── ui/
│       ├── DropZone.jsx         react-dropzone wrapper
│       ├── ProgressBar.jsx      Animated gradient bar
│       └── Toast.jsx            Toast system (useToast hook + ToastContainer)
├── pages/
│   └── Home.jsx                 Landing / tool-card grid
└── tools/
    ├── PDFToolkit/index.jsx     Merge · Split · Watermark (pdf-lib + PDF.js)
    ├── PassportPhoto/index.jsx  Crop · Tile · 300 DPI export (Canvas 2D)
    ├── ResumeBuilder/index.jsx  Form → live preview → window.print() PDF
    ├── VideoCompressor/index.jsx FFmpeg.wasm compression pipeline
    ├── HeicConverter/index.jsx  heic2any batch converter (concurrency queue)
    └── BackgroundEraser/index.jsx RMBG-1.4 via Transformers.js (WebGPU/WASM)
```

---

## Tech Stack

| Concern               | Library / API                     | Version  |
|-----------------------|-----------------------------------|----------|
| Build tool            | Vite                              | 6.x      |
| UI framework          | React                             | 18.x     |
| Routing               | react-router-dom                  | 6.x      |
| Styling               | Tailwind CSS                      | 3.x      |
| Icons                 | lucide-react                      | 0.468+   |
| PDF manipulation      | pdf-lib                           | 1.17.x   |
| PDF thumbnail render  | pdfjs-dist (CDN worker)           | 4.4.x    |
| Image canvas          | HTML5 Canvas 2D (native)          | —        |
| Video / audio         | @ffmpeg/ffmpeg + @ffmpeg/util     | 0.12.x   |
| HEIC conversion       | heic2any                          | 0.0.4    |
| Batch ZIP download    | JSZip                             | 3.10.x   |
| AI inference          | @huggingface/transformers         | 3.5.x    |
| Conditional classes   | clsx                              | 2.x      |

---

## Critical Browser Requirements

### SharedArrayBuffer (FFmpeg multi-threading)

FFmpeg.wasm uses `SharedArrayBuffer` for multi-threaded encoding. Browsers only expose this API when the page is **cross-origin isolated**, which requires two HTTP response headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These are set in `vite.config.js` for the development and preview servers. For **production**, your static host must set these headers.

**Nginx example:**
```nginx
add_header Cross-Origin-Opener-Policy "same-origin";
add_header Cross-Origin-Embedder-Policy "require-corp";
```

**Cloudflare Pages / Vercel:** Use `_headers` file:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

### WebGPU (Background Eraser)

The AI Background Eraser attempts `navigator.gpu.requestAdapter()`. If WebGPU is unavailable (Firefox, Safari < 18, or hardware without GPU support), it falls back transparently to WASM execution. No action required.

---

## Module Deep-Dives

### 1. PDF Toolkit

**Stack:** `pdf-lib` (manipulation) + `pdfjs-dist` (thumbnail rendering)

- **Merge:** Loads each PDF as `ArrayBuffer`, uses `PDFDocument.copyPages()` to assemble pages, then `PDFDocument.save()` → blob download.
- **Split:** Parses a range string (`1-3,5,7-9`) into page indices. Copies matching pages into a new `PDFDocument`.
- **Watermark:** Embeds `HelveticaBold`, draws text at center of each page with configurable opacity, rotation, and color using `pdf-lib`'s `drawText` + `rgb()` APIs.

**Thumbnail rendering:** `pdfjs-dist` renders page 1 to an off-screen `<canvas>` at 0.5× scale, exported as a data URL. The PDF.js worker is loaded from Cloudflare CDN to avoid bundling the ~1 MB worker binary:

```js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

**Memory:** Only page 1 is rendered per file for the thumbnail; no full document is loaded into the DOM.

---

### 2. Passport Photo Generator

**Stack:** HTML5 Canvas 2D API

**Export resolution:** The print sheet is generated at 300 DPI. For a 2×2 inch US passport photo:
```
pixels = 2 inches × 300 DPI = 600 × 600 px
```

**Tiling:** The chosen format tile is stamped onto a print-layout canvas using `ctx.drawImage()` in a nested loop over rows × columns, with a 20px gutter.

**User crop:** The image is drawn with `transform: scale(zoom) translate(ox, oy)` CSS to give a drag-and-crop UX. The same translation/zoom values are applied mathematically when writing to the export canvas.

---

### 3. Resume Builder

**Stack:** React state → CSS → `window.print()`

Two built-in templates: **Classic** (serif, single-column) and **Modern** (sidebar layout with dark left column).

**PDF export:** Uses the browser's native print dialog. `@media print` CSS hides all UI chrome (`.no-print`), shows only `.print-area` at full size. The user chooses "Save as PDF" in the print dialog.

**Adding templates:** Create a new component (e.g. `MinimalTemplate`) that accepts the `data` prop, then add it to the `TEMPLATES` array and the render switch in `ResumeBuilder`.

---

### 4. Video Compressor

**Stack:** `@ffmpeg/ffmpeg` + `@ffmpeg/util`

**Initialization:** FFmpeg core WASM is loaded from `unpkg.com` CDN using `toBlobURL()` to satisfy COEP (the resource is fetched and re-served as a same-origin blob):

```js
const FFMPEG_CDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
await ff.load({
  coreURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.wasm`, 'application/wasm'),
});
```

**Progress parsing:** FFmpeg emits log lines like:
```
frame=  100 fps= 25.0 ... time=00:00:04.00 ...
```
A regex extracts the `Duration:` line to get total seconds, then each `time=` line to compute a percentage.

**Multi-threading:** To enable multi-threaded encoding, switch to the `-mt` core:
```js
// In VideoCompressor/index.jsx, change FFMPEG_CDN to:
const FFMPEG_CDN = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
// And add the threadURL:
await ff.load({
  coreURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.wasm`, 'application/wasm'),
  workerURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.worker.js`, 'text/javascript'),
});
```
This requires COOP/COEP headers (already configured).

---

### 5. HEIC Converter

**Stack:** `heic2any` (wrapper over `libheif` compiled to WASM) + `JSZip`

**Concurrency control:** Browser tabs crash if too many HEIC conversions run simultaneously. The queue is limited to:
```js
const MAX_CONCURRENT = Math.max(1, Math.min(navigator.hardwareConcurrency - 1, 4));
```
A worker-pool pattern drains a shared task array:
```js
const workers = Array.from({ length: MAX_CONCURRENT }, async () => {
  while (queue.length) await queue.shift()();
});
await Promise.all(workers);
```

**Batch download:** Single file → direct `<a download>`. Multiple files → `JSZip.generateAsync()` → blob URL.

---

### 6. AI Background Eraser

**Stack:** `@huggingface/transformers` v3 · RMBG-1.4 model · WebGPU → WASM fallback

**Model:** `briaai/RMBG-1.4` — a 176 MB (fp32) / 88 MB (fp16) image matting model in ONNX format, hosted on HuggingFace Hub. Downloaded once and cached by the Transformers.js browser cache.

**Inference pipeline:**
1. Load image as `RawImage` from object URL.
2. Pre-process: resize to 1024×1024, normalize to [-1, 1], batch.
3. Run `model({ input: pixel_values })` → segmentation mask tensor.
4. Multiply mask by 255 → cast to uint8 → `RawImage` → resize back to original dimensions.
5. Draw original image on canvas → `getImageData` → replace α channel with mask values → `putImageData`.
6. `canvas.toBlob('image/png')` → download link.

**Backend selection:**
```js
let device = 'wasm';
if (navigator.gpu) {
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter) device = 'webgpu';
}
```
On failure, retries with `device: 'wasm'`.

**Model cache:** Controlled by:
```js
env.useBrowserCache = true;  // Use Cache API — survives page reloads
env.allowLocalModels = false; // Do not look for local model files
```

---

## Development

```bash
# Install
npm install

# Dev server (includes COOP/COEP headers)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

### Adding a New Tool

1. Create `src/tools/MyTool/index.jsx` exporting a default React component.
2. Add a route in `src/App.jsx`:
   ```jsx
   <Route path="my-tool" element={<MyTool />} />
   ```
3. Add a nav entry in `src/components/layout/Sidebar.jsx` (`GROUPS` array).
4. Add a card in `src/pages/Home.jsx` (`TOOLS` array).

---

## Performance Guidelines

| Rule | Rationale |
|------|-----------|
| Never load all PDF pages to DOM simultaneously | 100-page PDFs = OOM at full res |
| Limit HEIC concurrent jobs to `hardwareConcurrency - 1` | Each HEIC decode is CPU-intensive and memory-heavy |
| Load FFmpeg WASM lazily (on first compress click) | 10+ MB WASM binary — no need to pay on page load |
| Cache AI model with `env.useBrowserCache = true` | 90 MB model download must not repeat every session |
| Use `canvas.toBlob()` not `toDataURL()` | `toDataURL` holds a base64 copy in JS heap — toBlob streams |

---

## Production Deployment Checklist

- [ ] Static host configured to serve COOP + COEP headers
- [ ] HTTPS enforced (required for WebGPU and SharedArrayBuffer)
- [ ] Content-Type for `.wasm` files is `application/wasm` (Nginx: `types { application/wasm wasm; }`)
- [ ] CDN configured with long `Cache-Control` for hashed JS assets
- [ ] `vite build` output tested with `vite preview` locally before deploy
