import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Download, ZoomIn, ZoomOut } from 'lucide-react';
import DropZone from '../../components/ui/DropZone';
import { ToastContainer, useToast } from '../../components/ui/Toast';

const FORMATS = [
  { label: 'US Passport (2×2 in)',        w: 600,  h: 600  },
  { label: 'EU Biometric (35×45 mm)',      w: 413,  h: 531  },
  { label: 'UK Passport (35×45 mm)',       w: 413,  h: 531  },
  { label: 'Indian Passport (51×51 mm)',   w: 600,  h: 600  },
];

const FORMAT_LABELS = [
  { label: 'US Passport (2×2 in)',       inches: '2×2 in'    },
  { label: 'EU Biometric (35×45 mm)',    inches: '35×45 mm'  },
  { label: 'UK Passport (35×45 mm)',     inches: '35×45 mm'  },
  { label: 'Indian Passport (51×51 mm)', inches: '51×51 mm'  },
];

const LAYOUTS = [
  { label: '4×6 inch sheet (4 photos)', cols: 2, rows: 2 },
  { label: 'A4 sheet (6 photos)',        cols: 3, rows: 2 },
];

// Draws the image onto a canvas using "cover" fitting + zoom + pan
function drawImageCovered(ctx, img, canvasW, canvasH, zoom, panX, panY) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return;

  // Base scale so the image covers the frame (object-fit: cover)
  const baseScale = Math.max(canvasW / nw, canvasH / nh);
  const finalScale = baseScale * zoom;

  const drawW = nw * finalScale;
  const drawH = nh * finalScale;

  // Centre the image then apply pan
  const x = (canvasW - drawW) / 2 + panX;
  const y = (canvasH - drawH) / 2 + panY;

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(img, x, y, drawW, drawH);
}

