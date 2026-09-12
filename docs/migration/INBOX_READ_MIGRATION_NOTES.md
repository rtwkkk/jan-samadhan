# Inbox Read Migration Notes

## 1. Current Inbox Read Flow

The client-side inbox currently relies entirely on Supabase/PostgreSQL for reading the conversation list and hydrating updates:
1. **Initial Load (`src/components/inbox/conversation-list.tsx`):**
   Calls `supabase.from("conversations").select(CONVERSATION_SELECT)` to fetch all conversations, joined with Contacts and Tags.
2. **Hydration (`src/app/(dashboard)/inbox/page.tsx`):**
   When `use-realtime` detects a `postgres_changes` event for a new conversation, `hydrateConversation(id)` is called. It queries Supabase by `id` to pull the joined `contact` and `tags` data which is missing from the realtime payload.
3. **Total Unread (`src/hooks/use-total-unread.ts`):**
   Queries `supabase.from("conversations").select("id, unread_count")` on mount to compute the sidebar notification dot.

## 2. Files Changed
None. (Audit Only).

## 3. API Endpoint Used/Created
None created. An endpoint like `GET /api/internal/conversations` would be required because the existing `GET /api/v1/conversations` strictly uses `requireApiKey` and rejects browser-based Supabase session cookies.

## 4. MongoDB Repositories Used
None modified. The existing `ConversationRepository` would require a new method (e.g., `findManyWithContactsAndTags`) to perform a `$lookup`/`populate` across the `contacts` and `tags` collections, replicating the shape of `CONVERSATION_SELECT`.

## 5. Authentication/Account Resolution
Not implemented. Future implementation must use `getSession()` or equivalent Next.js auth utilities to resolve the user's `accountId` securely server-side.

## 6. Data-Shape Compatibility
The UI expects `Conversation` objects to contain a deeply nested `contact: { ..., tags: Tag[] }` object. Since the MongoDB `Contact` model uses an array of string `tagIds`, the MongoDB query must fully populate these tags to maintain compatibility with `matchesContactFilters` in `src/lib/inbox/conversations.ts`.

## 7. Realtime Compatibility
The UI relies on `supabase.channel("inbox-realtime").on("postgres_changes", ...)` for live updates. 
If we switch the initial load to MongoDB, Supabase Realtime will still fire events based on Postgres changes.

## 8. Tests Performed
- `npm run typecheck`
- Verified `original/` remains untouched.

## 9. Any Remaining Supabase Reads
All of them. Implementation was explicitly halted.

## 10. Blockers for the Next Migration Step (CONDITION B MET)

**Condition B was met: A separate backfill/synchronization step must happen before this client read can safely switch.**

**Explanation:**
1. In Step 13, Conversation and Message writes in the WhatsApp Webhook were intentionally left on PostgreSQL due to a strict Foreign Key constraint.
2. Therefore, when a live webhook hits the system today, the new conversation is written *only* to PostgreSQL.
3. If we migrate the client read paths to MongoDB right now, the initial load will return 0 live conversations (as they only exist in Postgres).
4. Furthermore, when Supabase Realtime fires a `conversation.created` event, `hydrateConversation(id)` would attempt to look up the ID in MongoDB and fail (returning `null`), leaving the UI completely broken.

**Conclusion:** We cannot migrate the UI read path to MongoDB while the authoritative write path is still on Postgres unless we build a dual-write sync. The recommended next step is to perform the bulk backfill and migrate the Webhook Writes + Client Reads in a single atomic cutover.
