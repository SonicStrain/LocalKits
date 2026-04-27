import { clsx } from 'clsx';

export default function ProgressBar({ value = 0, label, sublabel, className, size = 'md' }) {
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };

  return (
    <div className={clsx('w-full', className)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between mb-2">
          {label   && <span className="text-xs font-medium text-zinc-300">{label}</span>}
          {sublabel && <span className="text-xs text-zinc-500">{sublabel}</span>}
        </div>
      )}
      <div className={clsx('progress-track', heights[size])}>
        <div
          className={clsx('progress-fill', heights[size])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
