import { Link } from 'react-router-dom';
import { FileStack, Camera, FileText, Video, ImageDown, Wand2, Shield, Zap, ArrowRight, Cpu, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

const TOOLS = [
  {
    rank: 1,
    to: '/pdf-toolkit',
    icon: FileStack,
    label: 'PDF Toolkit',
    description: 'Merge PDFs, split by page ranges, and apply text watermarks — all without leaving your browser.',
    badge: 'Document',
    badgeClass: 'badge-violet',
    iconBg: 'from-violet-600 to-purple-700',
  },
  {
    rank: 2,
    to: '/image-converter',
    icon: SlidersHorizontal,
    label: 'Image Converter',
    description: 'Batch convert JPG, PNG, and WebP. Hit a custom file-size range via binary-search quality tuning.',
    badge: 'Media',
    badgeClass: 'badge-blue',
    iconBg: 'from-pink-600 to-rose-500',
  },
  {
    rank: 3,
    to: '/heic-converter',
    icon: ImageDown,
    label: 'HEIC Converter',
    description: 'Batch-convert iOS HEIC photos to JPG or PNG instantly, with a smart concurrency queue.',
    badge: 'Media',
    badgeClass: 'badge-blue',
    iconBg: 'from-cyan-600 to-teal-600',
  },
  {
    rank: 4,
    to: '/background-eraser',
    icon: Wand2,
    label: 'BG Eraser',
    description: 'AI-powered background removal running on WebGPU (falls back to WASM). Full-resolution output.',
    badge: 'AI',
    badgeClass: 'badge-emerald',
    iconBg: 'from-emerald-600 to-teal-600',
  },
  {
    rank: 5,
    to: '/video-compressor',
    icon: Video,
    label: 'Video Compressor',
    description: 'Compress video/audio using FFmpeg.wasm. Real-time progress, multiple quality presets.',
    badge: 'Media',
    badgeClass: 'badge-blue',
    iconBg: 'from-blue-600 to-cyan-600',
  },
  {
    rank: 6,
    to: '/passport-photo',
    icon: Camera,
    label: 'Passport Photo',
    description: 'Crop your photo to government-compliant dimensions and tile a 300 DPI print layout.',
    badge: 'Document',
    badgeClass: 'badge-violet',
    iconBg: 'from-violet-600 to-indigo-700',
  },
  {
    rank: 7,
    to: '/resume-builder',
    icon: FileText,
    label: 'Resume Builder',
    description: 'Fill a form, pick a template, and export a pixel-perfect PDF resume via browser print.',
    badge: 'Document',
    badgeClass: 'badge-violet',
    iconBg: 'from-blue-600 to-violet-700',
  },
];

const PERKS = [
  { icon: Shield, label: 'Zero uploads', desc: 'Files never leave your device' },
  { icon: Zap,    label: 'Instant',      desc: 'No server round-trips' },
  { icon: Cpu,    label: 'GPU-powered',  desc: 'WebGPU acceleration when available' },
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-500 flex items-center justify-center shadow-xl">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">LocalKits</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 leading-tight mb-3">
          Privacy-first browser tools.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-400">
            Zero cloud. Zero cost.
          </span>
        </h1>
        <p className="text-zinc-400 text-base max-w-xl">
          PDF manipulation, media transcoding, and on-device AI inference — all processed locally in your browser with no server payloads.
        </p>

        {/* Perks */}
        <div className="flex flex-wrap gap-3 mt-5">
          {PERKS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <Icon size={14} className="text-brand-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-zinc-200">{label}</span>
                <span className="text-xs text-zinc-500 ml-1.5">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map(({ rank, to, icon: Icon, label, description, badge, badgeClass, iconBg }) => (
          <Link
            key={to}
            to={to}
            className={clsx(
              'group card p-5 flex flex-col gap-4',
              'hover:border-zinc-700 hover:bg-zinc-900/80',
              'transition-all duration-200 cursor-pointer',
            )}
          >
            <div className="flex items-start justify-between">
              <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', iconBg)}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-600 tabular-nums">#{rank}</span>
                <span className={badgeClass}>{badge}</span>
              </div>
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-zinc-100 mb-1.5">{label}</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
            </div>

            <div className="flex items-center gap-1 text-xs font-medium text-brand-400 group-hover:gap-2 transition-all duration-150">
              Open tool <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
