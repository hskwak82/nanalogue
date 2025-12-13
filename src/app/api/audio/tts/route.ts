import { NextResponse } from 'next/server'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

// Initialize client with credentials from environment
function getClient() {
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
  if (credentials) {
    return new TextToSpeechClient({
      credentials: JSON.parse(credentials),
    })
  }
  // Fallback to default credentials (for local development with gcloud auth)
  return new TextToSpeechClient()
}

// Remove emojis for cleaner speech
function removeEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
}

const DEFAULT_VOICE = 'ko-KR-Neural2-A'
const VALID_VOICES = [
  'ko-KR-Neural2-A',
  'ko-KR-Neural2-B',
  'ko-KR-Neural2-C',
  'ko-KR-Wavenet-A',
  'ko-KR-Wavenet-B',
  'ko-KR-Wavenet-C',
  'ko-KR-Wavenet-D',
]

export async function POST(request: Request) {
  try {
    const { text, voice } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Clean text for TTS
    const cleanText = removeEmojis(text)
    if (!cleanText) {
      return NextResponse.json({ error: 'No text to speak' }, { status: 400 })
    }

    // Validate and select voice
    const selectedVoice = VALID_VOICES.includes(voice) ? voice : DEFAULT_VOICE

    const client = getClient()

    // Build the voice request
    const [response] = await client.synthesizeSpeech({
      input: { text: cleanText },
      voice: {
        languageCode: 'ko-KR',
        name: selectedVoice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
      },
    })

    if (!response.audioContent) {
      throw new Error('No audio content received')
    }

    // Return audio as base64
    const audioBase64 = Buffer.from(response.audioContent).toString('base64')

    return NextResponse.json({
      audio: audioBase64,
      format: 'mp3',
    })
  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
