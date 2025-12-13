import { google, calendar_v3 } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

interface CalendarToken {
  id: string
  user_id: string
  provider: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
}

interface CalendarEvent {
  date: string
  title: string
  time?: string      // HH:mm for timed events
  isAllDay: boolean
  description?: string
}

// Create OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback`
  )
}

// Generate authorization URL for Google Calendar
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  })
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Get calendar client with valid tokens
export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const supabase = await createClient()

  // Get stored tokens
  const { data: tokenData, error } = await supabase
    .from('calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single()

  if (error || !tokenData) {
    return null
  }

  const token = tokenData as CalendarToken
  const oauth2Client = createOAuth2Client()

  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  })

  // Check if token needs refresh
  const expiresAt = new Date(token.expires_at)
  if (expiresAt <= new Date()) {
    const refreshed = await refreshTokenIfNeeded(userId, oauth2Client)
    if (!refreshed) {
      return null
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// Refresh access token if expired
async function refreshTokenIfNeeded(
  userId: string,
  oauth2Client: ReturnType<typeof createOAuth2Client>
): Promise<boolean> {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    const supabase = await createClient()

    // Update stored token
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    const { error } = await supabase
      .from('calendar_tokens')
      .update({
        access_token: credentials.access_token,
        expires_at: expiresAt,
      })
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (error) {
      console.error('Failed to update token:', error)
      return false
    }

    oauth2Client.setCredentials(credentials)
    return true
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return false
  }
}

// Create a diary event on Google Calendar
export async function createDiaryEvent(
  userId: string,
  date: string,
  summary: string
): Promise<boolean> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) {
    return false
  }

  try {
    // Check if event already exists for this date
    const existingEvents = await calendar.events.list({
      calendarId: 'primary',
      timeMin: `${date}T00:00:00+09:00`,
      timeMax: `${date}T23:59:59+09:00`,
      q: '나날로그 일기',
    })

    // If event exists, update it instead
    if (existingEvents.data.items && existingEvents.data.items.length > 0) {
      const existingEvent = existingEvents.data.items[0]
      await calendar.events.update({
        calendarId: 'primary',
        eventId: existingEvent.id!,
        requestBody: {
          summary: '나날로그 일기 ✏️',
          description: summary,
          start: { date },
          end: { date },
          transparency: 'transparent', // Show as free
        },
      })
    } else {
      // Create new event
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: '나날로그 일기 ✏️',
          description: summary,
          start: { date },
          end: { date },
          transparency: 'transparent',
        },
      })
    }

    return true
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return false
  }
}

// Get events for a specific month
export async function getMonthEvents(
  userId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) {
    return []
  }

  try {
    // Get first and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: firstDay.toISOString(),
      timeMax: lastDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })

    const events: CalendarEvent[] = []

    for (const event of response.data.items || []) {
      // Skip 나날로그 diary events (we show them differently)
      if (event.summary?.includes('나날로그')) continue

      const isAllDay = !!event.start?.date // All-day events have 'date', timed events have 'dateTime'
      let date: string
      let time: string | undefined

      if (isAllDay) {
        date = event.start!.date!
      } else if (event.start?.dateTime) {
        // Extract date and time from dateTime (e.g., "2024-12-17T14:00:00+09:00")
        const dateTime = event.start.dateTime
        date = dateTime.split('T')[0]
        // Extract HH:mm from the time part
        const timePart = dateTime.split('T')[1]
        time = timePart.substring(0, 5) // "14:00"
      } else {
        continue
      }

      events.push({
        date,
        title: event.summary || 'Untitled',
        time,
        isAllDay,
        description: event.description || undefined,
      })
    }

    return events
  } catch (error) {
    console.error('Failed to get calendar events:', error)
    return []
  }
}

// Check if user has calendar connected
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('calendar_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()

  return !!data
}

// Save calendar tokens to database
export async function saveCalendarTokens(
  userId: string,
  tokens: {
    access_token?: string | null
    refresh_token?: string | null
    expiry_date?: number | null
  }
): Promise<boolean> {
  const supabase = await createClient()

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString()

  // Check if token already exists
  const { data: existing } = await supabase
    .from('calendar_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()

  if (existing) {
    // Update existing token
    const { error } = await supabase
      .from('calendar_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: SCOPES.join(' '),
      })
      .eq('id', existing.id)

    return !error
  } else {
    // Insert new token
    const { error } = await supabase.from('calendar_tokens').insert({
      user_id: userId,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: SCOPES.join(' '),
    })

    return !error
  }
}

// Create a calendar event with optional time
export interface CreateCalendarEventParams {
  userId: string
  title: string
  date: string        // YYYY-MM-DD
  time?: string       // HH:mm (optional)
  duration?: number   // minutes (default: 60)
  description?: string
}

export interface CreateCalendarEventResult {
  success: boolean
  eventId?: string
  error?: string
}

export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<CreateCalendarEventResult> {
  const { userId, title, date, time, duration = 60, description } = params

  const calendar = await getCalendarClient(userId)
  if (!calendar) {
    return { success: false, error: 'Calendar not connected' }
  }

  try {
    let start: { date?: string; dateTime?: string; timeZone?: string }
    let end: { date?: string; dateTime?: string; timeZone?: string }

    if (time) {
      // Timed event
      const startDateTime = `${date}T${time}:00+09:00`
      const endDate = new Date(`${date}T${time}:00`)
      endDate.setMinutes(endDate.getMinutes() + duration)
      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
      const endDateTime = `${date}T${endHours}:${endMinutes}:00+09:00`

      start = { dateTime: startDateTime, timeZone: 'Asia/Seoul' }
      end = { dateTime: endDateTime, timeZone: 'Asia/Seoul' }
    } else {
      // All-day event
      start = { date }
      end = { date }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description,
        start,
        end,
      },
    })

    return { success: true, eventId: response.data.id || undefined }
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return { success: false, error: 'Failed to create event' }
  }
}

// Disconnect calendar (remove tokens)
export async function disconnectCalendar(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('calendar_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google')

  return !error
}
