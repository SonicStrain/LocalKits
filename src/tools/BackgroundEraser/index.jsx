import { useState, useRef, useCallback } from 'react';
import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';
import { Wand2, Download, Loader2, Info, Cpu, Zap } from 'lucide-react';
import DropZone from '../../components/ui/DropZone';
import ProgressBar from '../../components/ui/ProgressBar';
import { ToastContainer, useToast } from '../../components/ui/Toast';

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'briaai/RMBG-1.4';

const PROCESSOR_CONFIG = {
  do_normalize: true,
  do_pad: false,
  do_rescale: true,
  do_resize: true,
  image_mean: [0.5, 0.5, 0.5],
  image_std: [1, 1, 1],
  resample: 2,
  size: { width: 1024, height: 1024 },
};

function BackgroundColor({ bg, setPreviewBg }) {
  const OPTIONS = [
    { label: 'Transparent', value: 'transparent', cls: 'bg-[repeating-conic-gradient(#808080_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]' },
    { label: 'White',       value: '#ffffff',      cls: 'bg-white' },
    { label: 'Black',       value: '#000000',      cls: 'bg-black' },
    { label: 'Gray',        value: '#374151',      cls: 'bg-gray-700' },
    { label: 'Blue',        value: '#1e40af',      cls: 'bg-blue-800' },
  ];

  return (
    <div>
      <p className="label mb-2">Preview background</p>
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setPreviewBg(o.value)}
            title={o.label}
            className={`w-7 h-7 rounded-full border-2 transition-all ${bg === o.value ? 'border-brand-400 scale-110' : 'border-zinc-700'} ${o.cls}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function BackgroundEraser() {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [outputUrl, setOutputUrl] = useState(null);
  const [previewBg, setPreviewBg] = useState('transparent');
  const [status, setStatus] = useState('idle'); // idle | loading-model | processing | done | error
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [gpuBackend, setGpuBackend] = useState(null);
  const modelRef = useRef(null);
  const processorRef = useRef(null);
  const { toasts, dismiss, toast } = useToast();

  const onFiles = useCallback((files) => {
    const f = files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImgSrc(url);
    setImgFile(f);
    setOutputUrl(null);
    setStatus('idle');
  }, []);

  const loadModel = async () => {
    if (modelRef.current) return;

    setStatus('loading-model');
    setProgress(5);

    // Try WebGPU first, fall back to wasm
    let device = 'wasm';
    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) { device = 'webgpu'; }
      }
    } catch { /* no webgpu */ }

    setGpuBackend(device);
    setStatusMsg(`Loading AI model via ${device.toUpperCase()} (first load ~90 MB — cached locally after) …`);
    setProgress(10);

    try {
      modelRef.current = await AutoModel.from_pretrained(MODEL_ID, {
        config: { model_type: 'custom' },
        device,
        dtype: device === 'webgpu' ? 'fp16' : 'fp32',
      });
      processorRef.current = await AutoProcessor.from_pretrained(MODEL_ID, {
        config: PROCESSOR_CONFIG,
      });
      setProgress(50);
    } catch (e) {
      // If WebGPU failed, retry with wasm
      if (device !== 'wasm') {
        setGpuBackend('wasm');
        setStatusMsg('WebGPU unavailable, falling back to WASM…');
        modelRef.current = await AutoModel.from_pretrained(MODEL_ID, {
          config: { model_type: 'custom' },
          device: 'wasm',
          dtype: 'fp32',
        });
        processorRef.current = await AutoProcessor.from_pretrained(MODEL_ID, {
          config: PROCESSOR_CONFIG,
        });
        setProgress(50);
      } else {
        throw e;
      }
    }
  };

  const handleErase = async () => {
    if (!imgSrc) { toast.error('Upload an image first.'); return; }
    setOutputUrl(null);
    setProgress(0);

    try {
      await loadModel();
    } catch (e) {
      toast.error('Model load failed: ' + e.message);
      setStatus('error');
      setStatusMsg('Failed to load model.');
      return;
    }

    setStatus('processing');
    setStatusMsg('Running inference…');
    setProgress(55);

    try {
      // Load image for inference
      const image = await RawImage.fromURL(imgSrc);
      const origW = image.width;
      const origH = image.height;

      setProgress(65);

      // Run model
      const { pixel_values } = await processorRef.current(image);
      const { output } = await modelRef.current({ input: pixel_values });

      setProgress(85);

      // Upscale mask to original dimensions
      const maskRaw = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(origW, origH);

      // Compose output on canvas
      const canvas = document.createElement('canvas');
      canvas.width = origW;
      canvas.height = origH;
      const ctx = canvas.getContext('2d');

      // Draw original image
      const imgEl = new Image();
      imgEl.src = imgSrc;
      await new Promise((res) => { imgEl.onload = res; });
      ctx.drawImage(imgEl, 0, 0);

      // Apply alpha mask
      const imgData = ctx.getImageData(0, 0, origW, origH);
      for (let i = 0; i < maskRaw.data.length; i++) {
        imgData.data[4 * i + 3] = maskRaw.data[i];
      }
      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setProgress(100);
        setStatus('done');
        setStatusMsg('Done!');
        toast.success('Background removed successfully!');
      }, 'image/png');
    } catch (e) {
      toast.error('Inference failed: ' + e.message);
      setStatus('error');
      setStatusMsg('Inference failed: ' + e.message);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = 'no-background.png';
    a.click();
  };

  const isLoading = status === 'loading-model' || status === 'processing';

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="tool-header">
        <div className="tool-icon-wrap bg-gradient-to-br from-emerald-600 to-teal-600">
          <Wand2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">AI Background Eraser</h1>
          <p className="text-sm text-zinc-500">RMBG-1.4 · WebGPU accelerated · On-device</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-3 text-xs text-blue-200">
        <Info size={14} className="mt-0.5 shrink-0 text-blue-400" />
        <div>
          <strong>On-device AI</strong> — Model is ~90 MB (downloaded once, cached in your browser).{' '}
          {gpuBackend && (
            <span className="inline-flex items-center gap-1 ml-1">
              {gpuBackend === 'webgpu' ? <><Zap size={11} className="text-amber-400" /> WebGPU</> : <><Cpu size={11} className="text-zinc-400" /> WASM</>} backend active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="card p-5 space-y-5">
          {!imgSrc ? (
            <DropZone
              onFiles={onFiles}
              accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
              multiple={false}
              label="Drop an image"
              sublabel="JPG, PNG, WebP"
            />
          ) : (
            <div className="space-y-3">
              <p className="label">Original</p>
              <img src={imgSrc} alt="original" className="w-full rounded-xl object-contain max-h-64 bg-zinc-800" />
              <button onClick={() => { setImgSrc(null); setImgFile(null); setOutputUrl(null); setStatus('idle'); }} className="btn-ghost text-xs">
                Change image
              </button>
            </div>
          )}

          {(isLoading || status === 'done') && (
            <ProgressBar value={progress} label={statusMsg || 'Processing…'} sublabel={`${progress}%`} />
          )}

          <button
            onClick={handleErase}
            disabled={!imgSrc || isLoading}
            className="btn-primary w-full"
          >
            {isLoading
              ? <><Loader2 size={15} className="animate-spin" /> {status === 'loading-model' ? 'Loading model…' : 'Processing…'}</>
              : <><Wand2 size={15} /> Remove Background</>
            }
          </button>
        </div>

        {/* Output */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="label">Result</p>
            {outputUrl && (
              <button onClick={handleDownload} className="btn-secondary gap-2 text-xs py-1.5 px-3">
                <Download size={13} /> Download PNG
              </button>
            )}
          </div>

          <BackgroundColor bg={previewBg} setPreviewBg={setPreviewBg} />

          {outputUrl ? (
            <div
              className="w-full rounded-xl overflow-hidden"
              style={{
                background: previewBg === 'transparent'
                  ? 'repeating-conic-gradient(#404040 0% 25%, #2a2a2a 0% 50%) 0 0 / 20px 20px'
                  : previewBg,
              }}
            >
              <img src={outputUrl} alt="result" className="w-full object-contain max-h-64" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-xl bg-zinc-800/50 text-zinc-600 text-sm border border-zinc-800 border-dashed">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                  <p className="text-zinc-500 text-xs text-center max-w-[180px]">{statusMsg}</p>
                </div>
              ) : 'Result will appear here'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
