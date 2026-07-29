import type { Permission } from '@/lib/types';

const WRITE_OPS = new Set(['append_rows', 'update_rows', 'delete_rows', 'clear_range']);

const TIER_RANK: Record<Permission, number> = {
  read: 0,
  read_insert: 1,
  read_insert_update: 2,
  full_crud: 3,
};

const TOOL_MIN_TIER: Record<string, Permission> = {
  get_sheet_schema: 'read',
  read_rows: 'read',
  search_rows: 'read',
  append_rows: 'read_insert',
  update_rows: 'read_insert_update',
  delete_rows: 'full_crud',
  clear_range: 'full_crud',
};

export function canUseTool(permission: Permission, toolName: string): boolean {
  const required = TOOL_MIN_TIER[toolName];
  if (!required) return false;
  return TIER_RANK[permission] >= TIER_RANK[required];
}

export function permissionRefusal(permission: Permission, toolName: string): string {
  return `Permission denied: connector allows "${permission}" but tool "${toolName}" requires higher access. Update the connector permission in Settings.`;
}

export function isWriteTool(toolName: string): boolean {
  return WRITE_OPS.has(toolName);
}
