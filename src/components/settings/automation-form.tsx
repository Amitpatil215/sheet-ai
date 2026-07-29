'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/tabs';
import { SCHEDULE_OPTIONS } from '@/lib/automations/schedule';
import type { Automation, Connector, SchedulePreset } from '@/lib/types';

interface Props {
  connectors: Connector[];
  /** If provided, we're editing; otherwise creating. */
  initial?: Automation;
  onSubmit: (data: {
    name: string;
    prompt: string;
    schedule: SchedulePreset;
    connectorIds: string[];
  }) => Promise<void>;
  onCancel?: () => void;
}

export function AutomationForm({
  connectors,
  initial,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [schedule, setSchedule] = useState<SchedulePreset>(
    initial?.schedule ?? 'daily',
  );
  const [connectorIds, setConnectorIds] = useState<string[]>(
    initial?.connectorIds ?? [],
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({ name, prompt, schedule, connectorIds });
      if (!initial) {
        setName('');
        setPrompt('');
        setSchedule('daily');
        setConnectorIds([]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">
        {initial ? `Edit: ${initial.name}` : 'New automation'}
      </h2>
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
      <div className="flex gap-2">
        <Button disabled={saving} onClick={() => void handleSubmit()}>
          {initial ? 'Save' : 'Create'}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}
