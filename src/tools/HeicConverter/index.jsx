import { useState, useCallback, useRef } from 'react';
import heic2any from 'heic2any';
import JSZip from 'jszip';
import { ImageDown, Download, Loader2, X, CheckCircle2 } from 'lucide-react';
import DropZone from '../../components/ui/DropZone';
import ProgressBar from '../../components/ui/ProgressBar';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { clsx } from 'clsx';

const MAX_CONCURRENT = Math.max(1, Math.min((navigator.hardwareConcurrency || 4) - 1, 4));

function fmtBytes(b) {
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

export default function HeicConverter() {
  const [files, setFiles] = useState([]);
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState('idle'); // idle | processing | done
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const { toasts, dismiss, toast } = useToast();

  const onFiles = useCallback((accepted) => {
    const heics = accepted.filter((f) =>
      f.type === 'image/heic' || f.type === 'image/heif' ||
      f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.heif')
    );
    if (!heics.length) { toast.error('No HEIC/HEIF files detected.'); return; }
    setFiles((prev) => [...prev, ...heics]);
    setResults([]);
    setStatus('idle');
  }, []);

  const removeFile = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setResults([]);
  };

  const handleConvert = async () => {
    if (!files.length) { toast.error('Add HEIC files first.'); return; }
    setStatus('processing');
    setProgress(0);
    setResults([]);

    const newResults = new Array(files.length).fill(null);
    let done = 0;

    const processFile = async (file, i) => {
      try {
        const blob = await heic2any({ blob: file, toType: `image/${format}`, quality });
        const out = Array.isArray(blob) ? blob[0] : blob;
        const url = URL.createObjectURL(out);
        newResults[i] = { name: file.name.replace(/\.(heic|heif)$/i, `.${format === 'jpeg' ? 'jpg' : format}`), url, size: out.size, ok: true };
      } catch (e) {
        newResults[i] = { name: file.name, url: null, size: 0, ok: false, error: e.message };
      }
      done++;
      setProgress(Math.round((done / files.length) * 100));
      setResults([...newResults]);
    };

    // Concurrency-limited queue
    const queue = files.map((f, i) => () => processFile(f, i));
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, files.length) }, async () => {
      while (queue.length) await queue.shift()();
    });
    await Promise.all(workers);

    setStatus('done');
    const successCount = newResults.filter((r) => r?.ok).length;
    toast.success(`Converted ${successCount}/${files.length} files.`);
  };

  const downloadAll = async () => {
    const ok = results.filter((r) => r?.ok);
    if (!ok.length) return;

    if (ok.length === 1) {
      const a = document.createElement('a');
      a.href = ok[0].url; a.download = ok[0].name; a.click();
      return;
    }

    const zip = new JSZip();
    for (const r of ok) {
      const res = await fetch(r.url);
      const buf = await res.arrayBuffer();
      zip.file(r.name, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'converted_images.zip'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success('Downloaded as ZIP!');
  };

  const clearAll = () => {
    results.forEach((r) => r?.url && URL.revokeObjectURL(r.url));
    setFiles([]); setResults([]); setStatus('idle'); setProgress(0);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="tool-header">
        <div className="tool-icon-wrap bg-gradient-to-br from-cyan-600 to-teal-600">
          <ImageDown size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">HEIC Converter</h1>
          <p className="text-sm text-zinc-500">iOS HEIC → JPG / PNG · Batch · No uploads</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Settings */}
        <div className="card p-5 space-y-5">
          <DropZone
            onFiles={onFiles}
            accept={{ 'image/heic': ['.heic'], 'image/heif': ['.heif'] }}
            multiple
            label="Drop HEIC / HEIF files"
            sublabel={`Batch processing up to ${MAX_CONCURRENT} concurrent conversions`}
            disabled={status === 'processing'}
          />

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="label">{files.length} file{files.length > 1 ? 's' : ''}</p>
                <button onClick={clearAll} className="btn-ghost text-xs py-1">Clear all</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {files.map((f, i) => {
                  const res = results[i];
                  return (
                    <div key={i} className={clsx('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', res?.ok ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-zinc-800/60')}>
                      {res?.ok
                        ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        : res?.ok === false
                          ? <X size={13} className="text-red-400 shrink-0" />
                          : <div className="w-3 h-3 rounded-full border border-zinc-600 shrink-0" />
                      }
                      <span className="flex-1 truncate text-zinc-300">{f.name}</span>
                      <span className="text-xs text-zinc-600 shrink-0">{fmtBytes(f.size)}</span>
                      {status === 'idle' && (
                        <button onClick={() => removeFile(i)} className="btn-ghost p-0.5 text-zinc-600 hover:text-red-400"><X size={12} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Output format</label>
              <select className="input" value={format} onChange={(e) => setFormat(e.target.value)} disabled={status === 'processing'}>
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
              </select>
            </div>
            {format === 'jpeg' && (
              <div>
                <label className="label">Quality ({Math.round(quality * 100)}%)</label>
                <input type="range" min={60} max={100} value={Math.round(quality * 100)} onChange={(e) => setQuality(e.target.value / 100)} className="w-full mt-2 accent-brand-500" disabled={status === 'processing'} />
              </div>
            )}
          </div>

          <div className="text-xs text-zinc-600 bg-zinc-800/50 rounded-xl px-3 py-2">
            Concurrency: up to <strong className="text-zinc-400">{MAX_CONCURRENT}</strong> simultaneous conversions<br />
            (based on <code>navigator.hardwareConcurrency</code> = {navigator.hardwareConcurrency})
          </div>

          {status === 'processing' && (
            <ProgressBar value={progress} label="Converting…" sublabel={`${progress}%`} />
          )}

          <div className="flex gap-3">
            <button onClick={handleConvert} disabled={!files.length || status === 'processing'} className="btn-primary flex-1">
              {status === 'processing' ? <><Loader2 size={15} className="animate-spin" /> Converting…</> : <><ImageDown size={15} /> Convert all</>}
            </button>
            {results.some((r) => r?.ok) && (
              <button onClick={downloadAll} className="btn-secondary gap-2">
                <Download size={15} />
                {results.filter((r) => r?.ok).length > 1 ? 'Download ZIP' : 'Download'}
              </button>
            )}
          </div>
        </div>

        {/* Preview grid */}
        <div className="card p-5">
          <p className="label mb-3">Converted previews</p>
          {results.some((r) => r?.ok) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {results.map((r, i) =>
                r?.ok ? (
                  <a key={i} href={r.url} download={r.name} className="group relative block rounded-xl overflow-hidden bg-zinc-800 aspect-square hover:ring-2 ring-brand-500 transition-all">
                    <img src={r.url} alt={r.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-150 flex items-center justify-center">
                      <Download size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-zinc-300 truncate px-1.5 py-1">{r.name}</p>
                  </a>
                ) : null
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
              Converted images appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
