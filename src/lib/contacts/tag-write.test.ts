import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContactRepository } from "@/lib/mongodb/repositories/ContactRepository";
import { TagRepository } from "@/lib/mongodb/repositories/TagRepository";

vi.mock("@/lib/mongodb/repositories/ContactRepository");
vi.mock("@/lib/mongodb/repositories/TagRepository");
vi.mock("@/lib/mongodb/client", () => ({ connectToDatabase: vi.fn().mockResolvedValue(true) }));

import { addContactTagIfAbsent } from './tag-write';

interface FakeOptions {
  contact?: { id: string } | null;
  tag?: { id: string } | null;
  insertData?: { id: string } | null;
  insertError?: { code?: string; message: string } | null;
}

function setupMocks(options: FakeOptions = {}) {
    vi.clearAllMocks();
    
    // TagRepository.findById
    if (options.tag === null) {
      TagRepository.findById = vi.fn().mockResolvedValue(null);
    } else {
      TagRepository.findById = vi.fn().mockResolvedValue({ _id: 'tag-1', name: 'vip', accountId: 'acc-1' });
    }

    // ContactRepository.findById
    if (options.contact === null) {
      ContactRepository.findById = vi.fn().mockResolvedValue(null);
    } else {
      ContactRepository.findById = vi.fn().mockResolvedValue({ _id: 'c-1', accountId: 'acc-1', tagIds: [] });
    }

    // ContactRepository.addTag
    if (options.insertError) {
      ContactRepository.addTag = vi.fn().mockRejectedValue(Object.assign(new Error(options.insertError.message), { code: options.insertError.code === '23505' ? 11000 : options.insertError.code }));
    } else if (options.insertData === null) {
      // simulate returning something that is not modified, if needed
      ContactRepository.addTag = vi.fn().mockResolvedValue(true);
    } else {
      ContactRepository.addTag = vi.fn().mockResolvedValue(true);
    }
  }

const input = {
  accountId: 'account-1',
  contactId: 'contact-1',
  tagId: 'tag-1',
};

describe('addContactTagIfAbsent', () => {
  it('returns true only when the join row was inserted', async () => {
    (setupMocks(), await expect(addContactTagIfAbsent(input)).resolves.toBe(true));
  });

  it('treats an error-free insert as successful even without a returned row', async () => {
    (setupMocks({insertData: null}), await expect(addContactTagIfAbsent(input)).resolves.toBe(true));
  });

  it('treats a unique violation as an idempotent duplicate', async () => {
    setupMocks();
    ContactRepository.findById = vi.fn().mockResolvedValue({ _id: 'c-1', accountId: 'acc-1', tagIds: ['tag-1'] });
    await expect(addContactTagIfAbsent(input)).resolves.toBe(false);
  });

  it('refuses contacts and tags outside the account', async () => {
    setupMocks({ contact: null });
    await expect(addContactTagIfAbsent(input)).rejects.toMatchObject({ status: 404 });
    setupMocks({ tag: null });
    await expect(addContactTagIfAbsent(input)).rejects.toMatchObject({ status: 404 });
  });

  it('surfaces non-duplicate insert failures', async () => {
    setupMocks({
      insertData: null,
      insertError: { code: '42501', message: 'permission denied' },
    });
    await expect(addContactTagIfAbsent(input)).rejects.toThrow(
      'permission denied'
    );
  });
});
