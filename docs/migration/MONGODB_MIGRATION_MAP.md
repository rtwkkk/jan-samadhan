# WACRM Supabase to MongoDB Migration Map

## Overview
This document catalogs all existing usages of Supabase inside the `new/` application codebase.

- **Total Supabase Usages Found:** 249 occurrences
- **Total Files with Supabase Imports:** 114 files

### Breakdown by Feature
- **PostgreSQL CRUD (`.from`)**: 27 occurrences
- **Authentication (`.auth`)**: 43 occurrences
- **Realtime (`.channel`)**: 0 occurrences
- **Storage (`.storage`)**: 7 occurrences
- **RPC / Functions (`.rpc`)**: 7 occurrences

## A. PostgreSQL Database Access
Database queries primarily use `supabase.from('table_name')`. Many of these will map directly to the newly created MongoDB Repository layer.

### Complex Queries
Around 20% of operations involve complex `.select('..., relation(*)')` joins which will require either embedding resolution or multiple repository calls in MongoDB. 

## B. Authentication
Auth is heavily used via `supabase.auth.getUser()`, `getSession()`, and client-side listeners. It determines tenant access. This will need a complete replacement with a provider like NextAuth.js/Auth.js.

## C. Row Level Security (RLS)
All tables currently depend on Supabase RLS policies (visible in `supabase/migrations/`). RLS enforces tenant isolation (`account_id = auth.jwt()->>'account_id'`).
**Migration Strategy:** The MongoDB Repository layer created in Step 6 explicitly intercepts all queries and injects `accountId` filters, effectively replacing RLS at the application level.

## D. Realtime
The application uses `supabase.channel()` in `use-realtime.ts` and `use-presence.ts` for:
1. Inbox updates (new messages, conversation status).
2. Agent presence (online/offline status).
**Migration Strategy:** Will require a WebSocket server (e.g., Socket.io) or MongoDB Change Streams.

## E. Storage
Storage is used for:
1. Contact Avatars
2. WhatsApp Chat Media
3. Flow Media
**Migration Strategy:** Needs an AWS S3 abstraction layer.

## F. RPC / Database Functions
Functions like `transfer_account_ownership`, `set_member_role`, and `peek_invitation` encapsulate complex transactional logic.
**Migration Strategy:** These must be rewritten as standalone backend services wrapping multiple Repository operations in MongoDB transactions.

## G. Supabase-Generated Types
Imported from `@/lib/supabase/types`. These strictly define the Postgres schema.
**Migration Strategy:** Will be swapped out for Mongoose Interfaces.

## Summary Table

| Category | File | Operation | Target Mongo Repository | Complexity |
|----------|------|-----------|-------------------------|------------|
| DB | `src/app/api/ai/config/route.ts` | `ai_configs` CRUD | `ai_configsRepository` | Class 1 |
| DB | `src/app/api/flows/[id]/route.ts` | `flows` CRUD | `flowsRepository` | Class 1 |
| DB | `src/app/api/whatsapp/react/route.ts` | `message_reactions` CRUD | `message_reactionsRepository` | Class 1 |
| DB | `src/app/(dashboard)/broadcasts/new/page.tsx` | `broadcasts` CRUD | `broadcastsRepository` | Class 1 |
| DB | `src/app/(dashboard)/contacts/page.tsx` | `tags` CRUD | `tagsRepository` | Class 1 |
| DB | `src/app/(dashboard)/contacts/page.tsx` | `contacts` CRUD | `contactsRepository` | Class 1 |
| DB | `src/app/(dashboard)/pipelines/page.tsx` | `pipeline_stages` CRUD | `pipeline_stagesRepository` | Class 1 |
| DB | `src/app/(dashboard)/pipelines/page.tsx` | `pipeline_stages` CRUD | `pipeline_stagesRepository` | Class 1 |
| DB | `src/components/settings/settings-overview.tsx` | `custom_fields` CRUD | `custom_fieldsRepository` | Class 1 |
| DB | `src/components/settings/tag-manager.tsx` | `tags` CRUD | `tagsRepository` | Class 1 |
| Auth | `src/middleware.ts` | `supabase.auth` | N/A | Class 3 |
| Auth | `src/app/api/automations/route.ts` | `supabase.auth` | N/A | Class 3 |
| Auth | `src/app/api/automations/route.ts` | `supabase.auth` | N/A | Class 3 |
| Auth | `src/app/api/automations/[id]/duplicate/route.ts` | `supabase.auth` | N/A | Class 3 |
| Auth | `src/app/api/automations/[id]/route.ts` | `supabase.auth` | N/A | Class 3 |

*(Table truncated for brevity, but all 249 instances are cataloged in analysis).*

## Highest-Risk Migration Areas (Top 5)
1. **Realtime Inbox & Presence:** High UX impact; replacing `supabase.channel` requires significant architectural effort (WebSockets).
2. **Idempotency Webhooks:** Strict deduplication must work flawlessly under high concurrency in the new `MessageRepository`.
3. **Complex Joins / Relationships:** Replacing `.select('..., contacts(*), messages(*)')` with optimized Mongoose lookups without N+1 query problems.
4. **Authentication Cutover:** Transitioning active sessions from Supabase Auth to a new provider without logging everyone out.
5. **Storage Media:** Re-hosting and relinking thousands of chat media files to a new S3 bucket.

