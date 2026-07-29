'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/tabs';
import { PERMISSION_LABELS, slugify } from '@/lib/utils';
import type { Connector, Permission, PromptTemplate } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  spreadsheetUrl: '',
  defaultWorksheet: '',
  systemPrompt: '',
  permission: 'full_crud' as Permission,
};

export function ConnectorsPanel() {
  const { apiFetch } = useApi();
  const [list, setList] = useState<Connector[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [tplTitle, setTplTitle] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const d = await apiFetch('/api/connectors');
    setList(d.connectors);
  };

  useEffect(() => {
    void reload().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setError(null);
    try {
      if (editingId) {
        await apiFetch(`/api/connectors/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/connectors', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      setTemplates([]);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const edit = async (c: Connector) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      spreadsheetUrl: c.spreadsheetUrl || c.spreadsheetId,
      defaultWorksheet: c.defaultWorksheet || '',
      systemPrompt: c.systemPrompt || '',
      permission: c.permission,
    });
    const d = await apiFetch(`/api/connectors/${c.id}/templates`);
    setTemplates(d.templates);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete connector?')) return;
    await apiFetch(`/api/connectors/${id}`, { method: 'DELETE' });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    await reload();
  };

  const addTemplate = async () => {
    if (!editingId || !tplTitle || !tplBody) return;
    await apiFetch(`/api/connectors/${editingId}/templates`, {
      method: 'POST',
      body: JSON.stringify({ title: tplTitle, promptBody: tplBody }),
    });
    setTplTitle('');
    setTplBody('');
    const d = await apiFetch(`/api/connectors/${editingId}/templates`);
    setTemplates(d.templates);
  };

  const removeTemplate = async (templateId: string) => {
    if (!editingId) return;
    await apiFetch(
      `/api/connectors/${editingId}/templates?templateId=${templateId}`,
      { method: 'DELETE' },
    );
    setTemplates((t) => t.filter((x) => x.id !== templateId));
  };

  return (
    <div className="mt-4 space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Card className="space-y-3">
        <h2 className="font-medium">{editingId ? 'Edit connector' : 'New connector'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: editingId ? f.slug : slugify(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label>Slug (@tag)</Label>
            <Input
              className="mt-1"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>Spreadsheet URL or ID</Label>
          <Input
            className="mt-1"
            value={form.spreadsheetUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, spreadsheetUrl: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Default worksheet</Label>
            <Input
              className="mt-1"
              value={form.defaultWorksheet}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultWorksheet: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Permission</Label>
            <Select
              className="mt-1"
              value={form.permission}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  permission: e.target.value as Permission,
                }))
              }
            >
              {Object.entries(PERMISSION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            className="mt-1"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <Label>Connector system prompt</Label>
          <Textarea
            className="mt-1"
            value={form.systemPrompt}
            onChange={(e) =>
              setForm((f) => ({ ...f, systemPrompt: e.target.value }))
            }
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void save()}>
            {editingId ? 'Update' : 'Create'}
          </Button>
          {editingId && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setTemplates([]);
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        {editingId && (
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <h3 className="mb-2 text-sm font-medium">Prompt templates</h3>
            <ul className="mb-3 space-y-1">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{t.title}</span>
                  <button type="button" onClick={() => void removeTemplate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid gap-2">
              <Input
                placeholder="Template title"
                value={tplTitle}
                onChange={(e) => setTplTitle(e.target.value)}
              />
              <Textarea
                placeholder="Prompt body"
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
              />
              <Button variant="secondary" size="sm" onClick={() => void addTemplate()}>
                <Plus className="h-3.5 w-3.5" /> Add template
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {list.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {c.name}{' '}
                <span className="text-xs text-zinc-400">@{c.slug}</span>
              </p>
              <p className="text-xs text-zinc-500">
                {PERMISSION_LABELS[c.permission]} · {c.spreadsheetId.slice(0, 12)}…
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => void edit(c)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void remove(c.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
        {!list.length && (
          <p className="text-sm text-zinc-400">No connectors yet.</p>
        )}
      </div>
    </div>
  );
}
