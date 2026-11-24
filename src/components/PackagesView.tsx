import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Search, Trash2, X } from 'lucide-react';
import {
  ConflictItem,
  FlagOverrideState,
  GentooProfile,
  GlobalFlagState,
  PackageEntry,
} from '../types/portage';
import { resolvePackageFlags } from '../utils/portageEngine';

interface PackagesViewProps {
  packages: PackageEntry[];
  profile: GentooProfile;
  globalFlags: Record<string, GlobalFlagState>;
  conflicts: ConflictItem[];
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
  onSetPackageFlag: (packageId: string, flag: string, state: FlagOverrideState) => void;
  onAddCustomFlag: (packageId: string, flag: string, state: FlagOverrideState) => void;
  onSetTargetFile: (packageId: string, targetFile: string) => void;
  onClearPackageOverrides: (packageId: string) => void;
  onDeletePackage: (packageId: string) => void;
  onApplyConflictFix: (fix: ConflictItem['fixes'][number]) => void;
  onOpenAddPackage: () => void;
}

const TARGET_FILES = ['desktop', 'media', 'system', 'dev', 'custom'];

export function PackagesView({
  packages,
  profile,
  globalFlags,
  conflicts,
  selectedPackageId,
  onSelectPackage,
  onSetPackageFlag,
  onAddCustomFlag,
  onSetTargetFile,
  onClearPackageOverrides,
  onDeletePackage,
  onApplyConflictFix,
  onOpenAddPackage,
}: PackagesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'modified' | 'conflicts'>('all');
  const [newFlagInput, setNewFlagInput] = useState('');
  const [newFlagState, setNewFlagState] = useState<'enable' | 'disable'>('enable');

  const packageConflictsMap = useMemo(() => {
    const map = new Map<string, ConflictItem[]>();
    for (const c of conflicts) {
      if (c.scope === 'package' && c.packageId) {
        const list = map.get(c.packageId) ?? [];
        list.push(c);
        map.set(c.packageId, list);
      }
    }
    return map;
  }, [conflicts]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((pkg) => {
      const overrideCount = Object.values(pkg.overrides).filter(
        (v) => v !== 'inherit'
      ).length;
      const hasConflict = packageConflictsMap.has(pkg.id);

      if (filterMode === 'modified' && overrideCount === 0) return false;
      if (filterMode === 'conflicts' && !hasConflict) return false;

      if (!q) return true;
      return (
        pkg.atom.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.iuse.some((f) => f.flag.toLowerCase().includes(q)) ||
        Object.keys(pkg.overrides).some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [packages, searchQuery, filterMode, packageConflictsMap]);

  const activePackage = useMemo(() => {
    return (
      packages.find((p) => p.id === selectedPackageId) ??
      filteredPackages[0] ??
      packages[0] ??
      null
    );
  }, [packages, filteredPackages, selectedPackageId]);

  const resolvedFlags = useMemo(() => {
    if (!activePackage) return [];
    return resolvePackageFlags(activePackage, profile, globalFlags);
  }, [activePackage, profile, globalFlags]);

  const activeConflicts = activePackage
    ? packageConflictsMap.get(activePackage.id) ?? []
    : [];

  const activeOverrideCount = activePackage
    ? Object.values(activePackage.overrides).filter((v) => v !== 'inherit').length
    : 0;

  const handleAddFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePackage) return;
    const cleaned = newFlagInput.trim().replace(/^[+-]/, '');
    if (!cleaned) return;
    onAddCustomFlag(activePackage.id, cleaned, newFlagState);
    setNewFlagInput('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[calc(100vh-3.5rem)]">
      {/* Left Master Package List */}
      <section className="xl:col-span-5 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter atoms or USE flags (e.g. wayland, ffmpeg)"
              aria-label="Filter packages or USE flags"
              className="w-full pl-9 pr-8 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded"
              role="tablist"
              aria-label="Filter packages by rule status"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'modified', label: 'Overridden' },
                  { id: 'conflicts', label: 'Conflicts' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filterMode === tab.id}
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    filterMode === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              {filteredPackages.length} packages
            </span>
          </div>
        </div>

        {filteredPackages.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No matching packages found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear your filter or add a custom Gentoo package atom directly.
            </p>
            <button
              type="button"
              onClick={onOpenAddPackage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Package Atom
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto">
            {filteredPackages.map((pkg) => {
              const isSelected = activePackage?.id === pkg.id;
              const overrideCount = Object.values(pkg.overrides).filter(
                (v) => v !== 'inherit'
              ).length;
              const pkgConflicts = packageConflictsMap.get(pkg.id)?.length ?? 0;

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onSelectPackage(pkg.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-sm font-medium truncate ${
                          isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {pkg.atom}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                      <span>package.use/{pkg.targetFile}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{pkg.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {pkgConflicts > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {pkgConflicts}
                      </span>
                    )}
                    {overrideCount > 0 && (
                      <span className="font-mono text-xs text-indigo-700 dark:text-indigo-300 tabular-nums">
                        {overrideCount} {overrideCount === 1 ? 'rule' : 'rules'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Right Detail Package Flag Editor */}
      <section className="xl:col-span-7 bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
        {!activePackage ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select a package from the list or add a custom atom to configure its USE flags.
            </p>
          </div>
        ) : (
          <>
            {/* Package Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{activePackage.category}</span>
                  <span aria-hidden="true">/</span>
                  <span>{activePackage.isCustom ? 'Custom atom' : 'Ebuild IUSE catalog'}</span>
                </div>
                <h2 className="font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 break-all">
                  {activePackage.atom}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {activePackage.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="sr-only" htmlFor="target-file-select">
                  Target package.use file
                </label>
                <select
                  id="target-file-select"
                  value={activePackage.targetFile}
                  onChange={(e) => onSetTargetFile(activePackage.id, e.target.value)}
                  className="px-2.5 py-2 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TARGET_FILES.map((file) => (
                    <option key={file} value={file}>
                      package.use/{file}
                    </option>
                  ))}
                </select>

                {activeOverrideCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onClearPackageOverrides(activePackage.id)}
                    className="px-3 py-2 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Clear Overrides
                  </button>
                )}

                {activePackage.isCustom && (
                  <button
                    type="button"
                    onClick={() => onDeletePackage(activePackage.id)}
                    aria-label="Remove custom package"
                    title="Remove custom package"
                    className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Inline REQUIRED_USE Conflicts */}
            {activeConflicts.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4 space-y-3">
                {activeConflicts.map((conflict) => (
                  <div key={conflict.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-xs font-mono font-medium text-amber-900 dark:text-amber-200">
                            REQUIRED_USE: {conflict.expression}
                          </div>
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            {conflict.message}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {conflict.fixes.map((fix) => (
                        <button
                          key={fix.label}
                          type="button"
                          onClick={() => onApplyConflictFix(fix)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap"
                        >
                          {fix.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Live package.use line preview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Generated line in /etc/portage/package.use/{activePackage.targetFile}
                </div>
                <code className="block font-mono text-xs text-slate-900 dark:text-slate-100 truncate">
                  {activeOverrideCount === 0
                    ? `# ${activePackage.atom} (all flags inherited from profile / make.conf)`
                    : `${activePackage.atom} ${Object.entries(activePackage.overrides)
                        .filter(([, s]) => s !== 'inherit')
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([f, s]) => (s === 'enable' ? f : `-${f}`))
                        .join(' ')}`}
                </code>
              </div>
            </div>

            {/* IUSE Flags Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  USE Flags & Resolution
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {resolvedFlags.length} flags
                </span>
              </div>

              {resolvedFlags.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No flags listed yet for this custom atom. Add flags using the form below.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resolvedFlags.map((item) => (
                    <div
                      key={item.flag}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`font-mono text-sm font-medium ${
                              item.enabled
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-red-700 dark:text-red-400'
                            }`}
                          >
                            {item.enabled ? `+${item.flag}` : `-${item.flag}`}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {item.enabled ? 'Enabled' : 'Disabled'} · via {item.origin}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      <div
                        className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded shrink-0 self-start sm:self-center"
                        role="group"
                        aria-label={`Override state for ${item.flag}`}
                      >
                        {(
                          [
                            { id: 'inherit', label: 'Inherit' },
                            { id: 'enable', label: 'Enable' },
                            { id: 'disable', label: 'Disable' },
                          ] as const
                        ).map((opt) => {
                          const isOptActive = item.override === opt.id;
                          let activeStyle =
                            'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs';
                          if (isOptActive && opt.id === 'enable') {
                            activeStyle =
                              'bg-emerald-600 text-white shadow-xs';
                          } else if (isOptActive && opt.id === 'disable') {
                            activeStyle =
                              'bg-red-600 text-white shadow-xs';
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onSetPackageFlag(activePackage.id, item.flag, opt.id)
                              }
                              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                                isOptActive
                                  ? activeStyle
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add custom flag to this package */}
              <form
                onSubmit={handleAddFlagSubmit}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={newFlagInput}
                  onChange={(e) => setNewFlagInput(e.target.value)}
                  placeholder="Add custom USE flag (e.g. abi_x86_32)"
                  aria-label="Custom USE flag name"
                  className="flex-1 min-w-[200px] px-3 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newFlagState}
                  onChange={(e) =>
                    setNewFlagState(e.target.value as 'enable' | 'disable')
                  }
                  aria-label="Custom flag state"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="enable">+ Enable</option>
                  <option value="disable">- Disable</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Add Flag
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
