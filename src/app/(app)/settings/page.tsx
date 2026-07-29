'use client';

import { Suspense } from 'react';
import { SettingsView } from '@/components/settings/settings-view';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-zinc-400">Loading settings…</div>
      }
    >
      <SettingsView />
    </Suspense>
  );
}
