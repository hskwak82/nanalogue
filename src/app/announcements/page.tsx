import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { AnnouncementsList } from '@/components/announcements/AnnouncementsList'

export default async function AnnouncementsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <Navigation user={{ email: user.email, name: profile?.name }} />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">공지사항</h1>
        <AnnouncementsList />
      </main>
    </div>
  )
}
