import React from 'react'
import ZoomVideo, { VideoQuality } from '@zoom/videosdk'
import { generateSignature } from './utils'

const sdkKey = import.meta.env.VITE_SDK_KEY
const sdkSecret = import.meta.env.VITE_SDK_SECRET

const topic = 'SomeTopicName'
const role = 1
const username = `User-${new Date().getTime().toString().slice(6)}`

const client = ZoomVideo.createClient()
await client.init('ja-JP', 'Global', { patchJsMedia: true })

const App: React.FC = () => {
  const [isConnected, setIsConnected] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const videoRef = React.useRef<HTMLDivElement>(null)

  const renderVideo = React.useCallback(
    async (event: { action: string; userId: number }) => {
      const mediaStream = client.getMediaStream()
      if (event.action === 'Start') {
        const userVideo = await mediaStream.attachVideo(
          event.userId,
          VideoQuality.Video_1080P,
        )
        if (userVideo instanceof HTMLElement) {
          videoRef.current?.appendChild(userVideo)
        }
      } else {
        const element = await mediaStream.detachVideo(event.userId)
        Array.isArray(element)
          ? element.forEach((el) => el.remove())
          : element?.remove()
      }
    },
    [],
  )

  const toggleVideo = async () => {
    const mediaStream = client.getMediaStream()
    if (mediaStream.isCapturingVideo()) {
      await mediaStream.stopVideo()
      await renderVideo({
        action: 'Stop',
        userId: client.getCurrentUserInfo().userId,
      })
    } else {
      await mediaStream.startVideo({ fullHd: true })
      await renderVideo({
        action: 'Start',
        userId: client.getCurrentUserInfo().userId,
      })
    }
  }

  const UseWorkAroundForSafari = async (client: any) => {
    let audioDecode: boolean
    let audioEncode: boolean
    client.on('media-sdk-change', (payload: any) => {
      console.log('media-sdk-change', payload)
      if (payload.type === 'audio' && payload.result === 'success') {
        if (payload.action === 'encode') {
          audioEncode = true
        } else if (payload.action === 'decode') {
          audioDecode = true
        }
        if (audioEncode && audioDecode) {
          console.log('start audio')
          client.getMediaStream().startAudio()
        }
      }
    })
  }

  const toggleAudio = async () => {
    const mediaStream = client.getMediaStream()
    if (isMuted) {
      await mediaStream.unmuteAudio()
      setIsMuted(false)
    } else {
      await mediaStream.muteAudio()
      setIsMuted(true)
    }
  }

  const startCall = async () => {
    const token = generateSignature(topic, role, sdkKey, sdkSecret)
    client.on('peer-video-state-change', renderVideo)
    await client.join(topic, token, username)

    const mediaStream = client.getMediaStream()
    await mediaStream.startVideo({ fullHd: true })

    await renderVideo({
      action: 'Start',
      userId: client.getCurrentUserInfo().userId,
    })
    setIsConnected(true)

    window.safari
      ? await UseWorkAroundForSafari(client)
      : await mediaStream.startAudio()
  }

  const leaveCall = async () => {
    client.off('peer-video-state-change', renderVideo)
    const mediaStream = client.getMediaStream()
    for (const user of client.getAllUser()) {
      const element = await mediaStream.detachVideo(user.userId)
      Array.isArray(element)
        ? element.forEach((el) => el.remove())
        : element.remove()
    }
    await client.leave()
    setIsConnected(false)
    setIsMuted(false)
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl font-bold text-center py-8">
        Zoom VideoSDK Hello World
      </h1>
      <div className="flex space-x-4 mb-4">
        {!isConnected ? (
          <button
            className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
            onClick={startCall}
          >
            Join
          </button>
        ) : (
          <>
            <button
              className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
              onClick={leaveCall}
            >
              Leave
            </button>
            <button
              className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
              onClick={toggleVideo}
            >
              Toggle Video
            </button>
            <button
              className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
              onClick={toggleAudio}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </>
        )}
      </div>
      <video-player-container ref={videoRef}></video-player-container>
    </div>
  )
}

export default App
