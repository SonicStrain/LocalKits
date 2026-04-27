import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Zap, Home, FileStack, Camera, FileText,
  Video, ImageDown, Wand2, X, ChevronRight,
  Shield, SlidersHorizontal,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: Home, label: 'Home', exact: true },
    ],
  },
  {
    label: 'Document Tools',
    items: [
      { to: '/pdf-toolkit',    icon: FileStack, label: 'PDF Toolkit',    rank: 1 },
      { to: '/passport-photo', icon: Camera,    label: 'Passport Photo', rank: 6 },
      { to: '/resume-builder', icon: FileText,  label: 'Resume Builder', rank: 7 },
    ],
  },
  {
    label: 'Media Tools',
    items: [
      { to: '/image-converter',  icon: SlidersHorizontal, label: 'Image Converter',  rank: 2 },
      { to: '/heic-converter',   icon: ImageDown,         label: 'HEIC Converter',   rank: 3 },
      { to: '/video-compressor', icon: Video,             label: 'Video Compressor', rank: 5 },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/background-eraser', icon: Wand2, label: 'BG Eraser', rank: 4 },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 z-40 flex flex-col',
          'bg-zinc-950 border-r border-zinc-800',
          'transition-transform duration-250 ease-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-800">
          <NavLink to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-blue-500 flex items-center justify-center shadow-lg">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-zinc-100 text-base tracking-tight">LocalKits</span>
          </NavLink>
          <button
            onClick={onClose}
            className="md:hidden btn-ghost p-1.5 rounded-lg"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, exact, rank }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={exact}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-brand-600/15 text-brand-300 border border-brand-600/20'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={16} className={isActive ? 'text-brand-400' : 'text-zinc-500'} />
                          <span className="flex-1">{label}</span>
                          {rank != null && (
                            <span className={clsx(
                              'text-[10px] font-bold tabular-nums',
                              isActive ? 'text-brand-500/70' : 'text-zinc-700',
                            )}>
                              #{rank}
                            </span>
                          )}
                          {isActive && <ChevronRight size={12} className="text-brand-500" />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Shield size={12} className="text-emerald-600" />
            <span>100% local — zero uploads</span>
          </div>
        </div>
      </aside>
    </>
  );
}
