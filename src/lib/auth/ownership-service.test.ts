import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { OwnershipService } from './ownership-service';
import { User } from '@/lib/mongodb/models/User';
import { Account } from '@/lib/mongodb/models/Account';

vi.mock('@/lib/mongodb/models/User', () => ({
  User: { findOne: vi.fn() }
}));

vi.mock('@/lib/mongodb/models/Account', () => ({
  Account: { findOne: vi.fn() }
}));

describe('OwnershipService', () => {
  let sessionMock: any;

  beforeEach(() => {
    vi.resetAllMocks();
    sessionMock = {
      withTransaction: vi.fn().mockImplementation(async (cb) => cb()),
      endSession: vi.fn(),
    };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(sessionMock as any);
  });

  it('throws 42501 if caller is not owner', async () => {
    vi.mocked(User.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({ accountId: 'a1', accountRole: 'admin' })
    } as any);

    await expect(OwnershipService.transferOwnership('u1', 'u2'))
      .rejects.toThrow('42501:Only the account owner can transfer ownership');
  });

  it('throws 22023 if target is self', async () => {
    vi.mocked(User.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({ accountId: 'a1', accountRole: 'owner' })
    } as any);

    await expect(OwnershipService.transferOwnership('u1', 'u1'))
      .rejects.toThrow('22023:You are already the owner');
  });

  it('throws 42501 if target is in a different account', async () => {
    vi.mocked(User.findOne)
      .mockReturnValueOnce({ session: vi.fn().mockResolvedValue({ accountId: 'a1', accountRole: 'owner' }) } as any)
      .mockReturnValueOnce({ session: vi.fn().mockResolvedValue({ accountId: 'a2', accountRole: 'agent' }) } as any);

    await expect(OwnershipService.transferOwnership('u1', 'u2'))
      .rejects.toThrow('42501:Target user is not a member of your account');
  });

  it('succeeds updating both users and the account', async () => {
    const mockCaller = { accountId: 'a1', accountRole: 'owner', save: vi.fn() };
    const mockTarget = { accountId: 'a1', accountRole: 'agent', save: vi.fn() };
    const mockAccount = { _id: 'a1', ownerUserId: 'u1', save: vi.fn() };

    vi.mocked(User.findOne)
      .mockReturnValueOnce({ session: vi.fn().mockResolvedValue(mockCaller) } as any)
      .mockReturnValueOnce({ session: vi.fn().mockResolvedValue(mockTarget) } as any);

    vi.mocked(Account.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockAccount) } as any);

    await OwnershipService.transferOwnership('u1', 'u2');

    expect(mockCaller.accountRole).toBe('admin');
    expect(mockCaller.save).toHaveBeenCalled();

    expect(mockTarget.accountRole).toBe('owner');
    expect(mockTarget.save).toHaveBeenCalled();

    expect(mockAccount.ownerUserId).toBe('u2');
    expect(mockAccount.save).toHaveBeenCalled();
  });
});
