import type { User } from './auth';

export type Permission =
  | 'chat:send'
  | 'chat:unlimited'
  | 'chat:all_models'
  | 'conversation:create'
  | 'conversation:read'
  | 'conversation:delete'
  | 'conversation:share'
  | 'conversation:export'
  | 'folder:create'
  | 'folder:delete'
  | 'system_prompt:edit'
  | 'image:upload'
  | 'file:upload'
  | 'api_key:manage'
  | 'usage:view'
  | 'team:view'
  | 'team:create'
  | 'team:invite'
  | 'team:remove_member'
  | 'team:manage_roles'
  | 'team:delete'
  | 'team:conversation:view'
  | 'team:conversation:create'
  | 'org:view'
  | 'org:create'
  | 'org:invite'
  | 'org:remove_member'
  | 'org:manage_roles'
  | 'org:manage_teams'
  | 'org:delete'
  | 'org:analytics'
  | 'org:billing'
  | 'admin:dashboard'
  | 'admin:users'
  | 'admin:billing'
  | 'admin:stats';

const FREE_INDIVIDUAL_PERMISSIONS: Permission[] = [
  'chat:send',
  'conversation:create',
  'conversation:read',
  'conversation:delete',
  'folder:create',
  'folder:delete',
];

const PRO_INDIVIDUAL_PERMISSIONS: Permission[] = [
  ...FREE_INDIVIDUAL_PERMISSIONS,
  'chat:unlimited',
  'chat:all_models',
  'conversation:share',
  'conversation:export',
  'system_prompt:edit',
  'image:upload',
  'file:upload',
  'api_key:manage',
  'usage:view',
];

const PRO_TEAM_USER_PERMISSIONS: Permission[] = [
  ...PRO_INDIVIDUAL_PERMISSIONS,
  'team:view',
  'team:conversation:view',
  'team:conversation:create',
];

const PRO_TEAM_ADMIN_PERMISSIONS: Permission[] = [
  ...PRO_TEAM_USER_PERMISSIONS,
  'team:create',
  'team:invite',
  'team:remove_member',
  'team:manage_roles',
  'team:delete',
];

const PRO_ORG_USER_PERMISSIONS: Permission[] = [...PRO_TEAM_USER_PERMISSIONS, 'org:view'];

const PRO_ORG_ADMIN_PERMISSIONS: Permission[] = [
  ...PRO_ORG_USER_PERMISSIONS,
  'team:create',
  'team:invite',
  'team:remove_member',
  'team:manage_roles',
  'team:delete',
  'org:create',
  'org:invite',
  'org:remove_member',
  'org:manage_roles',
  'org:manage_teams',
  'org:delete',
  'org:analytics',
  'org:billing',
];

const SUPERADMIN_PERMISSIONS: Permission[] = [
  ...PRO_ORG_ADMIN_PERMISSIONS,
  'admin:dashboard',
  'admin:users',
  'admin:billing',
  'admin:stats',
];

export function getUserPermissions(user: User): Permission[] {
  if (user.user_type === 'superadmin') {
    return SUPERADMIN_PERMISSIONS;
  }

  const tier = user.subscription_tier;
  const scope = user.subscription_scope;
  const role = user.user_type;

  if (tier === 'free') {
    return FREE_INDIVIDUAL_PERMISSIONS;
  }

  if (tier === 'pro') {
    if (scope === 'individual') {
      return PRO_INDIVIDUAL_PERMISSIONS;
    }

    if (scope === 'team') {
      if (role === 'admin') {
        return PRO_TEAM_ADMIN_PERMISSIONS;
      }
      return PRO_TEAM_USER_PERMISSIONS;
    }

    if (scope === 'organization') {
      if (role === 'admin') {
        return PRO_ORG_ADMIN_PERMISSIONS;
      }
      return PRO_ORG_USER_PERMISSIONS;
    }
  }

  return FREE_INDIVIDUAL_PERMISSIONS;
}

