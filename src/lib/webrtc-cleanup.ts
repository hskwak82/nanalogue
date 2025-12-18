// Global WebRTC cleanup utility
// Tracks and cleans up all WebRTC peer connections created by the app

// Use a unique identifier for our audio elements
const AUDIO_DATA_ATTR = 'data-nanalogue-realtime'

// Store references to active connections and audio elements
let activePeerConnection: RTCPeerConnection | null = null
let activeAudioElement: HTMLAudioElement | null = null
let activeMediaStream: MediaStream | null = null
let activeDataChannel: RTCDataChannel | null = null

// Track all created peer connections (in case we lose the reference)
const allPeerConnections = new Set<RTCPeerConnection>()

// Track all media streams for cleanup
const allMediaStreams = new Set<MediaStream>()

// Global flag to prevent reconnection after disconnect
let connectionBlocked = false

// Block all future connections (call this when user ends conversation)
export function blockConnections() {
  console.log('[WebRTC] Blocking all future connections')
  connectionBlocked = true
}

// Allow connections again (call this when starting a new session)
export function allowConnections() {
  console.log('[WebRTC] Allowing connections')
  connectionBlocked = false
}

// Check if connections are blocked
export function isConnectionBlocked(): boolean {
  return connectionBlocked
}

// Register a peer connection for tracking
export function registerPeerConnection(pc: RTCPeerConnection | null) {
  // Clean up any existing connection first
  cleanupWebRTC()
  activePeerConnection = pc
  if (pc) {
    allPeerConnections.add(pc)
  }
}

// Register an audio element for tracking
export function registerAudioElement(audio: HTMLAudioElement | null) {
  if (activeAudioElement && activeAudioElement !== audio) {
    stopAudioElement(activeAudioElement)
  }
  activeAudioElement = audio
  if (audio) {
    audio.setAttribute(AUDIO_DATA_ATTR, 'true')
  }
}

// Register a media stream for tracking
export function registerMediaStream(stream: MediaStream | null) {
  if (activeMediaStream && activeMediaStream !== stream) {
    activeMediaStream.getTracks().forEach((track) => track.stop())
  }
  activeMediaStream = stream
  if (stream) {
    allMediaStreams.add(stream)
  }
}

// Register a data channel for tracking
export function registerDataChannel(dc: RTCDataChannel | null) {
  if (activeDataChannel && activeDataChannel !== dc) {
    try {
      activeDataChannel.close()
    } catch {}
  }
  activeDataChannel = dc
}

// Completely stop an audio element
function stopAudioElement(audio: HTMLAudioElement) {
  try {
    audio.pause()
    audio.currentTime = 0
    audio.srcObject = null
    audio.src = ''
    audio.load() // Reset the audio element
    audio.remove() // Remove from DOM if present
  } catch (e) {
    console.log('[WebRTC Cleanup] Error stopping audio:', e)
  }
}

// Clean up all WebRTC resources
export function cleanupWebRTC() {
  console.log('[WebRTC Cleanup] Cleaning up all WebRTC resources')

  // Close data channel first
  if (activeDataChannel) {
    console.log('[WebRTC Cleanup] Closing data channel')
    try {
      activeDataChannel.close()
    } catch {}
    activeDataChannel = null
  }

  // Stop active media stream
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach((track) => {
      console.log(`[WebRTC Cleanup] Stopping active track: ${track.kind}`)
      track.stop()
    })
    activeMediaStream = null
  }

  // Stop ALL tracked media streams (including microphone)
  allMediaStreams.forEach((stream) => {
    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC Cleanup] Stopping tracked track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`)
      track.stop()
    })
  })
  allMediaStreams.clear()

  // Close active peer connection
  if (activePeerConnection) {
    console.log('[WebRTC Cleanup] Closing peer connection')
    try {
      activePeerConnection.close()
    } catch {}
    activePeerConnection = null
  }

  // Close all tracked peer connections
  allPeerConnections.forEach((pc) => {
    try {
      if (pc.connectionState !== 'closed') {
        console.log('[WebRTC Cleanup] Closing tracked peer connection')
        pc.close()
      }
    } catch {}
  })
  allPeerConnections.clear()

  // Stop and clear active audio element
  if (activeAudioElement) {
    console.log('[WebRTC Cleanup] Stopping active audio element')
    stopAudioElement(activeAudioElement)
    activeAudioElement = null
  }

  // Find and stop ALL audio elements with our marker
  if (typeof document !== 'undefined') {
    const ourAudioElements = document.querySelectorAll(`audio[${AUDIO_DATA_ATTR}]`)
    ourAudioElements.forEach((audio) => {
      console.log('[WebRTC Cleanup] Stopping marked audio element')
      stopAudioElement(audio as HTMLAudioElement)
    })

    // Also stop any other audio elements that might be playing
    document.querySelectorAll('audio').forEach((audio) => {
      if (audio.srcObject) {
        console.log('[WebRTC Cleanup] Stopping unmarked audio element with srcObject')
        stopAudioElement(audio)
      }
    })
  }
}

// Check if there's an active connection
export function hasActiveConnection(): boolean {
  return (
    activePeerConnection !== null &&
    activePeerConnection.connectionState !== 'closed'
  )
}

// Get connection state for debugging
export function getConnectionState(): string {
  if (!activePeerConnection) return 'none'
  return activePeerConnection.connectionState
}
