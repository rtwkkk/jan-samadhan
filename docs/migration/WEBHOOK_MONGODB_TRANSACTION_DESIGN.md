# Webhook MongoDB Transaction Design

## 1. CURRENT WEBHOOK FLOW

The exact execution sequence when `POST /api/whatsapp/webhook` receives a message event:

1. **Contact Resolution:** `findOrCreateContact()` looks up the contact by phone. If missing, creates a new Contact in MongoDB.
2. **Conversation Resolution:** `findOrCreateConversation()` looks up the conversation by `(account_id, contact_id)` oldest-first in PostgreSQL. If missing, inserts a new Conversation in PostgreSQL, handling unique-constraint race collisions.
3. **Realtime Dispatch:** If a conversation was created, it explicitly fires `dispatchWebhookEvent('conversation.created')` to the public webhook API. (PostgreSQL itself simultaneously fires a Realtime `INSERT` event to the Inbox UI).
4. **Reaction Short-Circuit:** If the message is a reaction, `handleReaction()` deletes (if empty emoji) or upserts into `message_reactions` in PostgreSQL, then halts processing.
5. **Media Parsing & Upload:** `parseMessageContent()` makes external calls to the Meta API to verify media, then downloads and uploads the file to Supabase Storage if `mirrorMedia` is enabled.
6. **First Message Check:** Queries PostgreSQL `messages` to count prior customer messages, determining `isFirstInboundMessage`.
7. **Message Upsert (Idempotency):** Upserts the `messages` row in PostgreSQL. It uses `ON CONFLICT (conversation_id, message_id) DO NOTHING`. If `upsert` returns 0 rows, it logs a replay and returns early (halting all subsequent side effects).
8. **Conversation Update (Unread Bump):** Calls PostgreSQL RPC `bump_conversation_on_inbound` to atomically increment `unread_count` and update `last_message_text` / `last_message_at`.
9. **Conversation Re-open:** Calls `reopenClosedConversation()` to atomically update `status = 'open'` where `status = 'closed'` in PostgreSQL.
10. **Broadcast Flagging:** `flagBroadcastReplyIfAny()` updates any recent broadcast state in PostgreSQL.
11. **Flow Runner Dispatch:** `dispatchInboundToFlows()` advances any active Flow engines in PostgreSQL.
12. **Automation Dispatch:** `runAutomationsForTrigger()` queues side effects in PostgreSQL based on triggers (e.g., `new_message_received`, `new_contact_created`).
13. **AI Auto-Reply Dispatch:** `dispatchInboundToAiReply()` triggers LLM automated replies.
14. **Public API Webhook Dispatch:** Emits `message.received` to external subscribers.

## 2. CURRENT DATABASE OPERATIONS

| Operation | PostgreSQL/Supabase Table or RPC | Read/Write | Purpose | Idempotency Mechanism | Transaction Dependency | Proposed MongoDB |
|-----------|----------------------------------|------------|---------|-----------------------|-------------------------|------------------|
| Contact Lookup/Create | MongoDB `contacts` | R/W | Identify sender | Mongoose `11000` catch | None | Already migrated |
| Conversation Lookup | `conversations` | Read | Identify thread | Oldest-first `limit(1)` | None | `Conversation.findOne()` |
| Conversation Insert | `conversations` | Write | Open thread | `ON CONFLICT` race catch | FK needed for Message | `Conversation.create()` |
| Reaction Delete/Upsert| `message_reactions` | Write | Update reaction | `ON CONFLICT` constraint | FK to `messages` | Subdocument or Collection |
| First Inbound Check | `messages` | Read | Identify first-time | None | None | `Message.countDocuments()` |
| Message Insert | `messages` | Write | Store payload | `ON CONFLICT DO NOTHING` | FK to `conversations` | `Message.create()` + Index |
| Unread Bump | RPC `bump_conversation...` | Write | Update inbox counts | DB-level `$inc` | Needs Conversation row | `Conversation.updateOne($inc)` |
| Re-open Thread | `conversations` | Write | Un-hide from inbox | `WHERE status='closed'` | Needs Conversation row | `Conversation.updateOne()` |

## 3. DATA CONSISTENCY RISKS

Moving operations partially to MongoDB introduces critical cross-database risks:
* **Foreign-Key Failures (Error 23503):** Moving Conversation creation to MongoDB while Message insertion remains in PostgreSQL will cause the Message insert to fail instantly due to `conversation_id REFERENCES conversations(id)`.
* **Broken Realtime UI:** The Next.js inbox strictly depends on PostgreSQL WebSocket events (`postgres_changes`) for new conversations and updates. Moving writes to MongoDB without a replacement Realtime layer will cause the UI to silently fail to show new messages.
* **Race Conditions:** `bump_conversation_on_inbound` depends on the PostgreSQL conversation row existing. If created in MongoDB, the PostgreSQL RPC will update 0 rows, resulting in permanently stale `unread_count` metrics.
* **Partial Writes & Retry Inconsistencies:** If MongoDB inserts the message but the process crashes before triggering automations, the webhook may be retried. If the MongoDB duplicate check (idempotency) stops the retry, the automations will never run, silently dropping business logic.

## 4. WEBHOOK IDEMPOTENCY