export default function PassportPhoto() {
  const [imgSrc, setImgSrc]   = useState(null);
  const [format, setFormat]   = useState(0);
  const [layout, setLayout]   = useState(0);
  const [zoom, setZoom]       = useState(1);
  const [pan, setPan]         = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [previewDataUrl, setPreviewDataUrl] = useState(null);

  const imgRef      = useRef(null);   // hidden <img> used as draw source
  const canvasRef   = useRef(null);   // the visible crop canvas
  const { toasts, dismiss, toast } = useToast();

  const fmt = FORMATS[format];

  // Redraws the visible crop canvas and captures a preview data URL for the tile grid
  const redraw = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext('2d');
    drawImageCovered(ctx, img, canvas.width, canvas.height, zoom, pan.x, pan.y);
    setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.92));
  }, [zoom, pan]);

  useEffect(() => { redraw(); }, [redraw, format]);

  const onFiles = useCallback((files) => {
    const f = files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImgSrc(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Drag handlers ──
  const getClient = (e) => {
    if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const startDrag = (e) => {
    const { x, y } = getClient(e);
    setDragging(true);
    setDragStart({ mx: x, my: y, px: pan.x, py: pan.y });
    e.preventDefault();
  };

  const onDrag = (e) => {
    if (!dragging) return;
    const { x, y } = getClient(e);
    setPan({ x: dragStart.px + (x - dragStart.mx), y: dragStart.py + (y - dragStart.my) });
    e.preventDefault();
  };

  const stopDrag = () => setDragging(false);

  // ── Export ──
  const exportPrint = () => {
    const img = imgRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) {
      toast.error('Photo not yet loaded.');
      return;
    }

    const lay = LAYOUTS[layout];
    const photoW = fmt.w;   // already in 300-DPI pixels
    const photoH = fmt.h;

    // Draw single photo tile
    const tile = document.createElement('canvas');
    tile.width  = photoW;
    tile.height = photoH;
    drawImageCovered(tile.getContext('2d'), img, photoW, photoH, zoom, pan.x * (photoW / (canvasRef.current?.width || photoW)), pan.y * (photoH / (canvasRef.current?.height || photoH)));

    // Build print sheet (gap = 20px at 300 DPI)
    const GAP = 20;
    const sheet = document.createElement('canvas');
    sheet.width  = lay.cols * photoW + (lay.cols + 1) * GAP;
    sheet.height = lay.rows * photoH + (lay.rows + 1) * GAP;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    for (let r = 0; r < lay.rows; r++) {
      for (let c = 0; c < lay.cols; c++) {
        ctx.drawImage(tile, GAP + c * (photoW + GAP), GAP + r * (photoH + GAP));
      }
    }

    sheet.toBlob((blob) => {
      if (!blob) { toast.error('Export failed — canvas error.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'passport_print_300dpi.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('300 DPI print sheet downloaded!');
    }, 'image/png');
  };

  // Canvas dimensions for UI (preview canvas always fits the card)
  const CANVAS_W = 240;
  const CANVAS_H = Math.round(CANVAS_W * fmt.h / fmt.w);

  return (
    <div className="animate-fade-in space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Hidden source image — no crossOrigin so canvas is never tainted */}
      {imgSrc && (
        <img
          ref={imgRef}
          src={imgSrc}
          alt=""
          style={{ display: 'none' }}
          onLoad={redraw}
        />
      )}

      <div className="tool-header">
        <div className="tool-icon-wrap bg-gradient-to-br from-violet-600 to-indigo-700">
          <Camera size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Passport Photo</h1>
          <p className="text-sm text-zinc-500">Crop · Tile · Export 300 DPI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Controls */}
        <div className="card p-5 space-y-5">
          {!imgSrc ? (
            <DropZone
              onFiles={onFiles}
              accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
              multiple={false}
              label="Drop your photo"
              sublabel="JPG, PNG, WebP"
            />
          ) : (
            <>
              {/* Crop canvas */}
              <div className="flex flex-col items-center gap-2">
                <p className="label self-start">Drag to reposition</p>
                <canvas
                  ref={canvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  className="rounded-xl border-4 border-brand-500/60 cursor-move select-none bg-zinc-800"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrag}
                  onMouseMove={onDrag}
                  onMouseUp={stopDrag}
                  onMouseLeave={stopDrag}
                  onTouchStart={startDrag}
                  onTouchMove={onDrag}
                  onTouchEnd={stopDrag}
                />
              </div>

              <div>
                <label className="label">Zoom ({Math.round(zoom * 100)}%)</label>
                <div className="flex items-center gap-2">
                  <ZoomOut size={14} className="text-zinc-500" />
                  <input
                    type="range" min={100} max={400} step={5}
                    value={Math.round(zoom * 100)}
                    onChange={(e) => { setZoom(e.target.value / 100); }}
                    className="flex-1 accent-brand-500"
                  />
                  <ZoomIn size={14} className="text-zinc-500" />
                </div>
              </div>

              <button onClick={() => { setImgSrc(null); setPan({ x: 0, y: 0 }); setZoom(1); }} className="btn-ghost text-xs">
                Change photo
              </button>
            </>
          )}

          <div>
            <label className="label">Photo format</label>
            <select className="input" value={format} onChange={(e) => { setFormat(Number(e.target.value)); setPan({ x: 0, y: 0 }); }}>
              {FORMAT_LABELS.map((f, i) => <option key={i} value={i}>{f.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Print layout</label>
            <select className="input" value={layout} onChange={(e) => setLayout(Number(e.target.value))}>
              {LAYOUTS.map((l, i) => <option key={i} value={i}>{l.label}</option>)}
            </select>
          </div>

          <button onClick={exportPrint} disabled={!imgSrc} className="btn-primary w-full">
            <Download size={15} /> Export 300 DPI Print Sheet
          </button>
        </div>

        {/* Preview panel */}
        <div className="card p-5 space-y-4">
          <p className="label">Print layout preview</p>
          {previewDataUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div
                className="inline-grid gap-1.5 p-3 bg-zinc-800 rounded-xl"
                style={{ gridTemplateColumns: `repeat(${LAYOUTS[layout].cols}, 1fr)` }}
              >
                {Array.from({ length: LAYOUTS[layout].cols * LAYOUTS[layout].rows }).map((_, i) => (
                  <img
                    key={i}
                    src={previewDataUrl}
                    alt=""
                    className="rounded border border-zinc-700"
                    style={{ width: 80, height: Math.round(80 * fmt.h / fmt.w), objectFit: 'cover' }}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500 text-center">
                {FORMAT_LABELS[format].label}<br />
                Output: {fmt.w} × {fmt.h} px per photo @ 300 DPI
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
              Upload a photo to see preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
