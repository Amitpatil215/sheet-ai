'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/tabs';
import { scheduleLabel } from '@/lib/automations/schedule';
import type { Automation, Connector, SchedulePreset } from '@/lib/types';
import { Pencil, Play, Trash2 } from 'lucide-react';
import { AutomationForm } from './automation-form';

export function AutomationsPanel() {
  const { apiFetch } = useApi();
  const [list, setList] = useState<Automation[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const create = async (data: {
    name: string;
    prompt: string;
    schedule: SchedulePreset;
    connectorIds: string[];
  }) => {
    setError(null);
    try {
      await apiFetch('/api/automations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const update = async (
    id: string,
    data: {
      name: string;
      prompt: string;
      schedule: SchedulePreset;
      connectorIds: string[];
    },
  ) => {
    setError(null);
    try {
      await apiFetch(`/api/automations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setEditingId(null);
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
    if (d.run?.chatId) window.location.href = `/chat/${d.run.chatId}`;
  };

  const remove = async (id: string) => {
    if (!confirm('Delete automation?')) return;
    await apiFetch(`/api/automations/${id}`, { method: 'DELETE' });
    await reload();
  };

  return (
    <div className="mt-4 space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Create form */}
      <AutomationForm connectors={connectors} onSubmit={create} />

      {/* List */}
      <div className="space-y-2">
        {list.map((a) =>
          editingId === a.id ? (
            <AutomationForm
              key={a.id}
              connectors={connectors}
              initial={a}
              onSubmit={(data) => update(a.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <AutomationCard
              key={a.id}
              automation={a}
              onEdit={() => setEditingId(a.id)}
              onToggle={() => void toggle(a)}
              onRun={() => void runNow(a.id)}
              onDelete={() => void remove(a.id)}
            />
          ),
        )}
        {!list.length && (
          <p className="text-sm text-zinc-400">No automations yet.</p>
        )}
      </div>
    </div>
  );
}

function AutomationCard({
  automation: a,
  onEdit,
  onToggle,
  onRun,
  onDelete,
}: {
  automation: Automation;
  onEdit: () => void;
  onToggle: () => void;
  onRun: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{a.name}</p>
          <p className="text-xs text-zinc-500">
            {scheduleLabel(a.schedule)} ·{' '}
            {a.enabled ? 'Enabled' : 'Disabled'}
            {a.nextRunAt &&
              ` · next ${new Date(a.nextRunAt).toLocaleString()}`}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {a.prompt}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={onToggle}>
            {a.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onRun}>
            <Play className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
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
  );
}
