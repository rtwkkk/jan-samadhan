# MongoDB Implementation Notes

## 1. MongoDB Library Selected
**Mongoose** was selected over the official MongoDB Node.js driver.
* **Why:** The WACRM MongoDB Architecture requires explicit Schema definitions (since Postgres handles this natively), default values, complex validation, embedding of tags/custom fields, and application-level tenant isolation logic. Mongoose provides a robust Schema modeling layer, Middleware (hooks) that can be used to enforce `accountId` scoping natively in the future, and excellent TypeScript support out of the box.

## 2. Files Created/Modified
* **Modified:** `package.json`, `package-lock.json` - Added `mongoose` dependency.
* **Modified:** `.env.local.example` - Added `MONGODB_URI` and `MONGODB_DB_NAME` placeholder variables.
* **Created:** `src/lib/mongodb/client.ts` - The centralized database connection utility.
* **Created:** `src/lib/mongodb/health.ts` - A health-check utility to test database connectivity safely.

## 3. Environment Variables Required
The application now expects the following environment variables to be set in `.env.local` for local development or in the hosting provider for production:
* `MONGODB_URI`: The connection string for the MongoDB instance (e.g., `mongodb://localhost:27017` or a MongoDB Atlas SRV URI).
* `MONGODB_DB_NAME`: The specific database to connect to (e.g., `wacrm`).

## 4. Connection Initialization & Reuse
The connection utility (`src/lib/mongodb/client.ts`) implements a global caching pattern specifically designed for Next.js.
* Next.js clears the Node.js module cache on every hot reload in development. If we simply called `mongoose.connect()` at the top of a file, every file change would spawn a new persistent connection pool to MongoDB, quickly exhausting the connection limit and causing the app to crash.
* By caching the connection Promise on the `global` object (which persists across hot reloads), we ensure exactly one connection pool is created and shared across the entire application lifecycle, for both development and production.

## 5. Running MongoDB Locally
You can run MongoDB locally using Docker:
```bash
docker run -d -p 27017:27017 --name wacrm-mongo mongo:latest
```
Then set `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=wacrm
```

## 6. Configuring MongoDB Atlas
For production or cloud development, create a cluster on MongoDB Atlas.
1. Get the connection string from the Atlas dashboard.
2. Ensure you whitelist your IP or allow `0.0.0.0/0` if deploying to Vercel/serverless environments.
3. Use the SRV connection string as your `MONGODB_URI`. DO NOT include the database name in the URI path if using `MONGODB_DB_NAME`.

## 7. Testing the Connection
You can test the connection by importing and running the health check utility in any server context:
```typescript
import { checkMongoHealth } from '@/lib/mongodb/health';

const { status, message } = await checkMongoHealth();
console.log(status, message);
```

## 8. Limitations & Next Steps
* Schema mapping has not been performed yet.
* Tenant isolation is not active yet (this requires building Repositories/Models).
* Mongoose connection options like `bufferCommands: false` are set to fail fast if the connection is dropped, which is standard practice for serverless functions like Next.js API routes.

## 9. Verification Results (Post-Foundation)
### Dependency status
- `mongoose` is correctly installed.
- `package.json` contains `mongoose`.
- `package-lock.json` is consistent.
- No accidental dependencies like `mongoos` exist.

### TypeScript status
- **Passed**. `npm run typecheck` executed with code 0 (`tsc --noEmit`).

### Build status
- **Failed (Unrelated)**. `npm run build` failed due to a `next/font` network error when trying to fetch Google Fonts (`Failed to fetch 'Inter' from Google Fonts`). This is a known issue when building inside a network-restricted sandbox environment and is entirely unrelated to the MongoDB foundation implementation.

### MongoDB connection status
- **MongoDB runtime connection: PASSED**. The centralized connection utility successfully connected to the local MongoDB instance (`mongodb://127.0.0.1:27017`) and securely resolved the target database (`wacrm`). Testing with invalid credentials accurately returned a failure without exposing secret tokens or raw URIs.

### Supabase status
- **Untouched**. Existing Supabase dependencies (`@supabase/supabase-js`, `@supabase/ssr`) are still installed and unaltered. Existing functionality remains broken/unbroken exactly as it was.

### Files changed
- `new/package.json`
- `new/package-lock.json`
- `new/.env.local.example`
- `new/src/lib/mongodb/client.ts`
- `new/src/lib/mongodb/health.ts`
- `new/MONGODB_IMPLEMENTATION_NOTES.md`

### Known issues
- None relating to the MongoDB foundation. The environment requires actual DB credentials before runtime logic can be invoked safely.
