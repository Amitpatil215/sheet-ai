'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, Card } from '@/components/ui/tabs';
import { ConnectorsPanel } from '@/components/settings/connectors-panel';
import { AutomationsPanel } from '@/components/settings/automations-panel';
import { MODEL_OPTIONS } from '@/lib/utils';

export function SettingsView() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const params = useSearchParams();
  const [tab, setTab] = useState('general');
  const [defaultModel, setDefaultModel] = useState<string>(MODEL_OPTIONS[0].id);
  const [apiKey, setApiKey] = useState('');
  const [orConfigured, setOrConfigured] = useState(false);
  const [google, setGoogle] = useState<{
    connected: boolean;
    connectedEmail?: string;
  }>({ connected: false });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const g = params.get('google');
    if (g === 'connected') setMsg('Google Sheets connected.');
    if (g === 'error' || g === 'no_refresh') {
      setErr('Google OAuth failed. Ensure offline consent and try again.');
    }
  }, [params]);

  useEffect(() => {
    void apiFetch('/api/preferences').then((d) => {
      setDefaultModel(d.preferences?.defaultModel || MODEL_OPTIONS[0].id);
      setOrConfigured(d.openrouter?.configured);
      setGoogle(d.google);
      if (d.preferences?.theme) setTheme(d.preferences.theme);
    }).catch((e) => setErr(e.message));
  }, [apiFetch, setTheme]);

  const saveGeneral = async () => {
    setSaving(true);
    setErr(null);
    try {
      await apiFetch('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: { defaultModel, theme: theme || 'system' },
          openRouterApiKey: apiKey || undefined,
          email: user?.email,
          displayName: user?.displayName,
          photoURL: user?.photoURL,
        }),
      });
      if (apiKey) {
        setOrConfigured(true);
        setApiKey('');
      }
      setMsg('Preferences saved.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const connectGoogle = async () => {
    const d = await apiFetch('/api/google/oauth');
    window.location.href = d.url;
  };

  const disconnectGoogle = async () => {
    if (!confirm('Disconnect Google Sheets?')) return;
    await apiFetch('/api/google/disconnect', { method: 'POST' });
    setGoogle({ connected: false });
    setMsg('Google Sheets disconnected.');
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage keys, Google Sheets, connectors, and automations.
      </p>
      <div className="mt-6">
        <Tabs
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'google', label: 'Google' },
            { id: 'connectors', label: 'Connectors' },
            { id: 'automations', label: 'Automations' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {msg && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {err}
        </p>
      )}

      {tab === 'general' && (
        <Card className="mt-4 space-y-4">
          <div>
            <Label htmlFor="or-key">OpenRouter API key (BYOK)</Label>
            <Input
              id="or-key"
              type="password"
              className="mt-1"
              placeholder={orConfigured ? '•••••••• (configured)' : 'sk-or-…'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Stored encrypted. Never exposed to the client Firestore.
            </p>
          </div>
          <div>
            <Label htmlFor="model">Default model</Label>
            <Select
              id="model"
              className="mt-1"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select
              id="theme"
              className="mt-1"
              value={theme || 'system'}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
          <Button onClick={() => void saveGeneral()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Card>
      )}

      {tab === 'google' && (
        <Card className="mt-4 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect Google Sheets with offline access so chat and automations can
            read and write your spreadsheets.
          </p>
          {google.connected ? (
            <>
              <p className="text-sm">
                Connected as{' '}
                <strong>{google.connectedEmail || 'Google account'}</strong>
              </p>
              <Button variant="destructive" onClick={() => void disconnectGoogle()}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={() => void connectGoogle()}>
              Connect Google Sheets
            </Button>
          )}
        </Card>
      )}

      {tab === 'connectors' && <ConnectorsPanel />}
      {tab === 'automations' && <AutomationsPanel />}
    </div>
  );
}
