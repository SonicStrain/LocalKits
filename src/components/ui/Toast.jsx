import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, XCircle, AlertTriangle, X, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'bg-emerald-900/80 border-emerald-700/60 text-emerald-200',
  error:   'bg-red-900/80   border-red-700/60   text-red-200',
  warning: 'bg-amber-900/80 border-amber-700/60 text-amber-200',
  info:    'bg-zinc-800/90  border-zinc-700      text-zinc-200',
};

const ICON_STYLES = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-zinc-400',
};

export function Toast({ message, type = 'info', onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(true);
  const Icon = ICONS[type];

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm max-w-sm w-full transition-all duration-200',
        STYLES[type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      <Icon size={16} className={clsx('mt-0.5 shrink-0', ICON_STYLES[type])} />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 200); }} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

let _id = 0;
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = (message, type = 'info') => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return {
    toasts,
    dismiss,
    toast: {
      success: (m) => push(m, 'success'),
      error:   (m) => push(m, 'error'),
      warning: (m) => push(m, 'warning'),
      info:    (m) => push(m, 'info'),
    },
  };
}
