# WhatsApp Webhook Migration Map

## 1. Exact Inbound Webhook Execution Flow
1. **Verification**: Validates HMAC signature using `x-hub-signature-256`.
2. **Queueing**: Pushes the processing logic to Next.js `after()` queue and immediately acknowledges Meta with `200 OK`.
3. **Routing**: Inspects the webhook body. Delegates Template status changes (`handleTemplateWebhookChange`) and Message statuses (`handleStatusUpdate`).
4. **Account Resolution**: Looks up `whatsapp_config` using `phone_number_id` (via `supabaseAdmin()`). Validates a single account mapping.
5. **Contact Resolution**: Calls local `findOrCreateContact`. Uses `findExistingContact` (which was migrated to MongoDB in Step 8) to check existence. If missing, attempts to `INSERT` into Supabase `contacts`. Handles unique-constraint racing safely. If the name changed, issues an `UPDATE` to Supabase `contacts`.
6. **Conversation Resolution**: Calls local `findOrCreateConversation`. Uses Supabase `SELECT` to find an open/pending conversation. If missing, `INSERT`s into Supabase `conversations`.
7. **Thread Open Webhook**: If the conversation was created, immediately fires internal `dispatchWebhookEvent('conversation.created')`.
8. **Reaction Handling**: If it's a reaction, processes it via `handleReaction` and terminates.
9. **Media Processing**: `parseMessageContent` downloads media from Meta and uploads to Supabase Storage if `mirrorInboundMedia` is enabled.
10. **Quoted Reply Context**: Looks up the internal message ID of any quoted Meta `context.id`.
11. **Idempotency Check / Message Insertion**: Issues an `UPSERT` to Supabase `messages` relying on `ON CONFLICT (conversation_id, message_id) DO NOTHING`. If `insertedRows.length === 0`, execution aborts immediately (deduplication success).
12. **Conversation Metadata**: Executes Supabase RPC `bump_conversation_on_inbound` to atomically increment `unread_count` and update `last_message_text`.
13. **Reopening**: Evaluates if the conversation was closed; if so, opens it using `reopenClosedConversation()`.
14. **Broadcast Resolution**: Flags if the reply correlates to a broadcast.
15. **Flows Engine**: Dispatches to `dispatchInboundToFlows()`.
16. **Automation Engine**: Executes `runAutomationsForTrigger()` for relevant events.
17. **AI Auto-Reply**: Executes `dispatchInboundToAiReply()` if configured.
18. **Message Webhook**: Fires internal `dispatchWebhookEvent('message.received')`.

## 2. All Database Writes Reachable from Webhook
* **`contacts`**: `UPDATE` (name change) & `INSERT` (new contact). Re-resolves on Postgres `23505`. (Webhook specific).
* **`conversations`**: `INSERT` (new conversation), `UPDATE` (re-open closed), `RPC` (bump unread).
* **`messages`**: `UPSERT` (new incoming message).
* **`message_reactions`**: `UPSERT` & `DELETE` (handled via `handleReaction`).
* **`message_status`**: `UPDATE` (handled via `handleStatusUpdate`).
* **`automation_logs`**: `INSERT` (automation engine).
* **`whatsapp_config`**: NO writes (read-only for resolution).
* **`contact_tags`**: `INSERT` (via automation flows like `addContactTagIfAbsent`).

## 3. Current Write Target of Each Operation
| Flow | Entity | Current Write Target | Function | Notes |
|------|--------|----------------------|----------|-------|
| Contact Init | `contacts` | **Supabase** | `findOrCreateContact` | Unique constraint race check. |
| Contact Lookups | `contacts` | **MongoDB** | `findExistingContact` | Migrated in Step 8. |
| Conv Init | `conversations` | **Supabase** | `findOrCreateConversation` | Checks status manually. |
| Message Recv | `messages` | **Supabase** | `processMessage` | UPSERT idempotency. |
| Conv Bump | `conversations` | **Supabase** | `bump_conversation_on_inbound` | RPC execution. |
| Conv Reopen | `conversations` | **Supabase** | `reopenClosedConversation` | |
| Tag Assignment | `tags` | **MongoDB** | `addContactTagIfAbsent` | Migrated in Step 9 via Automations! |
| Reaction | `messages` | **Supabase** | `handleReaction` | |
| AI | `messages` | **Supabase** | `dispatchInboundToAiReply` | AI drafts/sends. |
| Status Ack | `messages` | **Supabase** | `handleStatusUpdate` | |

