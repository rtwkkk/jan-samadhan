import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from './route'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { verifyPhoneNumber, registerPhoneNumber, subscribeWabaToApp } from '@/lib/whatsapp/meta-api'

const mockAccountId = 'acct-1'
const mockUserId = 'user-1'

// We must use vi.hoisted for mocks that get evaluated early
const mocks = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  encrypt: vi.fn((val) => `encrypted_${val}`),
  decrypt: vi.fn((val) => val.replace('encrypted_', ''))
}))

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: mocks.getCurrentAccount
}))

vi.mock('@/lib/whatsapp/encryption', () => ({
  encrypt: mocks.encrypt,
  decrypt: mocks.decrypt
}))

vi.mock('@/lib/whatsapp/meta-api', () => ({
  verifyPhoneNumber: vi.fn(),
  registerPhoneNumber: vi.fn(),
  subscribeWabaToApp: vi.fn()
}))

vi.mock('@/lib/mongodb/repositories/WhatsappConfigRepository', () => ({
  WhatsappConfigRepository: {
    findByAccountId: vi.fn(),
    findByPhoneNumberIdExcludingAccount: vi.fn(),
    upsert: vi.fn(),
    updateByAccountId: vi.fn(),
    deleteByAccountId: vi.fn()
  }
}))

describe('WhatsApp Config API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentAccount.mockResolvedValue({ accountId: mockAccountId, userId: mockUserId })
    ;(verifyPhoneNumber as any).mockResolvedValue({ verified_name: 'Test Business' })
    ;(registerPhoneNumber as any).mockResolvedValue({})
    ;(subscribeWabaToApp as any).mockResolvedValue({})
  })

  describe('GET /api/whatsapp/config', () => {
    it('rejects unauthenticated requests', async () => {
      mocks.getCurrentAccount.mockRejectedValue(new Error('Unauthorized'))
      
      const req = new Request('http://localhost/api/whatsapp/config')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns empty data when no config exists (dataOnly=true)', async () => {
      ;(WhatsappConfigRepository.findByAccountId as any).mockResolvedValue(null)
      
      const req = new Request('http://localhost/api/whatsapp/config?dataOnly=true')
      const res = await GET(req)
      const data = await res.json()
      
      expect(data).toEqual({ data: null })
      expect(WhatsappConfigRepository.findByAccountId).toHaveBeenCalledWith(mockAccountId)
    })

    it('returns formatted config (dataOnly=true)', async () => {
      ;(WhatsappConfigRepository.findByAccountId as any).mockResolvedValue({
        phoneNumberId: 'phone-123',
        wabaId: 'waba-123',
        mirrorInboundMedia: true
      })
      
      const req = new Request('http://localhost/api/whatsapp/config?dataOnly=true')
      const res = await GET(req)
      const json = await res.json()
      
      expect(json.data.phone_number_id).toBe('phone-123')
      expect(json.data.waba_id).toBe('waba-123')
      expect(json.data.mirror_inbound_media).toBe(true)
    })

    it('verifies with Meta and returns health check (dataOnly=false)', async () => {
      ;(WhatsappConfigRepository.findByAccountId as any).mockResolvedValue({
        phoneNumberId: 'phone-123',
        accessToken: 'encrypted_token'
      })
      
      const req = new Request('http://localhost/api/whatsapp/config')
      const res = await GET(req)
      const json = await res.json()
      
      expect(json.connected).toBe(true)
      expect(json.phone_info.verified_name).toBe('Test Business')
      expect(mocks.decrypt).toHaveBeenCalledWith('encrypted_token')
      expect(verifyPhoneNumber).toHaveBeenCalledWith({
        phoneNumberId: 'phone-123',
        accessToken: 'token'
      })
    })
  })

  describe('POST /api/whatsapp/config', () => {
    it('rejects unauthenticated requests', async () => {
      mocks.getCurrentAccount.mockRejectedValue(new Error('Unauthorized'))
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ phone_number_id: '1', access_token: 't' })
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('prevents duplicate account configuration on same phone_number_id', async () => {
      ;(WhatsappConfigRepository.findByPhoneNumberIdExcludingAccount as any).mockResolvedValue({ accountId: 'other' })
      
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ phone_number_id: '123', access_token: 'token' })
      })
      const res = await POST(req)
      expect(res.status).toBe(409)
      
      expect(WhatsappConfigRepository.findByPhoneNumberIdExcludingAccount).toHaveBeenCalledWith('123', mockAccountId)
    })

    it('creates or updates config successfully', async () => {
      ;(WhatsappConfigRepository.findByPhoneNumberIdExcludingAccount as any).mockResolvedValue(null)
      ;(WhatsappConfigRepository.findByAccountId as any).mockResolvedValue(null) // no existing
      ;(WhatsappConfigRepository.upsert as any).mockResolvedValue({})

      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          phone_number_id: 'phone-123',
          waba_id: 'waba-123',
          access_token: 'raw_token',
          pin: '123456'
        })
      })
      
      const res = await POST(req)
      const json = await res.json()
      
      expect(json.success).toBe(true)
      expect(json.registered).toBe(true)
      
      // Meta calls
      expect(verifyPhoneNumber).toHaveBeenCalledWith({
        phoneNumberId: 'phone-123',
        accessToken: 'raw_token'
      })
      expect(registerPhoneNumber).toHaveBeenCalledWith({
        phoneNumberId: 'phone-123',
        accessToken: 'raw_token',
        pin: '123456'
      })
      expect(subscribeWabaToApp).toHaveBeenCalledWith({
        wabaId: 'waba-123',
        accessToken: 'raw_token'
      })
      
      // DB upsert
      expect(WhatsappConfigRepository.upsert).toHaveBeenCalledWith(mockAccountId, expect.objectContaining({
        phoneNumberId: 'phone-123',
        wabaId: 'waba-123',
        accessToken: 'encrypted_raw_token',
        status: 'connected',
        lastRegistrationError: null
      }))
    })
  })

  describe('PATCH /api/whatsapp/config', () => {
    it('updates mirror_inbound_media', async () => {
      ;(WhatsappConfigRepository.updateByAccountId as any).mockResolvedValue(true)
      
      const req = new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ mirror_inbound_media: false })
      })
      
      const res = await PATCH(req)
      expect(res.status).toBe(200)
      
      expect(WhatsappConfigRepository.updateByAccountId).toHaveBeenCalledWith(mockAccountId, {
        mirrorInboundMedia: false
      })
    })
  })

  describe('DELETE /api/whatsapp/config', () => {
    it('deletes the config', async () => {
      ;(WhatsappConfigRepository.deleteByAccountId as any).mockResolvedValue(true)
      
      const req = new Request('http://localhost', { method: 'DELETE' })
      const res = await DELETE()
      
      expect(res.status).toBe(200)
      expect(WhatsappConfigRepository.deleteByAccountId).toHaveBeenCalledWith(mockAccountId)
    })
  })
})
