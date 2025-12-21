import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/home'
  const error = searchParams.get('error')
  const error_code = searchParams.get('error_code')
  const error_description = searchParams.get('error_description')

  // Comprehensive debug logging
  console.log('=== Auth Callback Debug ===')
  console.log('Full URL:', request.url)
  console.log('Params:', {
    code: code ? `${code.substring(0, 10)}...` : null,
    token_hash: token_hash ? `${token_hash.substring(0, 10)}...` : null,
    type,
    next,
    error,
    error_code,
    error_description
  })
  console.log('All search params:', Object.fromEntries(searchParams.entries()))
  console.log('===========================')

  // Handle errors from Supabase (in query params)
  if (error || error_code) {
    console.log('Error detected in callback:', { error, error_code, error_description })
    if (type === 'recovery' || error_code === 'otp_expired') {
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // If this is a recovery flow but no code or token_hash, redirect to reset-password
  // The client-side will handle session detection and error display
  if (type === 'recovery' && !code && !token_hash) {
    console.log('Recovery flow without code/token - redirecting to reset-password')
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  const supabase = await createClient()

  // Handle password recovery with token_hash (implicit flow)
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })

    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
    return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
  }

  // Handle code exchange (PKCE flow - used for OAuth and recovery)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is a password recovery flow
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Normal OAuth flow - redirect to home or next
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    // If code exchange failed for recovery, show error
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
