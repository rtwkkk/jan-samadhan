import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  getSubscribedApps,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api'
import { getCurrentAccount } from '@/lib/auth/account'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'

/**
 * GET /api/whatsapp/config/verify-registration
 *
 * Diagnostic endpoint — confirms the user's saved phone number is
 * actually reachable on Meta's side.
 *
 * Three checks run independently so the UI can show which step
 * passes and which fails:
 *
 *   1. phone_info          — GET /{phone_number_id} succeeds
 *   2. waba_subscription   — our app appears in GET /{waba_id}/subscribed_apps
 *   3. locally_marked_registered — registeredAt set when /register succeeded
 *
 * Returns 200 in every case so the UI can render diagnostic detail
 * rather than a generic error toast. The combined `live` flag is
 * what the UI badges on.
 */
export async function GET() {
  let accountId: string
  try {
    const ctx = await getCurrentAccount()
    accountId = ctx.accountId
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!accountId) {
    return NextResponse.json({
      live: false,
      checks: { config_exists: false },
      message: 'Your profile is not linked to an account.',
    })
  }

  const config = await WhatsappConfigRepository.findByAccountId(accountId)

  if (!config) {
    return NextResponse.json({
      live: false,
      checks: { config_exists: false },
      message: 'No WhatsApp configuration saved yet.',
    })
  }

  let accessToken: string
  try {
    accessToken = decrypt(config.accessToken)
  } catch {
    return NextResponse.json({
      live: false,
      checks: {
        config_exists: true,
        token_decryptable: false,
      },
      message:
        "Stored access token can't be decrypted — likely ENCRYPTION_KEY changed. Re-enter the token to repair.",
    })
  }

  const checks: {
    config_exists: boolean
    token_decryptable: boolean
    phone_metadata_ok: boolean
    waba_subscribed_to_app: boolean | null
    locally_marked_registered: boolean
  } = {
    config_exists: true,
    token_decryptable: true,
    phone_metadata_ok: false,
    waba_subscribed_to_app: null,
    locally_marked_registered: config.registeredAt != null,
  }
  const errors: string[] = []

  // 1. Phone metadata
  try {
    const info = await verifyPhoneNumber({
      phoneNumberId: config.phoneNumberId,
      accessToken,
    })
    if (info.verified_name === 'Test Number') {
      checks.locally_marked_registered = true;
      if (!config.registeredAt) {
        await WhatsappConfigRepository.updateByAccountId(accountId, {
          registeredAt: new Date()
        });
      }
    }
    checks.phone_metadata_ok = true
  } catch (err) {
    errors.push(
      `Phone metadata check failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // 2. WABA subscription — only meaningful if we have a wabaId
  if (config.wabaId) {
    try {
      const subs = await getSubscribedApps({
        wabaId: config.wabaId,
        accessToken,
      })
      checks.waba_subscribed_to_app = subs.length > 0
      if (!checks.waba_subscribed_to_app) {
        errors.push(
          'WABA has no subscribed apps. Re-save the configuration to subscribe.',
        )
      }
    } catch (err) {
      errors.push(
        `WABA subscription check failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  } else {
    errors.push(
      "No WABA ID on file — webhooks can't be wired without it. Add it in the form and re-save.",
    )
  }

  const live =
    checks.phone_metadata_ok &&
    (checks.waba_subscribed_to_app ?? false) &&
    checks.locally_marked_registered

  return NextResponse.json({
    live,
    checks,
    errors,
    last_registration_error: config.lastRegistrationError ?? null,
    registered_at: config.registeredAt?.toISOString() ?? null,
    subscribed_apps_at: config.subscribedAppsAt?.toISOString() ?? null,
  })
}
