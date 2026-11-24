import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { GLOBAL_USE_FLAGS, USE_EXPAND_GROUPS } from '../data/portageCatalog';
import { GentooProfile, GlobalFlagState, UseFlagMeta } from '../types/portage';

interface GlobalFlagsViewProps {
  profile: GentooProfile;
  globalFlags: Record<string, GlobalFlagState>;
  useExpand: Record<string, string[]>;
  onSetGlobalFlag: (flag: string, state: GlobalFlagState) => void;
  onToggleUseExpand: (variable: string, value: string) => void;
}

export function GlobalFlagsView({
  profile,
  globalFlags,
  useExpand,
  onSetGlobalFlag,
  onToggleUseExpand,
}: GlobalFlagsViewProps) {
  const [section, setSection] = useState<'use' | 'expand'>('use');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customFlagName, setCustomFlagName] = useState('');
  const [customFlagState, setCustomFlagState] = useState<'enable' | 'disable'>('enable');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(GLOBAL_USE_FLAGS.map((f) => f.category)));
    return ['All', ...cats];
  }, []);

  // Merge catalog global flags with any custom global flags imported or added by user
  const allFlagDefinitions = useMemo(() => {
    const knownNames = new Set(GLOBAL_USE_FLAGS.map((f) => f.name));
    const extras: UseFlagMeta[] = Object.keys(globalFlags)
      .filter((name) => !knownNames.has(name) && globalFlags[name] !== 'unset')
      .map((name) => ({
        name,
        description: 'Custom global USE flag configured in make.conf',
        category: 'Libraries & Languages',
      }));
    return [...GLOBAL_USE_FLAGS, ...extras];
  }, [globalFlags]);

  const filteredFlags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allFlagDefinitions.filter((flag) => {
      if (selectedCategory !== 'All' && flag.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        flag.name.toLowerCase().includes(q) ||
        flag.description.toLowerCase().includes(q)
      );
    });
  }, [allFlagDefinitions, selectedCategory, searchQuery]);

  const handleAddCustomGlobalFlag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customFlagName.trim().replace(/^[+-]/, '');
    if (!cleaned) return;
    onSetGlobalFlag(cleaned, customFlagState);
    setCustomFlagName('');
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Global make.conf Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure system-wide USE flags and hardware USE_EXPAND variables applied across all ebuilds.
          </p>
        </div>

        <div
          className="inline-flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded self-start"
          role="tablist"
          aria-label="Global configuration sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'use'}
            onClick={() => setSection('use')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              section === 'use'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Global USE Flags
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'expand'}
            onClick={() => setSection('expand')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              section === 'expand'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            USE_EXPAND Variables
          </button>
        </div>
      </div>

      {section === 'use' ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search global USE flags..."
                aria-label="Search global USE flags"
                className="w-full pl-9 pr-8 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="global-category-filter" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Category
              </label>
              <select
                id="global-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add custom global flag */}
          <form
            onSubmit={handleAddCustomGlobalFlag}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={customFlagName}
              onChange={(e) => setCustomFlagName(e.target.value)}
              placeholder="Add any custom global USE flag (e.g. jumbo-build, screencast)"
              aria-label="Custom global USE flag"
              className="flex-1 min-w-[220px] px-3 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={customFlagState}
              onChange={(e) =>
                setCustomFlagState(e.target.value as 'enable' | 'disable')
              }
              aria-label="Custom global flag state"
              className="px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="enable">+ Enable in make.conf</option>
              <option value="disable">- Disable in make.conf</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Global Flag
            </button>
          </form>

          {/* Global Flags Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFlags.map((flag) => {
                const state: GlobalFlagState = globalFlags[flag.name] ?? 'unset';
                const inProfileOn = profile.defaultEnabledFlags.includes(flag.name);
                const inProfileOff = profile.defaultDisabledFlags.includes(flag.name);
                const profileNote = inProfileOn
                  ? 'Profile enables by default'
                  : inProfileOff
                    ? 'Profile disables by default'
                    : 'Not set in profile';

                const effectiveOn =
                  state === 'enable' || (state === 'unset' && inProfileOn);

                return (
                  <div
                    key={flag.name}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`font-mono text-sm font-medium ${
                            effectiveOn
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {state === 'disable'
                            ? `-${flag.name}`
                            : effectiveOn
                              ? `+${flag.name}`
                              : flag.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {flag.category} · {profileNote}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {flag.description}
                      </p>
                    </div>

                    <div
                      className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded shrink-0 self-start sm:self-center"
                      role="group"
                      aria-label={`Global state for ${flag.name}`}
                    >
                      {(
                        [
                          { id: 'unset', label: 'Profile' },
                          { id: 'enable', label: 'Enable' },
                          { id: 'disable', label: 'Disable' },
                        ] as const
                      ).map((opt) => {
                        const isActive = state === opt.id;
                        let activeClass =
                          'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs';
                        if (isActive && opt.id === 'enable') {
                          activeClass = 'bg-emerald-600 text-white shadow-xs';
                        } else if (isActive && opt.id === 'disable') {
                          activeClass = 'bg-red-600 text-white shadow-xs';
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSetGlobalFlag(flag.name, opt.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                              isActive
                                ? activeClass
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* USE_EXPAND Variables */
        <div className="space-y-6">
          {USE_EXPAND_GROUPS.map((group) => {
            const selectedValues = useExpand[group.variable] ?? [];
            return (
              <div
                key={group.variable}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden"
              >
                <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {group.variable}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {group.description}
                    </p>
                  </div>
                  <code className="font-mono text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded self-start sm:self-center">
                    {group.variable}="{selectedValues.join(' ')}"
                  </code>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.options.map((opt) => {
                    const checked = selectedValues.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="px-4 py-2.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onToggleUseExpand(group.variable, opt.value)
                            }
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                              {opt.value}
                            </span>
                            <span className="ml-3 text-xs text-slate-500 dark:text-slate-400">
                              {opt.description}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">
                          {checked ? 'Active' : 'Off'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
