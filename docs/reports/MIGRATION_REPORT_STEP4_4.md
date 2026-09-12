# Phase 3 Step 4.4: Inbox UI Migration Report

**Goal:** Migrate the Inbox/Chat client UI (`conversation-list.tsx` and `message-thread.tsx`) from direct Supabase access to existing MongoDB-backed `/api/v1` routes without redesigning the UI or touching realtime features.

## Files Changed:
1. `src/components/inbox/conversation-list.tsx`:
   - Replaced `supabase.from("conversations").select(...)` with keyset-paginated HTTP `fetch('/api/v1/conversations')`.
   - Replaced `supabase.from("tags").select(...)` with `fetch('/api/tags')`.
   - Removed obsolete `CONVERSATION_SELECT` and `normalizeConversations` dependencies since the API directly returns the correct shape.

2. `src/components/inbox/message-thread.tsx`:
   - Replaced `supabase.from("profiles")` with `fetch('/api/account/members')`.
   - Replaced `supabase.from("messages")` with keyset-paginated `fetch('/api/v1/conversations/[id]/messages')`. Note: reversed the array on the client to preserve the chronological ascending display order.
   - Removed the separate `supabase.from("message_reactions")` fetch effect. Reactions are now extracted directly from the nested `Message.reactions` array returned by the messages API endpoint.
   - Replaced `supabase.from("conversations").update(...)` for status, unread count, and assignee assignment with `fetch('/api/v1/conversations/[id]', { method: 'PATCH' })`.
   - Note: The mutation logic for sending reactions (`postReaction`) was already using `fetch('/api/whatsapp/react')` and required no change.

3. `src/lib/api/v1/conversations.ts` & `src/app/api/v1/conversations/[id]/messages/route.ts`:
   - Updated `serializeMessage` and the `/api/v1/.../messages` route to include the nested `reactions` array in the returned `ApiMessage` so the frontend doesn't need a separate fetch.

4. `src/app/api/v1/conversations/[id]/route.ts` & `src/lib/api-keys/scopes.ts`:
   - Added a `PATCH` method to support updating a conversation's `status`, `unread_count`, and `assigned_agent_id` from the UI.
   - Registered a new `conversations:write` API scope to authorize these mutations.

## Remaining Inbox Supabase Dependencies:
- **Realtime**: `supabase.channel("room1")` and `supabase.channel("reactions:[id]")` remain strictly intact in `message-thread.tsx` and `use-realtime.ts` for Step 4.5.
- **Contact Sidebar**: `src/components/inbox/contact-sidebar.tsx` still uses Supabase to fetch `deals` and `contact_notes` since those domains belong to a future phase and were excluded from this migration.

## Verification:
- **Typecheck**: `npm run typecheck` passes cleanly (0 errors).
- **Tests**: `npm run test` reports 496 passing, 0 failing, 27 skipped (baseline matched).
