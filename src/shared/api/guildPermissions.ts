export type GuildAction = 'events' | 'announcements' | 'polls' | 'call_to_actions';
export type PermissionLevel = 'all' | 'officers' | 'owner';
export type GuildRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type GuildPermissions = Partial<Record<GuildAction, PermissionLevel>>;

export const GUILD_ACTIONS: GuildAction[] = ['events', 'announcements', 'polls', 'call_to_actions'];

export const DEFAULT_PERMISSIONS: Record<GuildAction, PermissionLevel> = {
  events: 'officers',
  announcements: 'officers',
  polls: 'all',
  call_to_actions: 'all',
};

const ROLES_FOR_LEVEL: Record<PermissionLevel, string[]> = {
  all: ['MEMBER', 'ADMIN', 'OWNER'],
  officers: ['ADMIN', 'OWNER'],
  owner: ['OWNER'],
};

export function resolveLevel(
  permissions: GuildPermissions | null | undefined,
  action: GuildAction,
): PermissionLevel {
  return permissions?.[action] ?? DEFAULT_PERMISSIONS[action];
}

export function canPerform(
  permissions: GuildPermissions | null | undefined,
  action: GuildAction,
  role: string | null | undefined,
): boolean {
  if (!role) return false;
  return ROLES_FOR_LEVEL[resolveLevel(permissions, action)].includes(role);
}
