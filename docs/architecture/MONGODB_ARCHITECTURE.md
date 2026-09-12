# WACRM MongoDB Architecture

## 1. Architecture Overview
The new WACRM architecture transitions from a heavily relational, database-constrained model (PostgreSQL with RLS) to a document-oriented model (MongoDB). 
The core principles for this migration are:
* **Explicit Tenancy:** Without Supabase RLS, tenant isolation (scoping by `accountId`) must be explicitly enforced at the application level.
* **Bounded Document Growth:** Entities that can grow indefinitely (like Messages in a Conversation or Logs in an Automation) are stored in separate collections to avoid hitting MongoDB's 16MB document limit.
* **Strategic Embedding:** Entities with strong lifecycle dependencies and bounded size (like Pipeline Stages or Contact Custom Values) are embedded within their parent documents to reduce the need for `$lookup` operations and improve read performance.

## 2. PostgreSQL → MongoDB Mapping

| PostgreSQL Table | MongoDB Collection | Strategy | Notes |
| ---------------- | ------------------ | -------- | ----- |
| `auth.users` + `profiles` | `users` | Merge | Combine identity and profile data into one document. |
| `accounts` | `accounts` | 1:1 | Represents the tenant. |
| `account_invitations` | `account_invitations` | 1:1 | Pending invites. |
| `contacts` | `contacts` | 1:1 | Core CRM entity. |
| `tags` | `tags` | 1:1 | Account-level tags. |
| `contact_tags` | `contacts.tagIds` | Embed Array | Store array of tag `ObjectId`s on the Contact. |
| `custom_fields` | `custom_fields` | 1:1 | Account-level field definitions. |
| `contact_custom_values` | `contacts.customFields`| Embed Map | Store as a Key-Value object inside the Contact. |
| `contact_notes` | `contact_notes` | 1:1 | Separate collection due to unbounded growth potential. |
| `conversations` | `conversations` | 1:1 | Represents a thread. |
| `messages` | `messages` | 1:1 | Separate to prevent conversation document bloat. |
| `whatsapp_config` | `whatsapp_configs` | 1:1 | API credentials and connection state. |
| `message_templates` | `message_templates` | 1:1 | Pre-approved Meta templates. |
| `pipelines` | `pipelines` | 1:1 | Sales pipelines. |
| `pipeline_stages` | `pipelines.stages` | Embed Array | Bounded size, tightly coupled to pipeline. |
| `deals` | `deals` | 1:1 | Sales deals. |
| `broadcasts` | `broadcasts` | 1:1 | Bulk campaigns. |
| `broadcast_recipients` | `broadcast_recipients` | 1:1 | Millions of potential rows, must remain separate. |
| `automations` | `automations` | 1:1 | Workflow definitions. |
| `automation_logs` | `automation_logs` | 1:1 | Unbounded execution history. |
| `flows` | `flows` | 1:1 | Chatbot flows. |
| `flow_runs` | `flow_runs` | 1:1 | Active session state for a contact in a flow. |
| `notifications` | `notifications` | 1:1 | Inbox/System notifications for users. |
| `api_keys` | `api_keys` | 1:1 | Developer API keys. |
| `ai_knowledge_documents`| `ai_knowledge_docs` | 1:1 | RAG knowledge base roots. |
| `ai_knowledge_chunks` | `ai_knowledge_chunks` | 1:1 | Searchable vector chunks. |

## 3. Collection Schemas

