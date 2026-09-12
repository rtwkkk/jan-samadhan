import { vi } from "vitest";
vi.mock("@/lib/mongodb/client", () => ({ connectToDatabase: vi.fn().mockResolvedValue(true) }));

import { describe, it, expect } from 'vitest';

import {
  serializeContact,
  findOrCreateContact,
  ContactError,
} from './contacts';

describe('serializeContact', () => {
  it('flattens tags(tags(*)) onto a tags array and nulls missing fields', () => {
    const row = {
      id: 'c1',
      phone: '+14155550123',
      name: 'Jane',
      email: null,
      company: 'Acme',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      tags: [
        { id: 't1', name: 'vip', color: '#fff' },
      ],
    };
    expect(serializeContact(row)).toEqual({
      id: 'c1',
      phone: '+14155550123',
      name: 'Jane',
      email: null,
      company: 'Acme',
      avatar_url: null,
      tags: [{ id: 't1', name: 'vip', color: '#fff' }],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    });
  });

  it('tolerates a row with no tags key', () => {
    const row = {
      id: 'c2',
      phone: '+1',
      name: null,
      email: null,
      company: null,
      avatar_url: null,
      created_at: 'a',
      updated_at: 'b',
    };
    expect(serializeContact(row).tags).toEqual([]);
  });
});

describe('findOrCreateContact', () => {
  const noopDb = {} as any;

  it('rejects a non-E.164 phone with a 400 ContactError', async () => {
    await expect(
      findOrCreateContact('acc', 'user', { phone: 'not-a-number' })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      findOrCreateContact('acc', 'user', { phone: 'not-a-number' })
    ).rejects.toBeInstanceOf(ContactError);
  });
});