export function hasPermission(user: User, permission: Permission): boolean {
  const permissions = getUserPermissions(user);
  return permissions.includes(permission);
}

export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  const userPermissions = getUserPermissions(user);
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  const userPermissions = getUserPermissions(user);
  return permissions.every((p) => userPermissions.includes(p));
}

export function canAccessTeamFeatures(user: User): boolean {
  return hasPermission(user, 'team:view');
}

export function canManageTeam(user: User): boolean {
  return hasPermission(user, 'team:invite');
}

export function canAccessOrgFeatures(user: User): boolean {
  return hasPermission(user, 'org:view');
}

export function canManageOrg(user: User): boolean {
  return hasPermission(user, 'org:invite');
}

export function canAccessAdminDashboard(user: User): boolean {
  return hasPermission(user, 'admin:dashboard');
}

export function hasUnlimitedMessages(user: User): boolean {
  return hasPermission(user, 'chat:unlimited');
}

export function canUseAllModels(user: User): boolean {
  return hasPermission(user, 'chat:all_models');
}

export function canUploadImages(user: User): boolean {
  return hasPermission(user, 'image:upload');
}

export function canUploadFiles(user: User): boolean {
  return hasPermission(user, 'file:upload');
}

export function canShareConversations(user: User): boolean {
  return hasPermission(user, 'conversation:share');
}

export function canExportConversations(user: User): boolean {
  return hasPermission(user, 'conversation:export');
}

export function canManageApiKeys(user: User): boolean {
  return hasPermission(user, 'api_key:manage');
}

export function canViewUsage(user: User): boolean {
  return hasPermission(user, 'usage:view');
}

export function getRoleName(user: User): string {
  if (user.user_type === 'superadmin') {
    return 'Super Admin';
  }

  const tier = user.subscription_tier;
  const scope = user.subscription_scope;
  const role = user.user_type;

  if (tier === 'free') {
    return 'Free User';
  }

  const tierLabel = 'Pro';
  const scopeLabel =
    scope === 'individual' ? 'Individual' : scope === 'team' ? 'Team' : 'Organization';
  const roleLabel = role === 'admin' ? 'Admin' : 'User';

  if (scope === 'individual') {
    return `${tierLabel} ${scopeLabel}`;
  }

  return `${tierLabel} ${scopeLabel} ${roleLabel}`;
}

export function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    'chat:send': 'Send chat messages',
    'chat:unlimited': 'Unlimited messages per day',
    'chat:all_models': 'Access to all AI models',
    'conversation:create': 'Create conversations',
    'conversation:read': 'Read conversations',
    'conversation:delete': 'Delete conversations',
    'conversation:share': 'Share conversations publicly',
    'conversation:export': 'Export conversations',
    'folder:create': 'Create folders',
    'folder:delete': 'Delete folders',
    'system_prompt:edit': 'Edit system prompts',
    'image:upload': 'Upload images',
    'file:upload': 'Upload files',
    'api_key:manage': 'Manage API keys',
    'usage:view': 'View usage analytics',
    'team:view': 'View team',
    'team:create': 'Create teams',
    'team:invite': 'Invite team members',
    'team:remove_member': 'Remove team members',
    'team:manage_roles': 'Manage team roles',
    'team:delete': 'Delete team',
    'team:conversation:view': 'View team conversations',
    'team:conversation:create': 'Create team conversations',
    'org:view': 'View organization',
    'org:create': 'Create organization',
    'org:invite': 'Invite organization members',
    'org:remove_member': 'Remove organization members',
    'org:manage_roles': 'Manage organization roles',
    'org:manage_teams': 'Manage organization teams',
    'org:delete': 'Delete organization',
    'org:analytics': 'View organization analytics',
    'org:billing': 'Manage organization billing',
    'admin:dashboard': 'Access admin dashboard',
    'admin:users': 'Manage all users',
    'admin:billing': 'View all billing',
    'admin:stats': 'View platform statistics',
  };
  return descriptions[permission];
}
