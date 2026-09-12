import { NextResponse } from 'next/server'
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }


    let accountId_ctx: string;
  let userId: string;
  try {
    const { getCurrentAccount } = await import('@/lib/auth/account');
    const ctx = await getCurrentAccount();
    accountId_ctx = ctx.accountId;
    userId = ctx.userId;
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const authError = null;
  const user = { id: userId };

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const accountId = accountId_ctx;
    if (!accountId) {
      return NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 });
    }

    // Get WhatsApp Config using existing repository
    const { WhatsappConfigRepository } = await import('@/lib/mongodb/repositories/WhatsappConfigRepository');
    const config = await WhatsappConfigRepository.findByAccountId(accountId);

    if (!config || !config.accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp not configured' },
        { status: 400 }
      )
    }

    const accessToken = decrypt(config.accessToken)

    // Get the download URL from Meta
    const mediaInfo = await getMediaUrl({ mediaId, accessToken })

    // Download the binary data
    const { buffer, contentType } = await downloadMedia({
      downloadUrl: mediaInfo.url,
      accessToken,
    })

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || mediaInfo.mimeType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Error in WhatsApp media GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}
