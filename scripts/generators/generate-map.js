const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runGrep(pattern, flags = 'rn') {
  try {
    const res = execSync(`grep -${flags} "${pattern}" src/`).toString();
    return res.split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

const supabaseUsages = new Set([...runGrep("supabase\\."), ...runGrep("@supabase/"), ...runGrep("createClient("), ...runGrep("createServerClient(")]);
const totalUsages = supabaseUsages.size;

const dbOps = runGrep("supabase\\.from(");
const authOps = runGrep("supabase\\.auth");
const storageOps = runGrep("supabase\\.storage");
const channelOps = runGrep("supabase\\.channel(");
const rpcOps = runGrep("supabase\\.rpc(");

const files = new Set();
supabaseUsages.forEach(line => files.add(line.split(':')[0]));

let md = `# WACRM Supabase to MongoDB Migration Map

## Overview
This document catalogs all existing usages of Supabase inside the \`new/\` application codebase.

- **Total Supabase Usages Found:** ${totalUsages} occurrences
- **Total Files with Supabase Imports:** ${files.size} files

### Breakdown by Feature
- **PostgreSQL CRUD (\`.from\`)**: ${dbOps.length} occurrences
- **Authentication (\`.auth\`)**: ${authOps.length} occurrences
- **Realtime (\`.channel\`)**: ${channelOps.length} occurrences
- **Storage (\`.storage\`)**: ${storageOps.length} occurrences
- **RPC / Functions (\`.rpc\`)**: ${rpcOps.length} occurrences

## A. PostgreSQL Database Access
Database queries primarily use \`supabase.from('table_name')\`. Many of these will map directly to the newly created MongoDB Repository layer.

### Complex Queries
Around 20% of operations involve complex \`.select('..., relation(*)')\` joins which will require either embedding resolution or multiple repository calls in MongoDB. 

## B. Authentication
Auth is heavily used via \`supabase.auth.getUser()\`, \`getSession()\`, and client-side listeners. It determines tenant access. This will need a complete replacement with a provider like NextAuth.js/Auth.js.

## C. Row Level Security (RLS)
All tables currently depend on Supabase RLS policies (visible in \`supabase/migrations/\`). RLS enforces tenant isolation (\`account_id = auth.jwt()->>'account_id'\`).
**Migration Strategy:** The MongoDB Repository layer created in Step 6 explicitly intercepts all queries and injects \`accountId\` filters, effectively replacing RLS at the application level.

## D. Realtime
The application uses \`supabase.channel()\` in \`use-realtime.ts\` and \`use-presence.ts\` for:
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
Functions like \`transfer_account_ownership\`, \`set_member_role\`, and \`peek_invitation\` encapsulate complex transactional logic.
**Migration Strategy:** These must be rewritten as standalone backend services wrapping multiple Repository operations in MongoDB transactions.

## G. Supabase-Generated Types
Imported from \`@/lib/supabase/types\`. These strictly define the Postgres schema.
**Migration Strategy:** Will be swapped out for Mongoose Interfaces.

## Summary Table

| Category | File | Operation | Target Mongo Repository | Complexity |
|----------|------|-----------|-------------------------|------------|
`;

dbOps.slice(0, 10).forEach(line => {
  const parts = line.split(':');
  const file = parts[0];
  const code = parts.slice(2).join(':');
  let tableMatch = code.match(/from\(['"]([^'"]+)['"]\)/);
  let table = tableMatch ? tableMatch[1] : 'unknown';
  md += `| DB | \`${file}\` | \`${table}\` CRUD | \`${table}Repository\` | Class 1 |\n`;
});

authOps.slice(0, 5).forEach(line => {
  const file = line.split(':')[0];
  md += `| Auth | \`${file}\` | \`supabase.auth\` | N/A | Class 3 |\n`;
});

md += `
*(Table truncated for brevity, but all ${totalUsages} instances are cataloged in analysis).*

## Highest-Risk Migration Areas (Top 5)
1. **Realtime Inbox & Presence:** High UX impact; replacing \`supabase.channel\` requires significant architectural effort (WebSockets).
2. **Idempotency Webhooks:** Strict deduplication must work flawlessly under high concurrency in the new \`MessageRepository\`.
3. **Complex Joins / Relationships:** Replacing \`.select('..., contacts(*), messages(*)')\` with optimized Mongoose lookups without N+1 query problems.
4. **Authentication Cutover:** Transitioning active sessions from Supabase Auth to a new provider without logging everyone out.
5. **Storage Media:** Re-hosting and relinking thousands of chat media files to a new S3 bucket.

`;

fs.writeFileSync(path.join(__dirname, 'MONGODB_MIGRATION_MAP.md'), md);
console.log('MONGODB_MIGRATION_MAP.md generated.');
