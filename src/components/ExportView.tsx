import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { GentooProfile, PortageWorkspaceState } from '../types/portage';
import {
  generateCombinedPackageUse,
  generateMakeConf,
  generatePackageUseFiles,
} from '../utils/portageEngine';

interface ExportViewProps {
  state: PortageWorkspaceState;
  profile: GentooProfile;
}

export function ExportView({ state, profile }: ExportViewProps) {
  const [selectedFile, setSelectedFile] = useState<string>('make.conf');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const makeConfContent = useMemo(
    () => generateMakeConf(state, profile),
    [state, profile]
  );

  const packageUseFiles = useMemo(
    () => generatePackageUseFiles(state.packages),
    [state.packages]
  );

  const combinedPackageUse = useMemo(
    () => generateCombinedPackageUse(state.packages),
    [state.packages]
  );

  const fileTabs = useMemo(() => {
    return [
      { id: 'make.conf', label: '/etc/portage/make.conf', content: makeConfContent },
      {
        id: 'package.use',
        label: '/etc/portage/package.use (combined)',
        content: combinedPackageUse,
      },
      ...packageUseFiles.map((f) => ({
        id: f.filename,
        label: `/etc/portage/${f.filename}`,
        content: f.content,
      })),
    ];
  }, [makeConfContent, combinedPackageUse, packageUseFiles]);

  const activeFile =
    fileTabs.find((f) => f.id === selectedFile) ?? fileTabs[0];

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fallback copy if clipboard permission restricted
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const cleanName = filename.replace(/\//g, '-');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const emergeCommand =
    'emerge --ask --verbose --update --deep --newuse @world';

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Generated Portage Config Files
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Copy or download clean configuration files ready for /etc/portage/.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCopy(activeFile.id, activeFile.content)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {copiedKey === activeFile.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy File
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownload(activeFile.id, activeFile.content)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* File tabs + code viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-1">
          {fileTabs.map((tab) => {
            const isActive = activeFile.id === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFile(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded font-mono text-xs transition-colors truncate ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Apply changes on host
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 flex items-center justify-between gap-2">
              <code className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                {emergeCommand}
              </code>
              <button
                type="button"
                onClick={() => handleCopy('emerge-cmd', emergeCommand)}
                aria-label="Copy emerge command"
                className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                {copiedKey === 'emerge-cmd' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{activeFile.label}</span>
              <span className="tabular-nums">
                {activeFile.content.split('\n').length - 1} lines
              </span>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">
              {activeFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
