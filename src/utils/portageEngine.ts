import {
  ConflictItem,
  FlagOrigin,
  FlagOverrideState,
  GentooProfile,
  GlobalFlagState,
  PackageEntry,
  PortageWorkspaceState,
  ResolvedFlagState,
} from '../types/portage';

/**
 * Resolves effective flag state & precedence for every IUSE + overridden flag on a package.
 * Portage precedence (lowest -> highest):
 * 1. Ebuild +IUSE default
 * 2. Profile make.defaults
 * 3. /etc/portage/make.conf USE
 * 4. /etc/portage/package.use
 */
export function resolvePackageFlags(
  pkg: PackageEntry,
  profile: GentooProfile,
  globalFlags: Record<string, GlobalFlagState>
): ResolvedFlagState[] {
  const knownMap = new Map<string, { description: string; defaultPlus: boolean }>();
  for (const item of pkg.iuse) {
    knownMap.set(item.flag, {
      description: item.description,
      defaultPlus: Boolean(item.defaultPlus),
    });
  }

  // Include any custom override flags not originally in pkg.iuse
  for (const flag of Object.keys(pkg.overrides)) {
    if (!knownMap.has(flag)) {
      knownMap.set(flag, {
        description: 'Custom USE flag added to package.use',
        defaultPlus: false,
      });
    }
  }

  const results: ResolvedFlagState[] = [];

  for (const [flag, meta] of knownMap.entries()) {
    const ebuildDefault = meta.defaultPlus;
    const profileDefault: 'enable' | 'disable' | 'unset' =
      profile.defaultEnabledFlags.includes(flag)
        ? 'enable'
        : profile.defaultDisabledFlags.includes(flag)
          ? 'disable'
          : 'unset';
    const globalState: GlobalFlagState = globalFlags[flag] ?? 'unset';
    const override: FlagOverrideState = pkg.overrides[flag] ?? 'inherit';

    let enabled = ebuildDefault;
    let origin: FlagOrigin = 'ebuild';

    if (profileDefault === 'enable') {
      enabled = true;
      origin = 'profile';
    } else if (profileDefault === 'disable') {
      enabled = false;
      origin = 'profile';
    }

    if (globalState === 'enable') {
      enabled = true;
      origin = 'make.conf';
    } else if (globalState === 'disable') {
      enabled = false;
      origin = 'make.conf';
    }

    if (override === 'enable') {
      enabled = true;
      origin = 'package.use';
    } else if (override === 'disable') {
      enabled = false;
      origin = 'package.use';
    }

    results.push({
      flag,
      description: meta.description,
      enabled,
      origin,
      override,
      globalState,
      profileDefault,
      ebuildDefault,
    });
  }

  return results;
}

/**
 * Evaluates global mutual exclusions and per-package REQUIRED_USE constraints.
 */
