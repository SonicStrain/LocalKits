const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react.default ? react.default() : react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'es2020',
  },
  esbuild: {
    target: 'es2020',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
    // Exclude packages that use runtime-variable dynamic imports — Vite can't
    // statically analyse them and emits noisy (harmless) warnings otherwise.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'pdfjs-dist', '@huggingface/transformers', 'onnxruntime-web'],
  },
});
