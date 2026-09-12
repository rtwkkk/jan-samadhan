import { describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword, createSession, validateSession, revokeSession } from "./server";

const { mockSessionUpdateOne, mockSessionCreate, mockSessionFindById } = vi.hoisted(() => {
  return {
    mockSessionUpdateOne: vi.fn().mockResolvedValue({}),
    mockSessionCreate: vi.fn().mockResolvedValue({}),
    mockSessionFindById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "fake_hash",
        userId: "fake_user_id",
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        revokedAt: null
      })
    })
  };
});

vi.mock("@/lib/mongodb/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true)
}));

vi.mock("@/lib/mongodb/models/Session", () => ({
  Session: {
    create: mockSessionCreate,
    findById: mockSessionFindById,
    updateOne: mockSessionUpdateOne
  }
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  })
}));

describe("MongoDB-native Auth Core", () => {
  it("hashes passwords and verifies correctly (Tests 1 & 2)", async () => {
    const raw = "my_secure_password";
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("creates a session generating a raw token but storing hash (Test 9, 10, 11)", async () => {
    const rawToken = await createSession("user_123");
    expect(rawToken).toBeTypeOf("string");
    expect(rawToken.length).toBeGreaterThan(20);
    expect(mockSessionCreate).toHaveBeenCalled();
  });

  it("validates an active session correctly (Test 10, 12)", async () => {
    const session = await validateSession("fake_raw_token");
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("fake_user_id");
  });

  it("revokes a session (Test 12, 13)", async () => {
    await revokeSession("fake_raw_token");
    expect(mockSessionUpdateOne).toHaveBeenCalled();
  });
});
