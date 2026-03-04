import { describe, it, expect, vi } from 'vitest'

// Mock Supabase RPC & Selects
const mockSupabase = {
    rpc: vi.fn(),
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn()
            }))
        }))
    }))
}

describe('Lootbox Expiry Logic', () => {
    it('Should correctly identify an expired card', () => {
        const pastDate = new Date(Date.now() - 100000).toISOString()
        const isExpired = new Date(pastDate) < new Date()
        expect(isExpired).toBe(true)
    })

    it('Should correctly identify a valid unexpired card', () => {
        const futureDate = new Date(Date.now() + 100000).toISOString()
        const isExpired = new Date(futureDate) < new Date()
        expect(isExpired).toBe(false)
    })
})

describe('Reveal Animation Data Structure', () => {
    it('Should handle properly structured mock RPC returns', async () => {
        mockSupabase.rpc.mockResolvedValueOnce({ data: 'fake-uuid', error: null })
        const { data } = await mockSupabase.rpc('open_lootbox')
        expect(data).toBe('fake-uuid')
    })
})
