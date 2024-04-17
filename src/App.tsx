import React from 'react'
import ZoomVideo, { VideoQuality } from '@zoom/videosdk'
import { generateSignature } from './utils'

const sdkKey = import.meta.env.VITE_SDK_KEY
const sdkSecret = import.meta.env.VITE_SDK_SECRET

const topic = 'SomeTopicName'
const role = 1
const username = `User-${new Date().getTime().toString().slice(6)}`

const App: React.FC = () => {
  const [isConnected, setIsConnected] = React.useState(false)
  const videoRef = React.useRef<HTMLDivElement>(null)

  const client = React.useMemo(() => ZoomVideo.createClient(), [])

  React.useEffect(() => {
    const initClient = async () => {
      await client.init('ja-JP', 'Global', { patchJsMedia: true })
    }
    initClient()
  }, [client])

  const renderVideo = async (event: any) => {
    const mediaStream = client.getMediaStream();
    if (event.action === 'Start') {
      const userVideo = await mediaStream.attachVideo(event.userId, VideoQuality.Video_1080P);
      const videoPlayerContainer = document.createElement('video-player-container');
      videoPlayerContainer.appendChild(userVideo);
      videoRef.current?.appendChild(videoPlayerContainer);
    } else {
      const element = await mediaStream.detachVideo(event.userId);
      Array.isArray(element) ? element.forEach((el) => el.remove()) : element.remove();
    }
  };

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

  const startCall = async () => {
    const token = generateSignature(topic, role, sdkKey, sdkSecret)
    client.on('peer-video-state-change', renderVideo)
    await client.join(topic, token, username)

    const mediaStream = client.getMediaStream()
    window.safari
      ? await UseWorkAroundForSafari(client)
      : await mediaStream.startAudio()
    await mediaStream.startVideo({ fullHd: true })

    await renderVideo({
      action: 'Start',
      userId: client.getCurrentUserInfo().userId,
    })
    setIsConnected(true)
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
          </>
        )}
      </div>
      <div
        ref={videoRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-4/5 mx-auto mb-10"
      ></div>
    </div>
  )
}

export default App