## 4. Current Idempotency Mechanism
The webhook heavily utilizes Supabase PostgreSQL features for idempotency:
* **Messages**: Relies on a `UNIQUE(conversation_id, message_id)` constraint inside an `UPSERT` with `ignoreDuplicates: true`. The `RETURNING id` clause determines if the message was actually inserted.
* **Contacts**: Uses `UNIQUE(account_id, phone)` and catches PostgreSQL code `23505` to recover gracefully.
* **MongoDB Equivalent Analysis**: `MessageRepository.upsertByMessageId()` uses `findOneAndUpdate` with `upsert: true`. To properly replicate the Postgres idempotency where we *abort downstream operations* if it was a duplicate, we will need the Mongo operation to return a flag indicating if an upsert actually inserted a new document (e.g., checking if the document `createdAt` matches `updatedAt` or using the raw result from MongoDB).

## 5. Conversation Metadata Update Mechanism
* **Last Message & Unread Count**: Updated atomically via a PostgreSQL RPC (`bump_conversation_on_inbound`).
* **Why**: To avoid read-modify-write race conditions where two simultaneous webhook messages read `unread_count = 0` and both write `unread_count = 1` instead of `2`.
* **MongoDB Equivalent**: Can be replaced effortlessly using `$inc: { unreadCount: 1 }` and `$set: { lastMessageText, lastMessageAt }` via `ConversationRepository.updateMetadata()`.

## 6. Contact Resolution Mechanism
The webhook calls `findExistingContact` (which queries MongoDB using a regex against the phone suffix), but if missing, writes the contact directly into Supabase. (Note: Because `findExistingContact` reads MongoDB, but the webhook writes to Supabase, this creates an inconsistency until writes are fully migrated in a future step).

## 7. RPC/Transaction Dependencies
* `bump_conversation_on_inbound`: Atomically increments unread counts and updates last message state.
* `reopenClosedConversation`: Updates a conversation status logically based on current state.

## 8. Realtime Side Effects
No code in the webhook explicitly fires Realtime subscriptions. Instead, the UI client (`message-thread.tsx`, `use-total-unread.ts`) subscribes to the Supabase Postgres tables (`conversations`, `messages`).
When the webhook performs an `INSERT` or `UPDATE` on Supabase, the Supabase Realtime engine automatically broadcasts these changes to connected clients. 
*(Once we move writes to MongoDB, we must manually dispatch Socket.io/Pusher/Realtime events).*

## 9. Storage/Media Side Effects
* `parseMessageContent` actively calls the Meta API to download media blobs.
* Uploads bytes to the Supabase Storage bucket `chat-media`.
* Modifies the Message payload to point to the Supabase Storage public URL.

## 10. Failure/Retry Behavior
* **Pre-Idempotency Failures**: If Config, Contact, or Conversation creation fails, the webhook aborts gracefully (`return`).
* **Mid-Idempotency**: If the message insert throws a non-unique error, it logs and aborts.
* **Duplicate Detection**: If a message was already processed (duplicate Meta delivery), it gracefully aborts without processing flows, AI, or webhooks.
* **Post-Idempotency Failures**: Flow/Automation/AI failures are intentionally isolated (via `catch` or detached promises) so that they do NOT crash the Webhook, ensuring Meta doesn't indefinitely retry a successful message just because an AI prompt failed.

## 11. Webhook MongoDB Writes
Currently, the webhook triggers MongoDB writes *indirectly* via side-effects (e.g. `runAutomationsForTrigger` executing an `addContactTagIfAbsent` action which writes to MongoDB's `ContactRepository`). 

## 12. Proposed Future Transaction Boundary
When fully migrated, the following core operations should exist inside a single atomic MongoDB Transaction/Session:
1. `findOrCreateContact` (Write)
2. `findOrCreateConversation` (Write)
3. `MessageRepository.insert` (Write + Duplicate Check)
4. `ConversationRepository.updateMetadata` (Write)

**Must remain OUTSIDE the transaction:**
* Meta API downloads.
* Supabase Storage uploads.
* External API dispatches (Flows, Automations, Webhooks, AI).
* Realtime broadcasting.

Because MongoDB limits transactions to rapid DB operations, slow network requests (like media downloads) must occur before the transaction starts, and async dispatches must occur strictly after the transaction commits successfully.
