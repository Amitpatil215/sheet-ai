export type Permission = 'read' | 'read_insert' | 'read_insert_update' | 'full_crud';

export type PendingIntent = 'insert' | 'update' | 'delete';

export interface UserPreferences {
  defaultModel: string;
  theme: 'light' | 'dark' | 'system';
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  preferences: UserPreferences;
}

export interface Connector {
  id: string;
  name: string;
  slug: string;
  description: string;
  spreadsheetId: string;
  spreadsheetUrl?: string;
  defaultWorksheet?: string;
  systemPrompt?: string;
  permission: Permission;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  promptBody: string;
  sortOrder: number;
}

export interface PendingOperation {
  connectorId: string;
  intent: PendingIntent;
  partialRow: Record<string, unknown>;
  requiredFields: string[];
  missingFields: string[];
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  source: 'user' | 'automation';
  automationId?: string;
  pendingOperation?: PendingOperation | null;
  searchablePreview?: string;
}

export type MessagePart =
  | { type: 'text'; text: string; state?: string }
  | { type: 'reasoning'; text: string; state?: string }
  | { type: 'step-start' }
  | {
      type: string;
      toolCallId?: string;
      toolName?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      args?: unknown;
      result?: unknown;
    };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts: MessagePart[];
  createdAt: string;
}

export type SchedulePreset =
  | 'daily'
  | 'weekly_monday_9am'
  | 'every_night'
  | 'hourly'
  | 'custom';

export interface Automation {
  id: string;
  name: string;
  prompt: string;
  connectorIds: string[];
  schedule: SchedulePreset;
  cron?: string;
  timezone: string;
  enabled: boolean;
  model?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  status: 'running' | 'success' | 'failed';
  chatId?: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface GoogleSecretMeta {
  connected: boolean;
  connectedEmail?: string;
  scopes?: string[];
  updatedAt?: string;
}

export interface OpenRouterSecretMeta {
  configured: boolean;
  updatedAt?: string;
}
