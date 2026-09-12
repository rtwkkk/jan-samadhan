# WACRM MongoDB Migration Analysis

## 1. Current Architecture
WACRM is a Next.js application that heavily relies on Supabase and PostgreSQL for its backend infrastructure. It functions as a shared inbox and CRM for WhatsApp Business. The backend relies on PostgreSQL relational features, Row Level Security (RLS) for multi-tenant isolation, Supabase Realtime for live updates, and Supabase Storage for media handling. A webhook receives events from the Meta Cloud API, processes them using Supabase's service-role client, and then triggers automations, AI responses, and stores data in PostgreSQL.

## 2. Supabase Dependencies
* `@supabase/supabase-js`: `package.json`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, and many other lib files. Used for client-side and server-side interactions, realtime subscriptions, and admin operations.
* `@supabase/ssr`: `package.json`, `src/middleware.ts`, `src/lib/supabase/server.ts`. Used for handling Supabase Auth sessions across Server-Side Rendering (SSR) and middleware in Next.js.

## 3. Current Database Schema
The database uses standard PostgreSQL relational tables with UUID primary keys and foreign keys.
Key tables:
* `profiles`: User information, linked 1:1 with `auth.users`.
* `contacts`: CRM contacts with a unique phone number per user.
* `tags` & `contact_tags`: Many-to-many relationship for contact categorization.
* `custom_fields` & `contact_custom_values`: Flexible schema for contacts.
* `conversations`: A thread between a user/account and a contact.
* `messages`: Individual messages within a conversation.
* `whatsapp_config`: Meta WhatsApp API credentials.
* `message_templates`: Pre-approved Meta templates.
* `pipelines`, `pipeline_stages`, `deals`: Sales pipelines and deals.
* `broadcasts`, `broadcast_recipients`: Bulk messaging campaigns.
* `accounts`, `account_members`, `account_invitations`: Team collaboration/multi-tenancy.
* `ai_knowledge_documents`, `ai_knowledge_chunks`: Knowledge base for AI.
* `automations`, `flows`, `notifications`, `api_keys`: Additional functional entities.

## 4. Authentication
Authentication is entirely handled by Supabase Auth (`auth.users` table). 
* Sessions are managed using `@supabase/ssr` cookies.
* `handle_new_user` Postgres trigger auto-creates a row in the `profiles` table when a new user registers in `auth.users`.
* Authentication is verified in Next.js middleware, API routes, and Server Actions.

## 5. Authorization / RLS
Access control relies on PostgreSQL Row Level Security (RLS). 
* Most tables have policies like `USING (auth.uid() = user_id)` for single-user isolation.
* Multi-tenant data relies on the `accounts` system, using custom RPC functions like `is_account_member(account_id)` to evaluate permissions in RLS policies.
* Moving to MongoDB will require re-implementing these access checks explicitly in the application layer (e.g., using middleware or data access objects) since MongoDB lacks built-in RLS.

## 6. Realtime
Supabase Realtime is used for live updates in the UI.
* Realtime is enabled on the `messages` and `conversations` tables.
* The frontend uses `postgres_changes` subscriptions (via `use-realtime.ts`) to listen for INSERTs and UPDATEs to instantly update the inbox and notifications without polling.

## 7. Storage
Supabase Storage is used for handling media files.
* Buckets: `avatars`, `chat_media`, `flow_media`, `inbound_media`.
* RLS policies restrict uploads/deletions to the owner (using folder structures like `avatars/{auth.uid()}/...`) but allow public reads.

## 8. PostgreSQL-Specific Features
* **Row Level Security (RLS):** Extensive use for access control.
* **pgvector:** Used in `ai_knowledge_chunks` for storing embeddings and semantic similarity searches (`HNSW` index and `<=>` operator).
* **Full-Text Search:** Uses `tsvector`, `to_tsvector`, and `ts_rank` for lexical search in the AI knowledge base.
* **Triggers/Functions:** Used for automatic `updated_at` timestamps and `profiles` creation on user signup.
* **JSONB:** Used for flexible schemas like `audience_filter` and `custom_fields`.

