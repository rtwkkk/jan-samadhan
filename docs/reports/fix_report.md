I have successfully identified and fixed the authentication bug for the Contacts API endpoint, allowing dashboard creation of contacts without requiring an API key.

## Investigation & Fix
1. **Root Cause:** `POST /api/v1/contacts` was directly calling `requireApiKey(request, 'contacts:write')`. This function strictly enforces bearer token presence, causing standard dashboard interactions (which use session cookies) to fail with a `401 Unauthorized` expecting an API key.
2. **Auth Fallback Expansion:** I updated the shared fallback wrapper, `requireApiAuth` (in `api-context.ts`), to accept an optional `minRole` argument. `requireApiAuth` attempts to authenticate via an API key first, and if that fails, correctly falls back to validating the standard MongoDB session cookie (`requireRole(minRole)`).
3. **Route Implementation:** I migrated `GET /api/v1/contacts` to use `requireApiAuth(request, 'contacts:read', 'viewer')` and `POST /api/v1/contacts` to use `requireApiAuth(request, 'contacts:write', 'agent')`.

## Verification & Test Results
- Created a new test suite: `src/app/api/v1/contacts/route.test.ts`
- **Session Authentication:** Proved an authenticated session context can successfully invoke the `POST` handler to create a contact (Status 201).
- **Unauthorized Rejection:** Proved unauthenticated requests continue to correctly receive a 401 status.
- **Tenant Isolation:** Proved the extracted `accountId` from the auth context is correctly passed to the inner `findOrCreateContact(ctx.accountId, ...)` functions blocking cross-account leakage.
- **Typecheck & Full Test Suite:** `npm run typecheck` passes with zero errors, and `npm test` successfully completed (549 passed, 41 skipped tests, 0 failures).

The Contacts API is now properly integrated with the MongoDB session flow while preserving external API key support!
