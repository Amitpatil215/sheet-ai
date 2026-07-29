'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#a7f3d0_0%,transparent_40%),radial-gradient(circle_at_80%_0%,#bbf7d0_0%,transparent_35%),linear-gradient(160deg,#ecfdf5,#f8fafc)] dark:bg-[radial-gradient(circle_at_20%_20%,#064e3b66_0%,transparent_40%),linear-gradient(160deg,#09090b,#14532d33)]">
      <div className="relative z-10 mx-4 w-full max-w-md text-center">
        <p className="text-4xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
          AI Sheets
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Chat with your Google Spreadsheets — tag connectors, run CRUD, and
          schedule automations.
        </p>
        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={() => void signInWithGoogle()}
          disabled={loading}
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
