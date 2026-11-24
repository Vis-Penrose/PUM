import { useEffect, useMemo, useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { AddPackageModal } from './components/AddPackageModal';
import { ConflictsView } from './components/ConflictsView';
import { ExportView } from './components/ExportView';
import { GlobalFlagsView } from './components/GlobalFlagsView';
import { ImportModal } from './components/ImportModal';
import { PackagesView } from './components/PackagesView';
import { Sidebar } from './components/Sidebar';
import { DEFAULT_WORKSPACE_STATE, GENTOO_PROFILES } from './data/portageCatalog';
import {
  ConflictItem,
  FlagOverrideState,
  GlobalFlagState,
  PackageEntry,
  PortageWorkspaceState,
  WorkspaceTab,
} from './types/portage';
import { evaluateConflicts, parsePortageInput } from './utils/portageEngine';

const STORAGE_KEY = 'portage-use-manager-state-v1';

function loadInitialState(): PortageWorkspaceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_WORKSPACE_STATE;
    const parsed = JSON.parse(saved) as Partial<PortageWorkspaceState>;
    return {
      profileId: parsed.profileId || DEFAULT_WORKSPACE_STATE.profileId,
      globalFlags: parsed.globalFlags || DEFAULT_WORKSPACE_STATE.globalFlags,
      useExpand: parsed.useExpand || DEFAULT_WORKSPACE_STATE.useExpand,
      packages:
        Array.isArray(parsed.packages) && parsed.packages.length > 0
          ? parsed.packages
          : DEFAULT_WORKSPACE_STATE.packages,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return DEFAULT_WORKSPACE_STATE;
  }
}

