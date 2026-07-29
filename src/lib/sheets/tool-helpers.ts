import type { Connector } from '@/lib/types';
import { canUseTool, permissionRefusal } from './permissions';

export interface ToolContext {
  uid: string;
  connectors: Map<string, Connector>;
}

export function resolve(ctx: ToolContext, connectorId: string) {
  const c = ctx.connectors.get(connectorId);
  if (!c) throw new Error(`Unknown connector: ${connectorId}`);
  if (!c.enabled) throw new Error(`Connector "${c.name}" is disabled`);
  return c;
}

export function guard(c: Connector, toolName: string) {
  if (!canUseTool(c.permission, toolName)) {
    throw new Error(permissionRefusal(c.permission, toolName));
  }
}
