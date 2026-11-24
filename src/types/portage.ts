export type FlagOverrideState = 'inherit' | 'enable' | 'disable';
export type GlobalFlagState = 'unset' | 'enable' | 'disable';

export type FlagOrigin = 'ebuild' | 'profile' | 'make.conf' | 'package.use';

export interface UseFlagMeta {
  name: string;
  description: string;
  category:
    | 'Display & Graphics'
    | 'Audio & Media'
    | 'System & Init'
    | 'Security & Crypto'
    | 'Toolchain & Build'
    | 'Networking'
    | 'Libraries & Languages';
}

export interface GentooProfile {
  id: string;
  path: string;
  label: string;
  arch: string;
  init: 'openrc' | 'systemd';
  description: string;
  defaultEnabledFlags: string[];
  defaultDisabledFlags: string[];
}

export interface PackageIuseFlag {
  flag: string;
  description: string;
  defaultPlus?: boolean;
}

export type RequiredUseRuleType =
  | 'exactly_one'
  | 'at_most_one'
  | 'at_least_one'
  | 'implies';

export interface RequiredUseRule {
  id: string;
  type: RequiredUseRuleType;
  /** Gentoo REQUIRED_USE syntax expression, e.g. "^^ ( wayland X )" or "vaapi? ( drm )" */
  expression: string;
  /** Flags involved in the constraint */
  flags: string[];
  /** For 'implies': when sourceFlag is enabled, all flags in `flags` must be enabled */
  sourceFlag?: string;
  description: string;
}

export interface PackageEntry {
  id: string;
  /** Full Portage atom, e.g. "www-client/firefox" or ">=media-video/ffmpeg-6.1" */
  atom: string;
  category: string;
  name: string;
  description: string;
  /** Target file inside /etc/portage/package.use/, e.g. "desktop", "media", "system", "custom" */
  targetFile: string;
  iuse: PackageIuseFlag[];
  overrides: Record<string, FlagOverrideState>;
  requiredUse?: RequiredUseRule[];
  isCustom?: boolean;
}

export interface UseExpandDefinition {
  variable: string;
  description: string;
  options: Array<{ value: string; description: string }>;
}

export interface ResolvedFlagState {
  flag: string;
  description: string;
  enabled: boolean;
  origin: FlagOrigin;
  override: FlagOverrideState;
  globalState: GlobalFlagState;
  profileDefault: 'enable' | 'disable' | 'unset';
  ebuildDefault: boolean;
}

export interface ConflictItem {
  id: string;
  scope: 'package' | 'global';
  severity: 'error' | 'warning';
  packageId?: string;
  atom?: string;
  expression: string;
  message: string;
  fixes: Array<{
    label: string;
    scope: 'package' | 'global';
    packageId?: string;
    packageOverrides?: Record<string, FlagOverrideState>;
    globalChanges?: Record<string, GlobalFlagState>;
  }>;
}

export type WorkspaceTab = 'packages' | 'global' | 'conflicts' | 'export';

export interface PortageWorkspaceState {
  profileId: string;
  globalFlags: Record<string, GlobalFlagState>;
  useExpand: Record<string, string[]>;
  packages: PackageEntry[];
  theme: 'light' | 'dark';
}
