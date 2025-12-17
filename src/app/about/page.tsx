import { Navigation } from '@/components/Navigation'
import { createClient } from '@/lib/supabase/server'
import { AboutContent } from '@/components/about/AboutContent'

export default async function AboutPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <Navigation user={user ? { email: user.email, name: profile?.name } : null} />
      <AboutContent isLoggedIn={!!user} />
    </div>
  )
}
