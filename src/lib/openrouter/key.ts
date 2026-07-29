import { decrypt } from '@/lib/crypto';
import { userRef } from '@/lib/firebase/auth';

export async function getOpenRouterKey(uid: string): Promise<string> {
  const snap = await userRef(uid).collection('secrets').doc('openrouter').get();
  if (!snap.exists) {
    throw new Error(
      'OpenRouter API key not configured. Add it in Settings → General.',
    );
  }
  return decrypt(snap.data()!.apiKey as string);
}

/** Returns the user's key when configured; otherwise undefined. */
export async function getOpenRouterKeyOptional(
  uid: string,
): Promise<string | undefined> {
  const snap = await userRef(uid).collection('secrets').doc('openrouter').get();
  if (!snap.exists) return undefined;
  return decrypt(snap.data()!.apiKey as string);
}
