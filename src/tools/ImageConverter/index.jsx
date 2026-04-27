import { useState, useCallback } from 'react';
import {
  Image as ImgIcon, Download, X, Loader2, Archive, ArrowRight,
  AlertTriangle, RefreshCw, Trash2,
} from 'lucide-react';
import DropZone from '../../components/ui/DropZone';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import JSZip from 'jszip';

const FORMATS = [
  { label: 'JPEG', ext: 'jpg',  mime: 'image/jpeg' },
  { label: 'PNG',  ext: 'png',  mime: 'image/png'  },
  { label: 'WebP', ext: 'webp', mime: 'image/webp' },
];

const SIZE_PRESETS = [
  { label: '< 50 KB',      min: 1,   max: 50   },
  { label: '50–100 KB',    min: 50,  max: 100  },
  { label: '100–200 KB',   min: 100, max: 200  },
  { label: '200–500 KB',   min: 200, max: 500  },
  { label: '500 KB–1 MB',  min: 500, max: 1024 },
];

let _uid = 0;
const uid = () => ++_uid;

function fmtBytes(b) {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise(res => canvas.toBlob(res, mime, quality));
}

function loadImg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function makeCanvas(img, scale) {
  const c = document.createElement('canvas');
  c.width  = Math.max(1, Math.round(img.naturalWidth  * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// Binary-search the output quality / scale to land within [lowB, highB] bytes.
async function fitToRange(img, mime, lowB, highB) {
  const try_ = async (canvas, q) => {
    const blob = await canvasToBlob(canvas, mime, q);
    return { blob, w: canvas.width, h: canvas.height };
  };

  const fullCanvas = makeCanvas(img, 1.0);
  const defQ = mime === 'image/png' ? undefined : 0.95;
  const orig = await try_(fullCanvas, defQ);

  // Already within range, or too small to reach low target
  if (orig.blob.size >= lowB && orig.blob.size <= highB) return orig;
  if (orig.blob.size < lowB) return orig;

  if (mime === 'image/png') {
    // PNG is lossless — reduce size by scaling dimensions down
    let lo = 0.05, hi = 1.0, best = null;
    for (let i = 0; i < 16; i++) {
      const m = (lo + hi) / 2;
      const r = await try_(makeCanvas(img, m), undefined);
      if (r.blob.size >= lowB && r.blob.size <= highB) { best = r; break; }
      if (r.blob.size > highB) hi = m; else lo = m;
      if (r.blob.size <= highB) best = r;
    }
    return best ?? await try_(makeCanvas(img, 0.05), undefined);
  }

  // JPEG / WebP: binary-search quality at full resolution first
  let qLo = 0.01, qHi = 0.95, best = null;
  for (let i = 0; i < 16; i++) {
    const q = (qLo + qHi) / 2;
    const r = await try_(fullCanvas, q);
    if (r.blob.size >= lowB && r.blob.size <= highB) { best = r; break; }
    if (r.blob.size > highB) qHi = q; else qLo = q;
    if (r.blob.size <= highB) best = r;
  }
  if (best) return best;

  // Still too large at min quality — additionally scale dimensions
  let sLo = 0.05, sHi = 1.0;
  for (let i = 0; i < 16; i++) {
    const s = (sLo + sHi) / 2;
    const r = await try_(makeCanvas(img, s), 0.7);
    if (r.blob.size >= lowB && r.blob.size <= highB) { best = r; break; }
    if (r.blob.size > highB) sHi = s; else sLo = s;
    if (r.blob.size <= highB) best = r;
  }
  return best ?? await try_(makeCanvas(img, 0.05), 0.4);
}

async function convertFile(file, fmt, sizeMode, minKB, maxKB) {
  const img = await loadImg(file);
  if (sizeMode === 'none') {
    const canvas = makeCanvas(img, 1.0);
    const q = fmt.mime === 'image/png' ? undefined : 0.92;
    const blob = await canvasToBlob(canvas, fmt.mime, q);
    return { blob, w: canvas.width, h: canvas.height };
  }
  return fitToRange(img, fmt.mime, minKB * 1024, maxKB * 1024);
}

export default function ImageConverter() {
  const [items, setItems] = useState([]);
  const [fmtIdx, setFmtIdx] = useState(0);
  const [sizeMode, setSizeMode] = useState('none');
  const [minKB, setMinKB] = useState(50);
  const [maxKB, setMaxKB] = useState(200);
  const [running, setRunning] = useState(false);
  const { toasts, dismiss, toast } = useToast();

  const fmt = FORMATS[fmtIdx];

  const patchItem = (id, patch) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const onFiles = useCallback((files) => {
    const next = files.map(f => ({
      id: uid(), file: f,
      status: 'idle',  // idle | processing | done | error
      blob: null, url: null, w: null, h: null, error: null,
    }));
    setItems(prev => [...prev, ...next]);
  }, []);

  const removeItem = (id) =>
    setItems(prev => {
      const it = prev.find(x => x.id === id);
      if (it?.url) URL.revokeObjectURL(it.url);
      return prev.filter(x => x.id !== id);
    });

  const clearAll = () =>
    setItems(prev => { prev.forEach(it => { if (it.url) URL.revokeObjectURL(it.url); }); return []; });

  const handleConvert = async () => {
    if (!items.length) { toast.error('No images added.'); return; }
    const minV = Number(minKB), maxV = Number(maxKB);
    if (sizeMode === 'range' && (minV < 1 || maxV <= minV)) {
      toast.error('Max size must be greater than Min size.'); return;
    }

    setRunning(true);
    let ok = 0, fail = 0;

    // Snapshot current items so we iterate even if user adds more while running
    const snapshot = [...items];

    for (const item of snapshot) {
      if (item.url) URL.revokeObjectURL(item.url);
      patchItem(item.id, { status: 'processing', blob: null, url: null, w: null, h: null, error: null });
      try {
        const { blob, w, h } = await convertFile(item.file, fmt, sizeMode, minV, maxV);
        const url = URL.createObjectURL(blob);
        patchItem(item.id, { status: 'done', blob, url, w, h });
        ok++;
      } catch (e) {
        patchItem(item.id, { status: 'error', error: e.message });
        fail++;
      }
    }

    setRunning(false);
    if (ok)   toast.success(`${ok} image${ok > 1 ? 's' : ''} converted!`);
    if (fail) toast.error(`${fail} image${fail > 1 ? 's' : ''} failed.`);
  };

  const downloadOne = (item) => {
    if (!item.url) return;
    const base = item.file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `${base}.${fmt.ext}`;
    a.click();
  };

  const downloadAll = async () => {
    const done = items.filter(it => it.status === 'done' && it.blob);
    if (!done.length) { toast.error('Nothing to download yet.'); return; }
    if (done.length === 1) { downloadOne(done[0]); return; }
    toast.info('Building ZIP…');
    const zip = new JSZip();
    done.forEach(it => zip.file(it.file.name.replace(/\.[^.]+$/, '') + '.' + fmt.ext, it.blob));
    const zBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zBlob);
    const a = document.createElement('a');
    a.href = url; a.download = 'converted_images.zip'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const doneCount = items.filter(it => it.status === 'done').length;
  const rangeOk   = sizeMode === 'none' || (Number(minKB) >= 1 && Number(maxKB) > Number(minKB));

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="tool-header">
        <div className="tool-icon-wrap bg-gradient-to-br from-pink-600 to-rose-500">
          <ImgIcon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Image Converter & Resizer</h1>
          <p className="text-sm text-zinc-500">Batch convert JPG · PNG · WebP — hit a target file-size range</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Settings column ── */}
        <div className="card p-5 space-y-5">
          <DropZone
            onFiles={onFiles}
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.avif'] }}
            multiple={true}
            label="Drop images here"
            sublabel="JPG, PNG, WebP, GIF, BMP, TIFF…"
          />

          {/* Output format */}
          <div>
            <label className="label">Output format</label>
            <div className="flex gap-1">
              {FORMATS.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setFmtIdx(i)}
                  className={i === fmtIdx ? 'tab tab-active' : 'tab tab-inactive'}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size targeting */}
          <div>
            <label className="label">File-size targeting</label>
            <div className="flex gap-1 mb-3">
              <button onClick={() => setSizeMode('none')}  className={sizeMode === 'none'  ? 'tab tab-active' : 'tab tab-inactive'}>No limit</button>
              <button onClick={() => setSizeMode('range')} className={sizeMode === 'range' ? 'tab tab-active' : 'tab tab-inactive'}>Target range</button>
            </div>

            {sizeMode === 'range' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                {/* Min / Max inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Min (KB)</label>
                    <input
                      type="number" min={1}
                      value={minKB}
                      onChange={e => setMinKB(Math.max(1, Number(e.target.value)))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Max (KB)</label>
                    <input
                      type="number" min={Number(minKB) + 1}
                      value={maxKB}
                      onChange={e => setMaxKB(Math.max(Number(minKB) + 1, Number(e.target.value)))}
                      className="input"
                    />
                  </div>
                </div>

                {/* Live summary */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Range: <strong className="text-zinc-200">{minKB} – {maxKB} KB</strong>
                  </span>
                  <span className="text-zinc-600">Gap: {maxKB - minKB} KB</span>
                </div>

                {/* Quick presets */}
                <div>
                  <p className="text-xs text-zinc-600 mb-2">Quick presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SIZE_PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setMinKB(p.min); setMaxKB(p.max); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors duration-150"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {!rangeOk && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertTriangle size={11} /> Max must be greater than Min.
                  </p>
                )}
                {fmtIdx === 1 && (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={11} />
                    PNG is lossless — size is reduced by scaling dimensions down, not by quality.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={handleConvert}
              disabled={!items.length || running || !rangeOk}
              className="btn-primary flex-1"
            >
              {running
                ? <><Loader2 size={14} className="animate-spin" /> Converting…</>
                : <><RefreshCw size={14} /> Convert {items.length > 0 && `${items.length} image${items.length > 1 ? 's' : ''}`}</>}
            </button>
            {items.length > 0 && !running && (
              <button onClick={clearAll} className="btn-ghost px-3 text-red-400" title="Clear all">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {doneCount > 1 && (
            <button onClick={downloadAll} className="btn-secondary w-full">
              <Archive size={14} /> Download all as ZIP ({doneCount} files)
            </button>
          )}
        </div>

        {/* ── Results column ── */}
        <div className="card p-5 flex flex-col gap-4 min-h-[200px]">
          <div className="flex items-center justify-between">
            <p className="label">
              Images{items.length > 0 && ` (${items.length})`}
            </p>
            {items.length > 0 && (
              <span className="text-xs text-zinc-500">
                {doneCount > 0 && <span className="text-emerald-400">{doneCount} done</span>}
                {items.filter(it => it.status === 'error').length > 0 && (
                  <span className="text-red-400 ml-2">
                    {items.filter(it => it.status === 'error').length} failed
                  </span>
                )}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
              Drop images on the left to get started
            </div>
          ) : (
            <ul className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
              {items.map(item => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 bg-zinc-900 rounded-xl px-3 py-2.5"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 shrink-0 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                    {item.url
                      ? <img src={item.url} alt="" className="w-full h-full object-cover" />
                      : <ImgIcon size={18} className="text-zinc-600" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{item.file.name}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-zinc-500">{fmtBytes(item.file.size)}</span>

                      {item.status === 'done' && item.blob && (
                        <>
                          <ArrowRight size={10} className="text-zinc-600" />
                          <span className={`text-xs font-medium ${item.blob.size < item.file.size ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {fmtBytes(item.blob.size)}
                          </span>
                          {item.w && (
                            <span className="text-xs text-zinc-600">
                              · {item.w}×{item.h}
                            </span>
                          )}
                          {/* Out-of-range hint */}
                          {sizeMode === 'range' && (
                            item.blob.size < minKB * 1024 || item.blob.size > maxKB * 1024
                          ) && (
                            <span className="text-xs text-amber-500" title="Result outside target range">⚠ outside range</span>
                          )}
                        </>
                      )}

                      {item.status === 'error' && (
                        <span className="text-xs text-red-400 truncate">{item.error}</span>
                      )}
                    </div>
                  </div>

                  {/* Status / actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === 'processing' && (
                      <Loader2 size={14} className="animate-spin text-brand-400" />
                    )}
                    {item.status === 'done' && (
                      <button
                        onClick={() => downloadOne(item)}
                        className="btn-ghost p-1.5 text-brand-400"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    )}
                    {item.status === 'error' && (
                      <AlertTriangle size={14} className="text-red-400" />
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="btn-ghost p-1 text-zinc-600 hover:text-red-400"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