export default function App() {
  const [state, setState] = useState<PortageWorkspaceState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('packages');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    () => loadInitialState().packages[0]?.id ?? ''
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddPkgOpen, setIsAddPkgOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  const activeProfile = useMemo(() => {
    return (
      GENTOO_PROFILES.find((p) => p.id === state.profileId) ?? GENTOO_PROFILES[0]
    );
  }, [state.profileId]);

  const conflicts = useMemo(
    () => evaluateConflicts(state.packages, activeProfile, state.globalFlags),
    [state.packages, activeProfile, state.globalFlags]
  );

  const stats = useMemo(() => {
    const packageRulesCount = state.packages.reduce((acc, pkg) => {
      const count = Object.values(pkg.overrides).filter((v) => v !== 'inherit').length;
      return acc + count;
    }, 0);

    const globalOverridesCount = Object.values(state.globalFlags).filter(
      (v) => v !== 'unset'
    ).length;

    return {
      packageRulesCount,
      globalOverridesCount,
      conflictsCount: conflicts.length,
    };
  }, [state.packages, state.globalFlags, conflicts]);

  const showNotice = (msg: string) => {
    setNotice(msg);
  };

  const handleSetPackageFlag = (
    packageId: string,
    flag: string,
    overrideState: FlagOverrideState
  ) => {
    setState((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg) => {
        if (pkg.id !== packageId) return pkg;
        const nextOverrides = { ...pkg.overrides };
        if (overrideState === 'inherit') {
          delete nextOverrides[flag];
        } else {
          nextOverrides[flag] = overrideState;
        }
        return { ...pkg, overrides: nextOverrides };
      }),
    }));
  };

  const handleAddCustomFlag = (
    packageId: string,
    flag: string,
    overrideState: FlagOverrideState
  ) => {
    setState((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg) => {
        if (pkg.id !== packageId) return pkg;
        const hasFlag = pkg.iuse.some((f) => f.flag === flag);
        const nextIuse = hasFlag
          ? pkg.iuse
          : [
              ...pkg.iuse,
              { flag, description: 'Custom USE flag added manually' },
            ];
        return {
          ...pkg,
          iuse: nextIuse,
          overrides: {
            ...pkg.overrides,
            [flag]: overrideState,
          },
        };
      }),
    }));
  };

  const handleSetTargetFile = (packageId: string, targetFile: string) => {
    setState((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, targetFile } : pkg
      ),
    }));
  };

  const handleClearPackageOverrides = (packageId: string) => {
    setState((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, overrides: {} } : pkg
      ),
    }));
  };

  const handleDeletePackage = (packageId: string) => {
    setState((prev) => {
      const nextPackages = prev.packages.filter((p) => p.id !== packageId);
      if (selectedPackageId === packageId) {
        setSelectedPackageId(nextPackages[0]?.id ?? '');
      }
      return { ...prev, packages: nextPackages };
    });
  };

  const handleSetGlobalFlag = (flag: string, flagState: GlobalFlagState) => {
    setState((prev) => {
      const nextGlobal = { ...prev.globalFlags };
      if (flagState === 'unset') {
        delete nextGlobal[flag];
      } else {
        nextGlobal[flag] = flagState;
      }
      return { ...prev, globalFlags: nextGlobal };
    });
  };

  const handleToggleUseExpand = (variable: string, value: string) => {
    setState((prev) => {
      const current = prev.useExpand[variable] ?? [];
      const exists = current.includes(value);
      const next = exists
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        ...prev,
        useExpand: {
          ...prev.useExpand,
          [variable]: next,
        },
      };
    });
  };

  const handleApplyConflictFix = (fix: ConflictItem['fixes'][number]) => {
    setState((prev) => {
      if (fix.scope === 'global' && fix.globalChanges) {
        const nextGlobal = { ...prev.globalFlags };
        for (const [flag, val] of Object.entries(fix.globalChanges)) {
          if (val === 'unset') {
            delete nextGlobal[flag];
          } else {
            nextGlobal[flag] = val;
          }
        }
        return { ...prev, globalFlags: nextGlobal };
      }

      if (fix.scope === 'package' && fix.packageId && fix.packageOverrides) {
        return {
          ...prev,
          packages: prev.packages.map((pkg) => {
            if (pkg.id !== fix.packageId) return pkg;
            const nextOverrides = { ...pkg.overrides };
            for (const [flag, val] of Object.entries(fix.packageOverrides!)) {
              if (val === 'inherit') {
                delete nextOverrides[flag];
              } else {
                nextOverrides[flag] = val;
              }
            }
            return { ...pkg, overrides: nextOverrides };
          }),
        };
      }
      return prev;
    });
  };

  const handleImport = (rawText: string, mode: 'merge' | 'replace') => {
    const parsed = parsePortageInput(rawText, state, mode);
    setState((prev) => ({
      ...prev,
      globalFlags: parsed.globalFlags,
      useExpand: parsed.useExpand,
      packages: parsed.packages,
    }));
    const { globalFlagsParsed, packageLinesParsed, newPackagesCreated } =
      parsed.summary;
    showNotice(
      `Imported ${globalFlagsParsed} global flags and ${packageLinesParsed} package.use rules (${newPackagesCreated} new atoms).`
    );
  };

  const handleAddPackage = (payload: {
    atom: string;
    category: string;
    name: string;
    description: string;
    targetFile: string;
    initialFlags: string[];
  }) => {
    const existing = state.packages.find((p) => p.atom === payload.atom);
    if (existing) {
      setSelectedPackageId(existing.id);
      setActiveTab('packages');
      showNotice(`${payload.atom} is already in your workspace.`);
      return;
    }

    const iuse = payload.initialFlags.map((raw) => {
      const clean = raw.replace(/^-/, '');
      return { flag: clean, description: 'Custom USE flag' };
    });

    const overrides: Record<string, FlagOverrideState> = {};
    for (const raw of payload.initialFlags) {
      if (raw.startsWith('-') && raw.length > 1) {
        overrides[raw.slice(1)] = 'disable';
      } else {
        overrides[raw] = 'enable';
      }
    }

    const newPkg: PackageEntry = {
      id: payload.atom,
      atom: payload.atom,
      category: payload.category,
      name: payload.name,
      description: payload.description,
      targetFile: payload.targetFile,
      iuse,
      overrides,
      isCustom: true,
    };

    setState((prev) => ({
      ...prev,
      packages: [newPkg, ...prev.packages],
    }));
    setSelectedPackageId(newPkg.id);
    setActiveTab('packages');
  };

  const handleResetWorkspace = () => {
    setState((prev) => ({
      ...DEFAULT_WORKSPACE_STATE,
      theme: prev.theme,
    }));
    setSelectedPackageId(DEFAULT_WORKSPACE_STATE.packages[0].id);
    showNotice('Workspace reset to default Gentoo Portage sample configuration.');
  };

  const breadcrumbLabel: Record<WorkspaceTab, string> = {
    packages: 'Portage / Package Rules',
    global: 'Portage / Global USE & USE_EXPAND',
    conflicts: 'Portage / REQUIRED_USE Check',
    export: 'Portage / Config Files',
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        profiles={GENTOO_PROFILES}
        selectedProfileId={state.profileId}
        onSelectProfile={(profileId) =>
          setState((prev) => ({ ...prev, profileId }))
        }
        stats={stats}
        theme={state.theme}
        onToggleTheme={() =>
          setState((prev) => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light',
          }))
        }
        onResetWorkspace={handleResetWorkspace}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, max 2 primary action buttons on right */}
        <header className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
            {breadcrumbLabel[activeTab]}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Config
            </button>

            <button
              type="button"
              onClick={() => setIsAddPkgOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Package
            </button>
          </div>
        </header>

        {notice && (
          <div className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-900 flex items-center justify-between gap-4 text-xs text-indigo-900 dark:text-indigo-200">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 min-w-0">
          {activeTab === 'packages' && (
            <PackagesView
              packages={state.packages}
              profile={activeProfile}
              globalFlags={state.globalFlags}
              conflicts={conflicts}
              selectedPackageId={selectedPackageId}
              onSelectPackage={setSelectedPackageId}
              onSetPackageFlag={handleSetPackageFlag}
              onAddCustomFlag={handleAddCustomFlag}
              onSetTargetFile={handleSetTargetFile}
              onClearPackageOverrides={handleClearPackageOverrides}
              onDeletePackage={handleDeletePackage}
              onApplyConflictFix={handleApplyConflictFix}
              onOpenAddPackage={() => setIsAddPkgOpen(true)}
            />
          )}

          {activeTab === 'global' && (
            <GlobalFlagsView
              profile={activeProfile}
              globalFlags={state.globalFlags}
              useExpand={state.useExpand}
              onSetGlobalFlag={handleSetGlobalFlag}
              onToggleUseExpand={handleToggleUseExpand}
            />
          )}

          {activeTab === 'conflicts' && (
            <ConflictsView
              conflicts={conflicts}
              onApplyFix={handleApplyConflictFix}
              onJumpToPackage={(packageId) => {
                setSelectedPackageId(packageId);
                setActiveTab('packages');
              }}
            />
          )}

          {activeTab === 'export' && (
            <ExportView state={state} profile={activeProfile} />
          )}
        </main>
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />

      <AddPackageModal
        isOpen={isAddPkgOpen}
        onClose={() => setIsAddPkgOpen(false)}
        onAddPackage={handleAddPackage}
      />
    </div>
  );
}
