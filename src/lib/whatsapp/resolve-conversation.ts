// ============================================================
// Resolve (or create) the conversation for a phone number.
//
// The dashboard composer always has a `conversation_id` in hand. The
// public API doesn't — an external automation knows a *phone number*,
// not an internal UUID. This helper bridges that: given an E.164
// phone, it finds-or-creates the contact and its conversation so the
// shared `sendMessageToConversation` core can run unchanged.
//
// It deliberately reuses the exact find-or-create logic the inbound
// webhook uses (the `findExistingContact` dedupe helper, the
// one-conversation-per-(account, contact) convention, the
// account_id-tenancy / user_id-audit split) so a contact created via
// the API is indistinguishable from one created by an inbound message.
//
// Audit user: created rows need a NOT NULL `user_id`. As with the
// webhook (where there's no logged-in human either), we attribute
// them to the WhatsApp config owner — a stable account-level default.
// ============================================================

import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { ConversationRepository } from '@/lib/mongodb/repositories/ConversationRepository';
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository';

import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils';
import { SendMessageError } from '@/lib/whatsapp/send-message';
import { resolveAuditUserId, ContactError } from '@/lib/api/v1/contacts';

export interface ResolvedConversation {
  conversationId: string;
  contactId: string;
  /** True if this call created the contact (vs matched an existing one). */
  contactCreated: boolean;
}

/**
 * Find or create the contact + conversation for `phone` within
 * `accountId`. Throws `SendMessageError` (shared with the send core,
 * so the route maps one error family) on a bad phone, a missing
 * WhatsApp config, or a DB failure.
 */
export async function resolveConversationByPhone(
  accountId: string,
  phone: string,
  name?: string | null
): Promise<ResolvedConversation> {
  const sanitized = sanitizePhoneForMeta(phone);
  if (!isValidE164(sanitized)) {
    throw new SendMessageError(
      'bad_request',
      "'to' must be a valid phone number in E.164 format (e.g. +14155550123)",
      400
    );
  }

  // Fail fast (and create nothing) when the account has no WhatsApp
  // connected — the same error the send would raise anyway.
  const config = await WhatsappConfigRepository.findByAccountId(accountId);
  if (!config) {
    throw new SendMessageError(
      'whatsapp_not_configured',
      'WhatsApp not configured. Please set up your WhatsApp integration first.',
      400
    );
  }

  let ownerUserId: string;
  try {
    ownerUserId = await resolveAuditUserId(accountId);
  } catch (err) {
    if (err instanceof ContactError) {
      throw new SendMessageError('db_error', err.message, err.status);
    }
    throw err;
  }

  // ---- contact -------------------------------------------------
  let contactId: string;
  let contactCreated = false;

  const existing = await findExistingContact(accountId, sanitized);
  if (existing) {
    contactId = existing.id;
    if (name && name !== existing.name) {
      await ContactRepository.updateById(accountId, existing.id, { name });
    }
  } else {
    try {
      const created = await ContactRepository.create({
        _id: crypto.randomUUID(),
        accountId,
        userId: ownerUserId,
        phone: sanitized,
        name: name || sanitized,
      });
      contactId = created._id;
      contactCreated = true;
    } catch (createErr: unknown) {
      // Lost a race against a concurrent inbound/API create — the
      // unique index (migration 022) rejected the duplicate. Re-resolve.
      if (isUniqueViolation(createErr)) {
        const raced = await findExistingContact(accountId, sanitized);
        if (raced) {
          contactId = raced.id;
          if (name && name !== raced.name) {
            await ContactRepository.updateById(accountId, raced.id, { name });
          }
        } else {
          console.error(
            '[webhook] Contact creation unique violation, but could not find raced contact',
            { accountId, phone: sanitized }
          );
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }
  }

  // ---- conversation -------------------------------------------
  const conversationId = await findOrCreateConversationRow(
    accountId,
    contactId,
    ownerUserId
  );

  return { conversationId, contactId, contactCreated };
}

/**
 * Find or create the single conversation for `(accountId, contactId)`.
 */
async function findOrCreateConversationRow(
  accountId: string,
  contactId: string,
  ownerUserId: string
): Promise<string> {
  const existing = await ConversationRepository.findByContactId(accountId, contactId);

  if (existing) {
    return existing._id;
  }

  try {
    const newConv = await ConversationRepository.create({
      _id: crypto.randomUUID(),
      accountId,
      contactId,
      assignedAgentId: ownerUserId === 'system' ? undefined : ownerUserId,
      status: 'open',
      unreadCount: 0
    });
    return newConv._id;
  } catch (convErr: any) {
    // 11000 is MongoDB duplicate key error code
    if (convErr.code === 11000) {
      const raced = await ConversationRepository.findByContactId(accountId, contactId);
      if (raced) {
        return raced._id;
      }
    }
    console.error('[resolve-conversation] conversation create error:', convErr);
    throw new SendMessageError('db_error', 'Failed to create conversation', 500);
  }
}
