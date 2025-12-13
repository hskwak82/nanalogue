import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, saveCalendarTokens } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle user denial or error
  if (error) {
    return NextResponse.redirect(`${origin}/settings?calendar=error&message=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/settings?calendar=error&message=no_code`)
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/login`)
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Save tokens to database
    const saved = await saveCalendarTokens(user.id, tokens)

    if (!saved) {
      return NextResponse.redirect(`${origin}/settings?calendar=error&message=save_failed`)
    }

    return NextResponse.redirect(`${origin}/settings?calendar=connected`)
  } catch (error) {
    console.error('Calendar callback error:', error)
    return NextResponse.redirect(`${origin}/settings?calendar=error&message=exchange_failed`)
  }
}
