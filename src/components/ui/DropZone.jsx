import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';
import { UploadCloud } from 'lucide-react';

export default function DropZone({
  onFiles,
  accept,
  multiple = true,
  label = 'Drop files here',
  sublabel,
  className,
  disabled = false,
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => onFiles(accepted),
    accept,
    multiple,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'dropzone-base select-none',
        isDragActive && 'dropzone-active',
        disabled && 'opacity-40 pointer-events-none',
        className,
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div
          className={clsx(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-200',
            isDragActive ? 'bg-brand-600/20' : 'bg-zinc-800',
          )}
        >
          <UploadCloud
            size={24}
            className={isDragActive ? 'text-brand-400' : 'text-zinc-500'}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{label}</p>
          {sublabel && <p className="text-xs text-zinc-500 mt-0.5">{sublabel}</p>}
          {!isDragActive && (
            <p className="text-xs text-zinc-600 mt-1">or click to browse</p>
          )}
        </div>
      </div>
    </div>
  );
}
