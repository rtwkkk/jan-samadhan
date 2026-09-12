# MongoDB Backfill and Cutover Design

## 1. Current Architecture
* **Writes:** The WhatsApp Webhook inserts Contacts into MongoDB, but Conversations, Messages, and Reactions into PostgreSQL. It relies heavily on PostgreSQL constraints (e.g., `ON CONFLICT (conversation_id, message_id)`) for idempotency against Meta's delivery retries.
* **Reads:** The Inbox UI fetches the conversation list and message threads from PostgreSQL via Supabase JS.
* **Realtime:** The Inbox UI listens to Supabase `postgres_changes` to hydrate new inbound messages and conversation bumps live.

## 2. PostgreSQL → MongoDB Field Mapping

| PostgreSQL Column (`conversations`) | MongoDB Field (`Conversation`) | Transformation | Nullable / Default | Constraints / Indexes |
|-------------------------------------|--------------------------------|----------------|--------------------|-----------------------|
| `id` (UUID) | `_id` (String) | None | NOT NULL | Primary Key |
| `account_id` (UUID) | `accountId` (String) | None | NOT NULL | Index: `{ accountId: 1, contactId: 1 }` (Unique) |
| `contact_id` (UUID) | `contactId` (String) | None | NOT NULL | FK to `Contact` |
| `status` (TEXT) | `status` (String) | None | Default `'open'` | Enum: open/pending/closed |
| `assigned_agent_id` (UUID) | `assignedAgentId` (String) | None | Nullable | FK to `User` |
| `last_message_text` (TEXT) | `lastMessageText` (String) | None | Nullable | None |
| `last_message_at` (TIMESTAMPTZ) | `lastMessageAt` (Date) | Cast to Date | Nullable | Index: `{ accountId: 1, updatedAt: -1 }` |
| `unread_count` (INTEGER) | `unreadCount` (Number) | None | Default `0` | None |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` | Cast to Date | Default `now()` | Managed by Mongoose timestamps |

| PostgreSQL Column (`messages`) | MongoDB Field (`Message`) | Transformation | Nullable / Default | Constraints / Indexes |
|--------------------------------|---------------------------|----------------|--------------------|-----------------------|
| `id` (UUID) | `_id` (String) | None | NOT NULL | Primary Key |
| `conversation_id` (UUID) | `conversationId` (String) | None | NOT NULL | Index: `{ conversationId: 1, createdAt: 1 }` |
| `sender_type` (TEXT) | `senderType` (String) | None | NOT NULL | Enum: customer/agent/bot |
| `sender_id` (UUID) | `senderId` (String) | None | Nullable | FK to `User` |
| `content_type` (TEXT) | `contentType` (String) | None | Default `'text'` | Enum |
| `content_text` (TEXT) | `contentText` (String) | None | Nullable | None |
| `media_url` / `media_type` | `media.url`, `media.mimeType` | Merge into object | Nullable | None |
| `message_id` (TEXT) | `messageId` (String) | None | Nullable | **MUST BE:** `{ conversationId: 1, messageId: 1 }` Unique |
| `status` (TEXT) | `status` (String) | None | Default `'sent'` | Enum |

*Note: `Message.ts` currently has `{ messageId: 1 }` as a unique index, which is incorrect per migration 009. It must be updated to `{ conversationId: 1, messageId: 1 }`.*

## 3. Backfill Dependency Order
Because MongoDB relationships are referenced at the application level and Contacts contain embedded Tags, the backfill must proceed strictly outward from leaves to root:
1. **Tags:** Must exist so Contacts can embed `tagIds`.
2. **Contacts:** Must exist before Conversations can reference `contactId`.
3. **Conversations:** Must exist before Messages can reference `conversationId`.
4. **Messages:** Must exist before Reactions can target them.
5. **Reactions / Status:** Applied last.

## 4. Synchronization Strategy Options
* **A. Temporary Dual-Write (Application Level):** Webhook writes to both DBs. **Risk:** High. Distributed transactions are not available. A partial failure creates a split-brain.
* **B. CDC / Debezium:** Captures PostgreSQL WAL and replays to Mongo. **Risk:** High operational complexity; overkill for this repository size.
* **C. Supabase Webhook Triggers:** Postgres triggers invoke Edge Functions to write to Mongo. **Risk:** High. Network requests inside DB triggers cause transaction bottlenecks and timeouts.
* **D. Maintenance Window (Webhook Pause):** We intentionally return `HTTP 503` from the Webhook. Meta's Cloud API guarantees retries for up to 24-48 hours. We run the backfill safely with zero moving data, deploy the Mongo Read+Write code, and remove the 503. Meta flushes the queue into MongoDB.

## 5. Recommended Synchronization Strategy
**Option D (Maintenance Window with 503 Queueing)** is the absolute safest approach. 
* **No message loss:** Meta buffers the messages safely.
* **No duplicates:** Existing webhook idempotency handles any edge cases.
* **No split-brain:** Writes never go to two places at once.
* **Zero concurrency risk:** The backfill runs on a completely static dataset.

## 6. Exact Cutover Sequence
1. **Pre-requisite:** Develop and test the MongoDB Change Stream Realtime replacement (SSE/Socket.io).
2. **Pre-requisite:** Develop the UI components to use the new MongoDB Read APIs.
3. **Phase 1 (Pause):** Deploy a temporary commit that returns `HTTP 503 Service Unavailable` for all `POST /api/whatsapp/webhook` requests. (Web UI remains online for read-only access).
4. **Phase 2 (Backfill):** Execute the Node.js backfill script to migrate Tags → Contacts → Conversations → Messages → Reactions.
5. **Phase 3 (Verify):** Run the Data Parity Validation script.
6. **Phase 4 (Deploy Cutover):** Deploy the final branch where:
   - Webhook writes exclusively to MongoDB (using Mongoose Transactions).
   - Client Inbox reads exclusively from MongoDB internal APIs.
   - Client Inbox listens to the new MongoDB Realtime streams.
   - The `503` block is removed.
7. **Phase 5 (Catch-up):** Meta automatically delivers the queued messages, which hit the new MongoDB write path.

## 7. Data Parity Checks
A validation script must check exact equality across:
* `SELECT count(*) FROM conversations` vs `Conversation.countDocuments()` (Grouped by `account_id`).
* `SELECT count(*) FROM messages` vs `Message.countDocuments()`.
* **Deep Check:** Select the 100 most recently active conversations from Postgres and assert that `lastMessageAt`, `lastMessageText`, and `unreadCount` match MongoDB identically.

## 8. Tenant Isolation Strategy
The Node.js backfill script must process data iteratively by `account_id` to guarantee tenant boundaries:
```typescript
const accounts = await postgres.query('SELECT id FROM accounts');
for (const account of accounts) {
  // 1. Fetch tags for account
  // 2. Fetch contacts for account
  // 3. Fetch conversations for account
  // 4. Batch insert into Mongo with explicit accountId=account.id
}
```
All MongoDB schemas natively enforce `accountId: { type: String, required: true }`. The script must strictly map this field to prevent cross-contamination.

## 9. Realtime Compatibility
* **Stage 1 (Current):** Postgres Writes + Postgres Realtime + Postgres Reads.
* **Stage 2 (Maintenance):** 503 Webhook + Postgres Realtime (Silent) + Postgres Reads.
* **Stage 3 (Backfill & Deploy):** Switch everything.
* **Stage 4 (Cutover):** MongoDB Writes + **MongoDB Change Streams (New)** + MongoDB Reads.
* **Crucial Dependency:** We cannot cutover the Webhook or the Inbox Reads until the Supabase `postgres_changes` websocket is replaced with a MongoDB-compatible realtime solution. If we try to split them, the UI will freeze.

## 10. Rollback Plan
If validation fails before Stage 4: 
1. Drop the MongoDB collections. 
2. Revert the `503` commit. 
3. Meta flushes the queue into PostgreSQL exactly as before. Zero data loss.

## 11. Risks and Mitigations
* **Risk:** The MongoDB `Message` model currently uses an incorrect unique index (`{ messageId: 1 }`). Meta message IDs can repeat across different phone numbers. 
* **Mitigation:** Update `Message.ts` to `{ conversationId: 1, messageId: 1 }` before the backfill.

## 12. Exact Next Implementation Step
**Fix MongoDB Model Constraints.**
Update `src/lib/mongodb/models/Message.ts` to replace the globally unique `messageId` index with the structurally correct compound index `{ conversationId: 1, messageId: 1 }` to match PostgreSQL migration 037. This ensures the future backfill and webhook logic will correctly isolate idempotency per-conversation.
