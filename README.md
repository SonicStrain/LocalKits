<div align="center">

<h1>⚡ LocalKits</h1>

<p><strong>Privacy-first browser tools. No uploads. No servers. No cost.</strong></p>

<p>PDF manipulation · Image conversion · Video compression · On-device AI — all running locally in your browser.</p>

![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-2-646cff?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

</div>

---

## ✨ What is LocalKits?

LocalKits is a suite of utility tools that run **100% inside your browser**. Your files never leave your device — there is no backend, no cloud processing, and no account required. Everything is handled by modern browser APIs: WebAssembly, WebGPU, and the Canvas API.

---

## 🧰 Tools

| # | Tool | Description | Powered by |
|---|------|-------------|------------|
| 1 | **PDF Toolkit** | Merge PDFs, split by page ranges, add text watermarks | `pdf-lib` · `pdfjs-dist` |
| 2 | **Image Converter** | Batch convert JPG ↔ PNG ↔ WebP with a target file-size range via binary-search quality tuning | Canvas API |
| 3 | **HEIC Converter** | Batch-convert iPhone HEIC photos to JPG or PNG with a smart concurrency queue | `heic2any` |
| 4 | **BG Eraser** | AI-powered background removal using WebGPU (falls back to WASM) | `@huggingface/transformers` |
| 5 | **Video Compressor** | Compress video/audio with real-time progress and multiple quality presets | `FFmpeg.wasm` |
| 6 | **Passport Photo** | Crop photos to government-compliant dimensions and tile a 300 DPI print layout | Canvas API |
| 7 | **Resume Builder** | Fill a form, pick a template, and export a pixel-perfect PDF via browser print | React |

---

## 🔒 Privacy by Design

- **Zero uploads** — files are read locally via the File API and never sent to a server
- **Zero accounts** — no sign-up, no tracking, no analytics
- **Zero cost** — no API keys or paid services required
- **Open source** — inspect every line of what runs on your machine

---

## 🚀 Getting Started

### Prerequisites

- Node.js 14+
- npm

### Run locally

```bash
# 1. Clone the repo
git clone https://github.com/SonicStrain/LocalKits
cd localkit

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:3000** in your browser.

> **Important:** Open the URL directly — not via a proxy or iframe. The dev server sends the `COOP` / `COEP` headers required for `SharedArrayBuffer` (used by FFmpeg.wasm).

### Build for production

```bash
npm run build      # outputs to /dist
npm run preview    # locally preview the production build
```

---

## 🌐 Deployment

Any host that supports **custom response headers** works. The two required headers are:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These are needed to enable `SharedArrayBuffer`, which FFmpeg.wasm depends on.

### Netlify (recommended)

A `public/_headers` file is already included. Just connect your repo or run:

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

### Vercel

Add a `vercel.json` at the project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

Then run `npx vercel --prod`.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + React Router 6 |
| Bundler | Vite 2 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| PDF | pdf-lib · pdfjs-dist |
| Video | FFmpeg.wasm (`@ffmpeg/ffmpeg`) |
| HEIC | heic2any |
| AI / ML | Hugging Face Transformers.js (WebGPU) |
| ZIP | JSZip |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/        # Sidebar, Layout, top bar
│   └── ui/            # DropZone, ProgressBar, Toast
├── pages/
│   └── Home.jsx       # Landing / tool grid
└── tools/
    ├── PDFToolkit/
    ├── ImageConverter/
    ├── HeicConverter/
    ├── BackgroundEraser/
    ├── VideoCompressor/
    ├── PassportPhoto/
    └── ResumeBuilder/
```

---

## 📄 License

[MIT](LICENSE) © 2025 LocalKits
