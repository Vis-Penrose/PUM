import {
  AlertTriangle,
  FileCode2,
  Package,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon,
} from 'lucide-react';
import { GentooProfile, WorkspaceTab } from '../types/portage';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  profiles: GentooProfile[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  stats: {
    packageRulesCount: number;
    globalOverridesCount: number;
    conflictsCount: number;
  };
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onResetWorkspace: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  profiles,
  selectedProfileId,
  onSelectProfile,
  stats,
  theme,
  onToggleTheme,
  onResetWorkspace,
}: SidebarProps) {
  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof Package;
    count?: number;
    isAlert?: boolean;
  }> = [
    {
      id: 'packages',
      label: 'Package Rules',
      icon: Package,
      count: stats.packageRulesCount,
    },
    {
      id: 'global',
      label: 'Global USE',
      icon: SlidersHorizontal,
      count: stats.globalOverridesCount,
    },
    {
      id: 'conflicts',
      label: 'REQUIRED_USE',
      icon: AlertTriangle,
      count: stats.conflictsCount,
      isAlert: stats.conflictsCount > 0,
    },
    {
      id: 'export',
      label: 'Config Files',
      icon: FileCode2,
    },
  ];

  const activeProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
      <div>
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            Portage USE
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="p-2 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="Primary workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      item.isAlert
                        ? 'text-amber-600 dark:text-amber-400'
                        : isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      item.isAlert
                        ? 'text-amber-700 dark:text-amber-400 font-semibold'
                        : isActive
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 mt-2 border-t border-slate-200 dark:border-slate-800">
          <label
            htmlFor="gentoo-profile-select"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2"
          >
            Portage Profile
          </label>
          <select
            id="gentoo-profile-select"
            value={selectedProfileId}
            onChange={(e) => onSelectProfile(e.target.value)}
            className="w-full px-2.5 py-2 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
          {activeProfile && (
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {activeProfile.description}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onResetWorkspace}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Sample Config
        </button>
      </div>
    </aside>
  );
}
