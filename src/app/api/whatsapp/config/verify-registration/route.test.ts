import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { verifyPhoneNumber, getSubscribedApps } from '@/lib/whatsapp/meta-api'

const mockAccountId = 'acct-1'
const mockUserId = 'user-1'

const mocks = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  decrypt: vi.fn((val) => val.replace('encrypted_', ''))
}))

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: mocks.getCurrentAccount
}))

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: mocks.decrypt
}))

vi.mock('@/lib/whatsapp/meta-api', () => ({
  verifyPhoneNumber: vi.fn(),
  getSubscribedApps: vi.fn()
}))

vi.mock('@/lib/mongodb/repositories/WhatsappConfigRepository', () => ({
  WhatsappConfigRepository: {
    findByAccountId: vi.fn()
  }
}))

describe('GET /api/whatsapp/config/verify-registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentAccount.mockResolvedValue({ accountId: mockAccountId, userId: mockUserId })
    ;(verifyPhoneNumber as any).mockResolvedValue({})
    ;(getSubscribedApps as any).mockResolvedValue([{ id: 'app-1' }])
  })

  it('rejects unauthenticated requests', async () => {
    mocks.getCurrentAccount.mockRejectedValue(new Error('Unauthorized'))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns false checks when no config exists', async () => {
    ;(WhatsappConfigRepository.findByAccountId as any).mockResolvedValue(null)
    const res = await GET()
    const json = await res.json()
    expect(json.live).toBe(false)
    expect(json.checks.config_exists).toBe(false)
  })

  it('runs diagnostic checks and returns live status', async () => {
    ;(WhatsappConfigRepository.findByAccountId as any).mockResolvedValue({
      phoneNumberId: 'phone-123',
      wabaId: 'waba-123',
      accessToken: 'encrypted_token',
      registeredAt: new Date('2024-01-01T00:00:00Z')
    })

    const res = await GET()
    const json = await res.json()
    
    expect(json.live).toBe(true)
    expect(json.checks.config_exists).toBe(true)
    expect(json.checks.token_decryptable).toBe(true)
    expect(json.checks.phone_metadata_ok).toBe(true)
    expect(json.checks.waba_subscribed_to_app).toBe(true)
    expect(json.checks.locally_marked_registered).toBe(true)
    
    expect(verifyPhoneNumber).toHaveBeenCalledWith({
      phoneNumberId: 'phone-123',
      accessToken: 'token'
    })
    
    expect(getSubscribedApps).toHaveBeenCalledWith({
      wabaId: 'waba-123',
      accessToken: 'token'
    })
  })
})
