import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContactRepository } from "@/lib/mongodb/repositories/ContactRepository";
import { ConversationRepository } from "@/lib/mongodb/repositories/ConversationRepository";
import { WhatsappConfigRepository } from "@/lib/mongodb/repositories/WhatsappConfigRepository";

vi.mock("@/lib/mongodb/repositories/ContactRepository");
vi.mock("@/lib/mongodb/repositories/ConversationRepository");
vi.mock("@/lib/mongodb/repositories/WhatsappConfigRepository");

import { resolveConversationByPhone } from './resolve-conversation';
import { SendMessageError } from './send-message';

function makeDb(script: any) {
  let likeCalls = 0;
  let convLookupCalls = 0;

  vi.clearAllMocks();

  WhatsappConfigRepository.findByAccountId = vi.fn().mockResolvedValue(script.config === null ? null : (script.config || { userId: 'owner-1' }));
  
  ContactRepository.findByPhoneSuffix = vi.fn().mockImplementation(() => {
    const data = script.contactCandidatesByCall ? (script.contactCandidatesByCall[likeCalls] ?? []) : (script.contactCandidates ?? []);
    likeCalls++;
    return Promise.resolve(data.map((r: any) => ({ _id: r.id, phone: r.phone })));
  });

  ContactRepository.create = vi.fn().mockImplementation(async () => {
    if (script.insertContactError) {
      throw Object.assign(new Error(), { code: script.insertContactError.code === '23505' ? 11000 : script.insertContactError.code });
    }
    return { _id: script.insertedContactId };
  });

  ConversationRepository.findByContactId = vi.fn().mockImplementation(() => {
    const row = script.existingConversationByCall ? (script.existingConversationByCall[convLookupCalls] ?? null) : (script.existingConversation ?? null);
    convLookupCalls++;
    return Promise.resolve(row ? { _id: row.id } : null);
  });

  ConversationRepository.create = vi.fn().mockImplementation(async () => {
    if (script.insertConversationError) {
      throw Object.assign(new Error(), { code: script.insertConversationError.code === '23505' ? 11000 : script.insertConversationError.code });
    }
    return { _id: script.insertedConversationId };
  });
}

vi.mock("@/lib/mongodb/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

describe('resolveConversationByPhone', () => {
  it('rejects an invalid phone before any DB call', async () => {
    vi.clearAllMocks();
    await expect(
      resolveConversationByPhone('acct', 'not-a-phone')
    ).rejects.toBeInstanceOf(SendMessageError);
  });

  it('fails with whatsapp_not_configured when no config owner exists', async () => {
    makeDb({ config: null });
    await resolveConversationByPhone('acct', '+14155550123').catch(
      (e: SendMessageError) => {
        expect(e.code).toBe('whatsapp_not_configured');
        expect(e.status).toBe(400);
      }
    );
    await expect(
      resolveConversationByPhone('acct', '+14155550123')
    ).rejects.toBeInstanceOf(SendMessageError);
  });

  it('returns the existing contact + conversation without creating', async () => {
    makeDb({
      config: { user_id: 'owner-1' },
      contactCandidates: [{ id: 'c1', phone: '14155550123' }],
      existingConversation: { id: 'cv1' },
    });
    const res = await resolveConversationByPhone(
      'acct',
      '+1 (415) 555-0123'
    );
    expect(res).toEqual({
      conversationId: 'cv1',
      contactId: 'c1',
      contactCreated: false,
    });
  });

  it('creates contact + conversation when none exist', async () => {
    makeDb({
      config: { user_id: 'owner-1' },
      contactCandidates: [],
      insertedContactId: 'c2',
      existingConversation: null,
      insertedConversationId: 'cv2',
    });
    const res = await resolveConversationByPhone(
      'acct',
      '+14155550199',
      'Jane'
    );
    expect(res).toEqual({
      conversationId: 'cv2',
      contactId: 'c2',
      contactCreated: true,
    });
  });

  it('re-resolves an existing contact when the insert loses a unique race', async () => {
    // First lookup misses (→ we attempt an insert), the insert hits a
    // 23505 unique violation, and the post-race re-lookup now returns
    // the row a concurrent writer created.
    makeDb({
      config: { user_id: 'owner-1' },
      contactCandidatesByCall: [[], [{ id: 'c-raced', phone: '14155550123' }]],
      insertContactError: { code: '23505' },
      existingConversation: { id: 'cv-raced' },
    });
    const res = await resolveConversationByPhone('acct', '+14155550123');
    expect(res.contactId).toBe('c-raced');
    expect(res.contactCreated).toBe(false);
    expect(res.conversationId).toBe('cv-raced');
  });

  it('re-resolves the conversation when the insert loses a unique race', async () => {
    // Existing contact, conversation lookup misses first (→ attempt an
    // insert), the insert hits a 23505 from a concurrent create, and the
    // post-race re-lookup returns the winning conversation — no duplicate
    // conversation is created (issue #363).
    makeDb({
      config: { user_id: 'owner-1' },
      contactCandidates: [{ id: 'c1', phone: '14155550123' }],
      existingConversationByCall: [null, { id: 'cv-raced' }],
      insertConversationError: { code: '23505' },
    });
    const res = await resolveConversationByPhone('acct', '+14155550123');
    expect(res).toEqual({
      conversationId: 'cv-raced',
      contactId: 'c1',
      contactCreated: false,
    });
  });
});
