'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/tabs';

export function PersonalInfoPanel({
  onSaved,
  onError,
}: {
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { apiFetch } = useApi();
  const [personalInfo, setPersonalInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiFetch('/api/preferences')
      .then((d) => {
        setPersonalInfo(d.preferences?.personalInfo ?? '');
      })
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }, [apiFetch, onError]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: { personalInfo: personalInfo.trim() },
        }),
      });
      onSaved('About you saved. Eva will use this in chat.');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="mt-4 text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <Card className="mt-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium">About you</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Tell Eva who you are — name, role, preferences, timezone, projects,
          how you like to work. The more useful context, the better she can
          assist like someone who knows you.
        </p>
      </div>
      <div>
        <Label htmlFor="personal-info">Personal info</Label>
        <Textarea
          id="personal-info"
          className="mt-1 min-h-45"
          placeholder={`Examples:\n- Name: Alex; based in Berlin (CET)\n- Founder of Acme; focus on sales & ops\n- Prefer short answers; push back if I'm overcomplicating\n- Tracking expenses and client pipeline in Sheets`}
          value={personalInfo}
          onChange={(e) => setPersonalInfo(e.target.value)}
        />
      </div>
      <Button onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </Card>
  );
}