## 9. WhatsApp Architecture
The WhatsApp flow operates as follows:
1. Meta Cloud API sends a webhook POST request to `/api/whatsapp/webhook/route.ts`.
2. WACRM verifies the HMAC-SHA256 signature (`x-hub-signature-256`).
3. If valid, it returns a 200 OK immediately and processes the payload asynchronously using `after()`.
4. It parses the incoming message/status, looks up the corresponding `whatsapp_config`, creates/updates the `contacts` and `conversations` records, and inserts the `messages` row.
5. Inbound media is downloaded from Meta and mirrored to Supabase Storage.
6. The system then evaluates active Automations, AI Auto-Replies, and Webhooks based on the new message.

## 10. AI / Search Architecture
The AI assistant uses a hybrid RAG (Retrieval-Augmented Generation) approach.
* **Lexical Search:** Uses Postgres full-text search (`fts` tsvector column).
* **Semantic Search:** Uses `pgvector` for OpenAI embeddings (1536 dims) with an HNSW index for fast nearest-neighbor retrieval.
* RPCs (`match_ai_knowledge_fts` and `match_ai_knowledge_semantic`) bypass RLS securely to fetch context for the AI.

## 11. Environment Variables
* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* `ENCRYPTION_KEY`
* `META_APP_SECRET`
* `NEXT_PUBLIC_SITE_URL`
* `NEXT_PUBLIC_APP_LOCALE`
* `ALLOWED_INVITE_HOSTS`
* `AUTOMATION_CRON_SECRET`
* `META_APP_ID`
* `WHATSAPP_TEMPLATES_DRY_RUN`
* `AI_REQUEST_TIMEOUT_MS`
* `AI_CONTEXT_MESSAGE_LIMIT`

## 12. Migration Difficulty
* **Authentication:** Easy - NextAuth/Auth.js can replace Supabase Auth relatively seamlessly.
* **Database Schema:** Moderate - Relational models map to NoSQL documents well if relationships are handled (Mongoose schemas/refs).
* **Authorization / RLS:** Difficult - Moving from DB-level constraints to Application-level checks requires rewriting all data-access points to include `userId`/`accountId` filters securely.
* **Realtime:** Moderate - Requires implementing a WebSocket server (e.g., Socket.io) or using MongoDB Change Streams with SSE to replicate `postgres_changes`.
* **AI / Vector Search:** Difficult - Requires migrating `pgvector` to MongoDB Atlas Vector Search and replacing Postgres Full-Text Search with Atlas Search.
* **Storage:** Moderate - AWS S3 or a similar object storage provider will easily replace Supabase Storage.

## 13. Recommended Migration Order
1. **Core Data Access Layer:** Create Mongoose/MongoDB schemas and basic CRUD operations.
2. **Authentication:** Migrate from Supabase Auth to NextAuth.
3. **Application Authorization:** Implement strict data access rules in the API to replace RLS.
4. **Webhook & Integrations:** Re-route the WhatsApp Webhook and Automations to use the MongoDB data layer.
5. **Realtime Services:** Implement MongoDB Change Streams + Server-Sent Events (SSE) or Socket.io.
6. **Storage & AI:** Integrate AWS S3 and MongoDB Atlas Search/Vector Search.

## 14. Critical Risks
* **Data Leaks:** Without RLS, missing a `userId` filter in a query could expose other tenants' data. This is the highest risk.
* **Race Conditions in Webhooks:** If MongoDB inserts are not handled carefully, duplicate contacts/conversations might be created during high-throughput webhook events.
* **Realtime Reliability:** Custom realtime implementations might be less robust than Supabase's managed Realtime out-of-the-box.

## 15. Files Requiring Changes
| File | Current Supabase Usage | Required MongoDB Change | Risk |
| ---- | ---------------------- | ----------------------- | ---- |
| `src/lib/supabase/client.ts` | Creates browser client | Delete / Replace with fetch/API layer | Low |
| `src/lib/supabase/server.ts` | Creates server client | Delete / Replace with DB connection util | Low |
| `src/middleware.ts` | Supabase Auth session checks | Replace with NextAuth middleware | High |
| `src/app/api/whatsapp/webhook/route.ts` | Supabase Service Role client | Use MongoDB models | High |
| `src/hooks/use-realtime.ts` | `postgres_changes` subscriptions | Use Socket.io / SSE hooks | Moderate |
| All API Routes | Direct Supabase CRUD queries | Replace with Mongoose/MongoDB queries | High (Security) |
| All Server Actions | Direct Supabase CRUD queries | Replace with Mongoose/MongoDB queries | High (Security) |
