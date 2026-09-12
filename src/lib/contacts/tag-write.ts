import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { TagRepository } from '@/lib/mongodb/repositories/TagRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

export class ContactTagWriteError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ContactTagWriteError';
    this.status = status;
  }
}

interface ContactTagWriteInput {
  accountId: string;
  contactId: string;
  tagId: string;
}

async function assertContactAndTagOwnership(
  input: ContactTagWriteInput
): Promise<void> {
  await connectToDatabase();

  const [contact, tag] = await Promise.all([
    ContactRepository.findById(input.accountId, input.contactId),
    TagRepository.findById(input.accountId, input.tagId),
  ]);

  if (!contact) {
    throw new ContactTagWriteError('Contact not found', 404);
  }
  if (!tag) {
    throw new ContactTagWriteError('Tag not found', 404);
  }
}

/**
 * Add a tag exactly once. Uses MongoDB $addToSet which is idempotent.
 * Returns true if the tag was newly added, false if already present.
 */
export async function addContactTagIfAbsent(
  input: ContactTagWriteInput
): Promise<boolean> {
  await assertContactAndTagOwnership(input);

  const contact = await ContactRepository.findById(input.accountId, input.contactId);
  if (!contact) return false;

  const alreadyHas = contact.tagIds.includes(input.tagId);
  if (alreadyHas) return false;

  await ContactRepository.addTag(input.accountId, input.contactId, input.tagId);
  return true;
}

export async function removeContactTag(
  input: ContactTagWriteInput
): Promise<void> {
  await assertContactAndTagOwnership(input);
  await ContactRepository.removeTag(input.accountId, input.contactId, input.tagId);
}
