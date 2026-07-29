export type Permission = 'read' | 'read_insert' | 'read_insert_update' | 'full_crud';

export interface UserPreferences {
  defaultModel: string;
  theme: 'light' | 'dark' | 'system';
  /** Freeform context the AI uses to know and assist the user. */
  personalInfo?: string;
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

export interface Chat {
  id: string;
  title: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  source: 'user' | 'automation';
  automationId?: string;
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
  | 'every_1m'
  | 'every_5m'
  | 'every_10m'
  | 'every_15m'
  | 'every_30m'
  | 'hourly'
  | 'every_2h'
  | 'every_6h'
  | 'every_12h'
  | 'daily'
  | 'every_night'
  | 'weekly_monday_9am'
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