**`users`**
```json
{
  "_id": "ObjectId",
  "email": "String",
  "fullName": "String",
  "avatarUrl": "String",
  "accountId": "ObjectId (Ref: accounts)",
  "accountRole": "String (owner, admin, agent, viewer)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**`accounts`**
```json
{
  "_id": "ObjectId",
  "name": "String",
  "ownerUserId": "ObjectId (Ref: users)",
  "defaultCurrency": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**`contacts`**
```json
{
  "_id": "ObjectId",
  "accountId": "ObjectId (Ref: accounts)",
  "phone": "String",
  "name": "String",
  "email": "String",
  "company": "String",
  "avatarUrl": "String",
  "tagIds": ["ObjectId (Ref: tags)"],
  "customFields": { "fieldId_String": "String" },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**`conversations`**
```json
{
  "_id": "ObjectId",
  "accountId": "ObjectId (Ref: accounts)",
  "contactId": "ObjectId (Ref: contacts)",
  "status": "String (open, pending, closed)",
  "assignedAgentId": "ObjectId (Ref: users)",
  "lastMessageText": "String",
  "lastMessageAt": "Date",
  "unreadCount": "Number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**`messages`**
```json
{
  "_id": "ObjectId",
  "accountId": "ObjectId (Ref: accounts)",
  "conversationId": "ObjectId (Ref: conversations)",
  "senderType": "String (customer, agent, bot)",
  "senderId": "ObjectId (Ref: users) // If agent",
  "contentType": "String (text, image, document, etc.)",
  "contentText": "String",
  "media": { "url": "String", "mimeType": "String" },
  "messageId": "String (WhatsApp ID)",
  "status": "String (sending, sent, delivered, read, failed)",
  "createdAt": "Date"
}
```

**`whatsapp_configs`**
```json
{
  "_id": "ObjectId",
  "accountId": "ObjectId (Ref: accounts)",
  "phoneNumberId": "String",
  "wabaId": "String",
  "accessToken": "String (Encrypted)",
  "verifyToken": "String (Encrypted)",
  "status": "String",
  "createdAt": "Date"
}
```

## 4. Relationships (Embedding vs Referencing)
* **Embedding `contact_tags` and `contact_custom_values`:** These are embedded into the `Contact` document. Contacts usually have <20 tags and <50 custom fields. Embedding them avoids complex joins when rendering a contact list.
* **Embedding `pipeline_stages`:** A pipeline rarely has more than 10 stages. Embedding them in `pipelines` is highly efficient.
* **Referencing `messages`:** Messages are heavily written to and can grow to tens of thousands per conversation. Embedding messages inside conversations would quickly hit the 16MB document size limit and cause severe performance degradation during array updates.
* **Referencing `deals` & `broadcast_recipients`:** These are independent entities that require their own indexing, pagination, and updates.

## 5. Multi-Tenant Security
Since MongoDB lacks Supabase's RLS, tenant isolation must be strictly enforced in the API layer.
* **Identification:** The Next.js middleware / Auth system will attach `accountId` and `role` to the incoming request context.
* **Query Scoping:** EVERY database query must include `{ accountId: req.user.accountId }`.
* **Repository Pattern:** To prevent developers from forgetting this, we should implement a Repository or Data Access Object (DAO) pattern. E.g. `ContactRepository(accountId).findById(id)` rather than `ContactModel.findById(id)`. This guarantees the `accountId` filter is always applied to reads, updates, and deletes.
* **Cross-Tenant Prevention:** The Repository layer will implicitly throw a 404/403 if a user tries to access a document where `accountId` does not match their session.

## 6. Users / Accounts / Roles
WACRM uses a "single membership" model: One User belongs to exactly One Account.
* The `User` document holds the `accountId` and `accountRole`.
* The `Account` document holds the `ownerUserId`.
* Roles (`owner`, `admin`, `agent`, `viewer`) dictate permissions for updating settings or assigning conversations.

## 7. Contacts
Contacts are uniquely identified by their phone number within a specific account (`accountId` + `phone`). Merging the custom fields and tags into the Contact document simplifies the most frequent CRM read operations.

## 8. Conversations
Conversations act as the stateful thread between an account and a contact. It holds denormalized data (`lastMessageText`, `lastMessageAt`, `unreadCount`) to allow rendering the inbox sidebar without joining the `messages` collection.

## 9. Messages
Messages are immutable historical records. They include a `messageId` provided by WhatsApp. Adding `accountId` directly to the Message document (which was implicitly derived via conversation in Postgres) allows for easier tenant-wide text searches and sharding if the database scales.

## 10. WhatsApp Data
The `whatsapp_configs` collection stores the Meta credentials. The `accessToken` must remain encrypted at rest using Node.js crypto, mirroring the existing `ENCRYPTION_KEY` strategy.

## 11. Automations
Automations remain separate collections. `automations` stores the workflow JSON/configuration, while `automation_logs` stores the execution history.

## 12. Pipelines / Deals
`pipelines` will embed `stages`. `deals` reference both `pipelineId` and `stageId`. Moving a deal between stages means updating its `stageId` reference.

## 13. Notifications
System notifications for agents (e.g., "Assigned to conversation"). Indexed by `userId` and `isRead`.

## 14. AI / Knowledge Base
The AI knowledge base consists of `ai_knowledge_docs` (the raw text) and `ai_knowledge_chunks` (the chunked vector data). The chunk document will store the 1536-dimensional embedding.

## 15. Search
* **CRM Search (Contacts/Conversations):** Can utilize basic MongoDB `$regex` or MongoDB Atlas Search (Lucene) for fuzzy matching.
* **Vector / Semantic Search:** `pgvector` will be replaced by **MongoDB Atlas Vector Search**. The `ai_knowledge_chunks.embedding` field will be indexed using an Atlas Vector Search index (HNSW algorithm) allowing `$vectorSearch` in aggregation pipelines.
* **Full-Text Search (Lexical):** MongoDB's built-in `$text` index or Atlas Search can replace PostgreSQL's `tsvector` / `ts_rank` functionality for lexical fallback searches.

## 16. File Metadata
For files (Avatars, Chat Media, Flow Media), we will not store binary data in MongoDB. We will continue using an Object Storage provider (AWS S3, Cloudflare R2, or potentially keeping Supabase Storage if only migrating DB). MongoDB will store the object key/URL in fields like `Contact.avatarUrl` or `Message.media.url`.

## 17. Indexes
Crucial indexes to create:
* `contacts`: `{ accountId: 1, phone: 1 }` (Unique)
* `conversations`: `{ accountId: 1, contactId: 1 }`, `{ accountId: 1, updated_at: -1 }` (Inbox sorting)
* `messages`: `{ conversationId: 1, createdAt: 1 }`, `{ messageId: 1 }` (Unique, sparse)
* `messages`: `{ accountId: 1 }` (For data deletion / compliance)
* `deals`: `{ accountId: 1, pipelineId: 1 }`
* `broadcast_recipients`: `{ broadcastId: 1, status: 1 }`
* `ai_knowledge_chunks`: Atlas Vector Search Index on `embedding` (1536 dims, cosine similarity).

## 18. Idempotency (WhatsApp Webhooks)
To prevent duplicate webhooks from inserting the same message twice:
* The `messages` collection will have a Unique Index on `messageId` (the WhatsApp-provided ID).
* When the webhook attempts to insert a message, we will use a `updateOne` with `upsert: true` or handle the `E11000 duplicate key error` gracefully.
* This guarantees that even if Meta retries a webhook delivery 3 times, the message is only stored and processed once.

## 19. Transactions / Concurrency
* **Webhook Processing:** When a webhook arrives, we often need to: 1) Insert a message, 2) Update the conversation's `lastMessageAt` and `unreadCount`.
* While MongoDB can do this in two separate operations, a failure in the middle could leave the unread count out of sync.
* **Recommendation:** Use MongoDB Multi-Document Transactions (requires a Replica Set) for the webhook pipeline. `session.startTransaction()`, update conversation, insert message, `session.commitTransaction()`. If transactions are unavailable, we can tolerate eventual consistency by running a background cron to recalculate unread counts.

