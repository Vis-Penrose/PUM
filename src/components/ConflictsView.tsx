import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ConflictItem } from '../types/portage';

interface ConflictsViewProps {
  conflicts: ConflictItem[];
  onApplyFix: (fix: ConflictItem['fixes'][number]) => void;
  onJumpToPackage: (packageId: string) => void;
}

export function ConflictsView({
  conflicts,
  onApplyFix,
  onJumpToPackage,
}: ConflictsViewProps) {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          REQUIRED_USE & Constraint Checker
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Validates ebuild REQUIRED_USE constraints and global flag exclusions before running emerge.
        </p>
      </div>

      {conflicts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            No USE flag conflicts detected
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            All global flags and per-package overrides currently satisfy Portage REQUIRED_USE rules.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md divide-y divide-slate-200 dark:divide-slate-800">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      conflict.severity === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {conflict.scope === 'global'
                          ? 'make.conf (global)'
                          : conflict.atom}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <code className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {conflict.expression}
                      </code>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {conflict.message}
                    </p>
                  </div>
                </div>

                {conflict.scope === 'package' && conflict.packageId && (
                  <button
                    type="button"
                    onClick={() => onJumpToPackage(conflict.packageId!)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    Inspect Package
                  </button>
                )}
              </div>

              <div className="pl-7 flex flex-wrap items-center gap-2">
                {conflict.fixes.map((fix) => (
                  <button
                    key={fix.label}
                    type="button"
                    onClick={() => onApplyFix(fix)}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors whitespace-nowrap"
                  >
                    {fix.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
