import { NextResponse } from 'next/server'
import {
  registerPhoneNumber,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'
import { getCurrentAccount } from '@/lib/auth/account'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'

/**
 * GET /api/whatsapp/config
 *
 * Used by the "Test API Connection" button and by the page to check
 * whether the saved config is healthy. Returns 200 in all non-auth cases
 * so the UI can render an appropriate message rather than show a 500.
 *
 * Response shape:
 *   { connected: true,  phone_info: {...} }
 *   { connected: false, reason: 'no_config',        message: '...' }
 *   { connected: false, reason: 'token_corrupted',  message: '...', needs_reset: true }
 *   { connected: false, reason: 'meta_api_error',   message: '...' }
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const dataOnly = url.searchParams.get('dataOnly') === 'true'

    let accountId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await WhatsappConfigRepository.findByAccountId(accountId)

    if (!config) {
      if (dataOnly) return NextResponse.json({ data: null })
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          message: 'No WhatsApp configuration saved yet. Fill in the form and click Save Configuration.',
        },
        { status: 200 }
      )
    }

    if (dataOnly) {
      // Return snake_case mapping for UI compatibility
      return NextResponse.json({
        data: {
          phone_number_id: config.phoneNumberId,
          waba_id: config.wabaId,
          registered_at: config.registeredAt,
          subscribed_apps_at: config.subscribedAppsAt,
          last_registration_error: config.lastRegistrationError,
          mirror_inbound_media: config.mirrorInboundMedia
        }
      })
    }

    // Try to decrypt the stored token with the current ENCRYPTION_KEY.
    // If this fails, the key changed (or was never consistent across envs).
    let accessToken: string
    try {
      accessToken = decrypt(config.accessToken)
    } catch (err) {
      console.error('[whatsapp/config GET] Token decryption failed:', err)
      return NextResponse.json(
        {
          connected: false,
          reason: 'token_corrupted',
          needs_reset: true,
          message:
            'The stored access token cannot be decrypted with the current ENCRYPTION_KEY. This usually means the key changed, or it differs between environments (local vs Hostinger vs Vercel). Click "Reset Configuration" below, then re-save.',
        },
        { status: 200 }
      )
    }

    // Validate credentials against Meta
    try {
      const phoneInfo = await verifyPhoneNumber({
        phoneNumberId: config.phoneNumberId,
        accessToken,
      })
      return NextResponse.json({ 
        connected: true, 
        status: config.registeredAt ? 'connected' : 'disconnected',
        phone_info: phoneInfo 
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[whatsapp/config GET] Meta API verification failed:', message)
      return NextResponse.json(
        {
          connected: false,
          reason: 'meta_api_error',
          message: `Meta API rejected the credentials: ${message}`,
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in WhatsApp config GET:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/whatsapp/config
 *
 * Saves or updates the WhatsApp config for the authenticated user.
 * Verifies credentials with Meta first, then encrypts and stores.
 */
export async function POST(request: Request) {
  try {
    let accountId: string
    let userId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
      userId = ctx.userId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phone_number_id, waba_id, access_token, verify_token, pin } = body

    if (!access_token || !phone_number_id) {
      return NextResponse.json(
        { error: 'access_token and phone_number_id are required' },
        { status: 400 }
      )
    }

    if (pin !== undefined && pin !== null && pin !== '') {
      if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
        return NextResponse.json(
          { error: 'PIN must be exactly 6 digits.' },
          { status: 400 }
        )
      }
    }

    // Reject if another account has already claimed this phone_number_id.
    // wacrm is single-tenant-per-WhatsApp-number — letting two accounts
    // bind the same number causes webhook lookup conflicts.
    const conflict = await WhatsappConfigRepository.findByPhoneNumberIdExcludingAccount(
      phone_number_id,
      accountId
    )

    if (conflict) {
      return NextResponse.json(
        {
          error:
            'This WhatsApp phone number is already linked to another account on this instance. Each phone number can only be connected to one wacrm user.',
        },
        { status: 409 }
      )
    }

    // Verify credentials with Meta BEFORE saving
    let phoneInfo
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: access_token,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('Meta API verification failed during save:', message)
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 400 }
      )
    }

    // Encrypt sensitive tokens before storing
    let encryptedAccessToken: string
    let encryptedVerifyToken: string | null
    try {
      encryptedAccessToken = encrypt(access_token)
      encryptedVerifyToken = verify_token ? encrypt(verify_token) : null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown encryption error'
      console.error('Encryption failed:', message)
      return NextResponse.json(
        {
          error:
            'Failed to encrypt token. Check that ENCRYPTION_KEY is a valid 64-character hex string in your environment variables.',
        },
        { status: 500 }
      )
    }

    // Look up any pre-existing config for this account so we know whether
    // this number is already registered with Meta — if so we can skip
    // /register when the user didn't provide a PIN this time around.
    const existing = await WhatsappConfigRepository.findByAccountId(accountId)

    const sameNumber =
      existing?.phoneNumberId === phone_number_id &&
      existing?.registeredAt != null

    let registeredAt: Date | null = existing?.registeredAt ?? null
    let registrationError: string | null = null
    let registrationSkipped = false

    const needsRegistration = !sameNumber || (typeof pin === 'string' && pin.length > 0)
    if (needsRegistration) {
      if (!pin) {
        // No PIN provided — skip /register for test numbers and similar.
        registrationSkipped = true
        if (phoneInfo && phoneInfo.verified_name === 'Test Number') {
          // Meta test numbers are pre-provisioned. No PIN registration is required or allowed.
          registeredAt = new Date()
        }
      } else {
        try {
          await registerPhoneNumber({
            phoneNumberId: phone_number_id,
            accessToken: access_token,
            pin,
          })
          registeredAt = new Date()
        } catch (err) {
          registrationError =
            err instanceof Error ? err.message : 'Unknown Meta API error'
          console.error('Phone number /register failed:', registrationError)
        }
      }
    }

    // Step 2: subscribe the WABA to this app. Idempotent on Meta's side.
    let subscribedAppsAt: Date | null = null
    if (waba_id) {
      try {
        await subscribeWabaToApp({
          wabaId: waba_id,
          accessToken: access_token,
        })
        subscribedAppsAt = new Date()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn('WABA subscribed_apps failed (non-fatal):', message)
      }
    }

    // Upsert everything — the repository handles insert vs update.
    await WhatsappConfigRepository.upsert(accountId, {
      phoneNumberId: phone_number_id,
      wabaId: waba_id || undefined,
      accessToken: encryptedAccessToken,
      verifyToken: encryptedVerifyToken ?? undefined,
      status: registrationError ? 'disconnected' : 'connected',
      connectedAt: registrationError ? null : new Date(),
      registeredAt: registrationError ? null : registeredAt,
      subscribedAppsAt: subscribedAppsAt ?? null,
      lastRegistrationError: registrationError,
    })

    if (registrationError) {
      return NextResponse.json({
        success: false,
        saved: true,
        registered: false,
        registration_error: registrationError,
        phone_info: phoneInfo,
      })
    }

    return NextResponse.json({
      success: true,
      saved: true,
      registered: registeredAt != null,
      registration_skipped: registrationSkipped,
      phone_info: phoneInfo,
    })
  } catch (error) {
    console.error('Error in WhatsApp config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/whatsapp/config
 *
 * Lightweight partial update — used for fields like mirror_inbound_media
 * that don't require re-verifying with Meta. Accepts a subset of fields.
 */
export async function PATCH(request: Request) {
  try {
    let accountId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Only allow specific safe fields via PATCH
    const allowed: Record<string, unknown> = {}
    if (typeof body.mirror_inbound_media === 'boolean') {
      allowed.mirrorInboundMedia = body.mirror_inbound_media
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await WhatsappConfigRepository.updateByAccountId(accountId, allowed)
    if (!updated) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in WhatsApp config PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/whatsapp/config
 *
 * Removes the authenticated user's WhatsApp configuration.
 * Used by the "Reset Configuration" button to recover from a corrupted
 * encrypted token.
 */
export async function DELETE() {
  try {
    let accountId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await WhatsappConfigRepository.deleteByAccountId(accountId)
    if (!deleted) {
      // No row existed — treat as success (idempotent)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in WhatsApp config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
