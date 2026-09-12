/**
 * Client-side helper to fetch the current authenticated user context.
 * Replaces `supabase.auth.getSession()` / `supabase.auth.getUser()` calls
 * in client components with our MongoDB-native auth.
 *
 * Returns { userId, accountId, email, role } or null if unauthenticated.
 */
export async function getClientAuth(): Promise<{
  userId: string;
  accountId: string;
  email: string;
  role: string;
} | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.user) return null;
    return {
      userId: data.user.id,
      accountId: data.accountId,
      email: data.user.email,
      role: data.role,
    };
  } catch {
    return null;
  }
}