* **Current Implementation:** Meta aggressively retries deliveries. The webhook uses the `messages` PostgreSQL table as an idempotency lock. It executes `INSERT ... ON CONFLICT (conversation_id, message_id) DO NOTHING`. If the insert yields 0 rows, it means the `message_id` already existed, so the function logs a replay and halts execution immediately. This prevents double-bumping unread counts and duplicate automation triggers.
* **MongoDB Equivalent:** We must enforce a unique compound index: `MessageSchema.index({ conversationId: 1, messageId: 1 }, { unique: true })`. The MongoDB upsert logic will be:
  ```typescript
  try {
    await MessageRepository.create(payload);
  } catch (error) {
    if (error.code === 11000) return; // Halt on duplicate (idempotent replay)
    throw error;
  }
  ```

## 5. TRANSACTION BOUNDARY

The webhook requires an ACID transaction to guarantee that a message is never saved without also updating the conversation's unread count.

**Must happen BEFORE the transaction:**
* Contact lookup/creation (can safely persist independently).
* Meta API requests (media URL fetch).
* Supabase Storage uploads (`mirrorInboundMedia`). External I/O must never block a MongoDB transaction lock.

**Must happen INSIDE the transaction:**
* Conversation Lookup / Creation (if not already existing).
* Message Insert (idempotent checkpoint).
* Conversation Update (Unread Bump, Last Message Update).
* Conversation Re-open (`status = 'open'`).

**Must happen AFTER commit:**
* Realtime/UI state broadcast.
* Automation/Flow fan-out.
* Public API webhook dispatch.

## 6. CONVERSATION + MESSAGE MIGRATION ORDER

To maintain referential integrity (Foreign Keys) and prevent silent failures, we cannot migrate writes independently. The exact migration order must be:
1. Complete migration of all *Read* operations (APIs, UI components) for both Conversations and Messages to MongoDB.
2. Implement a MongoDB Change Stream or Pub/Sub equivalent for Realtime updates.
3. Migrate the Webhook's Conversation **and** Message inserts together in a single deployment, utilizing a MongoDB Session/Transaction.
4. Drop PostgreSQL `conversations` and `messages` tables.

## 7. REALTIME IMPACT

* **Current State:** The Next.js client uses `@supabase/supabase-js` to listen to `postgres_changes` on both `conversations` and `messages`. 
* **Impact of Migration:** The moment we migrate the webhook inserts to MongoDB, these Supabase WebSocket events will stop firing. The inbox will appear completely frozen. Furthermore, the UI's `hydrateConversation` fallback explicitly queries the Supabase `conversations` table, which will crash or return empty if the data only exists in MongoDB.
* **Replacement Strategy:** Do NOT implement yet. The safest replacement strategy is to introduce a Node.js Server-Sent Events (SSE) route or Socket.io layer that listens to MongoDB Change Streams (`Conversation.watch()`, `Message.watch()`) and broadcasts them to the authenticated client.

## 8. FAILURE/RETRY SCENARIOS

* **Duplicate webhook delivery:** Safe. Caught by MongoDB unique index `11000` on `messageId`; halts execution.
* **Conversation exists but message insert fails:** Safe. Handled by transaction abort. No unread counts are bumped.
* **Media upload failure:** Fails early, BEFORE transaction starts. Meta retries delivery; upload re-attempts safely.
* **Process crash after commit:** Message is persisted. Meta gets no `200 OK` and retries. Duplicate delivery is caught by unique index, but automations might be lost (this is an existing flaw in the current architecture).
* **Process crash before commit:** Transaction aborts. Meta retries delivery. Safe.

## 9. REQUIRED CODE CHANGES

*(To be executed in a future step, DO NOT make these changes now)*:
* `src/lib/mongodb/models/Message.ts`: Add `unique: true` to `{ conversationId: 1, messageId: 1 }`.
* `src/lib/mongodb/repositories/MessageRepository.ts`: Add `createWithSession()` or `upsertIdempotent()` method.
* `src/lib/mongodb/repositories/ConversationRepository.ts`: Add `$inc` support for `bumpUnreadCount()`.
* `src/app/api/whatsapp/webhook/route.ts`:
  * Remove `supabaseAdmin().from('messages').upsert()`.
  * Remove `bump_conversation_on_inbound` RPC call.
  * Remove `reopenClosedConversation` Supabase call.
  * Wrap the insert/bump/reopen sequence in `mongoose.startSession() -> session.withTransaction()`.

## 10. OPEN QUESTIONS / BLOCKERS

1. **Realtime Replacement:** We must build the SSE/Socket.io MongoDB Change Stream infrastructure *before* cutting over the webhook writes, otherwise the client inbox will break.
2. **Reactions Migration:** Should `message_reactions` become an array of subdocuments on the `Message` model, or remain a separate MongoDB collection? Given they are frequently mutated, a separate collection or an array of subdocuments is required.
3. **Data Backfill:** We must execute a bulk Postgres -> Mongo data migration of historical conversations/messages *immediately prior* to the webhook write cutover.

## 11. RECOMMENDED NEXT IMPLEMENTATION STEP

**Migrate the remaining Read paths to MongoDB.**
Specifically, the Inbox UI client components (e.g., `src/app/(dashboard)/inbox/page.tsx`) currently fetch and hydrate conversations via Supabase REST APIs. We must switch these read queries to MongoDB (via internal Next.js API routes) before we can safely transition the writes. This is the smallest, lowest-risk change that doesn't violate Foreign Keys or Realtime write paths.
