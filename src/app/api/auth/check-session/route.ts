import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      hasSession: !!session,
    })
  } catch {
    return NextResponse.json({
      hasSession: false,
    })
  }
}
