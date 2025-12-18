// Global WebRTC cleanup utility
// Tracks and cleans up all WebRTC peer connections created by the app

// Store references to active connections and audio elements
let activePeerConnection: RTCPeerConnection | null = null
let activeAudioElement: HTMLAudioElement | null = null
let activeMediaStream: MediaStream | null = null

// Register a peer connection for tracking
export function registerPeerConnection(pc: RTCPeerConnection | null) {
  // Clean up any existing connection first
  cleanupWebRTC()
  activePeerConnection = pc
}

// Register an audio element for tracking
export function registerAudioElement(audio: HTMLAudioElement | null) {
  if (activeAudioElement && activeAudioElement !== audio) {
    activeAudioElement.pause()
    activeAudioElement.srcObject = null
  }
  activeAudioElement = audio
}

// Register a media stream for tracking
export function registerMediaStream(stream: MediaStream | null) {
  if (activeMediaStream && activeMediaStream !== stream) {
    activeMediaStream.getTracks().forEach((track) => track.stop())
  }
  activeMediaStream = stream
}

// Clean up all WebRTC resources
export function cleanupWebRTC() {
  console.log('[WebRTC Cleanup] Cleaning up all WebRTC resources')

  // Stop media stream
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach((track) => {
      console.log(`[WebRTC Cleanup] Stopping track: ${track.kind}`)
      track.stop()
    })
    activeMediaStream = null
  }

  // Close peer connection
  if (activePeerConnection) {
    console.log('[WebRTC Cleanup] Closing peer connection')
    activePeerConnection.close()
    activePeerConnection = null
  }

  // Stop and clear audio element
  if (activeAudioElement) {
    console.log('[WebRTC Cleanup] Stopping audio element')
    activeAudioElement.pause()
    activeAudioElement.srcObject = null
    activeAudioElement = null
  }

  // Also try to stop any audio elements that might be in the DOM
  if (typeof document !== 'undefined') {
    document.querySelectorAll('audio').forEach((audio) => {
      audio.pause()
      audio.srcObject = null
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
