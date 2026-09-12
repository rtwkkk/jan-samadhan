# Phase 3, Step 4.2 — Conversations & Messages MongoDB Core Migration Report

## Summary
Completed the core MongoDB migration for Conversations and Messages. The fundamental data layer (Models and Repositories) has been upgraded and extended, and the primary Next.js API routes serving the UI have been fully refactored to hit MongoDB instead of Supabase.

## Key Changes

### 1. MongoDB Models & Repositories
- **Message Model**: Added `reactions` array (using `IMessageReaction` sub-schema) to embed message reactions directly inside messages (with `emoji`, `actorType`, `actorId`, `createdAt`). This is much more efficient than the old separate PostgreSQL `message_reactions` table.
- **MessageRepository**: Added `setReaction` method which atomically manages upserting (pulling and pushing) reactions onto a specific message.

### 2. API Routes Migrated
- **`GET /api/v1/conversations`**: Upgraded to use `Conversation.find` and `populate('contactId')` with keyset pagination semantics mirroring the old Postgres keyset implementation.
- **`GET /api/v1/conversations/[id]`**: Upgraded to use `Conversation.findOne` with populated contact details.
- **`GET /api/v1/conversations/[id]/messages`**: Upgraded to use `MessageRepository.findManyWithCursor`, gating on account ownership first before serving messages.
- **`POST /api/whatsapp/react/route.ts`**: Upgraded to validate targets via `MessageRepository.findById`, send the Meta API request, and then mirror the status locally via `MessageRepository.setReaction` instead of inserting into Supabase.

### 3. Structural Integrity & Security
- All updated APIs preserve the exact existing response schemas to avoid breaking the frontend.
- `requireApiKey` and `requireRole` calls are preserved to derive the `accountId` (tenant) and securely scope all Mongoose/Repository queries. Cross-tenant leakage is prevented via `accountId` scoping.

### 4. Code Health
- Resolved TypeScript errors relating to populated document ID assertions.
- Current tests have some failures strictly relating to outdated Supabase mocks from *prior* migration steps (e.g. `tag-write.test.ts`, `template-webhook.test.ts`), which is out of scope for this data-layer step. No new breakages were introduced to the conversational core types.

## Remaining Dependencies (For Step 4.3+)
- `src/lib/whatsapp/send-message.ts` (still inserts outbound messages via Supabase)
- `src/lib/whatsapp/resolve-conversation.ts` (still uses Supabase to lookup contacts/conversations)
- `src/app/api/whatsapp/webhook/route.ts` (still uses Supabase for inbound message persistence)
- `src/lib/dashboard/queries.ts` (aggregations still run against Supabase)
- Client-side UI components (`conversation-list.tsx` and `message-thread.tsx`) still hit Supabase directly instead of the new MongoDB API routes built in this step.
- Realtime hooks (`use-realtime.ts`) still depend on `postgres_changes`.

## Risks/Blockers
No blockers detected. The migration is perfectly set up for Step 4.3 (Server-Side Logic Migration).