## 20. Authentication Migration Considerations
Since Supabase Auth handles cookies and user registration currently, migrating means implementing NextAuth.js (Auth.js) or a similar provider. The `users` collection will need additional fields like `passwordHash` (if using credentials) or OAuth provider IDs.

## 21. Storage Migration Considerations
Storage logic heavily relies on Supabase client methods (`supabase.storage.from()`). We will need to implement a cloud storage abstraction layer (e.g., using `@aws-sdk/client-s3`) to handle pre-signed URLs, uploads, and deletions securely.

## 22. Data Migration Strategy
If we need to migrate existing data from Postgres to Mongo:
1. Write a script to export tables to JSON/CSV or read directly via `pg` module.
2. Map UUIDs to MongoDB `ObjectId`s or store the Postgres UUIDs as strings in `_id` to preserve foreign keys exactly. Preserving string UUIDs as `_id` is the safest approach to maintain referential integrity without mapping tables.
3. Order of insertion: Accounts -> Users -> Pipelines -> Contacts -> Conversations -> Messages -> Everything else.

## 23. Risks and Mitigations
* **Loss of RLS:** Mitigated by creating a strict `createRepository(accountId)` factory in the backend that intercepts all DB calls.
* **Vector Search Dependency:** Mitigated by ensuring the deployment target is MongoDB Atlas, which natively supports Vector Search. (Self-hosted MongoDB does not natively support HNSW vector search without extensions).

## 24. Recommended Implementation Order
1. Setup Mongoose/MongoDB connection and Schema definitions.
2. Implement the `Repository` pattern with strict `accountId` scoping.
3. Migrate API routes for Contacts, Pipelines, and Deals.
4. Migrate the Webhook processing logic and Idempotency handling.
5. Migrate Realtime (Socket.io/SSE) for Inbox updates.
6. Migrate Auth and Storage as the final cutover steps.