export function evaluateConflicts(
  packages: PackageEntry[],
  profile: GentooProfile,
  globalFlags: Record<string, GlobalFlagState>
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  // 1. Global init conflict check: systemd vs elogind
  const systemdEffective =
    globalFlags['systemd'] === 'enable' ||
    (globalFlags['systemd'] !== 'disable' && profile.defaultEnabledFlags.includes('systemd'));
  const elogindEffective =
    globalFlags['elogind'] === 'enable' ||
    (globalFlags['elogind'] !== 'disable' && profile.defaultEnabledFlags.includes('elogind'));

  if (systemdEffective && elogindEffective) {
    conflicts.push({
      id: 'global-systemd-elogind',
      scope: 'global',
      severity: 'error',
      expression: '?? ( systemd elogind )',
      message:
        'Both systemd and elogind are globally active. Portage packages often block simultaneous systemd and elogind USE flags.',
      fixes: [
        {
          label: 'Disable elogind globally (-elogind)',
          scope: 'global',
          globalChanges: { elogind: 'disable', systemd: 'enable' },
        },
        {
          label: 'Disable systemd globally (-systemd)',
          scope: 'global',
          globalChanges: { systemd: 'disable', elogind: 'enable' },
        },
      ],
    });
  }

  // 2. Global lto + debug warning
  const ltoActive =
    globalFlags['lto'] === 'enable' ||
    (globalFlags['lto'] !== 'disable' && profile.defaultEnabledFlags.includes('lto'));
  const debugActive =
    globalFlags['debug'] === 'enable' ||
    (globalFlags['debug'] !== 'disable' && profile.defaultEnabledFlags.includes('debug'));

  if (ltoActive && debugActive) {
    conflicts.push({
      id: 'global-lto-debug',
      scope: 'global',
      severity: 'warning',
      expression: 'lto + debug',
      message:
        'Enabling lto and debug globally degrades stack traces and significantly increases link-time memory usage.',
      fixes: [
        {
          label: 'Disable debug globally (-debug)',
          scope: 'global',
          globalChanges: { debug: 'disable' },
        },
        {
          label: 'Unset global lto',
          scope: 'global',
          globalChanges: { lto: 'unset' },
        },
      ],
    });
  }

  // 3. Per-package REQUIRED_USE rules
  for (const pkg of packages) {
    if (!pkg.requiredUse || pkg.requiredUse.length === 0) continue;

    const resolved = resolvePackageFlags(pkg, profile, globalFlags);
    const enabledSet = new Set(resolved.filter((r) => r.enabled).map((r) => r.flag));

    for (const rule of pkg.requiredUse) {
      if (rule.type === 'at_least_one') {
        const count = rule.flags.filter((f) => enabledSet.has(f)).length;
        if (count === 0) {
          conflicts.push({
            id: `${pkg.id}:${rule.id}`,
            scope: 'package',
            severity: 'error',
            packageId: pkg.id,
            atom: pkg.atom,
            expression: rule.expression,
            message: rule.description,
            fixes: rule.flags.map((f) => ({
              label: `Enable +${f} on ${pkg.name}`,
              scope: 'package',
              packageId: pkg.id,
              packageOverrides: { [f]: 'enable' },
            })),
          });
        }
      } else if (rule.type === 'exactly_one') {
        const enabledInGroup = rule.flags.filter((f) => enabledSet.has(f));
        if (enabledInGroup.length !== 1) {
          conflicts.push({
            id: `${pkg.id}:${rule.id}`,
            scope: 'package',
            severity: 'error',
            packageId: pkg.id,
            atom: pkg.atom,
            expression: rule.expression,
            message: rule.description,
            fixes: rule.flags.map((chosen) => {
              const patch: Record<string, FlagOverrideState> = {};
              for (const other of rule.flags) {
                patch[other] = other === chosen ? 'enable' : 'disable';
              }
              return {
                label: `Use ${chosen} only`,
                scope: 'package',
                packageId: pkg.id,
                packageOverrides: patch,
              };
            }),
          });
        }
      } else if (rule.type === 'at_most_one') {
        const enabledInGroup = rule.flags.filter((f) => enabledSet.has(f));
        if (enabledInGroup.length > 1) {
          conflicts.push({
            id: `${pkg.id}:${rule.id}`,
            scope: 'package',
            severity: 'error',
            packageId: pkg.id,
            atom: pkg.atom,
            expression: rule.expression,
            message: rule.description,
            fixes: enabledInGroup.map((keep) => {
              const patch: Record<string, FlagOverrideState> = {};
              for (const other of enabledInGroup) {
                if (other !== keep) patch[other] = 'disable';
              }
              return {
                label: `Keep ${keep}, disable others`,
                scope: 'package',
                packageId: pkg.id,
                packageOverrides: patch,
              };
            }),
          });
        }
      } else if (rule.type === 'implies' && rule.sourceFlag) {
        if (enabledSet.has(rule.sourceFlag)) {
          const missing = rule.flags.filter((f) => !enabledSet.has(f));
          if (missing.length > 0) {
            const enablePatch: Record<string, FlagOverrideState> = {};
            for (const m of missing) enablePatch[m] = 'enable';

            conflicts.push({
              id: `${pkg.id}:${rule.id}`,
              scope: 'package',
              severity: 'error',
              packageId: pkg.id,
              atom: pkg.atom,
              expression: rule.expression,
              message: rule.description,
              fixes: [
                {
                  label: `Enable ${missing.join(', ')}`,
                  scope: 'package',
                  packageId: pkg.id,
                  packageOverrides: enablePatch,
                },
                {
                  label: `Disable -${rule.sourceFlag}`,
                  scope: 'package',
                  packageId: pkg.id,
                  packageOverrides: { [rule.sourceFlag]: 'disable' },
                },
              ],
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Generates /etc/portage/make.conf USE & USE_EXPAND lines.
 */
export function generateMakeConf(
  state: PortageWorkspaceState,
  profile: GentooProfile
): string {
  const lines: string[] = [
    '# /etc/portage/make.conf',
    `# Target profile: ${profile.path}`,
    '',
  ];

  const enabledFlags = Object.entries(state.globalFlags)
    .filter(([, val]) => val === 'enable')
    .map(([flag]) => flag)
    .sort();

  const disabledFlags = Object.entries(state.globalFlags)
    .filter(([, val]) => val === 'disable')
    .map(([flag]) => `-${flag}`)
    .sort();

  const allUseTokens = [...enabledFlags, ...disabledFlags];

  if (allUseTokens.length === 0) {
    lines.push('# No global USE overrides configured; using profile defaults.');
    lines.push('USE=""');
  } else if (allUseTokens.length <= 6) {
    lines.push(`USE="${allUseTokens.join(' ')}"`);
  } else {
    lines.push('USE="');
    for (let i = 0; i < allUseTokens.length; i += 6) {
      lines.push(`    ${allUseTokens.slice(i, i + 6).join(' ')}`);
    }
    lines.push('"');
  }

  const expandEntries = Object.entries(state.useExpand).filter(
    ([, values]) => values.length > 0
  );

  if (expandEntries.length > 0) {
    lines.push('');
    lines.push('# USE_EXPAND variables');
    for (const [variable, values] of expandEntries) {
      lines.push(`${variable}="${values.join(' ')}"`);
    }
  }

  return lines.join('\n') + '\n';
}

export interface GeneratedPackageUseFile {
  filename: string;
  content: string;
  ruleCount: number;
}

/**
 * Generates modular /etc/portage/package.use/* files and a combined view.
 */
export function generatePackageUseFiles(
  packages: PackageEntry[]
): GeneratedPackageUseFile[] {
  const grouped = new Map<string, string[]>();

  for (const pkg of packages) {
    const activeEntries = Object.entries(pkg.overrides)
      .filter(([, state]) => state !== 'inherit')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([flag, state]) => (state === 'enable' ? flag : `-${flag}`));

    if (activeEntries.length === 0) continue;

    const line = `${pkg.atom} ${activeEntries.join(' ')}`;
    const target = pkg.targetFile || 'custom';
    const existing = grouped.get(target) ?? [];
    existing.push(line);
    grouped.set(target, existing);
  }

  const files: GeneratedPackageUseFile[] = [];

  for (const [target, lines] of Array.from(grouped.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const content = [
      `# /etc/portage/package.use/${target}`,
      ...lines.sort(),
      '',
    ].join('\n');

    files.push({
      filename: `package.use/${target}`,
      content,
      ruleCount: lines.length,
    });
  }

  return files;
}

export function generateCombinedPackageUse(packages: PackageEntry[]): string {
  const files = generatePackageUseFiles(packages);
  if (files.length === 0) {
    return '# /etc/portage/package.use\n# No per-package USE overrides configured.\n';
  }
  return files
    .map((f) => `# --- ${f.filename} ---\n${f.content.split('\n').slice(1).join('\n')}`)
    .join('\n');
}

/**
 * Extracts category and package name from a Gentoo atom string.
 * Supports prefixes like >=, <=, =, ~, >, < and suffixes like :slot or ::repo.
 */
export function parseAtomParts(rawAtom: string): {
  atom: string;
  category: string;
  name: string;
} | null {
  const trimmed = rawAtom.trim();
  if (!trimmed || !trimmed.includes('/')) return null;

  const withoutOp = trimmed.replace(/^(>=|<=|>|<|=|~)/, '');
  const withoutSlotRepo = withoutOp.split(':')[0];
  const slashIdx = withoutSlotRepo.indexOf('/');
  if (slashIdx <= 0) return null;

  const category = withoutSlotRepo.slice(0, slashIdx);
  let name = withoutSlotRepo.slice(slashIdx + 1);
  // Strip trailing -version if user passed =cat/pkg-1.2.3
  name = name.replace(/-\d+(\.\d+)*([a-z])?(_(alpha|beta|pre|rc|p)\d*)*(-r\d+)?$/i, '');

  if (!category || !name) return null;

  return {
    atom: trimmed,
    category,
    name,
  };
}

export interface ParseImportResult {
  globalFlags: Record<string, GlobalFlagState>;
  useExpand: Record<string, string[]>;
  packages: PackageEntry[];
  summary: {
    globalFlagsParsed: number;
    useExpandVarsParsed: number;
    packageLinesParsed: number;
    newPackagesCreated: number;
  };
}

/**
 * Parses pasted make.conf and/or package.use text into Portage workspace state.
 */
export function parsePortageInput(
  rawText: string,
  currentState: PortageWorkspaceState,
  mode: 'merge' | 'replace'
): ParseImportResult {
  const nextGlobal: Record<string, GlobalFlagState> =
    mode === 'merge' ? { ...currentState.globalFlags } : {};
  const nextExpand: Record<string, string[]> =
    mode === 'merge'
      ? Object.fromEntries(
          Object.entries(currentState.useExpand).map(([k, v]) => [k, [...v]])
        )
      : {};
  const nextPackages: PackageEntry[] = currentState.packages.map((p) => ({
    ...p,
    overrides: mode === 'merge' ? { ...p.overrides } : {},
    iuse: [...p.iuse],
  }));

  let globalFlagsParsed = 0;
  let useExpandVarsParsed = 0;
  let packageLinesParsed = 0;
  let newPackagesCreated = 0;

  // 1. Parse quoted variables like USE="..." or VIDEO_CARDS="..." (supports multiline)
  const varRegex = /^\s*([A-Z0-9_]+)\s*=\s*"([^"]*)"/gm;
  let match: RegExpExecArray | null;
  const consumedVarLines = new Set<string>();

  while ((match = varRegex.exec(rawText)) !== null) {
    const varName = match[1];
    const body = match[2].replace(/#.*$/gm, ' ').trim();
    const tokens = body.split(/\s+/).filter(Boolean);

    if (varName === 'USE') {
      for (const token of tokens) {
        if (token.startsWith('-') && token.length > 1) {
          nextGlobal[token.slice(1)] = 'disable';
        } else {
          nextGlobal[token] = 'enable';
        }
        globalFlagsParsed++;
      }
      consumedVarLines.add(match[0]);
    } else if (
      ['VIDEO_CARDS', 'INPUT_DEVICES', 'CPU_FLAGS_X86', 'L10N'].includes(varName)
    ) {
      nextExpand[varName] = Array.from(new Set(tokens));
      useExpandVarsParsed++;
      consumedVarLines.add(match[0]);
    }
  }

  // Strip multiline var assignments before scanning line-by-line for package.use
  let remainingText = rawText;
  for (const block of consumedVarLines) {
    remainingText = remainingText.replace(block, '');
  }

  // 2. Parse package.use lines: "<atom> flag1 -flag2"
  const lines = remainingText.split(/\r?\n/);
  for (const rawLine of lines) {
    const cleanLine = rawLine.split('#')[0].trim();
    if (!cleanLine || cleanLine.includes('=')) {
      // Check if line starts with '=' atom like =www-client/firefox-128.0
      if (!cleanLine.startsWith('=')) continue;
    }

    const parts = cleanLine.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;

    const atomToken = parts[0];
    const atomParsed = parseAtomParts(atomToken);
    if (!atomParsed) continue;

    const flagTokens = parts.slice(1);
    packageLinesParsed++;

    let targetPkg = nextPackages.find(
      (p) =>
        p.atom === atomParsed.atom ||
        `${p.category}/${p.name}` === `${atomParsed.category}/${atomParsed.name}`
    );

    if (!targetPkg) {
      targetPkg = {
        id: atomParsed.atom,
        atom: atomParsed.atom,
        category: atomParsed.category,
        name: atomParsed.name,
        description: 'Imported custom package rule',
        targetFile: 'custom',
        iuse: [],
        overrides: {},
        isCustom: true,
      };
      nextPackages.push(targetPkg);
      newPackagesCreated++;
    } else if (atomParsed.atom !== targetPkg.atom && atomParsed.atom.match(/^[><=~]/)) {
      targetPkg.atom = atomParsed.atom;
    }

    for (const token of flagTokens) {
      const isDisable = token.startsWith('-') && token.length > 1;
      const flagName = isDisable ? token.slice(1) : token;
      targetPkg.overrides[flagName] = isDisable ? 'disable' : 'enable';

      if (!targetPkg.iuse.some((f) => f.flag === flagName)) {
        targetPkg.iuse.push({
          flag: flagName,
          description: 'Imported from package.use',
        });
      }
    }
  }

  return {
    globalFlags: nextGlobal,
    useExpand: nextExpand,
    packages: nextPackages,
    summary: {
      globalFlagsParsed,
      useExpandVarsParsed,
      packageLinesParsed,
      newPackagesCreated,
    },
  };
}
