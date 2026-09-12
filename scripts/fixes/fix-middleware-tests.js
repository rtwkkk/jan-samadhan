const fs = require('fs');

let testCode = `
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

describe("middleware — wacrm_session auth checks", () => {
  it("redirects an unauth user to /login when hitting protected paths", async () => {
    const req = new NextRequest("https://app.test/dashboard");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("passes through for a signed-in user on a protected page", async () => {
    const req = new NextRequest("https://app.test/dashboard");
    req.cookies.set("wacrm_session", "fake_session_token");
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects a signed-in user off /login to /dashboard", async () => {
    const req = new NextRequest("https://app.test/login");
    req.cookies.set("wacrm_session", "fake_session_token");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("redirects a signed-in user with an invite token to /join/<token>", async () => {
    const req = new NextRequest("https://app.test/login?invite=abc123");
    req.cookies.set("wacrm_session", "fake_session_token");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/join/abc123");
  });
});
`;

fs.writeFileSync('src/middleware.test.ts', testCode);
