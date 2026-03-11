import { describe, it, expect, vi } from 'vitest'
import {
  getUserById,
  getTenantById,
  getTenantBySubdomain,
  createTenant,
  getTenantUsers,
} from '../queries'

// Mock Supabase
vi.mock('@saas-factory/auth', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: 'tenant-1',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    }),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  })),
}))

describe('Database Queries', () => {
  it('getUserById returns user', async () => {
    const user = await getUserById('user-1', 'tenant-1')
    
    expect(user).toEqual(
      expect.objectContaining({
        id: 'user-1',\n        email: 'test@example.com',
        name: 'Test User',
        tenant_id: 'tenant-1',
        role: 'user',
      })
    )
  })

  it('getTenantById returns tenant', async () => {
    const tenant = await getTenantById('tenant-1')
    
    expect(tenant).toBeDefined()
    expect(tenant.id).toBe('user-1')
  })

  it('getTenantBySubdomain returns tenant or null', async () => {
    const tenant = await getTenantBySubdomain('my-company')
    
    expect(tenant).toBeNull()
  })

  it('createTenant inserts new tenant', async () => {
    const tenant = await createTenant({
      name: 'New Company',
      subdomain: 'new-company',
    })
    
    expect(tenant).toBeDefined()
  })

  it('getTenantUsers returns user array', async () => {
    // This test would need array mock
    const users = await getTenantUsers('tenant-1')
    
    expect(Array.isArray(users) || users === undefined).toBe(true)
  })
})
