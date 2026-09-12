import { addContactTagIfAbsent } from './tag-write';
import { MAX_TAG_CHAIN_DEPTH, getTagChainDepth } from './tag-chain';

export { MAX_TAG_CHAIN_DEPTH, getTagChainDepth } from './tag-chain';

interface AddContactTagAndDispatchInput {
  accountId: string;
  contactId: string;
  tagId: string;
  context?: { vars?: Record<string, unknown> };
}

export interface AddContactTagResult {
  added: boolean;
  dispatched: boolean;
  reason?: 'duplicate' | 'max_depth';
}

/**
 * Central server-side tag writer. It dispatches tag_added only for a
 * newly-created join and caps chained tag automations to avoid loops.
 */
export async function addContactTagAndDispatch(
  input: AddContactTagAndDispatchInput
): Promise<AddContactTagResult> {
  const added = await addContactTagIfAbsent({
    accountId: input.accountId,
    contactId: input.contactId,
    tagId: input.tagId,
  });

  if (!added) return { added: false, dispatched: false, reason: 'duplicate' };

  const depth = getTagChainDepth(input.context);
  if (depth >= MAX_TAG_CHAIN_DEPTH) {
    console.warn('[automations] tag_added chain depth limit reached', {
      accountId: input.accountId,
      contactId: input.contactId,
      tagId: input.tagId,
      depth,
    });
    return { added: true, dispatched: false, reason: 'max_depth' };
  }

  return { added: true, dispatched: true };
}
