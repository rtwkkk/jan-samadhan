I have successfully fixed the sidebar profile section to correctly sync with the updated user avatar.

## Root Cause
The `useAuth()` hook provides two distinct identity objects: `user` (the global authenticated user data) and `profile` (the linked account context snapshot).
Both `header.tsx` and `sidebar.tsx` were incorrectly deriving the user's name, email, and `avatarUrl` from the `profile` object. However, `profile-form.tsx` properly updates the core `user` object immediately on upload. This caused the avatar state to diverge in the UI depending on component tree reconciliation.

## Files Changed
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`

## Verification Results
- **Sidebar & Header Synchronization:** Both the top-right (`header.tsx`) and the bottom-left (`sidebar.tsx`) now strictly pull their visual identity (`full_name`, `email`, and `avatar_url`) from the `user` object returned by `useAuth()`.
- **Immediate Update:** Uploading a new profile avatar updates the `user` object inside the context. The React state flows instantly to the sidebar without requiring a page refresh.
- **Typecheck:** Clean (`npm run typecheck` passed with 0 errors).
- **Test Suite:** Clean (`npm test` passed with 557 successful tests and 0 failures). No Supabase dependencies were re-introduced.
