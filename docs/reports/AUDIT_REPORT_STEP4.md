# WACRM Phase 3, Step 4.1 — Conversations & Messages Audit

This report maps the active Supabase dependencies in the Conversations and Messages domains in `crm/new` and outlines the MongoDB replacement strategy.

---

## A. Conversations (Target: `Conversation` Model / Repository)

The `Conversation` MongoDB model and `ConversationRepository` already exist and are well-equipped to handle the core migration, including atomic unread increments.

**Dependencies:**
1. **`src/app/api/v1/conversations/route.ts` (Server)**
   - **Operation:** `supabase.from('conversations').select(CONVERSATION_SELECT).eq(...)` with keyset pagination.
   - **Replacement:** Use `ConversationRepository.findMany` with pagination and populate `contactId`.

2. **`src/app/api/v1/conversations/[id]/route.ts` (Server)**
   - **Operation:** `supabase.from('conversations').select(...).eq('id', ...).single()` and `.update()`.
   - **Replacement:** Use `ConversationRepository.findById` and `ConversationRepository.updateById`.

3. **`src/lib/conversations/reopen.ts` (Server)**
   - **Operation:** `supabase.from('conversations').update({ status: 'open' })`.
   - **Replacement:** Use `ConversationRepository.updateById`.

4. **`src/lib/whatsapp/resolve-conversation.ts` (Server)**
   - **Operation:** Selects existing conversation for a contact or creates a new one (`.select('id').eq('contact_id', ...)`).
   - **Replacement:** Use `ConversationRepository.findByContactId` and `ConversationRepository.create`.

5. **`src/lib/dashboard/queries.ts` (Server)**
   - **Operation:** Aggregates conversation counts and filters open conversations.
   - **Replacement:** Use MongoDB `$match` / `$group` aggregations via a dashboard-specific Mongoose query.

---

## B. Messages (Target: `Message` Model / Repository)

The `Message` MongoDB model and `MessageRepository` already exist with support for cursor-based pagination and idempotent upserts (crucial for WhatsApp webhooks).

**Dependencies:**
1. **`src/app/api/v1/conversations/[id]/messages/route.ts` (Server)**
   - **Operation:** `supabase.from('messages').select(...).eq('conversation_id', ...)` with keyset pagination.
   - **Replacement:** Use `MessageRepository.findManyWithCursor`.

2. **`src/lib/whatsapp/send-message.ts` (Server)**
   - **Operation:** `supabase.from('messages').insert(...)` for outbound messages, then updates `conversations.last_message_at`.
   - **Replacement:** Use `MessageRepository.create` and `ConversationRepository.updateMetadata`.

3. **`src/app/api/whatsapp/webhook/route.ts` (Server)**
   - **Operation:** Inserts inbound messages, handles duplicates (23505 errors), updates conversation unread count.
   - **Replacement:** Use `MessageRepository.upsertWebhookMessage` and `ConversationRepository.processInbound`.

4. **`src/lib/dashboard/queries.ts` (Server)**
   - **Operation:** Aggregates message volume and calculates response times between customer/agent messages.
   - **Replacement:** Use MongoDB Aggregation Pipeline on the `Message` collection.

---

## C. Inbox / UI (Client-Side)

Next.js Client Components currently fetch data directly from Supabase. These must transition to hitting Next.js `/api/v1/conversations` routes.

**Dependencies:**
1. **`src/components/inbox/conversation-list.tsx`**
   - **Operation:** Fetches `conversations` (and `tags`).
   - **Replacement:** Swap to `fetch('/api/v1/conversations')`.

2. **`src/components/inbox/message-thread.tsx`**
   - **Operation:** Fetches `messages`, `conversations`, `profiles`, and `message_reactions`.
   - **Replacement:** Swap to `fetch('/api/v1/conversations/[id]/messages')` and `/api/v1/conversations/[id]`.

---

## D. Message Reactions (Target: Gap in MongoDB)

**Dependencies:**
1. **`src/app/api/whatsapp/react/route.ts` (Server)**
   - **Operation:** Validates conversation/message, sends WhatsApp reaction, inserts into `message_reactions` table.
2. **`src/components/inbox/message-thread.tsx` (Client)**
   - **Operation:** Reads `message_reactions` via Supabase client.

**Replacement Strategy:**
The current MongoDB models lack a `MessageReaction` schema. We should embed an array of reactions directly onto the `Message` model (e.g., `reactions: [{ emoji, actorType, actorId, createdAt }]`) rather than creating a separate collection, as reactions are tightly bound to the message lifecycle.

---

## E. Realtime Integration (Target: Realtime Architecture)

The existing architecture relies heavily on Supabase's `postgres_changes`.

**Dependencies:**
1. **`src/hooks/use-realtime.ts`**: Subscribes to `messages` and `conversations`.
2. **`src/hooks/use-total-unread.ts`**: Subscribes to `conversations` for unread counts.
3. **`src/components/inbox/message-thread.tsx`**: Subscribes to `message_reactions`.

**Replacement Strategy:**
Moving away from Supabase means replacing `postgres_changes`. A solution like MongoDB Change Streams combined with Server-Sent Events (SSE), Socket.io, or an external provider (Pusher/Ably) must be instituted to preserve the live-updating chat UI.

---

## F. Existing MongoDB Coverage

- **Excellent Coverage:** The core `Conversation` and `Message` models are well-designed. `ConversationRepository.processInbound` intelligently handles the atomic unread bump and status reopen in a single database round-trip. `MessageRepository` handles idempotency exactly as required by Meta's webhook spec.
- **Gaps to Address:** 
  1. `Message` needs a `reactions` array.
  2. The Inbox requires a structured API route to serve aggregated data to the client to replace direct `supabase.from()` fetching.
  3. Realtime delivery mechanism.

---

## G. Recommended Implementation Order (Step 4.2 Onward)

1. **Step 4.2: Update MongoDB Models & Build API Routes**
   - Add `reactions` schema to the `Message` model.
   - Modify the `CONVERSATION_SELECT` and normalization logic to work with the MongoDB `Conversation` response shape.
   - Build out any missing `/api/*` endpoints required by `conversation-list.tsx` and `message-thread.tsx`.

2. **Step 4.3: Migrate Server-Side Core Logic (WhatsApp & Libraries)**
   - Update `send-message.ts`, `resolve-conversation.ts`, and `webhook/route.ts` to exclusively use the MongoDB repositories.
   - Update `dashboard/queries.ts` to utilize Mongoose aggregations for message volume and response times.

3. **Step 4.4: Migrate Client-Side UI & State Management**
   - Strip `supabase.from()` out of `conversation-list.tsx` and `message-thread.tsx`, replacing them with React Query/`fetch` hooks pointing to the new APIs.

4. **Step 4.5: Re-implement Realtime Functionality**
   - Architect and inject the replacement realtime solution (SSE or WebSockets) for `use-realtime.ts`, `use-total-unread.ts`, and reaction streaming.
