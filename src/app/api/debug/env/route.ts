import { NextResponse } from 'next/server'

// Debug endpoint to check which environment variables are available
// This only shows if they exist, NOT their values
export async function GET() {
  const envCheck = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    MY_OPENAI_KEY: !!process.env.MY_OPENAI_KEY,
    REALTIME_API_KEY: !!process.env.REALTIME_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Check if any env var with OPENAI exists
    anyOpenAI: Object.keys(process.env).filter(k => k.includes('OPENAI')),
  }

  return NextResponse.json(envCheck)
}
