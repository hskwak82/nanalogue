// Admin Authentication Utilities

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export type AdminRole = 'admin' | 'super_admin'

export interface AdminUser {
  id: string
  user_id: string
  role: AdminRole
  permissions: string[]
  created_at: string
  created_by: string | null
}

// Check if a user is an admin (server-side)
export async function isAdmin(userId: string): Promise<boolean> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await serviceClient
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return !!data
}

// Get admin user details
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await serviceClient
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return data as AdminUser | null
}

// Check if user is a super admin
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const admin = await getAdminUser(userId)
  return admin?.role === 'super_admin'
}

// Require admin access - redirect if not admin
export async function requireAdmin(): Promise<{ userId: string; admin: AdminUser }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = await getAdminUser(user.id)

  if (!admin) {
    redirect('/settings')
  }

  return { userId: user.id, admin }
}

// Require super admin access
export async function requireSuperAdmin(): Promise<{ userId: string; admin: AdminUser }> {
  const { userId, admin } = await requireAdmin()

  if (admin.role !== 'super_admin') {
    redirect('/settings/admin')
  }

  return { userId, admin }
}

// Check admin status for API routes (returns null if not admin)
export async function checkAdminAuth(): Promise<{ userId: string; admin: AdminUser } | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const admin = await getAdminUser(user.id)

  if (!admin) {
    return null
  }

  return { userId: user.id, admin }
}

// Get service client for admin operations (bypasses RLS)
export function getAdminServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
