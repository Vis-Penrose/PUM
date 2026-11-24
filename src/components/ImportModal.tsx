import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rawText: string, mode: 'merge' | 'replace') => void;
}

const SAMPLE_SNIPPET = `# /etc/portage/make.conf
USE="wayland pipewire vaapi lto -pulseaudio -cups"
VIDEO_CARDS="amdgpu radeonsi"

# /etc/portage/package.use/custom
www-client/firefox pgo lto -telemetry
media-video/ffmpeg x265 svt-av1 -debug
>=app-emulation/qemu-9.0 spice usbredir virgl`;

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      if (typeof content === 'string') {
        setRawText((prev) => (prev ? `${prev}\n${content}` : content));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    onImport(rawText, mode);
    setRawText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2
            id="import-modal-title"
            className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Import make.conf or package.use
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Paste lines from /etc/portage/make.conf or /etc/portage/package.use/*, or upload a file.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_SNIPPET)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              >
                Load Example
              </button>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                Upload File
                <input
                  type="file"
                  accept=".conf,.use,.txt,*"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder={'USE="wayland pipewire -pulseaudio"\nwww-client/firefox pgo lto -telemetry'}
            className="w-full p-3 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Merge with current rules
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Replace existing overrides
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rawText.trim()}
                className="px-4 py-2 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Import Rules
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
