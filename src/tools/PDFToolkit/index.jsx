import { useState, useCallback, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileStack, Trash2, ChevronUp, ChevronDown,
  Download, Plus, Scissors, Droplets, Loader2,
} from 'lucide-react';
import DropZone from '../../components/ui/DropZone';
import ProgressBar from '../../components/ui/ProgressBar';
import { ToastContainer, useToast } from '../../components/ui/Toast';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const TABS = ['Merge', 'Split', 'Watermark'];

function usePDFState() {
  const [tab, setTab] = useState('Merge');
  const [files, setFiles] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Split state
  const [splitRange, setSplitRange] = useState('');
  // Watermark state
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmOpacity, setWmOpacity] = useState(0.15);
  const [wmColor, setWmColor] = useState('#7c3aed');
  const [wmAngle, setWmAngle] = useState(45);

  return {
    tab, setTab, files, setFiles, thumbnails, setThumbnails,
    processing, setProcessing, progress, setProgress,
    splitRange, setSplitRange,
    wmText, setWmText, wmOpacity, setWmOpacity, wmColor, setWmColor, wmAngle, setWmAngle,
  };
}

async function renderFirstPage(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL();
}

function parseRanges(str, total) {
  const pages = new Set();
  for (const part of str.split(',')) {
    const [a, b] = part.trim().split('-').map(Number);
    if (!b) { if (a >= 1 && a <= total) pages.add(a - 1); }
    else { for (let i = a; i <= Math.min(b, total); i++) pages.add(i - 1); }
  }
  return [...pages].sort((a, c) => a - c);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function downloadBlob(bytes, name) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function PDFToolkit() {
  const s = usePDFState();
  const { toasts, dismiss, toast } = useToast();
  const thumbCache = useRef({});

  const addFiles = useCallback(async (accepted) => {
    const pdfs = accepted.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdfs.length) { toast.error('Only PDF files are accepted.'); return; }

    s.setFiles((prev) => [...prev, ...pdfs]);

    for (const f of pdfs) {
      if (!thumbCache.current[f.name + f.size]) {
        try {
          const dataUrl = await renderFirstPage(f);
          thumbCache.current[f.name + f.size] = dataUrl;
          s.setThumbnails((prev) => ({ ...prev, [f.name + f.size]: dataUrl }));
        } catch { /* thumbnail optional */ }
      }
    }
  }, []);

  const moveFile = (i, dir) => {
    s.setFiles((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const removeFile = (i) => s.setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleMerge = async () => {
    if (s.files.length < 2) { toast.error('Add at least 2 PDFs to merge.'); return; }
    s.setProcessing(true); s.setProgress(0);
    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < s.files.length; i++) {
        const buf = await s.files[i].arrayBuffer();
        const src = await PDFDocument.load(buf);
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
        s.setProgress(Math.round(((i + 1) / s.files.length) * 100));
      }
      const bytes = await merged.save();
      downloadBlob(bytes, 'merged.pdf');
      toast.success('Merged PDF downloaded!');
    } catch (e) {
      toast.error('Merge failed: ' + e.message);
    } finally {
      s.setProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!s.files[0]) { toast.error('Upload a PDF first.'); return; }
    s.setProcessing(true); s.setProgress(0);
    try {
      const buf = await s.files[0].arrayBuffer();
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const indices = s.splitRange.trim()
        ? parseRanges(s.splitRange, total)
        : Array.from({ length: total }, (_, i) => i);

      const out = await PDFDocument.create();
      for (const idx of indices) {
        const [page] = await out.copyPages(src, [idx]);
        out.addPage(page);
      }
      s.setProgress(100);
      const bytes = await out.save();
      downloadBlob(bytes, 'split.pdf');
      toast.success(`Extracted ${indices.length} pages.`);
    } catch (e) {
      toast.error('Split failed: ' + e.message);
    } finally {
      s.setProcessing(false);
    }
  };

  const handleWatermark = async () => {
    if (!s.files[0]) { toast.error('Upload a PDF first.'); return; }
    s.setProcessing(true); s.setProgress(0);
    try {
      const buf = await s.files[0].arrayBuffer();
      const pdf = await PDFDocument.load(buf);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const { r, g, b } = hexToRgb(s.wmColor);
      const pages = pdf.getPages();

      pages.forEach((page, i) => {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) / 10;
        const textWidth = font.widthOfTextAtSize(s.wmText, fontSize);
        page.drawText(s.wmText, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: s.wmOpacity,
          rotate: degrees(s.wmAngle),
        });
        s.setProgress(Math.round(((i + 1) / pages.length) * 100));
      });

      const bytes = await pdf.save();
      downloadBlob(bytes, 'watermarked.pdf');
      toast.success('Watermarked PDF downloaded!');
    } catch (e) {
      toast.error('Watermark failed: ' + e.message);
    } finally {
      s.setProcessing(false);
    }
  };

  const handleAction = () => {
    if (s.tab === 'Merge') handleMerge();
    else if (s.tab === 'Split') handleSplit();
    else handleWatermark();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="tool-header">
        <div className="tool-icon-wrap bg-gradient-to-br from-violet-600 to-purple-700">
          <FileStack size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">PDF Toolkit</h1>
          <p className="text-sm text-zinc-500">Merge · Split · Watermark — all local</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => { s.setTab(t); s.setFiles([]); }}
            className={t === s.tab ? 'tab tab-active' : 'tab tab-inactive'}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card p-5 space-y-5">
        <DropZone
          onFiles={addFiles}
          accept={{ 'application/pdf': ['.pdf'] }}
          multiple={s.tab === 'Merge'}
          label={s.tab === 'Merge' ? 'Drop PDFs to merge' : 'Drop a PDF'}
          sublabel="PDF files only"
        />

        {/* File list */}
        {s.files.length > 0 && (
          <div className="space-y-2">
            <p className="label">{s.files.length} file{s.files.length > 1 ? 's' : ''} loaded</p>
            {s.files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-zinc-800/60 rounded-xl px-3 py-2.5">
                {s.thumbnails[f.name + f.size] && (
                  <img src={s.thumbnails[f.name + f.size]} alt="" className="h-10 w-8 object-cover rounded border border-zinc-700" />
                )}
                <span className="flex-1 text-sm text-zinc-300 truncate">{f.name}</span>
                <span className="text-xs text-zinc-600 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                {s.tab === 'Merge' && (
                  <>
                    <button onClick={() => moveFile(i, -1)} disabled={i === 0} className="btn-ghost p-1"><ChevronUp size={14} /></button>
                    <button onClick={() => moveFile(i, 1)} disabled={i === s.files.length - 1} className="btn-ghost p-1"><ChevronDown size={14} /></button>
                  </>
                )}
                <button onClick={() => removeFile(i)} className="btn-ghost p-1 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Split options */}
        {s.tab === 'Split' && (
          <div>
            <label className="label">Page ranges (e.g. 1-3,5,7-9) — leave blank for all</label>
            <input
              className="input"
              placeholder="1-5, 7, 9-12"
              value={s.splitRange}
              onChange={(e) => s.setSplitRange(e.target.value)}
            />
          </div>
        )}

        {/* Watermark options */}
        {s.tab === 'Watermark' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Watermark text</label>
              <input className="input" value={s.wmText} onChange={(e) => s.setWmText(e.target.value)} placeholder="CONFIDENTIAL" />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="color" className="w-full h-10 rounded-xl cursor-pointer bg-zinc-800 border border-zinc-700 p-1" value={s.wmColor} onChange={(e) => s.setWmColor(e.target.value)} />
            </div>
            <div>
              <label className="label">Opacity ({Math.round(s.wmOpacity * 100)}%)</label>
              <input type="range" min={5} max={80} value={Math.round(s.wmOpacity * 100)} onChange={(e) => s.setWmOpacity(e.target.value / 100)} className="w-full accent-brand-500" />
            </div>
            <div>
              <label className="label">Angle ({s.wmAngle}°)</label>
              <input type="range" min={0} max={90} value={s.wmAngle} onChange={(e) => s.setWmAngle(Number(e.target.value))} className="w-full accent-brand-500" />
            </div>
          </div>
        )}

        {/* Progress */}
        {s.processing && (
          <ProgressBar value={s.progress} label="Processing…" sublabel={`${s.progress}%`} />
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleAction} disabled={s.processing} className="btn-primary gap-2">
            {s.processing
              ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
              : s.tab === 'Merge'
                ? <><Plus size={15} /> Merge PDFs</>
                : s.tab === 'Split'
                  ? <><Scissors size={15} /> Extract Pages</>
                  : <><Droplets size={15} /> Apply Watermark</>
            }
          </button>
          {s.files.length > 0 && (
            <button onClick={() => s.setFiles([])} className="btn-ghost">Clear</button>
          )}
        </div>
      </div>
    </div>
  );
}
