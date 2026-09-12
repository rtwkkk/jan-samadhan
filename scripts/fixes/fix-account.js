const fs = require('fs');

let code = fs.readFileSync('src/lib/auth/account.ts', 'utf8');

// Add the exports at the bottom
code += `
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: err.message }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  if (err instanceof ForbiddenError) {
    return new Response(JSON.stringify({ error: err.message }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
}
`;

// Also, the previous `getCurrentAccount` in my rewrite used `unauthorized` and `forbidden` from `src/lib/api/v1/respond`.
// The API routes expect it to throw `UnauthorizedError` and `ForbiddenError` if it fails!
code = code.replace(/throw unauthorized\([^)]*\)/g, "throw new UnauthorizedError('Could not load account context')");
code = code.replace(/throw forbidden\([^)]*\)/g, "throw new ForbiddenError(`This action requires the '\${minRole}' role or higher`)");

fs.writeFileSync('src/lib/auth/account.ts', code);
