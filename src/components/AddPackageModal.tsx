import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { parseAtomParts } from '../utils/portageEngine';

interface AddPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPackage: (payload: {
    atom: string;
    category: string;
    name: string;
    description: string;
    targetFile: string;
    initialFlags: string[];
  }) => void;
}

export function AddPackageModal({
  isOpen,
  onClose,
  onAddPackage,
}: AddPackageModalProps) {
  const [atomInput, setAtomInput] = useState('');
  const [description, setDescription] = useState('');
  const [targetFile, setTargetFile] = useState('custom');
  const [flagsInput, setFlagsInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAtomParts(atomInput);
    if (!parsed) {
      setError('Enter a valid Gentoo atom like media-video/vlc or >=dev-python/numpy-2.0');
      return;
    }

    const flags = flagsInput
      .split(/\s+/)
      .map((f) => f.trim())
      .filter(Boolean);

    onAddPackage({
      atom: parsed.atom,
      category: parsed.category,
      name: parsed.name,
      description: description.trim() || 'Custom Portage package entry',
      targetFile,
      initialFlags: flags,
    });

    setAtomInput('');
    setDescription('');
    setFlagsInput('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-pkg-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2
            id="add-pkg-modal-title"
            className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Add Package Atom
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
          <div className="space-y-1.5">
            <label
              htmlFor="atom-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Portage Atom
            </label>
            <input
              id="atom-input"
              type="text"
              value={atomInput}
              onChange={(e) => {
                setAtomInput(e.target.value);
                setError('');
              }}
              placeholder="e.g. media-video/vlc or >=dev-db/postgresql-16:16"
              className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="pkg-desc-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Note (Optional)
              </label>
              <input
                id="pkg-desc-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VLC media player"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="pkg-file-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Target File
              </label>
              <select
                id="pkg-file-select"
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="custom">package.use/custom</option>
                <option value="desktop">package.use/desktop</option>
                <option value="media">package.use/media</option>
                <option value="system">package.use/system</option>
                <option value="dev">package.use/dev</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="pkg-flags-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Initial USE Flags (Space-separated, prefix with - to disable)
            </label>
            <input
              id="pkg-flags-input"
              type="text"
              value={flagsInput}
              onChange={(e) => setFlagsInput(e.target.value)}
              placeholder="e.g. wayland vaapi -qt5"
              className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
            >
              Add Package
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
