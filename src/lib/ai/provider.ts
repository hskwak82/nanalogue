// Unified AI Provider for text generation
// Supports OpenAI and Gemini

export type AIProviderId = 'openai' | 'gemini'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GenerateOptions {
  messages: ChatMessage[]
  jsonMode?: boolean
  stream?: boolean
}

interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (error: Error) => void
}

// Get the current AI provider from settings
export async function getAIProvider(): Promise<AIProviderId> {
  // Reuse realtime provider setting as the unified AI provider
  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return 'openai' // Default
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data } = await supabase
    .from('system_settings')
    .select('realtime_provider')
    .eq('id', 'default')
    .single()

  return (data?.realtime_provider as AIProviderId) || 'openai'
}

// Generate text using OpenAI
async function generateOpenAI(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: options.messages,
      ...(options.jsonMode && { response_format: { type: 'json_object' } }),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Generate text using Gemini
async function generateGemini(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured')
  }

  // Convert messages to Gemini format
  const systemInstruction = options.messages.find(m => m.role === 'system')?.content || ''
  const contents = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          ...(options.jsonMode && { responseMimeType: 'application/json' }),
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Stream text using OpenAI
async function streamOpenAI(options: GenerateOptions, callbacks: StreamCallbacks): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: options.messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  let fullContent = ''
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullContent += content
            callbacks.onChunk(content)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
    callbacks.onDone()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Stream error'))
  }

  return fullContent
}

// Stream text using Gemini
async function streamGemini(options: GenerateOptions, callbacks: StreamCallbacks): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured')
  }

  // Convert messages to Gemini format
  const systemInstruction = options.messages.find(m => m.role === 'system')?.content || ''
  const contents = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  let fullContent = ''
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6).trim()
        if (!data) continue

        try {
          const parsed = JSON.parse(data)
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            fullContent += text
            callbacks.onChunk(text)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
    callbacks.onDone()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Stream error'))
  }

  return fullContent
}

// Main generate function - auto-selects provider
export async function generateText(options: GenerateOptions): Promise<string> {
  const provider = await getAIProvider()

  if (provider === 'gemini') {
    return generateGemini(options)
  } else {
    return generateOpenAI(options)
  }
}

// Main stream function - auto-selects provider
export async function streamText(options: GenerateOptions, callbacks: StreamCallbacks): Promise<string> {
  const provider = await getAIProvider()

  if (provider === 'gemini') {
    return streamGemini(options, callbacks)
  } else {
    return streamOpenAI(options, callbacks)
  }
}

// Generate with specific provider (for cases where you need to override)
export async function generateWithProvider(
  provider: AIProviderId,
  options: GenerateOptions
): Promise<string> {
  if (provider === 'gemini') {
    return generateGemini(options)
  } else {
    return generateOpenAI(options)
  }
}

// Stream with specific provider
export async function streamWithProvider(
  provider: AIProviderId,
  options: GenerateOptions,
  callbacks: StreamCallbacks
): Promise<string> {
  if (provider === 'gemini') {
    return streamGemini(options, callbacks)
  } else {
    return streamOpenAI(options, callbacks)
  }
}
