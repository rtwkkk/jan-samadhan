# Conversation Write Migration Notes

## Classification of Writes

| File | Function / Logic | Classification | Reason / Dependency |
|------|------------------|----------------|---------------------|
| `src/app/api/whatsapp/webhook/route.ts` | `findOrCreateConversation` | **D. REALTIME-DEPENDENT** & **C. MESSAGE-DEPENDENT** | Postgres INSERT triggers realtime for the Inbox UI. The UI's fallback `hydrateConversation` uses Supabase client-side fetch. Furthermore, Postgres `messages` INSERT depends on the `conversation_id` FK. |
| `src/app/api/whatsapp/webhook/route.ts` | `reopenClosedConversation` | **D. REALTIME-DEPENDENT** & **B. ATOMIC/RPC WRITE** | Uses conditional atomic `UPDATE status = 'open' WHERE status = 'closed'` and triggers UI updates. |
| `src/app/api/whatsapp/webhook/route.ts` | `bump_conversation_on_inbound` | **B. ATOMIC/RPC WRITE** | Updates `unread_count` atomically. Explicitly forbidden to migrate in this step. |
| `src/lib/ai/auto-reply.ts` | AI Auto-reply Status Update | **D. REALTIME-DEPENDENT** & **F. COMPLEX** | Updates conversation assigned agent and status. |
| `src/lib/automations/engine.ts` | Automation Status Update | **D. REALTIME-DEPENDENT** | Updates conversation status. |
| `src/lib/whatsapp/send-message.ts` | Send Message Status Update | **D. REALTIME-DEPENDENT** | Updates conversation status. |

## Migration Decision
According to the rules:
1. "DO NOT migrate any Conversation write that is required to trigger an existing realtime UI update unless the behavior is preserved by another existing mechanism."
2. "If migrating them would silently break inbox UI updates, leave them on Supabase and document the dependency."
3. "The downstream Message processing must continue receiving the same logical: conversation.id" (which relies on Postgres Foreign Key).

Migrating `findOrCreateConversation` or `reopenClosedConversation` to MongoDB would violate all three directives:
1. **Realtime Loss**: The Postgres Realtime `INSERT`/`UPDATE` events would cease to fire.
2. **UI Breakage**: The `hydrateConversation` fallback in the UI fetches from Postgres. It would find nothing.
3. **FK Violation**: The downstream `messages` UPSERT in Postgres enforces a Foreign Key against `conversations(id)`. If the conversation exists only in MongoDB, the message insert throws a Postgres `23503` constraint violation.

**Therefore, zero Conversation writes can be safely migrated to MongoDB at this stage.** 
All Conversation writes will intentionally remain on Supabase PostgreSQL for this step to preserve UI behavior, RPC dependencies, and referential integrity.
