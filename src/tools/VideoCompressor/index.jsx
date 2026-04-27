import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { Video, Download, Loader2, X, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import DropZone from '../../components/ui/DropZone';
import ProgressBar from '../../components/ui/ProgressBar';
import { ToastContainer, useToast } from '../../components/ui/Toast';

const QUALITY_PRESETS = [
  { label: 'High (large file)',  crf: 18, desc: 'Near-lossless. Great for archiving.' },
  { label: 'Balanced',          crf: 23, desc: 'Good quality, reasonable size.' },
  { label: 'Compressed',        crf: 28, desc: 'Smaller file, visible compression.' },
  { label: 'Small (web)',       crf: 35, desc: 'Smallest file. Streaming-friendly.' },
];

const RESOLUTIONS = [
  { label: 'Original', scale: '' },
  { label: '1080p',    scale: 'scale=-2:1080' },
  { label: '720p',     scale: 'scale=-2:720'  },
  { label: '480p',     scale: 'scale=-2:480'  },
];

const OUTPUT_FORMATS = [
  { label: 'MP4 (H.264)',       ext: 'mp4',  mime: 'video/mp4',   audioOnly: false, codec: ['-c:v', 'libx264', '-c:a', 'aac'] },
  { label: 'WebM (VP9)',        ext: 'webm', mime: 'video/webm',  audioOnly: false, codec: ['-c:v', 'libvpx-vp9', '-c:a', 'libopus'] },
  { label: 'MP3 (audio only)',  ext: 'mp3',  mime: 'audio/mpeg',  audioOnly: true,  codec: ['-vn', '-c:a', 'libmp3lame'] },
];

function parseDuration(log) {
  const m = log.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
}

function parseTime(log) {
  const m = log.match(/time=\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

// Files are served from /public — same-origin, no CORS/CORP needed
const FFMPEG_CORE_URL = '/ffmpeg-core.js';
const FFMPEG_WASM_URL = '/ffmpeg-core.wasm';

const IS_ISOLATED = typeof window !== 'undefined' && window.crossOriginIsolated;
const HAS_SAB = typeof SharedArrayBuffer !== 'undefined';

export default function VideoCompressor() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(1);
  const [resolution, setResolution] = useState(0);
  const [outputFormat, setOutputFormat] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading-ffmpeg | processing | done | error
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState('');
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const ffRef = useRef(null);
  const durationRef = useRef(null);
  const coreBlobRef = useRef(null);
  const wasmBlobRef = useRef(null);
  const { toasts, dismiss, toast } = useToast();

  const appendLog = (msg) => setLog((prev) => prev + msg + '\n');

  const loadFFmpeg = async () => {
    if (ffRef.current) return ffRef.current;
    setStatus('loading-ffmpeg');
    appendLog('Loading FFmpeg WASM…');
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => {
      appendLog(message);
      if (!durationRef.current) {
        const d = parseDuration(message);
        if (d) durationRef.current = d;
      }
      const t = parseTime(message);
      if (t && durationRef.current) {
        setProgress(Math.min(99, Math.round((t / durationRef.current) * 100)));
      }
    });

    // Use fetch+arrayBuffer to create blob URLs.
    // Direct URL paths cause the internal module worker to call import('/ffmpeg-core.js')
    // which silently fails under Vite 2 + COEP, leaving ff.load() hanging forever.
    // Blob URLs are always treated as same-origin in worker contexts, so they load reliably.
    if (!coreBlobRef.current) {
      appendLog('Fetching FFmpeg core JS…');
      const r = await fetch(FFMPEG_CORE_URL);
      coreBlobRef.current = URL.createObjectURL(
        new Blob([await r.arrayBuffer()], { type: 'text/javascript' })
      );
    }
    if (!wasmBlobRef.current) {
      appendLog('Fetching FFmpeg WASM (~32 MB)…');
      const r = await fetch(FFMPEG_WASM_URL);
      wasmBlobRef.current = URL.createObjectURL(
        new Blob([await r.arrayBuffer()], { type: 'application/wasm' })
      );
    }
    appendLog('Initialising FFmpeg worker…');
    await ff.load({ coreURL: coreBlobRef.current, wasmURL: wasmBlobRef.current });
    ffRef.current = ff;
    appendLog('FFmpeg ready.');
    return ff;
  };

  const onFiles = useCallback((files) => {
    setFile(files[0]);
    setOutputUrl(null);
    setStatus('idle');
    setProgress(0);
    setLog('');
    durationRef.current = null;
  }, []);

  const handleCompress = async () => {
    if (!file) { toast.error('No file selected.'); return; }
    setOutputUrl(null);
    setProgress(0);
    setLog('');
    durationRef.current = null;

    let ff;
    try {
      ff = await loadFFmpeg();
    } catch (e) {
      toast.error('Failed to load FFmpeg: ' + e.message);
      setStatus('error');
      return;
    }

    setStatus('processing');
    const fmt = OUTPUT_FORMATS[outputFormat];
    const inputName = 'input' + file.name.slice(file.name.lastIndexOf('.'));
    const outputName = `output.${fmt.ext}`;

    try {
      await ff.writeFile(inputName, await fetchFile(file));
      const crf = QUALITY_PRESETS[quality].crf;
      const scaleFilter = RESOLUTIONS[resolution].scale;

      // Codec flags must come before codec-specific options (crf, preset).
      // -movflags +faststart is omitted: it rewrites the file via a temp path
      // inside Emscripten FS which can hang on some WASM builds.
      // ultrafast preset is used because single-threaded WASM is ~20× slower
      // than native; ultrafast is 5–8× faster than fast at the same CRF.
      const args = ['-i', inputName];
      if (scaleFilter && !fmt.audioOnly) args.push('-vf', scaleFilter);
      args.push(...fmt.codec);
      if (!fmt.audioOnly) args.push('-crf', String(crf), '-preset', 'ultrafast');
      args.push(outputName);

      await ff.exec(args);

      const data = await ff.readFile(outputName);
      const blob = new Blob([data.buffer], { type: fmt.mime });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setOutputSize(blob.size);
      setProgress(100);
      setStatus('done');
      toast.success('Compression complete!');

      // Cleanup
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
    } catch (e) {
      toast.error('Compression failed: ' + e.message);
      setStatus('error');
      appendLog('ERROR: ' + e.message);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const fmt = OUTPUT_FORMATS[outputFormat];
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `compressed.${fmt.ext}`;
    a.click();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="tool-header">
        <div className="tool-icon-wrap bg-gradient-to-br from-blue-600 to-cyan-600">
          <Video size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Video Compressor</h1>
          <p className="text-sm text-zinc-500">FFmpeg.wasm — fully in-browser, no uploads</p>
        </div>
      </div>

      {/* Environment banner */}
      {HAS_SAB ? (
        <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-2.5 text-xs text-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <span>
            Cross-origin isolated — <strong>SharedArrayBuffer</strong> available.
            {' '}WASM runs in single-threaded mode; a 1-min clip may take 1–5 min to encode.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-xs text-red-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <span>
            <strong>SharedArrayBuffer is unavailable</strong> — the page is not cross-origin isolated.
            FFmpeg cannot run. Open <code>http://localhost:3000</code> directly in your browser
            (not via a proxy or iframe). The dev server sends the required <code>COOP/COEP</code> headers.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upload + settings */}
        <div className="card p-5 space-y-5">
          {!file ? (
            <DropZone
              onFiles={onFiles}
              accept={{ 'video/*': [], 'audio/*': [] }}
              multiple={false}
              label="Drop a video or audio file"
              sublabel="MP4, MOV, MKV, AVI, MP3, WAV…"
            />
          ) : (
            <div className="flex items-center gap-3 bg-zinc-800/60 rounded-xl px-3 py-2.5">
              <Video size={16} className="text-brand-400 shrink-0" />
              <span className="flex-1 text-sm text-zinc-300 truncate">{file.name}</span>
              <span className="text-xs text-zinc-600">{fmtBytes(file.size)}</span>
              <button onClick={() => { setFile(null); setOutputUrl(null); setStatus('idle'); }} className="btn-ghost p-1 text-red-400">
                <X size={14} />
              </button>
            </div>
          )}

          <div>
            <label className="label">Output format</label>
            <div className="flex flex-wrap gap-1">
              {OUTPUT_FORMATS.map((f, i) => (
                <button key={i} onClick={() => setOutputFormat(i)} className={i === outputFormat ? 'tab tab-active' : 'tab tab-inactive'}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Quality</label>
            <div className="space-y-1.5">
              {QUALITY_PRESETS.map((q, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${i === quality ? 'border-brand-500 bg-brand-600/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                  <input type="radio" name="quality" checked={i === quality} onChange={() => setQuality(i)} className="mt-0.5 accent-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{q.label}</p>
                    <p className="text-xs text-zinc-500">{q.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Resolution</label>
            <select className="input" value={resolution} onChange={(e) => setResolution(Number(e.target.value))}>
              {RESOLUTIONS.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
            </select>
          </div>

          <button
            onClick={handleCompress}
            disabled={!file || status === 'processing' || status === 'loading-ffmpeg'}
            className="btn-primary w-full"
          >
            {status === 'loading-ffmpeg' && <><Loader2 size={15} className="animate-spin" /> Loading FFmpeg…</>}
            {status === 'processing'     && <><Loader2 size={15} className="animate-spin" /> Compressing…</>}
            {(status === 'idle' || status === 'done' || status === 'error') && <><Video size={15} /> Compress</>}
          </button>
        </div>

        {/* Progress + output */}
        <div className="card p-5 space-y-5">
          {(status === 'processing' || status === 'loading-ffmpeg') && (
            <ProgressBar value={progress} label={status === 'loading-ffmpeg' ? 'Loading FFmpeg WASM…' : 'Compressing…'} sublabel={`${progress}%`} />
          )}

          {status === 'done' && outputUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-400">Compression complete</span>
                <span className="text-xs text-zinc-500">{fmtBytes(outputSize)} output</span>
              </div>
              <video src={outputUrl} controls className="w-full rounded-xl bg-black" />
              <button onClick={handleDownload} className="btn-primary w-full">
                <Download size={15} /> Download compressed file
              </button>
            </div>
          )}

          <div>
            <p className="label mb-2">FFmpeg console</p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] text-zinc-500 font-mono h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {log || 'Logs will appear here…'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
