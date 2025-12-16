import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { AdminNav } from '@/components/admin'
import { isAdmin } from '@/lib/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check admin access
  const hasAdminAccess = await isAdmin(user.id)
  if (!hasAdminAccess) {
    redirect('/settings')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        user={{ email: user.email, name: profile?.name }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">관리자</h1>
          <p className="text-sm text-gray-500">서비스 관리 및 통계</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <AdminNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
    </div>
  )
}
