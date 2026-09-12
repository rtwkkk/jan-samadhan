# Contact Domain Migration Notes

## 1. Field Mapping (PostgreSQL -> MongoDB)

| PostgreSQL (\`contacts\`) | MongoDB (\`ContactRepository\`) | Notes |
|--------------------------|-------------------------------|-------|
| \`id\` (UUID)              | \`_id\` (String)                | Kept as String to preserve existing foreign keys. |
| \`account_id\` (UUID)      | \`accountId\` (String)          | Critical for tenant isolation. |
| \`user_id\` (UUID)         | *(Not Migrated)*              | Original schema tracked creator for audit logs; omitted from current Mongoose schema based on architecture specs. |
| \`phone\` (text)           | \`phone\` (String)              | Core indexed identifier. |
| \`name\` (text)            | \`name\` (String)               | Nullable. |
| \`email\` (text)           | \`email\` (String)              | Nullable. |
| \`company\` (text)         | \`company\` (String)            | Nullable. |
| \`avatar_url\` (text)      | \`avatarUrl\` (String)          | Nullable. |
| \`created_at\` (timestamptz)| \`createdAt\` (Date)           | Handled natively by Mongoose \`timestamps: true\`. |
| \`updated_at\` (timestamptz)| \`updatedAt\` (Date)           | Handled natively by Mongoose \`timestamps: true\`. |
| *(Joined Table)* \`contact_tags\` | \`tagIds\` ([String])   | Embedded as an array of Strings directly on the Contact document. |
| *(Joined Table)* \`contact_custom_values\` | \`customFields\` (Map) | Embedded as a Key-Value Map directly on the Contact document. |

## 2. Migrated Operations

The following pure-CRUD operations were seamlessly migrated to `ContactRepository`:
1. **Find by Phone Suffix**: \`findExistingContact\` (in \`src/lib/contacts/dedupe.ts\`). Replaced `.like` with a MongoDB `$regex` query scoped by \`accountId\`.
2. **Create Contact**: \`findOrCreateContact\` (in \`src/lib/api/v1/contacts.ts\`). Mapped `.insert()` to \`ContactRepository.create()\`. 
3. **Update Contact**: API \`PATCH /api/v1/contacts/[id]\`. Mapped `.update()` to \`ContactRepository.updateById()\`.

## 3. Account Isolation Strategy
Every migrated operation strictly utilizes the \`accountId\` resolved from the application's existing authentication context (\`ctx.accountId\`). 
* In `findExistingContact`, `accountId` is passed into `ContactRepository.findMany()`.
* In `findOrCreateContact`, `accountId` is directly mapped into the MongoDB creation payload.
* In the PATCH route, the repository's `updateById` method strictly intercepts and enforces `accountId` ownership before applying the update.

## 4. Intentionally Unmigrated Operations
The following operations **remain on Supabase** to preserve application stability and avoid writing cross-domain polyfills:
1. **`getContactById` (API Read):** Uses complex relational `.select('*, contact_tags(tags(*))')` joining across three tables. Migrating this would break the API response shape without heavily refactoring the `tags` domain (which is out of scope).
2. **Contact Form / Client Components:** Modifying client-side `.from('contacts')` would require introducing new Server Actions or API routes, constituting a major refactoring outside the strict data-access mapping scope.
3. **Webhooks / Triggers:** Operations reliant on PostgreSQL unique-constraint racing and transactional integrity remain intact on the Postgres side until webhook idempotency can be addressed holistically.
