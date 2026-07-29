'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/tabs';
import { scheduleLabel, SCHEDULE_OPTIONS } from '@/lib/automations/schedule';
import type { Automation, Connector, SchedulePreset } from '@/lib/types';
import { Play, Trash2 } from 'lucide-react';

export function AutomationsPanel() {
  const { apiFetch } = useApi();
  const [list, setList] = useState<Automation[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schedule, setSchedule] = useState<SchedulePreset>('daily');
  const [connectorIds, setConnectorIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const [a, c] = await Promise.all([
      apiFetch('/api/automations'),
      apiFetch('/api/connectors'),
    ]);
    setList(a.automations);
    setConnectors(c.connectors);
  };

  useEffect(() => {
    void reload().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    setError(null);
    try {
      await apiFetch('/api/automations', {
        method: 'POST',
        body: JSON.stringify({ name, prompt, schedule, connectorIds }),
      });
      setName('');
      setPrompt('');
      setConnectorIds([]);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const toggle = async (a: Automation) => {
    await apiFetch(`/api/automations/${a.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !a.enabled }),
    });
    await reload();
  };

  const runNow = async (id: string) => {
    const d = await apiFetch(`/api/automations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ runNow: true }),
    });
    if (d.run?.chatId) {
      window.location.href = `/chat/${d.run.chatId}`;
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete automation?')) return;
    await apiFetch(`/api/automations/${id}`, { method: 'DELETE' });
    await reload();
  };

  return (
    <div className="mt-4 space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Card className="space-y-3">
        <h2 className="font-medium">New automation</h2>
        <div>
          <Label>Name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Prompt</Label>
          <Textarea
            className="mt-1"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Summarize new rows in @Finance and list anomalies"
          />
        </div>
        <div>
          <Label>Schedule</Label>
          <Select
            className="mt-1"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as SchedulePreset)}
          >
            {SCHEDULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Connectors</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {connectors.map((c) => {
              const on = connectorIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setConnectorIds((ids) =>
                      on ? ids.filter((x) => x !== c.id) : [...ids, c.id],
                    )
                  }
                  className={
                    on
                      ? 'rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs text-white'
                      : 'rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs dark:bg-zinc-800'
                  }
                >
                  @{c.slug}
                </button>
              );
            })}
          </div>
        </div>
        <Button onClick={() => void create()}>Create</Button>
      </Card>

      <div className="space-y-2">
        {list.map((a) => (
          <Card key={a.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-zinc-500">
                  {scheduleLabel(a.schedule)} ·{' '}
                  {a.enabled ? 'Enabled' : 'Disabled'}
                  {a.nextRunAt && ` · next ${new Date(a.nextRunAt).toLocaleString()}`}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {a.prompt}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="secondary" size="sm" onClick={() => void toggle(a)}>
                  {a.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void runNow(a.id)}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(a.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
            {a.lastRunAt && (
              <p className="text-xs text-zinc-400">
                Last run {new Date(a.lastRunAt).toLocaleString()} — see sidebar
                automation chats or{' '}
                <Link href="/" className="underline">
                  chat list
                </Link>
              </p>
            )}
          </Card>
        ))}
        {!list.length && (
          <p className="text-sm text-zinc-400">No automations yet.</p>
        )}
      </div>
    </div>
  );
}
